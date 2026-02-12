import {
    requireLogin,
    qs,
    loadRegistered,
    getCompetency,
    submitEvaluation,
    clearFieldErrors,
    setFieldError
} from "./app.js";
import { API_BASE } from "./config.js";

let student;
let selectedSection = null;
let topics = [];

// ----------------------------
// เมื่อโหลดหน้า
// ----------------------------
window.onload = async () => {
    student = requireLogin();

    qs("#evalYearSelect").addEventListener("change", loadStudentSubjects);
    qs("#evalTermSelect").addEventListener("change", loadStudentSubjects);
    qs("#subjectSelect").addEventListener("change", selectSubject);

    document.querySelector("#evalForm").addEventListener("submit", submitForm);

    await loadStudentSubjects();
};

// ----------------------------
// โหลดรายวิชาที่นักเรียนลงทะเบียน
// ----------------------------
async function loadStudentSubjects() {
    const year = qs("#evalYearSelect").value;
    const term = qs("#evalTermSelect").value;

    const select = qs("#subjectSelect");
    select.innerHTML = `<option value="">กำลังโหลด...</option>`;
    const subjects = await loadRegistered(student.id, year, term);
    select.innerHTML = `<option disabled selected value="">-- กรุณาเลือกวิชา --</option>`;

    if (!subjects.length) {
        select.innerHTML = `<option disabled selected value="">ยังไม่มีรายวิชาที่บันทึกแล้ว</option>`;
        resetTeacherCard();
        await loadTopics();
        return;
    }

    subjects.forEach((sub) => {
        const op = document.createElement("option");
        op.value = sub.section_id;
        op.textContent = `${sub.subject_code} - ${sub.subject_name}`;
        op.dataset.teacher = sub.teacher_name;
        op.dataset.subjectName = sub.subject_name;
        select.appendChild(op);
    });

    resetTeacherCard();
    await loadTopics();
}

// ----------------------------
// เมื่อเลือกวิชา
// ----------------------------
async function selectSubject() {
    const option = qs("#subjectSelect").selectedOptions[0];
    if (!option) return;

    selectedSection = {
        id: option.value,
        subject_name: option.dataset.subjectName,
        teacher_name: option.dataset.teacher
    };

    qs("#teacherName").textContent = selectedSection.teacher_name || "-";
    qs("#subjectName").textContent = selectedSection.subject_name;

    await loadEvaluationStatus();
    renderQuestions();
}

// ----------------------------
// เช็คสถานะประเมินแล้วหรือยัง
// ----------------------------
async function loadEvaluationStatus() {
    const year = qs("#evalYearSelect").value;
    const term = qs("#evalTermSelect").value;

    const results = await getCompetency(student.id, year, term);

    const statusBox = qs("#evalStatus");

    if (results.length > 0) {
        statusBox.textContent = "ประเมินแล้ว";
        statusBox.classList.add("done");
        statusBox.style.background = "#632b2b";
    } else {
        statusBox.textContent = "รอการประเมิน";
        statusBox.classList.remove("done");
        statusBox.style.background = "#f59e0b";
    }
}

// ----------------------------
// โหลดหัวข้อประเมินจากผอ
// ----------------------------
async function loadTopics() {
    const year = qs("#evalYearSelect").value;
    const term = qs("#evalTermSelect").value;
    const body = qs("#evalQuestions");
    body.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center; padding:20px; color:#777;">
                กำลังโหลดหัวข้อ...
            </td>
        </tr>
    `;

    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (term) params.append("semester", term);

    const res = await fetch(`${API_BASE}/evaluation/topics?${params.toString()}`);
    const rows = await res.json();
    topics = (rows || []).map((r) => r.name).filter((name) => name && String(name).trim().length > 0);

    renderQuestions();
}

// ----------------------------
// วาดคำถาม
// ----------------------------
function renderQuestions() {
    const body = qs("#evalQuestions");
    body.innerHTML = "";

    if (!topics.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px; color:#777;">
                    ยังไม่มีหัวข้อประเมิน
                </td>
            </tr>
        `;
        return;
    }

    topics.forEach((q, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${index + 1}. ${q}</td>
            <td><input type="radio" name="q${index}" value="5" required></td>
            <td><input type="radio" name="q${index}" value="4"></td>
            <td><input type="radio" name="q${index}" value="3"></td>
            <td><input type="radio" name="q${index}" value="2"></td>
            <td><input type="radio" name="q${index}" value="1"></td>
        `;

        body.appendChild(tr);
    });
}

// ----------------------------
// ส่งแบบประเมิน
// ----------------------------
async function submitForm(event) {
    event.preventDefault();
    clearFieldErrors(qs("#evalForm"));

    if (!selectedSection) {
        setFieldError(qs("#subjectSelect"), "กรุณาเลือกวิชา");
        return;
    }

    if (!topics.length) {
        alert("ยังไม่มีหัวข้อประเมิน");
        return;
    }

    const year = qs("#evalYearSelect").value;
    const term = qs("#evalTermSelect").value;
    const feedback = qs("#evalFeedback")?.value?.trim() || "";

    const data = topics.map((q, i) => ({
        name: q,
        score: Number(document.querySelector(`input[name="q${i}"]:checked`).value)
    }));

    await submitEvaluation(student.id, data, year, term, selectedSection?.id || null, feedback);

    alert("ส่งแบบประเมินสำเร็จ");
    await loadEvaluationStatus();
}

// รีเซ็ต UI
function resetTeacherCard() {
    qs("#teacherName").textContent = "กรุณาเลือกวิชา";
    qs("#subjectName").textContent = "-";
    qs("#evalStatus").textContent = "รอการประเมิน";
}
