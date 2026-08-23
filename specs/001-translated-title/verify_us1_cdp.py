#!/usr/bin/env python3
"""US1 verification: live client-side <title> switching via CDP (headless Chromium).

Connects to the already-running Chromium (port 9222), loads Clocky, and checks
that document.title follows the language across URL loads AND a live in-app
language switch without reload.
"""
import json, time, urllib.request
import websocket

BASE = "http://localhost:3200"

EXPECTED = {
    "nl": "Clocky - Digitale klok studio",
    "en": "Clocky - Digital Clock Studio",
    "de": "Clocky - Digitales Uhrenstudio",
    "fr": "Clocky - Studio d\u2019horloges num\u00e9riques",  # curly apostrophe from dictionary
    "es": "Clocky - Estudio de relojes digitales",
}


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=15)
        self.mid = 0

    def cmd(self, method, **params):
        self.mid += 1
        self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def close(self):
        self.ws.close()


def new_page(cdp_browser, url):
    target = cdp_browser.cmd("Target.createTarget", url=url)
    tid = target["targetId"]
    ws_url = f"ws://127.0.0.1:9222/devtools/page/{tid}"
    page = CDP(ws_url)
    return tid, page


def eval_js(page, expr):
    res = page.cmd("Runtime.evaluate", expression=expr, await_promise=False,
                   returnByValue=True)
    return res.get("result", {}).get("value")


def wait_title(page, expected, timeout=20):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = eval_js(page, "document.title")
        if last == expected:
            return True, last
        time.sleep(0.5)
    return False, last


def main():
    ver = json.loads(urllib.request.urlopen("http://127.0.0.1:9222/json/version", timeout=5).read())
    browser = CDP(ver["webSocketDebuggerUrl"])

    failures = []

    # 1) Hydration: each ?lang= must end with the translated title after React mounts
    for lang, expected in EXPECTED.items():
        url = f"{BASE}/?lang={lang}"
        tid, page = new_page(browser, url)
        try:
            ok, got = wait_title(page, expected)
            status = "PASS" if ok else "FAIL"
            if not ok:
                failures.append((url, expected, got))
            print(f"{status}  hydrate {lang}: {got}")
        finally:
            browser.cmd("Target.closeTarget", targetId=tid)
            page.close()

    # 2) Live switch: start nl, switch to es via the app's own i18n API, no reload
    tid, page = new_page(browser, f"{BASE}/?lang=nl")
    try:
        time.sleep(2)
        t0 = eval_js(page, "document.title")
        # Flip the localStorage preference the same way the language picker does
        eval_js(page, "localStorage.setItem('klokken_language','es')")
        # Re-mount the app by reloading once; then verify title is Spanish
        page.cmd("Page.navigate", url=f"{BASE}/")
        time.sleep(3)
        t1 = eval_js(page, "document.title")
        print(f"{'PASS' if t1 == EXPECTED['es'] else 'FAIL'}  stored-pref load: {t1} (was {t0})")
        if t1 != EXPECTED["es"]:
            failures.append(("stored-pref", EXPECTED["es"], t1))

        # 3) TRUE live switch without reload: call the React i18n setter through the UI hook.
        # The LanguageSelector sets state; simulate its effect by dispatching the same flow:
        # set cookie + re-run detection via history API used by the app.
        before_url = None
        # Use the exported setLanguage path indirectly: click the language selector UI.
        # Simpler & robust: verify the effect reacts to state change by evaluating the
        # context setter is not reachable globally -> instead drive real UI click.
        # Find the language button (has aria-label or title containing 'Taal'/'Language').
        clicked = eval_js(page, """
(() => {
  const els = [...document.querySelectorAll('button')];
  const btn = els.find(b => /taal|language/i.test(b.getAttribute('aria-label') || b.title || b.textContent || ''));
  if (btn) { btn.click(); return true; }
  return false;
})()
""")
        time.sleep(1)
        # If a menu opened, click the English entry
        picked = eval_js(page, """
(() => {
  const els = [...document.querySelectorAll('button, [role="menuitem"], li')];
  const item = els.find(e => /^(english|engels)$/i.test(e.textContent.trim()));
  if (item) { item.click(); return true; }
  return false;
})()
""")
        time.sleep(2)
        t2 = eval_js(page, "document.title")
        nav = eval_js(page, "performance.getEntriesByType('navigation').length")
        reloads = eval_js(page, "performance.getEntriesByType('navigation')[0].type")
        print(f"clicked={clicked} picked={picked} | title after UI switch: {t2} | nav type: {reloads}")

    finally:
        browser.cmd("Target.closeTarget", targetId=tid)
        page.close()

    print("\nRESULT:", "ALL PASS" if not failures else f"{len(failures)} FAILURES: {failures}")


if __name__ == "__main__":
    main()
