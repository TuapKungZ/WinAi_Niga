import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

async function ensureCompetencyColumns() {
    await pool.query(
        `ALTER TABLE competency_results
         ADD COLUMN IF NOT EXISTS section_id INTEGER`
    );
}

async function ensureFeedbackTable() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS competency_feedback (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL,
            section_id INTEGER,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    );
}

async function ensureCompetencyTopicsTable() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS competency_topics (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            order_index INTEGER DEFAULT 0,
            avg_score NUMERIC(5,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (name, year, semester)
        )`
    );
    await pool.query(
        `ALTER TABLE competency_topics
         ADD COLUMN IF NOT EXISTS avg_score NUMERIC(5,2)`
    );
}

async function seedTopicsFromResults(year, semester) {
    if (!year || !semester) return;
    const existing = await pool.query(
        `SELECT COUNT(*) AS total FROM competency_topics WHERE year=$1 AND semester=$2`,
        [year, semester]
    );
    if (Number(existing.rows[0].total || 0) > 0) return;

    const result = await pool.query(
        `SELECT DISTINCT name
         FROM competency_results
         WHERE year=$1 AND semester=$2
         ORDER BY name ASC`,
        [year, semester]
    );
    if (!result.rows.length) return;

    const values = [];
    const params = [];
    result.rows.forEach((row, index) => {
        params.push(row.name, year, semester, index + 1);
        values.push(`($${params.length - 3},$${params.length - 2},$${params.length - 1},$${params.length})`);
    });
    await pool.query(
        `INSERT INTO competency_topics(name, year, semester, order_index)
         VALUES ${values.join(", ")}`,
        params
    );
}

router.get("/topics", async (req, res) => {
    try {
        const { year, semester } = req.query;
        await ensureCompetencyTopicsTable();
        await seedTopicsFromResults(year, semester);

        const result = await pool.query(
            `SELECT id, name, year, semester, order_index
             FROM competency_topics
             WHERE ($1::int IS NULL OR year=$1)
               AND ($2::int IS NULL OR semester=$2)
             ORDER BY order_index ASC, id ASC`,
            [year || null, semester || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("ERROR /evaluation/topics:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/competency", async (req, res) => {
    const { student_id, year, semester } = req.query;

    const result = await pool.query(
        `SELECT * FROM competency_results
         WHERE student_id=$1 AND year=$2 AND semester=$3`,
        [student_id, year, semester]
    );

    res.json(result.rows);
});

router.post("/submit", async (req, res) => {
    const { student_id, data, year, semester, section_id, feedback } = req.body;

    await ensureCompetencyColumns();
    await ensureFeedbackTable();

    if (section_id) {
        await pool.query(
            `DELETE FROM competency_results
             WHERE student_id=$1 AND year=$2 AND semester=$3 AND section_id=$4`,
            [student_id, year, semester, section_id]
        );

        await pool.query(
            `DELETE FROM competency_feedback
             WHERE student_id=$1 AND section_id=$2 AND year=$3 AND semester=$4`,
            [student_id, section_id, year, semester]
        );
    } else {
        await pool.query(
            `DELETE FROM competency_results WHERE student_id=$1 AND year=$2 AND semester=$3`,
            [student_id, year, semester]
        );
    }

    if (section_id && feedback && String(feedback).trim().length > 0) {
        await pool.query(
            `INSERT INTO competency_feedback(student_id, section_id, year, semester, feedback)
             VALUES($1,$2,$3,$4,$5)`,
            [student_id, section_id, year, semester, feedback.trim()]
        );
    }

    for (const item of data) {
        await pool.query(
            `INSERT INTO competency_results(student_id, section_id, name, score, year, semester)
             VALUES($1,$2,$3,$4,$5,$6)`,
            [student_id, section_id, item.name, item.score, year, semester]
        );
    }

    res.json({ message: "บันทึกสำเร็จ" });
});

export default router;
