import { useEffect, useRef, useState } from 'react';
import { getZonedDate } from './timeUtils';

export function useZonedClock(
  timeZone: string | undefined,
  timeOverride: Date | null | undefined,
  onTick?: (now: Date) => void
): Date {
  const zone = timeZone || 'local';
  const [now, setNow] = useState(() => getZonedDate(new Date(), zone));
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });

  useEffect(() => {
    if (timeOverride) return;
    setNow(getZonedDate(new Date(), zone));
    const id = setInterval(() => {
      const d = getZonedDate(new Date(), zone);
      tickRef.current?.(d);
      setNow(d);
    }, 1000);
    return () => clearInterval(id);
  }, [zone, timeOverride]);

  return timeOverride ? getZonedDate(timeOverride, zone) : now;
}