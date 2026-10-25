const endpoint = process.env.LOAD_TEST_URL ?? "http://localhost:4000/graphql";
const concurrencyLevels = (process.env.LOAD_CONCURRENCY ?? "1,10,25,50")
  .split(",")
  .map((value) => Number(value.trim()));
const requestsPerUser = Number(process.env.LOAD_REQUESTS_PER_USER ?? 10);
const query = JSON.stringify({ query: "{ releases { id status } }" });

if (
  !concurrencyLevels.length ||
  concurrencyLevels.some((value) => !Number.isInteger(value) || value < 1) ||
  !Number.isInteger(requestsPerUser) ||
  requestsPerUser < 1
) {
  throw new Error("Provide positive LOAD_CONCURRENCY values and LOAD_REQUESTS_PER_USER.");
}

async function request() {
  const startedAt = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: query,
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json();
    return {
      duration: performance.now() - startedAt,
      failed: !response.ok || Boolean(payload.errors?.length),
    };
  } catch {
    return { duration: performance.now() - startedAt, failed: true };
  }
}

async function runLevel(concurrency) {
  const durations = [];
  let failures = 0;
  const startedAt = performance.now();

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let index = 0; index < requestsPerUser; index += 1) {
        try {
          const result = await request();
          durations.push(result.duration);
          if (result.failed) failures += 1;
        } catch {
          failures += 1;
        }
      }
    }),
  );

  durations.sort((left, right) => left - right);
  const total = concurrency * requestsPerUser;
  const percentile95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] ?? 0;
  return {
    concurrency,
    requests: total,
    failures,
    failureRate: `${((failures / total) * 100).toFixed(2)}%`,
    durationSeconds: ((performance.now() - startedAt) / 1000).toFixed(2),
    p95Milliseconds: percentile95.toFixed(1),
  };
}

console.log(`GraphQL read-only load test: ${endpoint}; ${requestsPerUser} requests per worker`);
for (const concurrency of concurrencyLevels) {
  console.log(JSON.stringify(await runLevel(concurrency)));
}
