const TOKEN_KEY = "kirana_token";
const STORE_NAME_KEY = "kirana_store_name";

export function saveSession(token: string, storeName: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STORE_NAME_KEY, storeName);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoreName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORE_NAME_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORE_NAME_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}
