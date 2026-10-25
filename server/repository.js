import { STEP_TITLES, getReleaseStatus } from "../src/releases.js";

function serializeRelease(row) {
  const completedSteps = row.completed_steps.map(Boolean);
  return {
    id: row.id,
    name: row.name,
    date: row.scheduled_at.toISOString(),
    status: getReleaseStatus(completedSteps),
    info: row.additional_info,
    completedSteps,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function createReleaseRepository(pool) {
  return {
    async list() {
      const { rows } = await pool.query(
        "SELECT * FROM releases ORDER BY scheduled_at ASC, created_at ASC",
      );
      return rows.map(serializeRelease);
    },

    async create({ name, date, info }) {
      const completedSteps = STEP_TITLES.map(() => false);
      const { rows } = await pool.query(
        `INSERT INTO releases (name, scheduled_at, additional_info, completed_steps)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, date, info, completedSteps],
      );
      return serializeRelease(rows[0]);
    },

    async updateInfo(id, info) {
      const { rows } = await pool.query(
        `UPDATE releases SET additional_info = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, info],
      );
      return rows[0] ? serializeRelease(rows[0]) : null;
    },

    async setStep(id, stepIndex, completed) {
      const { rows } = await pool.query(
        `UPDATE releases
         SET completed_steps[$2] = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, stepIndex + 1, completed],
      );
      return rows[0] ? serializeRelease(rows[0]) : null;
    },

    async delete(id) {
      const { rowCount } = await pool.query("DELETE FROM releases WHERE id = $1", [id]);
      return rowCount === 1;
    },
  };
}
