import { GraphQLError } from "graphql";
import { STEP_TITLES } from "../src/releases.js";

function requireRelease(release) {
  if (!release) {
    throw new GraphQLError("Release not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return release;
}

function parseReleaseDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new GraphQLError("A valid release date is required", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return date.toISOString();
}

export function createResolvers(repository) {
  return {
    Query: {
      releases: () => repository.list(),
    },
    Mutation: {
      createRelease: async (_parent, { name, date, info = "" }) => {
        const normalizedName = name.trim();
        if (!normalizedName) {
          throw new GraphQLError("Release name is required", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        return repository.create({
          name: normalizedName,
          date: parseReleaseDate(date),
          info: info.trim(),
        });
      },
      updateReleaseInfo: async (_parent, { id, info }) =>
        requireRelease(await repository.updateInfo(id, info)),
      setReleaseStep: async (_parent, { id, stepIndex, completed }) => {
        if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= STEP_TITLES.length) {
          throw new GraphQLError("Step index is out of range", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        return requireRelease(await repository.setStep(id, stepIndex, completed));
      },
      deleteRelease: (_parent, { id }) => repository.delete(id),
    },
  };
}
