// centraliza el acceso al storage del token
export const TOKEN_KEY = 'authToken';
const LEGACY_KEYS = ['accessToken','token','jwt'];

export function getAccessToken() {
  let t = localStorage.getItem(TOKEN_KEY);
  if (t) return t;

  // attempt legacy keys
  for (const key of LEGACY_KEYS) {
    const v = localStorage.getItem(key);
    if (v) {
      // migrate
      localStorage.setItem(TOKEN_KEY, v);
      localStorage.removeItem(key);
      return v;
    }
  }
  return null;
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}
