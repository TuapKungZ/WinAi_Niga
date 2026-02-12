import pool from "./db/pool.js";

async function inspect() {
    try {
        const result = await pool.query(`
            SELECT ss.id, s.subject_code, s.name, ss.class_level, ss.classroom, ss.day_of_week, ss.time_range
            FROM subject_sections ss
            JOIN subjects s ON ss.subject_id = s.id
            WHERE ss.class_level = 'ม.1'
            ORDER BY ss.classroom, s.subject_code, ss.day_of_week
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
