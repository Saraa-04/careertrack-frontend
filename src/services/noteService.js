import { request } from "./apiClient";

// The token argument is optional: if omitted, the saved login token is used.
export const getNotes = (token) =>
  request("/notes", { token, fallbackMessage: "Failed to fetch notes" });

export const createNote = (noteData, token) =>
  request("/notes", {
    method: "POST",
    body: noteData,
    token,
    fallbackMessage: "Failed to create note",
  });

export const updateNote = (id, noteData, token) =>
  request(`/notes/${id}`, {
    method: "PUT",
    body: noteData,
    token,
    fallbackMessage: "Failed to update note",
  });

export const deleteNote = (id, token) =>
  request(`/notes/${id}`, {
    method: "DELETE",
    token,
    fallbackMessage: "Failed to delete note",
  });
