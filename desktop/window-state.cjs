const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_STATE = Object.freeze({
  width: 1440,
  height: 900,
  maximized: false
});

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const state = {
    width: clamp(source.width, 1100, 3840, DEFAULT_STATE.width),
    height: clamp(source.height, 720, 2160, DEFAULT_STATE.height),
    maximized: source.maximized === true
  };
  if (Number.isFinite(Number(source.x))) state.x = Math.round(Number(source.x));
  if (Number.isFinite(Number(source.y))) state.y = Math.round(Number(source.y));
  return state;
}

function statePath(userDataDir) {
  return path.join(userDataDir, 'desktop-state.json');
}

function readWindowState(userDataDir) {
  try {
    return normalizeState(JSON.parse(fs.readFileSync(statePath(userDataDir), 'utf8')));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeWindowState(userDataDir, state) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const target = statePath(userDataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const normalized = normalizeState(state);
  fs.writeFileSync(temp, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(temp, target);
  return normalized;
}

module.exports = {
  DEFAULT_STATE,
  normalizeState,
  readWindowState,
  writeWindowState
};
