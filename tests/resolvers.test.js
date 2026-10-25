import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ApolloServer } from "@apollo/server";
import { createResolvers } from "../server/resolvers.js";
import { STEP_TITLES } from "../src/releases.js";

function createRepositoryStub() {
  const releases = new Map();
  return {
    releases,
    list: async () => [...releases.values()],
    create: async ({ name, date, info }) => {
      const release = {
        id: "release-1",
        name,
        date,
        info,
        status: "planned",
        completedSteps: STEP_TITLES.map(() => false),
      };
      releases.set(release.id, release);
      return release;
    },
    updateInfo: async (id, info) => {
      const release = releases.get(id);
      if (!release) return null;
      const updated = { ...release, info };
      releases.set(id, updated);
      return updated;
    },
    setStep: async (id, stepIndex, completed) => {
      const release = releases.get(id);
      if (!release) return null;
      const completedSteps = release.completedSteps.map((value, index) =>
        index === stepIndex ? completed : value,
      );
      const count = completedSteps.filter(Boolean).length;
      const updated = {
        ...release,
        completedSteps,
        status: count === 0 ? "planned" : count === completedSteps.length ? "done" : "ongoing",
      };
      releases.set(id, updated);
      return updated;
    },
    delete: async (id) => releases.delete(id),
  };
}

test("GraphQL resolvers create releases and compute status as checklist steps change", async () => {
  const resolvers = createResolvers(createRepositoryStub());
  const release = await resolvers.Mutation.createRelease(null, {
    name: "  API 2.0  ",
    date: "2026-11-01T12:00:00Z",
  });

  assert.equal(release.name, "API 2.0");
  assert.equal(release.status, "planned");

  const inProgress = await resolvers.Mutation.setReleaseStep(null, {
    id: release.id,
    stepIndex: 0,
    completed: true,
  });
  assert.equal(inProgress.status, "ongoing");

  let completed = inProgress;
  for (let stepIndex = 1; stepIndex < STEP_TITLES.length; stepIndex += 1) {
    completed = await resolvers.Mutation.setReleaseStep(null, {
      id: release.id,
      stepIndex,
      completed: true,
    });
  }
  assert.equal(completed.status, "done");
});

test("GraphQL resolvers reject invalid inputs and missing releases", async () => {
  const resolvers = createResolvers(createRepositoryStub());

  await assert.rejects(
    resolvers.Mutation.createRelease(null, {
      name: " ",
      date: "2026-11-01",
    }),
    { extensions: { code: "BAD_USER_INPUT" } },
  );
  await assert.rejects(
    resolvers.Mutation.createRelease(null, {
      name: "API",
      date: "not-a-date",
    }),
    { extensions: { code: "BAD_USER_INPUT" } },
  );
  await assert.rejects(
    resolvers.Mutation.setReleaseStep(null, {
      id: "missing",
      stepIndex: STEP_TITLES.length,
      completed: true,
    }),
    { extensions: { code: "BAD_USER_INPUT" } },
  );
  await assert.rejects(
    resolvers.Mutation.updateReleaseInfo(null, { id: "missing", info: "note" }),
    { extensions: { code: "NOT_FOUND" } },
  );
});

test("GraphQL schema and resolvers execute a release query", async () => {
  const typeDefs = await readFile(new URL("../server/schema.graphql", import.meta.url), "utf8");
  const server = new ApolloServer({
    typeDefs,
    resolvers: createResolvers(createRepositoryStub()),
  });
  await server.start();

  try {
    const result = await server.executeOperation({
      query: `mutation {
        createRelease(name: "API 3.0", date: "2026-11-01T12:00:00Z") {
          name status completedSteps
        }
      }`,
    });

    assert.equal(result.body.kind, "single");
    assert.deepEqual(result.body.singleResult.errors, undefined);
    assert.equal(result.body.singleResult.data.createRelease.name, "API 3.0");
    assert.equal(result.body.singleResult.data.createRelease.status, "planned");
  } finally {
    await server.stop();
  }
});
