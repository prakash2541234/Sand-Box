import { getReleaseStatus, STEP_TITLES } from "./releases.js";
import { createDemoReleases } from "./demo-data.js";

const DEMO_STORAGE_KEY = "shipshape-demo-releases";
const DEMO_CHOICE_KEY = "shipshape-demo-choice";
const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT?.trim() || "/graphql";

export function isDemoMode() {
  return demoMode;
}

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`The API returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

function readDemoReleases() {
  const saved = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!saved) return [];

  const releases = JSON.parse(saved);
  if (!Array.isArray(releases)) {
    throw new Error("Saved demo releases have an invalid format. Clear this site's demo data and try again.");
  }
  return releases;
}

function writeDemoReleases(releases) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(releases));
}

function requireDemoRelease(releases, id) {
  const release = releases.find((item) => item.id === id);
  if (!release) throw new Error("Release not found.");
  return release;
}

export function getDemoChoice() {
  return demoMode ? localStorage.getItem(DEMO_CHOICE_KEY) : "application";
}

export function chooseDemoData() {
  const releases = createDemoReleases();
  writeDemoReleases(releases);
  localStorage.setItem(DEMO_CHOICE_KEY, "demo");
  return releases;
}

export function chooseEmptyWorkspace() {
  writeDemoReleases([]);
  localStorage.setItem(DEMO_CHOICE_KEY, "empty");
}

function demoGetReleases() {
  return Promise.resolve(
    readDemoReleases().sort((left, right) => new Date(left.date) - new Date(right.date)),
  );
}

function demoCreateRelease({ name, date, info = "" }) {
  const parsedDate = new Date(date);
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) throw new Error("Release name is required.");
  if (!date || Number.isNaN(parsedDate.getTime())) throw new Error("A valid release date is required.");

  const now = new Date().toISOString();
  const release = {
    id: crypto.randomUUID(),
    name: normalizedName,
    date: parsedDate.toISOString(),
    status: "planned",
    info: String(info).trim(),
    completedSteps: STEP_TITLES.map(() => false),
    createdAt: now,
    updatedAt: now,
  };

  writeDemoReleases([...readDemoReleases(), release]);
  return Promise.resolve(release);
}

function demoUpdateReleaseInfo(id, info) {
  const releases = readDemoReleases();
  const release = requireDemoRelease(releases, id);
  const updated = { ...release, info, updatedAt: new Date().toISOString() };
  writeDemoReleases(releases.map((item) => (item.id === id ? updated : item)));
  return Promise.resolve(updated);
}

function demoSetReleaseStep(id, stepIndex, completed) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= STEP_TITLES.length) {
    throw new Error("Step index is out of range.");
  }

  const releases = readDemoReleases();
  const release = requireDemoRelease(releases, id);
  const completedSteps = release.completedSteps.map((isComplete, index) =>
    index === stepIndex ? completed : isComplete,
  );
  const updated = {
    ...release,
    completedSteps,
    status: getReleaseStatus(completedSteps),
    updatedAt: new Date().toISOString(),
  };
  writeDemoReleases(releases.map((item) => (item.id === id ? updated : item)));
  return Promise.resolve(updated);
}

function demoDeleteRelease(id) {
  const releases = readDemoReleases();
  requireDemoRelease(releases, id);
  writeDemoReleases(releases.filter((item) => item.id !== id));
  return Promise.resolve(true);
}

export function getReleases() {
  if (demoMode) return demoGetReleases();
  return graphqlRequest("{ releases { id name date status info completedSteps createdAt updatedAt } }")
    .then(({ releases }) => releases);
}

export function createRelease(input) {
  if (demoMode) return demoCreateRelease(input);
  return graphqlRequest(
    `mutation CreateRelease($name: String!, $date: String!, $info: String) {
      createRelease(name: $name, date: $date, info: $info) {
        id name date status info completedSteps createdAt updatedAt
      }
    }`,
    input,
  ).then(({ createRelease: release }) => release);
}

export function updateReleaseInfo(id, info) {
  if (demoMode) return demoUpdateReleaseInfo(id, info);
  return graphqlRequest(
    `mutation UpdateReleaseInfo($id: ID!, $info: String!) {
      updateReleaseInfo(id: $id, info: $info) {
        id name date status info completedSteps createdAt updatedAt
      }
    }`,
    { id, info },
  ).then(({ updateReleaseInfo: release }) => release);
}

export function setReleaseStep(id, stepIndex, completed) {
  if (demoMode) return demoSetReleaseStep(id, stepIndex, completed);
  return graphqlRequest(
    `mutation SetReleaseStep($id: ID!, $stepIndex: Int!, $completed: Boolean!) {
      setReleaseStep(id: $id, stepIndex: $stepIndex, completed: $completed) {
        id name date status info completedSteps createdAt updatedAt
      }
    }`,
    { id, stepIndex, completed },
  ).then(({ setReleaseStep: release }) => release);
}

export function deleteRelease(id) {
  if (demoMode) return demoDeleteRelease(id);
  return graphqlRequest(
    "mutation DeleteRelease($id: ID!) { deleteRelease(id: $id) }",
    { id },
  ).then(({ deleteRelease: deleted }) => deleted);
}
