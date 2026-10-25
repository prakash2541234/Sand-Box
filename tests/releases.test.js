import test from "node:test";
import assert from "node:assert/strict";
import { getReleaseStatus, STEP_TITLES, toggleReleaseStep } from "../src/releases.js";
import { createDemoReleases } from "../src/demo-data.js";

test("release status is planned, ongoing, and done based on completed steps", () => {
  assert.equal(getReleaseStatus(STEP_TITLES.map(() => false)), "planned");
  assert.equal(getReleaseStatus([true, ...STEP_TITLES.slice(1).map(() => false)]), "ongoing");
  assert.equal(getReleaseStatus(STEP_TITLES.map(() => true)), "done");
});

test("toggling a step updates completion and computed status without mutating the release", () => {
  const release = {
    completedSteps: STEP_TITLES.map(() => false),
    status: "planned",
  };

  const updated = toggleReleaseStep(release, 0);

  assert.equal(updated.completedSteps[0], true);
  assert.equal(updated.status, "ongoing");
  assert.equal(release.completedSteps[0], false);
  assert.equal(release.status, "planned");
});

test("demo data includes a release with all checklist steps completed", () => {
  const releases = createDemoReleases();
  const completedRelease = releases.find((release) => release.status === "done");

  assert.ok(completedRelease);
  assert.equal(completedRelease.completedSteps.length, STEP_TITLES.length);
  assert.equal(completedRelease.completedSteps.every(Boolean), true);
  assert.equal(completedRelease.completedSteps.filter(Boolean).length, 8);
  assert.equal(releases.some((release) => release.status === "ongoing"), true);
  assert.equal(releases.some((release) => release.status === "planned"), true);
});
