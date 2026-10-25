import { getReleaseStatus, STEP_TITLES } from "./releases.js";

function createDemoRelease({ id, name, daysFromNow, info, completedCount }) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const timestamp = new Date().toISOString();
  const completedSteps = STEP_TITLES.map((_, index) => index < completedCount);

  return {
    id,
    name,
    date: date.toISOString(),
    status: getReleaseStatus(completedSteps),
    info,
    completedSteps,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDemoReleases() {
  return [
    createDemoRelease({
      id: "demo-payments-api-2-4",
      name: "Payments API 2.4",
      daysFromNow: 2,
      info: "All release checks are complete. Ready for the production rollout.",
      completedCount: STEP_TITLES.length,
    }),
    createDemoRelease({
      id: "demo-mobile-app-1-8",
      name: "Mobile app 1.8",
      daysFromNow: 5,
      info: "Coordinate the rollout with the mobile team.",
      completedCount: 3,
    }),
    createDemoRelease({
      id: "demo-web-dashboard-3-2",
      name: "Web dashboard 3.2",
      daysFromNow: 9,
      info: "",
      completedCount: 0,
    }),
  ];
}
