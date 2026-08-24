import React, { useEffect, useState, useMemo } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { useZonedClock } from '../../utils/useZonedClock';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/types';
import { Eye, Info, Volume2, ShieldCheck, Sun, Palette, Globe } from 'lucide-react';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

type FrontplateFinish = 'matte_black' | 'brushed_steel' | 'walnut_wood' | 'minimal_white' | 'copper_rust';

interface Cell {
  char: string;
  key?: string;
  r: number;
  c: number;
}

export const WordClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.1,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { language: currentAppLang, t } = useLanguage();
  const [clockLang, setClockLang] = useState<Language>(currentAppLang);
  const [finish, setFinish] = useState<FrontplateFinish>('matte_black');
  const [showSubtitle, setShowSubtitle] = useState<boolean>(true);
  const [showCornerDots, setShowCornerDots] = useState<boolean>(true);
  const [activeLedColor, setActiveLedColor] = useState<string>(config.accentColor || '#38bdf8');

  // Keep clock language in sync with app language initially
  useEffect(() => {
    setClockLang(currentAppLang);
  }, [currentAppLang]);

  useEffect(() => {
    if (config.accentColor) {
      setActiveLedColor(config.accentColor);
    }
  }, [config.accentColor]);

  const activeTime = useZonedClock(timeZone || config.timeZone, timeOverride, (now) => {
    if (soundEnabled && config.soundType) {
      if (now.getSeconds() === 0) {
        playClockSound(config.soundType || 'gear_click', soundVolume * 1.5);
      } else {
        playClockSound(config.soundType || 'soft_tick', soundVolume * 0.5);
      }
    }
  });
  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();

  const cornerMinutes = minutes % 5; // 0, 1, 2, 3, 4

  // Matrix and logic resolvers for all 5 languages
  const { matrixData, activeKeys, timeSentence } = useMemo(() => {
    const keys = new Set<string>();
    const roundedMins = Math.floor(minutes / 5) * 5;
    let sentence = '';

    // ================= DUTCH (NL) =================
    if (clockLang === 'nl') {
      const rawMatrix: string[][] = [
        ['H', 'E', 'T', 'K', 'I', 'S', 'A', 'V', 'I', 'J', 'F'],
        ['T', 'I', 'E', 'N', 'E', 'N', 'Z', 'V', 'O', 'O', 'R'],
        ['O', 'V', 'E', 'R', 'M', 'E', 'R', 'K', 'W', 'A', 'R', 'T'],
        ['V', 'O', 'O', 'R', 'P', 'M', 'S', 'O', 'V', 'E', 'R'],
        ['H', 'A', 'L', 'F', 'S', 'P', 'G', 'E', 'E', 'N', 'S'],
        ['T', 'W', 'E', 'E', 'N', 'C', 'D', 'R', 'I', 'E', 'N'],
        ['V', 'I', 'E', 'R', 'V', 'I', 'J', 'F', 'Z', 'E', 'S'],
        ['Z', 'E', 'V', 'E', 'N', 'N', 'E', 'G', 'E', 'N', 'O'],
        ['A', 'C', 'H', 'T', 'T', 'I', 'E', 'N', 'E', 'L', 'F'],
        ['T', 'W', 'A', 'A', 'L', 'F', 'B', 'M', 'U', 'U', 'R']
      ];

      const keyMapping: (string | undefined)[][] = [
        ['HET', 'HET', 'HET', undefined, 'IS', 'IS', undefined, 'VIJF_MIN', 'VIJF_MIN', 'VIJF_MIN', 'VIJF_MIN'],
        ['TIEN_MIN', 'TIEN_MIN', 'TIEN_MIN', 'TIEN_MIN', undefined, undefined, undefined, 'VOOR_1', 'VOOR_1', 'VOOR_1', 'VOOR_1'],
        ['OVER_1', 'OVER_1', 'OVER_1', 'OVER_1', undefined, undefined, undefined, 'KWART', 'KWART', 'KWART', 'KWART', 'KWART'],
        ['VOOR_2', 'VOOR_2', 'VOOR_2', 'VOOR_2', undefined, undefined, undefined, 'OVER_2', 'OVER_2', 'OVER_2', 'OVER_2'],
        ['HALF', 'HALF', 'HALF', 'HALF', undefined, undefined, undefined, 'EEN', 'EEN', 'EEN', undefined],
        ['TWEE', 'TWEE', 'TWEE', 'TWEE', undefined, undefined, undefined, 'DRIE', 'DRIE', 'DRIE', 'DRIE'],
        ['VIER', 'VIER', 'VIER', 'VIER', 'VIJF_UUR', 'VIJF_UUR', 'VIJF_UUR', 'VIJF_UUR', 'ZES', 'ZES', 'ZES'],
        ['ZEVEN', 'ZEVEN', 'ZEVEN', 'ZEVEN', 'ZEVEN', 'NEGEN', 'NEGEN', 'NEGEN', 'NEGEN', 'NEGEN', undefined],
        ['ACHT', 'ACHT', 'ACHT', 'ACHT', 'TIEN_UUR', 'TIEN_UUR', 'TIEN_UUR', 'TIEN_UUR', 'ELF', 'ELF', 'ELF'],
        ['TWAALF', 'TWAALF', 'TWAALF', 'TWAALF', 'TWAALF', 'TWAALF', undefined, undefined, 'UUR', 'UUR', 'UUR']
      ];

      keys.add('HET');
      keys.add('IS');

      let hr = hours % 12 || 12;
      if (minutes >= 20) {
        hr = (hr % 12) + 1;
      }

      let minPhrase = '';
      if (roundedMins === 0) {
        keys.add('UUR');
      } else if (roundedMins === 5) {
        keys.add('VIJF_MIN');
        keys.add('OVER_1');
        minPhrase = 'vijf over';
      } else if (roundedMins === 10) {
        keys.add('TIEN_MIN');
        keys.add('OVER_1');
        minPhrase = 'tien over';
      } else if (roundedMins === 15) {
        keys.add('KWART');
        keys.add('OVER_2');
        minPhrase = 'kwart over';
      } else if (roundedMins === 20) {
        keys.add('TIEN_MIN');
        keys.add('VOOR_2');
        keys.add('HALF');
        minPhrase = 'tien voor half';
      } else if (roundedMins === 25) {
        keys.add('VIJF_MIN');
        keys.add('VOOR_2');
        keys.add('HALF');
        minPhrase = 'vijf voor half';
      } else if (roundedMins === 30) {
        keys.add('HALF');
        minPhrase = 'half';
      } else if (roundedMins === 35) {
        keys.add('VIJF_MIN');
        keys.add('OVER_1');
        keys.add('HALF');
        minPhrase = 'vijf over half';
      } else if (roundedMins === 40) {
        keys.add('TIEN_MIN');
        keys.add('OVER_1');
        keys.add('HALF');
        minPhrase = 'tien over half';
      } else if (roundedMins === 45) {
        keys.add('KWART');
        keys.add('VOOR_2');
        minPhrase = 'kwart voor';
      } else if (roundedMins === 50) {
        keys.add('TIEN_MIN');
        keys.add('VOOR_1');
        minPhrase = 'tien voor';
      } else if (roundedMins === 55) {
        keys.add('VIJF_MIN');
        keys.add('VOOR_1');
        minPhrase = 'vijf voor';
      }

      const hrKeys: Record<number, string> = {
        1: 'EEN', 2: 'TWEE', 3: 'DRIE', 4: 'VIER', 5: 'VIJF_UUR',
        6: 'ZES', 7: 'ZEVEN', 8: 'ACHT', 9: 'NEGEN', 10: 'TIEN_UUR', 11: 'ELF', 12: 'TWAALF'
      };
      const hrNames: Record<number, string> = {
        1: 'één', 2: 'twee', 3: 'drie', 4: 'vier', 5: 'vijf',
        6: 'zes', 7: 'zeven', 8: 'acht', 9: 'negen', 10: 'tien', 11: 'elf', 12: 'twaalf'
      };

      if (hrKeys[hr]) keys.add(hrKeys[hr]);

      sentence = `Het is ${minPhrase ? minPhrase + ' ' : ''}${hrNames[hr]}${roundedMins === 0 ? ' uur' : ''}`;

      const grid: Cell[][] = rawMatrix.map((row, r) =>
        row.map((char, c) => ({
          char,
          key: keyMapping[r] ? keyMapping[r][c] : undefined,
          r,
          c
        }))
      );
      return { matrixData: grid, activeKeys: keys, timeSentence: sentence };
    }

    // ================= ENGLISH (EN) =================
    if (clockLang === 'en') {
      const rawMatrix: string[][] = [
        ['I', 'T', 'L', 'I', 'S', 'A', 'S', 'A', 'M', 'P', 'M'],
        ['A', 'C', 'Q', 'U', 'A', 'R', 'T', 'E', 'R', 'D', 'C'],
        ['T', 'W', 'E', 'N', 'T', 'Y', 'F', 'I', 'V', 'E', 'X'],
        ['H', 'A', 'L', 'F', 'B', 'T', 'E', 'N', 'F', 'T', 'O'],
        ['P', 'A', 'S', 'T', 'E', 'R', 'U', 'N', 'I', 'N', 'E'],
        ['O', 'N', 'E', 'S', 'I', 'X', 'T', 'H', 'R', 'E', 'E'],
        ['F', 'O', 'U', 'R', 'F', 'I', 'V', 'E', 'T', 'W', 'O'],
        ['E', 'I', 'G', 'H', 'T', 'E', 'L', 'E', 'V', 'E', 'N'],
        ['S', 'E', 'V', 'E', 'N', 'T', 'W', 'E', 'L', 'V', 'E'],
        ['T', 'E', 'N', 'S', 'E', 'O', 'C', 'L', 'O', 'C', 'K']
      ];

      const keyMapping: (string | undefined)[][] = [
        ['IT', 'IT', undefined, 'IS', 'IS', undefined, undefined, undefined, undefined, undefined, undefined],
        ['A', undefined, 'QUARTER', 'QUARTER', 'QUARTER', 'QUARTER', 'QUARTER', 'QUARTER', 'QUARTER', undefined, undefined],
        ['TWENTY', 'TWENTY', 'TWENTY', 'TWENTY', 'TWENTY', 'TWENTY', 'FIVE_MIN', 'FIVE_MIN', 'FIVE_MIN', 'FIVE_MIN', undefined],
        ['HALF', 'HALF', 'HALF', 'HALF', undefined, 'TEN_MIN', 'TEN_MIN', 'TEN_MIN', undefined, 'TO', 'TO'],
        ['PAST', 'PAST', 'PAST', 'PAST', undefined, undefined, undefined, 'NINE', 'NINE', 'NINE', 'NINE'],
        ['ONE', 'ONE', 'ONE', 'SIX', 'SIX', 'SIX', 'THREE', 'THREE', 'THREE', 'THREE', 'THREE'],
        ['FOUR', 'FOUR', 'FOUR', 'FOUR', 'FIVE_HR', 'FIVE_HR', 'FIVE_HR', 'FIVE_HR', 'TWO', 'TWO', 'TWO'],
        ['EIGHT', 'EIGHT', 'EIGHT', 'EIGHT', 'EIGHT', 'ELEVEN', 'ELEVEN', 'ELEVEN', 'ELEVEN', 'ELEVEN', 'ELEVEN'],
        ['SEVEN', 'SEVEN', 'SEVEN', 'SEVEN', 'SEVEN', 'TWELVE', 'TWELVE', 'TWELVE', 'TWELVE', 'TWELVE', 'TWELVE'],
        ['TEN_HR', 'TEN_HR', 'TEN_HR', undefined, undefined, 'OCLOCK', 'OCLOCK', 'OCLOCK', 'OCLOCK', 'OCLOCK', 'OCLOCK']
      ];

      keys.add('IT');
      keys.add('IS');

      let hr = hours % 12 || 12;
      let isTo = false;

      if (roundedMins === 0) {
        keys.add('OCLOCK');
        sentence = `It is ${getEnHourName(hr)} o'clock`;
      } else if (roundedMins === 5) {
        keys.add('FIVE_MIN');
        keys.add('PAST');
        sentence = `It is five past ${getEnHourName(hr)}`;
      } else if (roundedMins === 10) {
        keys.add('TEN_MIN');
        keys.add('PAST');
        sentence = `It is ten past ${getEnHourName(hr)}`;
      } else if (roundedMins === 15) {
        keys.add('A');
        keys.add('QUARTER');
        keys.add('PAST');
        sentence = `It is a quarter past ${getEnHourName(hr)}`;
      } else if (roundedMins === 20) {
        keys.add('TWENTY');
        keys.add('PAST');
        sentence = `It is twenty past ${getEnHourName(hr)}`;
      } else if (roundedMins === 25) {
        keys.add('TWENTY');
        keys.add('FIVE_MIN');
        keys.add('PAST');
        sentence = `It is twenty-five past ${getEnHourName(hr)}`;
      } else if (roundedMins === 30) {
        keys.add('HALF');
        keys.add('PAST');
        sentence = `It is half past ${getEnHourName(hr)}`;
      } else if (roundedMins === 35) {
        keys.add('TWENTY');
        keys.add('FIVE_MIN');
        keys.add('TO');
        isTo = true;
        sentence = `It is twenty-five to ${getEnHourName((hr % 12) + 1)}`;
      } else if (roundedMins === 40) {
        keys.add('TWENTY');
        keys.add('TO');
        isTo = true;
        sentence = `It is twenty to ${getEnHourName((hr % 12) + 1)}`;
      } else if (roundedMins === 45) {
        keys.add('A');
        keys.add('QUARTER');
        keys.add('TO');
        isTo = true;
        sentence = `It is a quarter to ${getEnHourName((hr % 12) + 1)}`;
      } else if (roundedMins === 50) {
        keys.add('TEN_MIN');
        keys.add('TO');
        isTo = true;
        sentence = `It is ten to ${getEnHourName((hr % 12) + 1)}`;
      } else if (roundedMins === 55) {
        keys.add('FIVE_MIN');
        keys.add('TO');
        isTo = true;
        sentence = `It is five to ${getEnHourName((hr % 12) + 1)}`;
      }

      const activeHr = isTo ? (hr % 12) + 1 : hr;
      const hrKeyMap: Record<number, string> = {
        1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE_HR',
        6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN_HR', 11: 'ELEVEN', 12: 'TWELVE'
      };
      if (hrKeyMap[activeHr]) keys.add(hrKeyMap[activeHr]);

      const grid: Cell[][] = rawMatrix.map((row, r) =>
        row.map((char, c) => ({
          char,
          key: keyMapping[r] ? keyMapping[r][c] : undefined,
          r,
          c
        }))
      );
      return { matrixData: grid, activeKeys: keys, timeSentence: sentence };
    }

    // ================= GERMAN (DE) =================
    if (clockLang === 'de') {
      const rawMatrix: string[][] = [
        ['E', 'S', 'K', 'I', 'S', 'T', 'A', 'F', 'Ü', 'N', 'F'],
        ['Z', 'E', 'H', 'N', 'Z', 'W', 'A', 'N', 'Z', 'I', 'G'],
        ['D', 'R', 'E', 'I', 'V', 'I', 'E', 'R', 'T', 'E', 'L'],
        ['V', 'O', 'R', 'F', 'U', 'N', 'K', 'N', 'A', 'C', 'H'],
        ['H', 'A', 'L', 'B', 'A', 'E', 'L', 'F', 'Ü', 'N', 'F'],
        ['E', 'I', 'N', 'S', 'X', 'A', 'M', 'Z', 'W', 'E', 'I'],
        ['D', 'R', 'E', 'I', 'A', 'U', 'J', 'V', 'I', 'E', 'R'],
        ['S', 'E', 'C', 'H', 'S', 'N', 'L', 'A', 'C', 'H', 'T'],
        ['S', 'I', 'E', 'B', 'E', 'N', 'Z', 'W', 'Ö', 'L', 'F'],
        ['Z', 'E', 'H', 'N', 'E', 'U', 'N', 'E', 'U', 'H', 'R']
      ];

      const keyMapping: (string | undefined)[][] = [
        ['ES', 'ES', undefined, 'IST', 'IST', 'IST', undefined, 'FÜNF_MIN', 'FÜNF_MIN', 'FÜNF_MIN', 'FÜNF_MIN'],
        ['ZEHN_MIN', 'ZEHN_MIN', 'ZEHN_MIN', 'ZEHN_MIN', 'ZWANZIG', 'ZWANZIG', 'ZWANZIG', 'ZWANZIG', 'ZWANZIG', 'ZWANZIG', 'ZWANZIG'],
        ['DREI_VIERTEL', 'DREI_VIERTEL', 'DREI_VIERTEL', 'DREI_VIERTEL', 'VIERTEL', 'VIERTEL', 'VIERTEL', 'VIERTEL', 'VIERTEL', 'VIERTEL', 'VIERTEL'],
        ['VOR', 'VOR', 'VOR', undefined, undefined, undefined, undefined, 'NACH', 'NACH', 'NACH', 'NACH'],
        ['HALB', 'HALB', 'HALB', 'HALB', undefined, 'ELF', 'ELF', 'ELF', 'FÜNF_HR', 'FÜNF_HR', 'FÜNF_HR'],
        ['EINS', 'EINS', 'EINS', 'EINS', undefined, undefined, undefined, 'ZWEI', 'ZWEI', 'ZWEI', 'ZWEI'],
        ['DREI_HR', 'DREI_HR', 'DREI_HR', 'DREI_HR', undefined, undefined, undefined, 'VIER', 'VIER', 'VIER', 'VIER'],
        ['SECHS', 'SECHS', 'SECHS', 'SECHS', 'SECHS', undefined, undefined, 'ACHT', 'ACHT', 'ACHT', 'ACHT'],
        ['SIEBEN', 'SIEBEN', 'SIEBEN', 'SIEBEN', 'SIEBEN', 'SIEBEN', 'ZWÖLF', 'ZWÖLF', 'ZWÖLF', 'ZWÖLF', 'ZWÖLF'],
        ['ZEHN_HR', 'ZEHN_HR', 'ZEHN_HR', 'ZEHN_HR', 'NEUN', 'NEUN', 'NEUN', 'NEUN', 'UHR', 'UHR', 'UHR']
      ];

      keys.add('ES');
      keys.add('IST');

      let hr = hours % 12 || 12;
      let nextHr = (hr % 12) + 1;
      let targetHr = hr;

      if (roundedMins === 0) {
        keys.add('UHR');
        sentence = `Es ist ${getDeHourName(hr, true)} Uhr`;
      } else if (roundedMins === 5) {
        keys.add('FÜNF_MIN');
        keys.add('NACH');
        sentence = `Es ist fünf nach ${getDeHourName(hr, false)}`;
      } else if (roundedMins === 10) {
        keys.add('ZEHN_MIN');
        keys.add('NACH');
        sentence = `Es ist zehn nach ${getDeHourName(hr, false)}`;
      } else if (roundedMins === 15) {
        keys.add('VIERTEL');
        keys.add('NACH');
        sentence = `Es ist Viertel nach ${getDeHourName(hr, false)}`;
      } else if (roundedMins === 20) {
        keys.add('ZEHN_MIN');
        keys.add('VOR');
        keys.add('HALB');
        targetHr = nextHr;
        sentence = `Es ist zehn vor halb ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 25) {
        keys.add('FÜNF_MIN');
        keys.add('VOR');
        keys.add('HALB');
        targetHr = nextHr;
        sentence = `Es ist fünf vor halb ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 30) {
        keys.add('HALB');
        targetHr = nextHr;
        sentence = `Es ist halb ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 35) {
        keys.add('FÜNF_MIN');
        keys.add('NACH');
        keys.add('HALB');
        targetHr = nextHr;
        sentence = `Es ist fünf nach halb ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 40) {
        keys.add('ZEHN_MIN');
        keys.add('NACH');
        keys.add('HALB');
        targetHr = nextHr;
        sentence = `Es ist zehn nach halb ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 45) {
        keys.add('VIERTEL');
        keys.add('VOR');
        targetHr = nextHr;
        sentence = `Es ist Viertel vor ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 50) {
        keys.add('ZEHN_MIN');
        keys.add('VOR');
        targetHr = nextHr;
        sentence = `Es ist zehn vor ${getDeHourName(nextHr, false)}`;
      } else if (roundedMins === 55) {
        keys.add('FÜNF_MIN');
        keys.add('VOR');
        targetHr = nextHr;
        sentence = `Es ist fünf vor ${getDeHourName(nextHr, false)}`;
      }

      const deHrKeys: Record<number, string> = {
        1: 'EINS', 2: 'ZWEI', 3: 'DREI_HR', 4: 'VIER', 5: 'FÜNF_HR',
        6: 'SECHS', 7: 'SIEBEN', 8: 'ACHT', 9: 'NEUN', 10: 'ZEHN_HR', 11: 'ELF', 12: 'ZWÖLF'
      };
      if (deHrKeys[targetHr]) keys.add(deHrKeys[targetHr]);

      const grid: Cell[][] = rawMatrix.map((row, r) =>
        row.map((char, c) => ({
          char,
          key: keyMapping[r] ? keyMapping[r][c] : undefined,
          r,
          c
        }))
      );
      return { matrixData: grid, activeKeys: keys, timeSentence: sentence };
    }

    // ================= FRENCH (FR) =================
    if (clockLang === 'fr') {
      const rawMatrix: string[][] = [
        ['I', 'L', 'E', 'S', 'T', 'O', 'U', 'N', 'E', 'D', 'E'],
        ['D', 'E', 'U', 'X', 'T', 'R', 'O', 'I', 'S', 'Q', 'U'],
        ['Q', 'U', 'A', 'T', 'R', 'E', 'C', 'I', 'N', 'Q', 'R'],
        ['S', 'I', 'X', 'S', 'E', 'P', 'T', 'H', 'U', 'I', 'T'],
        ['N', 'E', 'U', 'F', 'D', 'I', 'X', 'O', 'N', 'Z', 'E'],
        ['M', 'I', 'D', 'I', 'M', 'I', 'N', 'U', 'I', 'T', 'E'],
        ['H', 'E', 'U', 'R', 'E', 'S', 'E', 'T', 'P', 'I', 'E'],
        ['M', 'O', 'I', 'N', 'S', 'L', 'E', 'D', 'I', 'X', 'T'],
        ['E', 'T', 'Q', 'U', 'A', 'R', 'T', 'D', 'E', 'M', 'I'],
        ['V', 'I', 'N', 'G', 'T', '-', 'C', 'I', 'N', 'Q', 'U']
      ];

      const keyMapping: (string | undefined)[][] = [
        ['IL', 'IL', 'EST', 'EST', 'EST', undefined, 'UNE', 'UNE', 'UNE', undefined, undefined],
        ['DEUX', 'DEUX', 'DEUX', 'DEUX', 'TROIS', 'TROIS', 'TROIS', 'TROIS', 'TROIS', undefined, undefined],
        ['QUATRE', 'QUATRE', 'QUATRE', 'QUATRE', 'QUATRE', 'QUATRE', 'CINQ_HR', 'CINQ_HR', 'CINQ_HR', 'CINQ_HR', undefined],
        ['SIX', 'SIX', 'SIX', 'SEPT', 'SEPT', 'SEPT', 'SEPT', 'HUIT', 'HUIT', 'HUIT', 'HUIT'],
        ['NEUF', 'NEUF', 'NEUF', 'NEUF', 'DIX_HR', 'DIX_HR', 'DIX_HR', 'ONZE', 'ONZE', 'ONZE', 'ONZE'],
        ['MIDI', 'MIDI', 'MIDI', 'MIDI', 'MINUIT', 'MINUIT', 'MINUIT', 'MINUIT', 'MINUIT', 'MINUIT', undefined],
        ['HEURES', 'HEURES', 'HEURES', 'HEURES', 'HEURES', 'HEURES', 'ET', 'ET', undefined, undefined, undefined],
        ['MOINS', 'MOINS', 'MOINS', 'MOINS', 'MOINS', 'LE', 'LE', 'DIX_MIN', 'DIX_MIN', 'DIX_MIN', undefined],
        ['ET', 'ET', 'QUART', 'QUART', 'QUART', 'QUART', 'QUART', 'DEMIE', 'DEMIE', 'DEMIE', 'DEMIE'],
        ['VINGT', 'VINGT', 'VINGT', 'VINGT', 'VINGT', undefined, 'CINQ_MIN', 'CINQ_MIN', 'CINQ_MIN', 'CINQ_MIN', undefined]
      ];

      keys.add('IL');
      keys.add('EST');

      let hr = hours % 12 || 12;
      let isNext = roundedMins >= 35;
      let targetHr = isNext ? (hr % 12) + 1 : hr;

      // Special 12 and 0 in french
      const isMidi = (hours === 12 && !isNext) || (hours === 11 && isNext);
      const isMinuit = (hours === 0 && !isNext) || (hours === 23 && isNext);

      if (isMidi) {
        keys.add('MIDI');
      } else if (isMinuit) {
        keys.add('MINUIT');
      } else {
        const frHrKeys: Record<number, string> = {
          1: 'UNE', 2: 'DEUX', 3: 'TROIS', 4: 'QUATRE', 5: 'CINQ_HR',
          6: 'SIX', 7: 'SEPT', 8: 'HUIT', 9: 'NEUF', 10: 'DIX_HR', 11: 'ONZE', 12: 'DEUX'
        };
        if (frHrKeys[targetHr]) keys.add(frHrKeys[targetHr]);
        keys.add('HEURES');
      }

      if (roundedMins === 5) {
        keys.add('CINQ_MIN');
      } else if (roundedMins === 10) {
        keys.add('DIX_MIN');
      } else if (roundedMins === 15) {
        keys.add('ET');
        keys.add('QUART');
      } else if (roundedMins === 20) {
        keys.add('VINGT');
      } else if (roundedMins === 25) {
        keys.add('VINGT');
        keys.add('CINQ_MIN');
      } else if (roundedMins === 30) {
        keys.add('ET');
        keys.add('DEMIE');
      } else if (roundedMins === 35) {
        keys.add('MOINS');
        keys.add('VINGT');
        keys.add('CINQ_MIN');
      } else if (roundedMins === 40) {
        keys.add('MOINS');
        keys.add('VINGT');
      } else if (roundedMins === 45) {
        keys.add('MOINS');
        keys.add('LE');
        keys.add('QUART');
      } else if (roundedMins === 50) {
        keys.add('MOINS');
        keys.add('DIX_MIN');
      } else if (roundedMins === 55) {
        keys.add('MOINS');
        keys.add('CINQ_MIN');
      }

      sentence = `Il est ${getFrPhrase(hours, roundedMins)}`;

      const grid: Cell[][] = rawMatrix.map((row, r) =>
        row.map((char, c) => ({
          char,
          key: keyMapping[r] ? keyMapping[r][c] : undefined,
          r,
          c
        }))
      );
      return { matrixData: grid, activeKeys: keys, timeSentence: sentence };
    }

    // ================= SPANISH (ES) =================
    // clockLang === 'es'
    const rawMatrix: string[][] = [
      ['E', 'S', 'L', 'A', 'S', 'O', 'N', 'L', 'A', 'S', 'X'],
      ['U', 'N', 'A', 'D', 'O', 'S', 'T', 'R', 'E', 'S', 'C'],
      ['C', 'U', 'A', 'T', 'R', 'O', 'C', 'I', 'N', 'C', 'O'],
      ['S', 'E', 'I', 'S', 'S', 'I', 'E', 'T', 'E', 'P', 'N'],
      ['O', 'C', 'H', 'O', 'N', 'U', 'E', 'V', 'E', 'D', 'E'],
      ['D', 'I', 'E', 'Z', 'O', 'N', 'C', 'E', 'D', 'O', 'C'],
      ['M', 'E', 'D', 'I', 'O', 'D', 'Í', 'A', 'N', 'O', 'C'],
      ['M', 'E', 'N', 'O', 'S', 'Y', 'D', 'I', 'E', 'Z', 'B'],
      ['V', 'E', 'I', 'N', 'T', 'E', 'C', 'I', 'N', 'C', 'O'],
      ['C', 'U', 'A', 'R', 'T', 'O', 'M', 'E', 'D', 'I', 'A']
    ];

    const keyMapping: (string | undefined)[][] = [
      ['ES_LA', 'ES_LA', 'ES_LA', 'ES_LA', 'SON_LAS', 'SON_LAS', 'SON_LAS', 'SON_LAS', 'SON_LAS', 'SON_LAS', undefined],
      ['UNA', 'UNA', 'UNA', 'DOS', 'DOS', 'DOS', 'TRES', 'TRES', 'TRES', 'TRES', undefined],
      ['CUATRO', 'CUATRO', 'CUATRO', 'CUATRO', 'CUATRO', 'CUATRO', 'CINCO_HR', 'CINCO_HR', 'CINCO_HR', 'CINCO_HR', 'CINCO_HR'],
      ['SEIS', 'SEIS', 'SEIS', 'SEIS', 'SIETE', 'SIETE', 'SIETE', 'SIETE', 'SIETE', undefined, undefined],
      ['OCHO', 'OCHO', 'OCHO', 'OCHO', 'NUEVE', 'NUEVE', 'NUEVE', 'NUEVE', 'NUEVE', undefined, undefined],
      ['DIEZ_HR', 'DIEZ_HR', 'DIEZ_HR', 'DIEZ_HR', 'ONCE', 'ONCE', 'ONCE', 'ONCE', 'DOCE', 'DOCE', 'DOCE'],
      ['MEDIODIA', 'MEDIODIA', 'MEDIODIA', 'MEDIODIA', 'MEDIODIA', 'MEDIODIA', 'MEDIODIA', 'MEDIODIA', undefined, undefined, undefined],
      ['MENOS', 'MENOS', 'MENOS', 'MENOS', 'MENOS', 'Y', 'DIEZ_MIN', 'DIEZ_MIN', 'DIEZ_MIN', 'DIEZ_MIN', undefined],
      ['VEINTE', 'VEINTE', 'VEINTE', 'VEINTE', 'VEINTE', 'VEINTE', 'CINCO_MIN', 'CINCO_MIN', 'CINCO_MIN', 'CINCO_MIN', 'CINCO_MIN'],
      ['CUARTO', 'CUARTO', 'CUARTO', 'CUARTO', 'CUARTO', 'CUARTO', 'MEDIA', 'MEDIA', 'MEDIA', 'MEDIA', 'MEDIA']
    ];

    let hr = hours % 12 || 12;
    let isNext = roundedMins >= 35;
    let targetHr = isNext ? (hr % 12) + 1 : hr;

    if (targetHr === 1) {
      keys.add('ES_LA');
      keys.add('UNA');
    } else {
      keys.add('SON_LAS');
      const esHrKeys: Record<number, string> = {
        2: 'DOS', 3: 'TRES', 4: 'CUATRO', 5: 'CINCO_HR', 6: 'SEIS',
        7: 'SIETE', 8: 'OCHO', 9: 'NUEVE', 10: 'DIEZ_HR', 11: 'ONCE', 12: 'DOCE'
      };
      if (esHrKeys[targetHr]) keys.add(esHrKeys[targetHr]);
    }

    if (roundedMins === 5) {
      keys.add('Y');
      keys.add('CINCO_MIN');
    } else if (roundedMins === 10) {
      keys.add('Y');
      keys.add('DIEZ_MIN');
    } else if (roundedMins === 15) {
      keys.add('Y');
      keys.add('CUARTO');
    } else if (roundedMins === 20) {
      keys.add('Y');
      keys.add('VEINTE');
    } else if (roundedMins === 25) {
      keys.add('Y');
      keys.add('VEINTE');
      keys.add('CINCO_MIN');
    } else if (roundedMins === 30) {
      keys.add('Y');
      keys.add('MEDIA');
    } else if (roundedMins === 35) {
      keys.add('MENOS');
      keys.add('VEINTE');
      keys.add('CINCO_MIN');
    } else if (roundedMins === 40) {
      keys.add('MENOS');
      keys.add('VEINTE');
    } else if (roundedMins === 45) {
      keys.add('MENOS');
      keys.add('CUARTO');
    } else if (roundedMins === 50) {
      keys.add('MENOS');
      keys.add('DIEZ_MIN');
    } else if (roundedMins === 55) {
      keys.add('MENOS');
      keys.add('CINCO_MIN');
    }

    sentence = getEsPhrase(hours, roundedMins);

    const grid: Cell[][] = rawMatrix.map((row, r) =>
      row.map((char, c) => ({
        char,
        key: keyMapping[r] ? keyMapping[r][c] : undefined,
        r,
        c
      }))
    );
    return { matrixData: grid, activeKeys: keys, timeSentence: sentence };
  }, [clockLang, hours, minutes]);

  // Frontplate styles
  const getPlateStyles = () => {
    switch (finish) {
      case 'brushed_steel':
        return {
          background: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #475569 100%)',
          border: '1px solid #64748b',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.6)'
        };
      case 'walnut_wood':
        return {
          background: 'linear-gradient(145deg, #2b1810 0%, #1c0f0a 100%)',
          border: '1px solid #78350f',
          boxShadow: 'inset 0 1px 3px rgba(251,191,36,0.1), 0 20px 40px rgba(0,0,0,0.7)'
        };
      case 'minimal_white':
        return {
          background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
          border: '1px solid #cbd5e1',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        };
      case 'copper_rust':
        return {
          background: 'linear-gradient(145deg, #451a03 0%, #1c1917 50%, #064e3b 100%)',
          border: '1px solid #b45309',
          boxShadow: 'inset 0 1px 3px rgba(245,158,11,0.2), 0 20px 40px rgba(0,0,0,0.7)'
        };
      case 'matte_black':
      default:
        return {
          background: 'linear-gradient(145deg, #18181b 0%, #09090b 100%)',
          border: '1px solid #27272a',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.8)'
        };
    }
  };

  const isLightPlate = finish === 'minimal_white';
  const inactiveCharColor = isLightPlate ? 'rgba(148, 163, 184, 0.35)' : 'rgba(255, 255, 255, 0.08)';

  return (
    <div
      className="relative w-full h-full min-h-[380px] flex flex-col items-center justify-between p-4 sm:p-6 rounded-3xl select-none"
      style={{
        backgroundColor: config.bgColor,
        fontFamily: config.fontFamily || 'sans-serif'
      }}
    >
      {/* Top Toolbar Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-3 mb-1 border-b border-white/10 text-xs">
        {/* Language Matrix Switcher */}
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <Globe className="w-3.5 h-3.5 text-sky-400 ml-1 mr-0.5" />
          {(['nl', 'en', 'de', 'fr', 'es'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setClockLang(l)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase transition-all ${
                clockLang === l
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Finish Selector */}
        <div className="flex items-center space-x-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFinish('matte_black')}
              title={t('wordFinishMatteBlack')}
              className={`w-4 h-4 rounded-full bg-zinc-900 border ${
                finish === 'matte_black' ? 'border-sky-400 scale-110 shadow-sm' : 'border-zinc-700'
              }`}
            />
            <button
              onClick={() => setFinish('brushed_steel')}
              title={t('wordFinishBrushedSteel')}
              className={`w-4 h-4 rounded-full bg-slate-400 border ${
                finish === 'brushed_steel' ? 'border-sky-400 scale-110 shadow-sm' : 'border-slate-600'
              }`}
            />
            <button
              onClick={() => setFinish('walnut_wood')}
              title={t('wordFinishWalnut')}
              className={`w-4 h-4 rounded-full bg-amber-900 border ${
                finish === 'walnut_wood' ? 'border-sky-400 scale-110 shadow-sm' : 'border-amber-700'
              }`}
            />
            <button
              onClick={() => setFinish('minimal_white')}
              title={t('wordFinishWhite')}
              className={`w-4 h-4 rounded-full bg-slate-100 border ${
                finish === 'minimal_white' ? 'border-sky-400 scale-110 shadow-sm' : 'border-slate-300'
              }`}
            />
            <button
              onClick={() => setFinish('copper_rust')}
              title={t('wordFinishCopper')}
              className={`w-4 h-4 rounded-full bg-amber-700 border ${
                finish === 'copper_rust' ? 'border-sky-400 scale-110 shadow-sm' : 'border-amber-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* The Physical Clock Frontplate */}
      <div
        className="relative my-auto w-full max-w-[420px] aspect-square p-5 sm:p-7 rounded-2xl flex flex-col justify-between transition-all duration-500"
        style={getPlateStyles()}
      >
        {/* 4 Corner Minute Dots */}
        {showCornerDots && (
          <>
            {/* Top-Left: +1 min */}
            <div
              className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: cornerMinutes >= 1 ? activeLedColor : inactiveCharColor,
                boxShadow:
                  cornerMinutes >= 1 && config.glowEffect ? `0 0 10px ${activeLedColor}` : 'none'
              }}
            />
            {/* Top-Right: +2 mins */}
            <div
              className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: cornerMinutes >= 2 ? activeLedColor : inactiveCharColor,
                boxShadow:
                  cornerMinutes >= 2 && config.glowEffect ? `0 0 10px ${activeLedColor}` : 'none'
              }}
            />
            {/* Bottom-Right: +3 mins */}
            <div
              className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: cornerMinutes >= 3 ? activeLedColor : inactiveCharColor,
                boxShadow:
                  cornerMinutes >= 3 && config.glowEffect ? `0 0 10px ${activeLedColor}` : 'none'
              }}
            />
            {/* Bottom-Left: +4 mins */}
            <div
              className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: cornerMinutes >= 4 ? activeLedColor : inactiveCharColor,
                boxShadow:
                  cornerMinutes >= 4 && config.glowEffect ? `0 0 10px ${activeLedColor}` : 'none'
              }}
            />
          </>
        )}

        {/* 10x11 Character Matrix Grid */}
        <div className="w-full h-full grid grid-rows-10 gap-1 sm:gap-1.5 items-center justify-items-center">
          {matrixData.map((row, rIdx) => (
            <div key={rIdx} className="w-full flex justify-between items-center px-1 sm:px-2">
              {row.map((cell, cIdx) => {
                const isActive = !!cell.key && activeKeys.has(cell.key);
                return (
                  <span
                    key={`${rIdx}-${cIdx}`}
                    className={`font-mono text-center font-bold transition-all duration-500 ${
                      isFullSize ? 'text-base sm:text-2xl' : 'text-xs sm:text-base'
                    }`}
                    style={{
                      color: isActive ? activeLedColor : inactiveCharColor,
                      textShadow:
                        isActive && config.glowEffect
                          ? `0 0 12px ${activeLedColor}, 0 0 24px ${activeLedColor}`
                          : 'none',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    {cell.char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Subtitle Display */}
      {showSubtitle && (
        <div className="mt-3 text-center">
          <p
            className="text-xs sm:text-sm font-medium tracking-wide transition-all"
            style={{ color: activeLedColor }}
          >
            "{timeSentence}"
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {activeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {cornerMinutes > 0 ? ` (+${cornerMinutes} min)` : ''} • QLOCKTWO-Design
          </p>
        </div>
      )}
    </div>
  );
};

// Helper name formatters
function getEnHourName(hr: number): string {
  const names = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return names[hr] || '';
}

function getDeHourName(hr: number, isOclock: boolean): string {
  if (hr === 1) return isOclock ? 'ein' : 'eins';
  const names = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
  return names[hr] || '';
}

function getFrPhrase(hours: number, roundedMins: number): string {
  const hr = hours % 12 || 12;
  const isNext = roundedMins >= 35;
  const targetHr = isNext ? (hr % 12) + 1 : hr;
  const hrName = targetHr === 1 ? 'une heure' : `${targetHr} heures`;

  if (targetHr === 12) {
    return 'midi';
  }
  return hrName;
}

function getEsPhrase(hours: number, roundedMins: number): string {
  const hr = hours % 12 || 12;
  const isNext = roundedMins >= 35;
  const targetHr = isNext ? (hr % 12) + 1 : hr;
  const prefix = targetHr === 1 ? 'Es la una' : `Son las ${targetHr}`;

  if (roundedMins === 0) return `${prefix} en punto`;
  if (roundedMins === 15) return `${prefix} y cuarto`;
  if (roundedMins === 30) return `${prefix} y media`;
  if (roundedMins === 45) return `${prefix} menos cuarto`;
  return `${prefix} y ${roundedMins} minutos`;
}
