import { request } from "./apiClient";

export const getApplications = async () => {
  const data = await request("/applications", {
    fallbackMessage: "Failed to fetch applications",
  });
  return data.applications;
};

export const createApplication = async (application) => {
  const data = await request("/applications", {
    method: "POST",
    body: application,
    fallbackMessage: "Failed to create application",
  });
  return data.application;
};

export const updateApplication = async (id, application) => {
  const data = await request(`/applications/${id}`, {
    method: "PUT",
    body: application,
    fallbackMessage: "Failed to update application",
  });
  return data.application;
};

export const deleteApplication = (id) =>
  request(`/applications/${id}`, {
    method: "DELETE",
    fallbackMessage: "Failed to delete application",
  });
