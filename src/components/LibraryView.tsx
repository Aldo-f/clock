import React, { useState } from 'react';
import { ClockItem } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Heart,
  Sparkles,
  User,
  Trash2,
  Search,
  BookOpen,
  Globe,
  Maximize2
} from 'lucide-react';

interface Props {
  personalClocks: ClockItem[];
  communityClocks: ClockItem[];
  onOpenCustomizer: (clock?: ClockItem) => void;
  onOpenFullSize: (clock: ClockItem) => void;
  onDeletePersonal: (id: string) => void;
  onLikeCommunity: (id: string) => void;
}

export const LibraryView: React.FC<Props> = ({
  personalClocks,
  communityClocks,
  onOpenCustomizer,
  onOpenFullSize,
  onDeletePersonal,
  onLikeCommunity
}) => {
  const { t, translateClock, translateCategory } = useLanguage();
  const [tab, setTab] = useState<'personal' | 'community'>('community');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');

  const rawCategories = [
    'Alle',
    'Mechanisch & uniek',
    'Digitaal & tech',
    'Minimalistisch',
    'Retro & vintage',
    'Persoonlijk',
    'Custom AI'
  ];

  const currentList = tab === 'personal' ? personalClocks : communityClocks;

  const translatedList = currentList.map((c) => translateClock(c));

  const filteredList = translatedList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.author && c.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat =
      selectedCategory === 'Alle' ||
      c.category === selectedCategory ||
      translateCategory(c.category) === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-sky-400" />
            <span>{t('libTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('libSubtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setTab('community')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'community'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t('libTabCommunity')} ({communityClocks.length})</span>
          </button>

          <button
            onClick={() => setTab('personal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'personal'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('libTabPersonal')} ({personalClocks.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('libSearchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {rawCategories.map((rawCat) => {
            const catLabel = rawCat === 'Alle' ? t('catAll') : translateCategory(rawCat);
            return (
              <button
                key={rawCat}
                onClick={() => setSelectedCategory(rawCat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === rawCat
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {catLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">{t('libEmpty')}</p>
          <p className="text-xs text-slate-500 mt-1">
            {t('libEmptySub')}
          </p>
          <button
            onClick={() => onOpenCustomizer()}
            className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('libDesignNew')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((clock) => (
            <div
              key={clock.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              {/* Clock Live Preview Window */}
              <div className="relative w-full aspect-square border-b border-slate-800 overflow-hidden bg-slate-950">
                <ClockRenderer clock={clock} soundEnabled={false} />

                {/* Quick Full Size Hover Overlay Button */}
                <button
                  onClick={() => onOpenFullSize(clock)}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md border border-white/10 shadow-lg opacity-80 hover:opacity-100 transition-all hover:scale-105 active:scale-95 z-20"
                  title={t('viewFullscreen')}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                      {translateCategory(clock.category)}
                    </span>

                    {/* Upvote / Like Button */}
                    <button
                      onClick={() => onLikeCommunity(clock.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all active:scale-95"
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                      <span>{clock.likes || 1}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors truncate mb-1">
                    {clock.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">{clock.description}</p>
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2.5">
                  <span className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{clock.author || t('anonymous')}</span>
                  </span>

                  {tab === 'personal' && (
                    <button
                      onClick={() => onDeletePersonal(clock.id)}
                      className="text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('delete')}</span>
                    </button>
                  )}
                </div>

                {/* Action Buttons: Full Size & AI Customizer */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onOpenFullSize(clock)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('navFullscreen')}</span>
                  </button>

                  <button
                    onClick={() => onOpenCustomizer(clock)}
                    className="py-2.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white font-bold text-xs rounded-xl border border-sky-500/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('edit')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
