import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import pg from "pg";
import { createReleaseRepository } from "./repository.js";
import { createResolvers } from "./resolvers.js";

const { Pool } = pg;
const directory = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://shipshape:shipshape@localhost:5432/shipshape",
});

async function start() {
  await pool.query("SELECT 1");
  const schema = await readFile(path.join(directory, "schema.sql"), "utf8");
  await pool.query(schema);

  const typeDefs = await readFile(path.join(directory, "schema.graphql"), "utf8");
  const apollo = new ApolloServer({
    typeDefs,
    resolvers: createResolvers(createReleaseRepository(pool)),
  });
  await apollo.start();

  const app = express();
  app.get("/health", async (_request, response) => {
    try {
      await pool.query("SELECT 1");
      response.json({ status: "ok" });
    } catch (error) {
      console.error("Health check failed", error);
      response.status(503).json({ status: "unavailable" });
    }
  });
  app.use("/graphql", express.json(), expressMiddleware(apollo));
  app.use(express.static(path.join(directory, "..", "dist")));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(directory, "..", "dist", "index.html"));
  });

  const server = createServer(app);
  server.listen(port, () => {
    console.log(`Shipshape server listening on port ${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await apollo.stop();
        await pool.end();
        process.exit(0);
      });
    });
  }
}

start().catch(async (error) => {
  console.error("Unable to start Shipshape server", error);
  await pool.end();
  process.exitCode = 1;
});
