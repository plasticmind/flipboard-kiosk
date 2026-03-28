/**
 * Individual split-flap character module.
 * Manages one character cell with sequential cycling animation.
 * Supports configurable charset (e.g. digits-only for clock positions).
 */

export const CHARS_FULL = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
export const CHARS_DIGITS = ' 0123456789:';

export class Flap {
  /**
   * @param {HTMLElement} el — the .flap container element
   * @param {object} opts
   * @param {function} opts.onFlipStart — called when a flip animation begins
   * @param {function} opts.onFlipEnd — called when a flip animation lands
   */
  constructor(el, opts = {}) {
    this.el = el;
    this.onFlipStart = opts.onFlipStart || null;
    this.onFlipEnd = opts.onFlipEnd || null;
    this.chars = CHARS_FULL;
    this.currentChar = ' ';
    this.targetChar = ' ';
    this.isFlipping = false;
    this.charIndex = 0;
    this._pendingTimeout = null;
    this._cancelled = false;
    this._inAnimEnd = false; // guard against re-entrant animationend

    // Cache DOM references
    this.topText = el.querySelector('.flap__top .flap__text');
    this.bottomText = el.querySelector('.flap__bottom .flap__text');
    this.cardFrontText = el.querySelector('.flap__card-front .flap__text');
    this.cardBackText = el.querySelector('.flap__card-back .flap__text');
    this.card = el.querySelector('.flap__card');

    // Listen for animation end — filter to our specific animation
    this.card.addEventListener('animationend', (e) => {
      if (e.animationName === 'flip-down') this._onAnimationEnd();
    });

    this._updateDisplay(this.currentChar, this.currentChar);
  }

  /** Switch charset (e.g. CHARS_DIGITS for clock positions). Resets to space. */
  setCharset(chars) {
    if (this.chars === chars) return;
    this.chars = chars;
    this.charIndex = 0;
    this.currentChar = chars[0]; // space
    this._updateDisplay(this.currentChar, this.currentChar);
  }

  setTarget(char, delay = 0) {
    char = (char || ' ').toUpperCase();
    if (this.chars.indexOf(char) === -1) char = ' ';

    if (this._pendingTimeout) {
      clearTimeout(this._pendingTimeout);
      this._pendingTimeout = null;
    }

    // If mid-flip, mark for cancellation — it will restart in _onAnimationEnd
    if (this.isFlipping) {
      this._cancelled = true;
      this.targetChar = char;
      return; // let the current animation finish, then it will redirect
    }

    this.targetChar = char;
    if (this.targetChar === this.currentChar) return;

    if (delay > 0) {
      this._pendingTimeout = setTimeout(() => {
        this._pendingTimeout = null;
        this._startFlipSequence();
      }, delay);
    } else {
      this._startFlipSequence();
    }
  }

  _startFlipSequence() {
    if (this.isFlipping) return;
    this._cancelled = false;
    this._flipToNext();
  }

  _flipToNext() {
    this.isFlipping = true;

    const nextIndex = (this.charIndex + 1) % this.chars.length;
    const nextChar = this.chars[nextIndex];

    this._updateDisplay(this.currentChar, nextChar);

    this.card.classList.remove('flipping');
    void this.card.offsetWidth;
    this.card.classList.add('flipping');
    this.el.classList.add('flipping');

    if (this.onFlipStart) this.onFlipStart();
  }

  _onAnimationEnd() {
    // Guard: prevent re-entrant calls
    if (this._inAnimEnd) return;
    this._inAnimEnd = true;

    // Advance state
    this.charIndex = (this.charIndex + 1) % this.chars.length;
    this.currentChar = this.chars[this.charIndex];

    // Remove animation class
    this.card.classList.remove('flipping');
    this.el.classList.remove('flipping');

    this._updateDisplay(this.currentChar, this.currentChar);

    if (this.onFlipEnd) this.onFlipEnd();

    this.isFlipping = false;
    this._inAnimEnd = false;

    if (this._cancelled) {
      this._cancelled = false;
      if (this.currentChar !== this.targetChar) {
        requestAnimationFrame(() => this._startFlipSequence());
      }
      return;
    }

    if (this.currentChar !== this.targetChar) {
      requestAnimationFrame(() => this._flipToNext());
    }
  }

  _updateDisplay(current, next) {
    const cur = current === ' ' ? '\u00A0' : current;
    const nxt = next === ' ' ? '\u00A0' : next;
    this.topText.textContent = nxt;        // revealed behind the folding card
    this.cardFrontText.textContent = cur;   // the face that folds down
    this.bottomText.textContent = cur;      // stays visible until card covers it
    this.cardBackText.textContent = nxt;    // back of card, revealed when it lands
  }

  static createElement() {
    const el = document.createElement('div');
    el.className = 'flap';
    el.innerHTML = `
      <div class="flap__top"><span class="flap__text">\u00A0</span></div>
      <div class="flap__bottom">
        <div class="flap__bottom-shadow"></div>
        <span class="flap__text">\u00A0</span>
      </div>
      <div class="flap__card">
        <div class="flap__card-front"><span class="flap__text">\u00A0</span></div>
        <div class="flap__card-back"><span class="flap__text">\u00A0</span></div>
      </div>
    `;
    return el;
  }
}
