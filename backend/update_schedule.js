import pool from "./db/pool.js";

async function updateSchedule() {
    try {
        // อิงจากรูปที่ 2: อ21101, ม.1 / 2 (Room 2) -> จันทร์ 08:00-08:50
        // เราจะอัปเดตคาบเรียนของวิชา อ21101 ที่เป็นของห้อง 2

        const updateQuery = `
            UPDATE subject_sections
            SET time_range = '08:00-08:50', day_of_week = 'จันทร์'
            WHERE subject_id IN (SELECT id FROM subjects WHERE subject_code = 'อ21101')
              AND classroom = '2'
              AND class_level = 'ม.1'
        `;

        const result = await pool.query(updateQuery);
        console.log(`Update successful. Rows affected: ${result.rowCount}`);
    } catch (err) {
        console.error("Update failed:", err);
    } finally {
        await pool.end();
    }
}

updateSchedule();
