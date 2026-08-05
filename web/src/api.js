// Обёртка над fetch: токен, JSON, ошибки на русском
let token = sessionStorage.getItem('token') || '';

export function setToken(t) {
  token = t || '';
  if (t) sessionStorage.setItem('token', t);
  else sessionStorage.removeItem('token');
}

export function getToken() {
  return token;
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* пустой ответ */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `Ошибка ${res.status}`);
  }
  return data;
}
