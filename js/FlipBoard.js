/**
 * FlipBoard — manages the grid of flap modules.
 * Handles message distribution, row/column layout, and staggered animation timing.
 * Computes sizing dynamically from font measurement.
 */

import { Flap, CHARS_FULL, CHARS_DIGITS } from './Flap.js';
import { Sound } from './Sound.js';

const CHARS = CHARS_FULL;

const SIZE_PRESETS = {
  large:  { rows: 1 },
  medium: { rows: 3 },
  small:  { rows: 5 },
};

export class FlipBoard {
  constructor(container, config = {}) {
    this.container = container;
    this.size = config.size || 'large';
    this.sound = new Sound(config.sound || 'mechanical');
    this.message = config.message || '';
    this.flaps = [];
    this.rows = SIZE_PRESETS[this.size].rows;
    this.cols = 0; // computed dynamically
    this.staggerMs = 40;
    this.speed = config.speed || 'fast';
  }

  static SPEEDS = {
    slow:      { flipMs: 300, staggerMs: 80 },
    normal:    { flipMs: 180, staggerMs: 55 },
    fast:      { flipMs: 100, staggerMs: 35 },
    ludicrous: { flipMs: 50,  staggerMs: 18 },
  };

  /** Set the flip speed. Updates CSS duration and JS stagger. */
  setSpeed(speed) {
    if (!(speed in FlipBoard.SPEEDS)) return;
    this.speed = speed;
    const s = FlipBoard.SPEEDS[speed];
    this.staggerMs = s.staggerMs;
    this.container.style.setProperty('--flip-duration', s.flipMs + 'ms');
  }

  /** Build the DOM grid. Waits for font to load, measures chars, computes layout. */
  async init() {
    this.container.setAttribute('data-size', this.size);
    this.container.innerHTML = '';
    this.flaps = [];

    // Wait for Barlow to be loaded so canvas measurement is accurate
    await document.fonts.ready;

    // Compute all sizing from font measurement
    const sizing = this._computeSizing();
    this.cols = sizing.cols;

    // Apply computed sizing as CSS custom properties
    this.container.style.setProperty('--flap-width', sizing.flapWidth + 'px');
    this.container.style.setProperty('--flap-height', sizing.flapHeight + 'px');
    this.container.style.setProperty('--flap-font-size', sizing.fontSize + 'px');
    this.container.style.setProperty('--flap-col-gap', sizing.colGap + 'px');
    this.container.style.setProperty('--flap-gap', sizing.rowGap + 'px');

    // Build grid
    for (let r = 0; r < this.rows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board__row';
      const rowFlaps = [];

      for (let c = 0; c < this.cols; c++) {
        const flapEl = Flap.createElement();
        rowEl.appendChild(flapEl);
        rowFlaps.push(new Flap(flapEl, {
          onFlipStart: () => this.sound.playWhoosh(),
          onFlipEnd: () => this.sound.playClick(),
        }));
      }

      this.container.appendChild(rowEl);
      this.flaps.push(rowFlaps);
    }

    this._initSoundOnGesture();
    this.setSpeed(this.speed);
    return this;
  }

  /**
   * Compute flap dimensions from viewport size and font measurement.
   * Flow: viewport → flapHeight → fontSize → measure widest char → flapWidth → cols
   */
  _computeSizing() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const debugBarH = 52;
    const boardPadV = 10;
    const boardPadH = 20;
    const rowGap = Math.max(4, Math.round(vh * 0.006));
    const colGap = Math.max(2, Math.round(vw * 0.002));

    const availH = vh - debugBarH - boardPadV * 2;
    const availW = vw - boardPadH * 2;

    const totalRowGaps = (this.rows - 1) * rowGap;
    const flapHeight = Math.floor((availH - totalRowGaps) / this.rows);
    const fontSize = Math.floor(flapHeight * 0.72);

    // Measure widest character using Canvas 2D
    const maxCharWidth = this._measureWidestChar(fontSize);
    const flapWidth = Math.ceil(maxCharWidth * 1.18); // 18% breathing room

    // Derive column count from available width
    const cols = Math.floor(availW / (flapWidth + colGap));

    return { flapWidth, flapHeight, fontSize, cols, colGap, rowGap };
  }

  /** Measure the widest character in the charset at a given font size (px). */
  _measureWidestChar(fontSizePx) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `600 ${fontSizePx}px 'Barlow Semi Condensed', sans-serif`;

    let maxWidth = 0;
    for (const ch of CHARS) {
      if (ch === ' ') continue;
      maxWidth = Math.max(maxWidth, ctx.measureText(ch).width);
    }
    return maxWidth;
  }

  /**
   * When true, flaps auto-switch to CHARS_DIGITS for digit/colon positions
   * and CHARS_FULL for letter positions. Set by time/date modes.
   */
  smartCharsets = false;

  /**
   * Set the displayed message.
   * @param {string} msg
   * @param {object} opts
   * @param {boolean} opts.stagger — whether to stagger flap starts (default true)
   */
  setMessage(msg, { stagger = true } = {}) {
    this.message = (msg || '').toUpperCase();
    const lines = this._layoutMessage(this.message);
    const isDigit = /[0-9:]/;

    for (let r = 0; r < this.rows; r++) {
      const line = (lines[r] || '').padEnd(this.cols, ' ');
      for (let c = 0; c < this.cols; c++) {
        const char = line[c];
        const flap = this.flaps[r][c];

        if (this.smartCharsets) {
          flap.setCharset(isDigit.test(char) ? CHARS_DIGITS : CHARS_FULL);
        }

        const delay = stagger
          ? c * this.staggerMs + r * this.cols * this.staggerMs * 0.4
          : 0;
        flap.setTarget(char, delay);
      }
    }
  }

  /** Reset all flaps to full charset. */
  resetCharsets() {
    for (const row of this.flaps) {
      for (const flap of row) flap.setCharset(CHARS_FULL);
    }
  }

  /** Layout message into rows, centered horizontally and vertically. */
  _layoutMessage(msg) {
    let rawLines = msg.split('\n');

    const wrapped = [];
    for (const line of rawLines) {
      if (line.length <= this.cols) {
        wrapped.push(line);
      } else {
        let remaining = line;
        while (remaining.length > 0) {
          if (remaining.length <= this.cols) {
            wrapped.push(remaining);
            break;
          }
          let breakIdx = remaining.lastIndexOf(' ', this.cols);
          if (breakIdx <= 0) breakIdx = this.cols;
          wrapped.push(remaining.slice(0, breakIdx));
          remaining = remaining.slice(breakIdx).trimStart();
        }
      }
    }

    const lines = wrapped.slice(0, this.rows);

    const centered = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.length >= this.cols) return trimmed.slice(0, this.cols);
      const padTotal = this.cols - trimmed.length;
      const padLeft = Math.floor(padTotal / 2);
      return ' '.repeat(padLeft) + trimmed + ' '.repeat(padTotal - padLeft);
    });

    const vertPad = Math.floor((this.rows - centered.length) / 2);
    const result = [];
    for (let i = 0; i < this.rows; i++) {
      const lineIdx = i - vertPad;
      result.push(lineIdx >= 0 && lineIdx < centered.length ? centered[lineIdx] : '');
    }

    return result;
  }

  /** Change the board size mode. Rebuilds the grid. */
  async setSize(size) {
    if (!(size in SIZE_PRESETS)) return;
    this.size = size;
    this.rows = SIZE_PRESETS[size].rows;
    await this.init();
    if (this.message) {
      this.setMessage(this.message);
    }
  }

  /** Initialize AudioContext on first user gesture. */
  _initSoundOnGesture() {
    const handler = () => {
      this.sound.init();
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
      document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    document.addEventListener('touchstart', handler);
    this.sound.init();
  }
}
