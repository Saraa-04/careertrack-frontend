import { request } from "./apiClient";

// Shared helper: every preparation call is scoped to one application.
const preparationRequest = (applicationId, method = "GET", body) => {
  if (!localStorage.getItem("token")) {
    return Promise.reject(new Error("Please log in to continue."));
  }

  return request(`/interview-preparation/${applicationId}`, {
    method,
    body,
    fallbackMessage: "Preparation request failed.",
  });
};

export const getPreparation = (applicationId) =>
  preparationRequest(applicationId);

export const createPreparation = (applicationId) =>
  preparationRequest(applicationId, "POST", {});

export const updatePreparation = (applicationId, updates) =>
  preparationRequest(applicationId, "PUT", updates);

export const deletePreparation = (applicationId) =>
  preparationRequest(applicationId, "DELETE");
