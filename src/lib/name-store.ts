const KEY = "mf-display-name";

export function getSavedName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {}
}
