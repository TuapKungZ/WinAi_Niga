import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import registrationRoute from "./routes/registration.js";
import scheduleRoute from "./routes/schedule.js";
import gradesRoute from "./routes/grades.js";
import healthRoute from "./routes/health.js";
import conductRoute from "./routes/conduct.js";
import activitiesRoute from "./routes/activities.js";
import evaluationRoute from "./routes/evaluation.js";
import authRoute from "./routes/auth.js";
import teacherAuthRoutes from "./routes/teacher_auth.js";
import teacherDashboardRoute from "./routes/teacher_dashboard.js";
import teacherScoreRoutes from "./routes/teacher_scores.js";
import teacherGradeRoutes from "./routes/teacher_grade.js";
import teacherStudentsRoutes from "./routes/teacher_students.js";
import teacherProfileRoutes from "./routes/teacher_profile.js";
import teacherCalendarRoutes from "./routes/teacher_calendar.js";
import teacherAttendanceRoutes from "./routes/teacher_attendance.js";
import teacherExamRoutes from "./routes/teacher_exam.js";
import teacherEvaluationRoutes from "./routes/teacher_evaluation.js";
import uploadRoutes from "./routes/upload.js";
import directorAuthRoutes from "./routes/director_auth.js";
import directorRoutes from "./routes/director.js";
import studentProfileRoutes from "./routes/student_profile.js";


const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STATIC FILES
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Serve frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

// ROOT REDIRECT
app.get("/", (req, res) => {
    res.redirect("/pages/login.html");
});

// ROUTES
app.use("/api/auth", authRoute);
app.use("/api/registration", registrationRoute);
app.use("/api/schedule", scheduleRoute);
app.use("/api/grades", gradesRoute);
app.use("/api/health", healthRoute);
app.use("/api/conduct", conductRoute);
app.use("/api/activities", activitiesRoute);
app.use("/api/evaluation", evaluationRoute);
app.use("/api/teacher/auth", teacherAuthRoutes);
app.use("/api/teacher/dashboard", teacherDashboardRoute);
app.use("/api/teacher/scores", teacherScoreRoutes);
app.use("/api/teacher/grade", teacherGradeRoutes);
app.use("/api/teacher/students", teacherStudentsRoutes);
app.use("/api/teacher/profile", teacherProfileRoutes);
app.use("/api/teacher/calendar", teacherCalendarRoutes);
app.use("/api/teacher/attendance", teacherAttendanceRoutes);
app.use("/api/teacher/exam", teacherExamRoutes);
app.use("/api/teacher/evaluation", teacherEvaluationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/director/auth", directorAuthRoutes);
app.use("/api/director", directorRoutes);
app.use("/api/student", studentProfileRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));
