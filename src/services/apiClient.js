// Single place for talking to the backend.
// Set VITE_API_URL (for example in .env.local or your host's dashboard) to point
// the app at a deployed server. It falls back to the local dev server.
const DEFAULT_API_URL = "http://localhost:5000/api";

export const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(
  /\/+$/,
  ""
);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const getToken = () => localStorage.getItem("token");

/**
 * Wrapper around fetch that adds the auth header, parses JSON, and turns
 * failed responses into an Error carrying the server's message.
 *
 * A 401 on an authenticated request means the token is missing, invalid or
 * expired, so the token is cleared and the user is sent back to the login page.
 */
export async function request(
  path,
  { method = "GET", body, auth = true, token, fallbackMessage = "Request failed" } = {}
) {
  const authToken = token ?? (auth ? getToken() : null);
  const headers = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (auth && response.status === 401) {
      localStorage.removeItem("token");

      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.replace("/login");
      }
    }

    throw new ApiError(data.message || fallbackMessage, response.status);
  }

  return data;
}
