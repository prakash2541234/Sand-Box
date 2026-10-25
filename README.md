# Shipshape — Release checklist

A responsive single-page release checklist. The React UI uses a GraphQL API backed by PostgreSQL. Each release has a fixed eight-step checklist and a status computed from completion: `planned` (none), `ongoing` (some), or `done` (all).

## Run the browser-only demo (no Docker or database required)

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually [http://localhost:5173](http://localhost:5173)). On the first visit, choose **Start with an empty workspace** or **Load local demo data**. The demo choice seeds three example releases: one with all eight steps completed (`done`, 8/8), one in progress, and one planned. The choice and releases are saved in this browser. This is only a frontend preview: it does not run the GraphQL API or PostgreSQL, and demo data is not shared with other browsers/devices. The UI labels this mode so it is not mistaken for database persistence.

To show the first-visit choice again, open the browser developer tools, go to **Application/Storage → Local Storage**, select this site's origin, and remove the `shipshape-demo-releases` and `shipshape-demo-choice` entries.

## Run the full stack with Docker

Install Docker Desktop and start it, then from the repository root:

```bash
docker compose up --build
```

Open [http://localhost:4000](http://localhost:4000). GraphQL is at [http://localhost:4000/graphql](http://localhost:4000/graphql), and the health check is [http://localhost:4000/health](http://localhost:4000/health). Stop with `Ctrl+C`; `docker compose down` stops containers. To also remove the local database volume, run `docker compose down -v` (this permanently deletes local release data).

The API-development workflow requires Node.js 20.19+ or 22.12+ and a running PostgreSQL instance:

```bash
npm install
npm run dev:api
```

Set `DATABASE_URL` if PostgreSQL is not available at the local default (`postgres://shipshape:shipshape@localhost:5432/shipshape`). Vite serves the UI and proxies `/graphql` and `/health` to the API on port 4000.

## Checks and load test

```bash
npm test
npm run build
```

Run the read-only GraphQL load test against a running instance:

```bash
npm run loadtest
```

Configure the endpoint, concurrent workers, and requests per worker with `LOAD_TEST_URL`, `LOAD_CONCURRENCY` (comma-separated levels), and `LOAD_REQUESTS_PER_USER`. The script reports failed requests, failure rate, p95 latency, and elapsed time at each level. These results depend on the host, database, network, and selected workload; do not treat a local run as a deployed capacity guarantee.

## User actions

- Create a release with a required name and date, and optional notes.
- Select any release in the sidebar to open its checklist.
- Check/uncheck a step; status and progress update from the saved server response.
- Edit notes and select **Save notes** to persist the change.
- Delete the selected release. The next release is selected automatically, or the empty state is shown.
- The UI displays API errors instead of silently treating failed requests as successful.
- Release records are shared through the database; no user accounts or per-user data model are included.

## Design and technical decisions

- **React + Vite SPA:** keeps the interface and local development loop small; Vite proxies GraphQL during development.
- **Express + Apollo Server 5:** exposes one GraphQL HTTP endpoint and serves the production-built SPA from the same origin.
- **PostgreSQL with `pg`:** stores release records and the fixed step state in a `BOOLEAN[8]` array. Database initialization is idempotent and runs at API startup.
- **Fixed checklist in code:** the eight step titles are shared in `src/releases.js`; each row stores only eight completion booleans, not duplicated step definitions.
- **Computed status:** status is derived from saved completion values in the API response, not accepted as mutation input or stored as a separate database field.
- **Date storage:** the API validates the submitted date and PostgreSQL stores it as `TIMESTAMPTZ`; the browser formats it using the viewer's locale.
- **Persistence:** PostgreSQL is authoritative in the full-stack mode. The explicitly labeled browser-only demo stores data in `localStorage` so the UI can be exercised before PostgreSQL is installed.
- **Development modes:** `npm run dev` starts the standalone browser demo; `npm run dev:api` starts the API plus Vite and requires PostgreSQL. The production build uses the GraphQL API.
- **Container setup:** Docker Compose starts PostgreSQL and the combined API/static UI; the app waits for the database health check. A named volume retains data across restarts.
- **Tests:** Node's built-in test runner checks checklist transitions and resolver validation without requiring a running database.
- **Responsive interface:** the release list scrolls horizontally on small screens and the checklist/details stack.
- **Typography:** DM Sans and Manrope are loaded from Google Fonts with sans-serif fallbacks.

## GraphQL API

There is one API endpoint: `POST /graphql`. GraphQL operations:

| Operation | Purpose |
|---|---|
| `releases` | List releases ordered by scheduled date. |
| `createRelease(name, date, info)` | Create a release; `name` and ISO-compatible `date` are required. |
| `updateReleaseInfo(id, info)` | Replace the optional additional information (empty text clears it). |
| `setReleaseStep(id, stepIndex, completed)` | Set one of the eight steps on/off; indexes are `0` through `7`. |
| `deleteRelease(id)` | Delete a release and return whether one was removed. |

The API also exposes `GET /health`, which checks database connectivity. GraphQL errors include `BAD_USER_INPUT` for invalid inputs and `NOT_FOUND` for missing releases.

Example query:

```graphql
query {
  releases {
    id
    name
    date
    status
    info
    completedSteps
  }
}
```

## Database schema

`server/schema.sql` creates this table. There is no seed data.

| Column | PostgreSQL type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key, generated by PostgreSQL. |
| `name` | `TEXT` | Required; check constraint rejects blank names. |
| `scheduled_at` | `TIMESTAMPTZ` | Required release date/time. |
| `additional_info` | `TEXT` | Optional user notes; stored as an empty string when omitted. |
| `completed_steps` | `BOOLEAN[]` | Required array with exactly eight elements; defaults to all false. |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Set on checklist and notes updates. |

The public status is calculated from `completed_steps` and is intentionally not a database column.

## Deployment and capacity

The app is container-ready but has not been deployed from this workspace. Online deployment requires a hosting account and a hosted PostgreSQL database/connection string. No credentials or provider were supplied. Run the documented load test against the deployed GraphQL URL to measure capacity on the actual deployment; no concurrency limit or optimization delta is claimed until that experiment is run.
