export const STEP_TITLES = [
  "Code review approved",
  "Automated tests passing",
  "Changelog updated",
  "Version number bumped",
  "Production build verified",
  "Database migrations ready",
  "Deployment scheduled",
  "Team notified",
];

export function getReleaseStatus(completedSteps) {
  const completedCount = completedSteps.filter(Boolean).length;

  if (completedCount === 0) return "planned";
  if (completedCount === completedSteps.length) return "done";
  return "ongoing";
}

export function toggleReleaseStep(release, stepIndex) {
  const completedSteps = release.completedSteps.map((isComplete, index) =>
    index === stepIndex ? !isComplete : isComplete,
  );

  return {
    ...release,
    completedSteps,
    status: getReleaseStatus(completedSteps),
  };
}
