import { request } from "./apiClient";

export const getGoal = async () => {
  const data = await request("/goals", {
    fallbackMessage: "Failed to fetch weekly goal",
  });
  return data.goal;
};

export const updateGoal = async (weeklyApplicationTarget) => {
  const data = await request("/goals", {
    method: "PUT",
    body: { weeklyApplicationTarget },
    fallbackMessage: "Failed to update weekly goal",
  });
  return data.goal;
};
