import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe, ChevronDown, Check, Sparkles, Sliders } from 'lucide-react';

interface Props {
  variant?: 'dropdown' | 'pills' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<Props> = ({ variant = 'dropdown', className = '' }) => {
  const {
    language,
    setLanguage,
    resetToAutoDetect,
    isAutoDetected,
    detectedBrowserLang,
    languages,
    t
  } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === language) || languages[0];
  const detectedOption = languages.find((l) => l.code === detectedBrowserLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl ${className}`}>
        {languages.map((lang) => {
          const isSelected = lang.code === language;
          return (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-all shadow-sm ${className}`}
          title={`${t('language')}: ${currentLang.nativeName} (${isAutoDetected ? t('langAutoFromBrowser') : t('langPreferenceSaved')})`}
        >
          <span>{currentLang.flag}</span>
          <span className="uppercase text-[11px] font-bold tracking-wide">{currentLang.code}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-1.5 mb-1">
              <span>{t('language')}</span>
              {isAutoDetected && (
                <span className="text-sky-400 text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded-md font-mono">
                  AUTO
                </span>
              )}
            </div>

            {languages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              );
            })}

            {/* Auto detect reset button */}
            {!isAutoDetected && (
              <div className="pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    resetToAutoDetect();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-sky-300 hover:bg-slate-800/60 rounded-xl transition-all"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>{t('langAutoFromBrowser')} ({detectedOption.flag} {detectedOption.code.toUpperCase()})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-md active:scale-95 ${className}`}
      >
        <Globe className="w-4 h-4 text-sky-400" />
        <span className="text-sm">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.nativeName}</span>
        <span className="sm:hidden uppercase text-[11px]">{currentLang.code}</span>
        {isAutoDetected && (
          <span className="hidden md:inline-block text-[9px] bg-sky-500/20 border border-sky-500/30 text-sky-300 px-1.5 py-0.2 rounded font-normal">
            Auto
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-1.5 mb-1">
            <span>{t('selectLanguage')}</span>
            <span className="text-[9px] text-slate-500 lowercase">cookies + browser</span>
          </div>

          {languages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-sky-400" />}
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            {!isAutoDetected ? (
              <button
                onClick={() => {
                  resetToAutoDetect();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-sky-300 hover:bg-slate-800/60 rounded-xl transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('langAutoFromBrowser')}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  {detectedOption.flag} {detectedOption.code.toUpperCase()}
                </span>
              </button>
            ) : (
              <div className="px-2.5 py-1 text-[10px] text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{t('langAutoDetectedNotice')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
