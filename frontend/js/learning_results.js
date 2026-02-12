import {
    requireLogin,
    qs,
    getAdvisorEvaluation,
    getSubjectEvaluation,
    loadRegistered
} from "./app.js";

let student;
let registeredSubjects = [];

window.onload = async () => {
    student = requireLogin();

    qs("#lrYearSelect").addEventListener("change", loadResults);
    qs("#lrTermSelect").addEventListener("change", loadResults);
    qs("#lrSubjectSelect").addEventListener("change", loadSubjectEvaluation);

    await loadResults();
};

async function loadResults() {
    const year = qs("#lrYearSelect").value;
    const term = qs("#lrTermSelect").value;

    await loadSubjectOptions();

    const container = qs("#resultsContainer");
    container.innerHTML = `<div class="state-message loading">กำลังโหลดผลประเมิน...</div>`;
    const rows = await getAdvisorEvaluation(student.id, year, term);

    if (rows.length === 0) {
        container.innerHTML = `
            <div class="health-card">
                <p style="text-align:center; padding:20px; color:#777;">
                    ยังไม่มีข้อมูลผลประเมิน
                </p>
            </div>`;
    } else {
        container.innerHTML = "";

        rows.forEach(r => {
            const card = document.createElement("div");
            card.classList.add("health-card");
            card.style.marginBottom = "20px";

            const scoreValue = Number(r.score);
            const displayScore = Number.isFinite(scoreValue) ? (Number.isInteger(scoreValue) ? scoreValue : scoreValue.toFixed(2)) : "-";
            const percent = Number.isFinite(scoreValue) ? (scoreValue / 5) * 100 : 0;

            let color = "#632b2b";
            if (r.score <= 2) color = "#ef4444";
            else if (r.score == 3) color = "#f59e0b";

            card.innerHTML = `
                <div class="card-header-text">
                    <i class="fa-solid fa-bullseye"></i> ${r.name}
                </div>

                <div style="padding: 15px;">

                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span>คะแนน:</span>
                        <strong>${displayScore}/5</strong>
                    </div>

                    <div class="bar-bg">
                        <div class="bar-fill" style="width:${percent}%; background:${color};">
                        </div>
                    </div>

                </div>
            `;

            container.appendChild(card);
        });
    }

    await loadSubjectEvaluation();
}

async function loadSubjectOptions() {
    const year = qs("#lrYearSelect").value;
    const term = qs("#lrTermSelect").value;
    const select = qs("#lrSubjectSelect");
    if (!select) return;

    select.innerHTML = `<option value="">กำลังโหลด...</option>`;
    registeredSubjects = await loadRegistered(student.id, year, term);

    if (!registeredSubjects.length) {
        select.innerHTML = `<option value="">ยังไม่มีรายวิชาที่ลงทะเบียน</option>`;
        qs("#lrTeacherName").textContent = "ครูผู้สอน: -";
        qs("#subjectResultsContainer").innerHTML = `<div class="state-message empty">ยังไม่มีผลประเมินรายวิชา</div>`;
        return;
    }

    select.innerHTML = `<option value="">-- เลือกวิชา --</option>`;
    registeredSubjects.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.section_id;
        opt.textContent = `${s.subject_code} - ${s.subject_name}`;
        opt.dataset.teacher = s.teacher_name || "-";
        opt.dataset.subjectId = s.subject_id || "";
        select.appendChild(opt);
    });
}

async function loadSubjectEvaluation() {
    const year = qs("#lrYearSelect").value;
    const term = qs("#lrTermSelect").value;
    const select = qs("#lrSubjectSelect");
    const container = qs("#subjectResultsContainer");
    const teacherBox = qs("#lrTeacherName");

    if (!select || !container) return;

    const sectionId = select.value;
    const selectedOpt = select.selectedOptions?.[0];
    const teacherName = selectedOpt?.dataset?.teacher || "-";
    const subjectId = selectedOpt?.dataset?.subjectId || "";
    if (teacherBox) teacherBox.textContent = `ครูผู้สอน: ${teacherName}`;

    if (!sectionId) {
        container.innerHTML = `<div class="state-message empty">กรุณาเลือกวิชา</div>`;
        return;
    }

    container.innerHTML = `<div class="state-message loading">กำลังโหลดผลประเมินรายวิชา...</div>`;
    const rows = await getSubjectEvaluation(student.id, sectionId, year, term, subjectId);

    if (!Array.isArray(rows) || rows.length === 0) {
        container.innerHTML = `<div class="health-card"><p style="text-align:center; padding:20px; color:#777;">ยังไม่มีผลประเมินรายวิชา</p></div>`;
        return;
    }

    container.innerHTML = "";
    rows.forEach((r) => {
        const card = document.createElement("div");
        card.classList.add("health-card");
        card.style.marginBottom = "20px";

        const scoreValue = Number(r.score);
        const displayScore = Number.isFinite(scoreValue) ? (Number.isInteger(scoreValue) ? scoreValue : scoreValue.toFixed(2)) : "-";
        const percent = Number.isFinite(scoreValue) ? (scoreValue / 5) * 100 : 0;

        let color = "#632b2b";
        if (r.score <= 2) color = "#ef4444";
        else if (r.score == 3) color = "#f59e0b";

        card.innerHTML = `
            <div class="card-header-text">
                <i class="fa-solid fa-bullseye"></i> ${r.topic}
            </div>
            <div style="padding: 15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>คะแนน:</span>
                    <strong>${displayScore}/5</strong>
                </div>
                <div class="bar-bg">
                    <div class="bar-fill" style="width:${percent}%; background:${color};"></div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
