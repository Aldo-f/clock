import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe, Check, X, Sparkles } from 'lucide-react';
import { Language } from '../i18n/types';

export const LanguageAutoDetectBanner: React.FC = () => {
  const {
    language,
    setLanguage,
    showAutoDetectNotice,
    dismissAutoDetectNotice,
    languages,
    t
  } = useLanguage();

  const [visible, setVisible] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (showAutoDetectNotice) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => {
        setVisible(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [showAutoDetectNotice]);

  if (!visible || !showAutoDetectNotice) return null;

  const currentOption = languages.find((l) => l.code === language) || languages[0];

  return (
    <div
      id="lang-autodetect-banner"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] bg-slate-900/95 border border-sky-500/30 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0 mt-0.5">
          <Globe className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-base">{currentOption.flag}</span>
            <h4 className="text-xs font-bold text-white tracking-tight">
              {currentOption.nativeName}
            </h4>
            <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t('langAutoFromBrowser')}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t('langAutoDetectedNotice')}.
          </p>

          {showOptions ? (
            <div className="pt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowOptions(false);
                    dismissAutoDetectNotice();
                  }}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    lang.code === language
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={dismissAutoDetectNotice}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('langDismiss')}</span>
              </button>

              <button
                onClick={() => setShowOptions(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all active:scale-95"
              >
                <span>{t('langChange')}</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={dismissAutoDetectNotice}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-800 transition-all shrink-0"
          title={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
