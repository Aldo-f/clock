// Advanced Web Audio API synthesizer for Clocky
// Includes mechanical ticks, digital blips, hourly chimes, generative ambient soundscapes & speech synthesis

let audioCtx: AudioContext | null = null;
let ambientGainNode: GainNode | null = null;
let activeAmbientNodes: { stop: () => void }[] = [];
let currentAmbientType: string = 'none';

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Single sound effect playback
export function playClockSound(type: string, volume: number = 0.15) {
  if (type === 'none' || volume <= 0) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'soft_tick') {
      // Wood / mechanical soft tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'digital_beep') {
      // Short high digital blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    } else if (type === 'gear_click' || type === 'split_flap') {
      // Mechanical snap / Split flap click
      const bufferSize = Math.floor(ctx.sampleRate * 0.035);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = type === 'split_flap' ? 1800 : 2600;
      filter.Q.value = 4.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'oscilloscope_blip') {
      // Pure sine blip with subtle frequency sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'marble_roll') {
      // Marble clink on metal track
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'water_drop') {
      // Droplet sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.06);
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'space_hum') {
      // Cosmic ambient pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {}
}

// Play Hourly Chimes (Westminster Quarters, Tibetan Singing Bowl, Grandfather Gong, Cuckoo)
export function playChimeSound(chimeType: string, volume: number = 0.3) {
  if (!chimeType || chimeType === 'none' || volume <= 0) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (chimeType === 'westminster') {
      // Westminster chime 4-note motif: E4, G#4, F#4, B3 (330, 415, 370, 247 Hz)
      const notes = [
        { freq: 330, time: 0.0, dur: 0.7 },
        { freq: 415, time: 0.75, dur: 0.7 },
        { freq: 370, time: 1.5, dur: 0.7 },
        { freq: 247, time: 2.25, dur: 1.6 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(freq * 2.02, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
        oscHarmonic.start(now + time);
        oscHarmonic.stop(now + time + dur);
      });
    } else if (chimeType === 'singing_bowl') {
      // Resonant harmonic Tibetan Singing Bowl with beating frequencies
      const freqs = [432, 434.5, 864, 1296];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        const amp = (volume * 0.35) / (idx + 1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 4.5);
      });
    } else if (chimeType === 'grandfather') {
      // Deep resonant bronze clock gong
      const fundamentals = [130.81, 131.5, 261.63, 523.25];
      fundamentals.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.5);
      });
    } else if (chimeType === 'cuckoo') {
      // Two-tone cuckoo call: High (659Hz / E5) then Low (523Hz / C5)
      const tones = [
        { freq: 659, time: 0.0, dur: 0.22 },
        { freq: 523, time: 0.28, dur: 0.45 }
      ];

      tones.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.45, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    }
  } catch (e) {}
}

// Stop any currently running continuous ambient generator
export function stopAmbientSound() {
  if (activeAmbientNodes.length > 0) {
    activeAmbientNodes.forEach((node) => {
      try {
        node.stop();
      } catch (e) {}
    });
    activeAmbientNodes = [];
  }
  currentAmbientType = 'none';
}

// Start generative real-time ambient soundscapes
export function startAmbientSound(type: string, volume: number = 0.25) {
  if (type === currentAmbientType && activeAmbientNodes.length > 0) {
    // Update volume if already playing
    if (ambientGainNode && audioCtx) {
      ambientGainNode.gain.setValueAtTime(Math.max(0.001, volume * 0.5), audioCtx.currentTime);
    }
    return;
  }

  stopAmbientSound();
  if (!type || type === 'none' || volume <= 0) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    currentAmbientType = type;

    ambientGainNode = ctx.createGain();
    ambientGainNode.gain.setValueAtTime(0.001, now);
    ambientGainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 1.5);
    ambientGainNode.connect(ctx.destination);

    if (type === 'rain') {
      // Pink/Brown noise filtered to simulate continuous gentle rain on window
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1400;

      noiseSource.connect(lowpass);
      lowpass.connect(ambientGainNode);
      noiseSource.start();

      activeAmbientNodes.push({
        stop: () => {
          noiseSource.stop();
          noiseSource.disconnect();
        }
      });
    } else if (type === 'synth432') {
      // Calming 432Hz ambient chord drone (432Hz, 216Hz, 540Hz harmonic major)
      const freqs = [108, 216, 432, 540, 648];
      const oscillators: OscillatorNode[] = [];

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const subGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Slow subtle pitch detune for warmth
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.1 + i * 0.05;
        lfoGain.gain.value = 1.2;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        subGain.gain.value = 0.25 / (i + 1);
        osc.connect(subGain);
        subGain.connect(ambientGainNode!);
        osc.start();

        oscillators.push(osc, lfo);
      });

      activeAmbientNodes.push({
        stop: () => {
          oscillators.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch (e) {}
          });
        }
      });
    } else if (type === 'brown_noise') {
      // Warm, deep brownian focus noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Boost amplitude
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      noiseSource.connect(filter);
      filter.connect(ambientGainNode);
      noiseSource.start();

      activeAmbientNodes.push({
        stop: () => {
          noiseSource.stop();
          noiseSource.disconnect();
        }
      });
    } else if (type === 'forest') {
      // Filtered gentle wind noise with intermittent peaceful crickets / chimes
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 1.5;

      noise.connect(filter);
      filter.connect(ambientGainNode);
      noise.start();

      activeAmbientNodes.push({
        stop: () => {
          noise.stop();
          noise.disconnect();
        }
      });
    } else if (type === 'cosmic_hum') {
      // Deep sub-harmonic space drone (55Hz, 110Hz, 165Hz) with stereo panning
      const freqs = [55, 110, 165];
      const oscs: OscillatorNode[] = [];

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(ambientGainNode!);
        osc.start();
        oscs.push(osc);
      });

      activeAmbientNodes.push({
        stop: () => {
          oscs.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch (e) {}
          });
        }
      });
    }
  } catch (err) {}
}

// Speak the current time naturally in the chosen language using Web Speech API
export function speakCurrentTime(date: Date, lang: string = 'en', timeZone?: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any existing speech

    let hours = date.getHours();
    let minutes = date.getMinutes();

    if (timeZone && timeZone !== 'local') {
      try {
        const str = date.toLocaleTimeString('en-US', { timeZone, hour12: false, hour: 'numeric', minute: 'numeric' });
        const [h, m] = str.split(':').map(Number);
        hours = h;
        minutes = m;
      } catch (e) {}
    }

    let text = '';
    const voiceLang = lang === 'nl' ? 'nl-NL' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US';

    if (lang === 'nl') {
      if (minutes === 0) {
        text = `Het is nu ${hours} uur.`;
      } else if (minutes === 15) {
        text = `Het is kwart over ${hours}.`;
      } else if (minutes === 30) {
        text = `Het is half ${(hours % 12) + 1}.`;
      } else if (minutes === 45) {
        text = `Het is kwart voor ${(hours % 12) + 1}.`;
      } else {
        text = `Het is ${hours} uur en ${minutes} minuten.`;
      }
    } else if (lang === 'de') {
      text = `Es ist ${hours} Uhr ${minutes === 0 ? '' : minutes}.`;
    } else if (lang === 'fr') {
      text = `Il est ${hours} heures ${minutes === 0 ? '' : minutes}.`;
    } else if (lang === 'es') {
      text = `Son las ${hours} y ${minutes === 0 ? 'en punto' : minutes}.`;
    } else {
      // English
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const minStr = minutes < 10 && minutes > 0 ? `oh ${minutes}` : minutes === 0 ? "o'clock" : minutes;
      text = `It is ${h12} ${minStr} ${ampm}.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(lang)) || voices.find((v) => v.lang.includes(lang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}
