// VITE_API_BASE unset  -> dev default (separate backend on :4000)
// VITE_API_BASE=""      -> same-origin relative calls (prod behind the nginx /api proxy)
const RAW_BASE = import.meta.env.VITE_API_BASE;
const BASE = RAW_BASE === undefined ? "http://localhost:4000" : RAW_BASE;

const TOKEN_KEY = "jamlyrics_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),

  // admin events
  listEvents: () => request("/api/events", { auth: true }),
  getEvent: (id) => request(`/api/events/${id}`, { auth: true }),
  createEvent: (data) => request("/api/events", { method: "POST", body: data, auth: true }),
  updateEvent: (id, data) =>
    request(`/api/events/${id}`, { method: "PUT", body: data, auth: true }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE", auth: true }),

  // admin songs
  addSong: (eventId, data) =>
    request(`/api/events/${eventId}/songs`, { method: "POST", body: data, auth: true }),
  updateSong: (eventId, songId, data) =>
    request(`/api/events/${eventId}/songs/${songId}`, {
      method: "PUT",
      body: data,
      auth: true,
    }),
  deleteSong: (eventId, songId) =>
    request(`/api/events/${eventId}/songs/${songId}`, { method: "DELETE", auth: true }),
  bulkAddSongs: (eventId, songs) =>
    request(`/api/events/${eventId}/songs/bulk`, {
      method: "POST",
      body: { songs },
      auth: true,
    }),
  fetchGoogleSheetCsv: (eventId, url) =>
    request(`/api/events/${eventId}/songs/gsheet-csv`, {
      method: "POST",
      body: { url },
      auth: true,
    }),

  // public participant
  publicEvent: (id) => request(`/api/public/events/${id}`),
  publicSong: (eventId, songId) => request(`/api/public/events/${eventId}/songs/${songId}`),
};
