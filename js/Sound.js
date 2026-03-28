/**
 * Sound manager for split-flap click sounds.
 * Each flip triggers a quiet whoosh (start) + click (end).
 * Many simultaneous flaps naturally sum to a louder cacophony.
 */
export class Sound {
  static VARIANTS = ['mechanical', 'whoosh', 'soft', 'clatter'];

  constructor(variant = 'mechanical') {
    this.variant = variant;
    this.ctx = null;
    this.noiseShort = null;  // 8ms
    this.noiseLong = null;   // 20ms
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.noiseShort = this._makeNoise(0.008);
      this.noiseLong = this._makeNoise(0.020);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  _makeNoise(sec) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * sec), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Quiet swoosh at the START of a flip.
   * Jitter is applied in audio-time (microsecond precision, no setTimeout quantization).
   */
  playWhoosh() {
    if (this.variant === 'off' || !this.initialized) return;
    const now = this.ctx.currentTime + Math.random() * 0.035; // 0–35ms jitter

    switch (this.variant) {
      case 'mechanical': this._whooshMechanical(now); break;
      case 'whoosh':     this._whooshSweep(now); break;
      case 'soft':       this._whooshSoft(now); break;
      case 'clatter':    this._whooshClatter(now); break;
    }
  }

  /** Short clack at the END of a flip (the "landing"). */
  playClick() {
    if (this.variant === 'off' || !this.initialized) return;
    const now = this.ctx.currentTime + Math.random() * 0.035; // 0–35ms jitter

    switch (this.variant) {
      case 'mechanical': this._clickMechanical(now); break;
      case 'whoosh':     this._clickWhoosh(now); break;
      case 'soft':       this._clickSoft(now); break;
      case 'clatter':    this._clickClatter(now); break;
    }
  }

  // ─── Mechanical ──────────────────────────────────────────────

  _whooshMechanical(now) {
    this._playNoise(this.noiseLong, {
      now, duration: 0.015,
      filterType: 'highpass', filterFreq: 3000, filterQ: 0.5,
      volume: 0.15, decay: 0.012,
    });
  }

  _clickMechanical(now) {
    this._playNoise(this.noiseShort, {
      now, duration: 0.008,
      filterType: 'bandpass', filterFreq: 2200, filterQ: 2,
      volume: 0.35, decay: 0.005,
    });
  }

  // ─── Whoosh (swoopy) ─────────────────────────────────────────

  _whooshSweep(now) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseLong;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(5000, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.018);
    filter.Q.value = 0.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.020);
  }

  _clickWhoosh(now) {
    this._playNoise(this.noiseShort, {
      now, duration: 0.008,
      filterType: 'bandpass', filterFreq: 1800, filterQ: 3,
      volume: 0.35, decay: 0.006,
    });
  }

  // ─── Soft (plastic) ──────────────────────────────────────────

  _whooshSoft(now) {
    this._playNoise(this.noiseLong, {
      now, duration: 0.012,
      filterType: 'lowpass', filterFreq: 2000, filterQ: 0.5,
      volume: 0.10, decay: 0.010,
    });
  }

  _clickSoft(now) {
    this._playNoise(this.noiseShort, {
      now, duration: 0.008,
      filterType: 'bandpass', filterFreq: 1000, filterQ: 1,
      volume: 0.25, decay: 0.008,
    });
  }

  // ─── Clatter (metallic) ──────────────────────────────────────

  _whooshClatter(now) {
    this._playNoise(this.noiseLong, {
      now, duration: 0.012,
      filterType: 'highpass', filterFreq: 4000, filterQ: 1,
      volume: 0.15, decay: 0.010,
    });
  }

  _clickClatter(now) {
    this._playNoise(this.noiseShort, {
      now, duration: 0.006,
      filterType: 'bandpass', filterFreq: 3800, filterQ: 5,
      volume: 0.35, decay: 0.004,
    });
  }

  // ─── Shared helper ───────────────────────────────────────────

  _playNoise(buffer, { now, duration, filterType, filterFreq, filterQ, volume, decay }) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + duration);
  }

  setVariant(variant) {
    if (Sound.VARIANTS.includes(variant) || variant === 'off') {
      this.variant = variant;
    }
  }
}
