/**
 * Split-Flap Display — Entry Point
 */

import { FlipBoard } from './FlipBoard.js';

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  size: 'small',
  sound: 'mechanical',
  speed: 'fast',
  mode: 'message',      // 'message' | 'time' | 'date'
  message: 'HELLO WORLD',
};

// ─── Initialize ──────────────────────────────────────────────
const boardEl = document.querySelector('.board');
const board = new FlipBoard(boardEl, CONFIG);

let tickInterval = null;

async function start() {
  await board.init();
  setTimeout(() => applyMode(), 300);
}

start();

// ─── Time / Date formatting ─────────────────────────────────

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_LONG  = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS     = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatTime(size) {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = String(h % 12 || 12).padStart(2, ' ');

  switch (size) {
    case 'large':
      return `${h12}:${m}`;
    case 'medium':
      return `${h12}:${m}:${s} ${ampm}`;
    case 'small': {
      const day = DAYS_LONG[now.getDay()];
      const mon = MONTHS[now.getMonth()];
      const date = now.getDate();
      return `${day} ${mon} ${date}\n${h12}:${m}:${s} ${ampm}`;
    }
  }
}

function formatDate(size) {
  const now = new Date();
  const dayShort = DAYS_SHORT[now.getDay()];
  const dayLong = DAYS_LONG[now.getDay()];
  const mon = MONTHS[now.getMonth()];
  const date = now.getDate();

  switch (size) {
    case 'large':
      return dayShort;
    case 'medium':
      return `${dayShort} ${mon} ${date}`;
    case 'small':
      return `${dayLong} ${mon} ${date}`;
  }
}

// ─── Mode management ─────────────────────────────────────────

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function applyMode() {
  stopTick();

  if (CONFIG.mode === 'message') {
    board.smartCharsets = false;
    board.resetCharsets();
    board.setMessage(CONFIG.message);
  } else if (CONFIG.mode === 'time') {
    board.smartCharsets = true;
    board.setMessage(formatTime(board.size));
    tickInterval = setInterval(() => {
      board.setMessage(formatTime(board.size), { stagger: false });
    }, 1000);
  } else if (CONFIG.mode === 'date') {
    board.smartCharsets = true;
    board.setMessage(formatDate(board.size));
    tickInterval = setInterval(() => {
      board.setMessage(formatDate(board.size), { stagger: false });
    }, 60000);
  }
}

// ─── Controls ────────────────────────────────────────────────

const modeSelect = document.getElementById('mode-select');
const msgInput = document.getElementById('msg-input');
const sizeSelect = document.getElementById('size-select');
const speedSelect = document.getElementById('speed-select');
const soundSelect = document.getElementById('sound-select');
const replayBtn = document.getElementById('replay');

// Mode
modeSelect.addEventListener('change', () => {
  CONFIG.mode = modeSelect.value;
  msgInput.disabled = CONFIG.mode !== 'message';
  applyMode();
});

// Message input — flip on Enter
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    CONFIG.message = msgInput.value;
    board.setMessage(CONFIG.message);
    msgInput.blur();
  }
});

// Size
sizeSelect.addEventListener('change', async () => {
  await board.setSize(sizeSelect.value);
  setTimeout(() => applyMode(), 300);
});

// Speed
speedSelect.addEventListener('change', () => {
  board.setSpeed(speedSelect.value);
});

// Sound
soundSelect.addEventListener('change', () => {
  board.sound.setVariant(soundSelect.value);
});

// Replay
replayBtn.addEventListener('click', () => {
  board.setMessage(' ');
  setTimeout(() => applyMode(), 600);
});
