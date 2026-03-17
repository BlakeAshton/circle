export const STORAGE_KEY = "circle_state_v4";

export function loadState(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(payload, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // If storage is full or blocked, skip persistence.
  }
}
