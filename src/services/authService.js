import { request } from "./apiClient";

// Auth endpoints are public, so a 401 here means "wrong credentials",
// not "session expired".
export const registerUser = (userData) =>
  request("/auth/register", {
    method: "POST",
    body: userData,
    auth: false,
    fallbackMessage: "Registration failed",
  });

export const loginUser = (userData) =>
  request("/auth/login", {
    method: "POST",
    body: userData,
    auth: false,
    fallbackMessage: "Login failed",
  });
