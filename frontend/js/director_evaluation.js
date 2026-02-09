import { requireDirectorLogin, qs, setState, clearFieldErrors, setFieldError, getDirector, openModal } from "./app.js";
import { API_BASE } from "./config.js";

let studentList = [];
let studentEvalRows = [];

window.onload = async () => {
    requireDirectorLogin();

    qs("#loadEvalBtn").addEventListener("click", () => {
        loadEvaluation();
        loadTopics();
    });

    qs("#evalStudentSearch").addEventListener("input", (e) => {
        renderStudentOptions(e.target.value);
    });

    qs("#openStudentEvalModalBtn").addEventListener("click", () => {
        openModal("studentEvalModal");
    });
    qs("#openTopicModalBtn").addEventListener("click", async () => {
        openModal("topicModal");
        await loadTopics();
    });

    qs("#loadStudentEvalBtn").addEventListener("click", loadStudentEvaluation);
    qs("#addEvalRowBtn").addEventListener("click", addStudentEvalRow);
    qs("#saveStudentEvalBtn").addEventListener("click", saveStudentEvaluation);
    qs("#evalStudentSelect").addEventListener("change", loadStudentEvaluation);

    qs("#evalTopicBody").addEventListener("click", handleTopicActions);
    qs("#evalStudentBody").addEventListener("click", handleStudentRowActions);
    qs("#addTopicBtn").addEventListener("click", addTopic);

    await loadStudents();
    await loadEvaluation();
    await loadTopics();
    await loadStudentEvaluation();
};

function getFilters() {
    const year = qs("#evalYear").value.trim();
    const semester = qs("#evalSemester").value.trim();
    return { year, semester };
}

function getDirectorCode() {
    const director = getDirector();
    return director?.director_code || "";
}

async function loadEvaluation() {
    const { year, semester } = getFilters();
    setState(qs("#evaluationBody"), "loading", "กำลังโหลดข้อมูล...");

    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (semester) params.append("semester", semester);

    const res = await fetch(`${API_BASE}/director/evaluation/summary?${params.toString()}`);
    const rows = await res.json();

    const body = qs("#evaluationBody");
    body.innerHTML = "";
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:20px;">ไม่มีข้อมูล</td></tr>`;
        return;
    }

    rows.forEach((item) => {
        body.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${Number(item.avg_score || 0).toFixed(2)}</td>
            </tr>
        `;
    });
}

async function loadTopics() {
    const { year, semester } = getFilters();
    qs("#evalTopicBody").innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">กำลังโหลดหัวข้อ...</td></tr>`;

    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (semester) params.append("semester", semester);

    const res = await fetch(`${API_BASE}/director/evaluation/topics?${params.toString()}`);
    const rows = await res.json();

    const body = qs("#evalTopicBody");
    body.innerHTML = "";

    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">ยังไม่มีหัวข้อ</td></tr>`;
        return;
    }

    rows.forEach((item) => {
        body.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td class="center">${Number(item.avg_score || 0).toFixed(2)}</td>
                <td class="center">${item.total}</td>
                <td><input class="table-input" type="text" data-role="rename" data-name="${item.name}" placeholder="พิมพ์ชื่อใหม่"></td>
                <td class="center">
                    <button class="btn-outline btn-sm" data-action="rename" data-name="${item.name}">เปลี่ยนชื่อ</button>
                    <button class="btn-danger btn-sm" data-action="delete" data-name="${item.name}">ลบ</button>
                </td>
            </tr>
        `;
    });
}

async function loadStudents() {
    const res = await fetch(`${API_BASE}/director/students`);
    studentList = await res.json();
    renderStudentOptions("");
}

function renderStudentOptions(keyword) {
    const select = qs("#evalStudentSelect");
    const search = keyword.trim().toLowerCase();
    select.innerHTML = "";

    const filtered = !search
        ? studentList
        : studentList.filter((s) => {
            const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
            return name.includes(search) || String(s.student_code || "").includes(search);
        });

    if (!filtered.length) {
        select.innerHTML = `<option value="">ไม่พบข้อมูลนักเรียน</option>`;
        return;
    }

    filtered.forEach((s) => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.trim();
        const label = `${s.student_code || "-"} - ${name || "ไม่มีชื่อ"}`;
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = label;
        select.appendChild(opt);
    });
}

async function loadStudentEvaluation() {
    const studentId = qs("#evalStudentSelect").value;
    const { year, semester } = getFilters();

    if (!studentId) {
        alert("กรุณาเลือกนักเรียน");
        return;
    }
    if (!year || !semester) {
        alert("กรุณาระบุปีการศึกษาและภาคเรียน");
        return;
    }

    qs("#evalStudentBody").innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">กำลังโหลดข้อมูล...</td></tr>`;

    const params = new URLSearchParams({ student_id: studentId, year, semester });
    const res = await fetch(`${API_BASE}/director/evaluation/student?${params.toString()}`);
    const rows = await res.json();
    studentEvalRows = rows;
    renderStudentEvaluation();
}

function renderStudentEvaluation() {
    const body = qs("#evalStudentBody");
    body.innerHTML = "";

    if (!studentEvalRows.length) {
        body.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">ยังไม่มีข้อมูล</td></tr>`;
        return;
    }

    studentEvalRows.forEach((row, index) => {
        body.innerHTML += `
            <tr data-index="${index}">
                <td><input class="table-input" type="text" value="${row.name || ""}" data-field="name"></td>
                <td class="center"><input class="table-input center" type="number" min="0" max="100" step="1" value="${row.score ?? ""}" data-field="score"></td>
                <td class="center"><button class="btn-outline btn-sm" data-action="remove">ลบ</button></td>
            </tr>
        `;
    });
}

function addStudentEvalRow() {
    studentEvalRows.push({ name: "", score: "" });
    renderStudentEvaluation();
}

function handleStudentRowActions(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const index = Number(row?.dataset.index);
    if (Number.isNaN(index)) return;

    if (btn.dataset.action === "remove") {
        studentEvalRows.splice(index, 1);
        renderStudentEvaluation();
    }
}

async function saveStudentEvaluation() {
    clearFieldErrors(qs("#evalStudentBody"));

    const studentId = qs("#evalStudentSelect").value;
    const { year, semester } = getFilters();
    const directorCode = getDirectorCode();

    if (!studentId) {
        alert("กรุณาเลือกนักเรียน");
        return;
    }
    if (!year || !semester) {
        alert("กรุณาระบุปีการศึกษาและภาคเรียน");
        return;
    }

    const password = window.prompt("กรอกรหัสผ่านผู้อำนวยการเพื่อบันทึก");
    if (!password) return;

    const rows = Array.from(qs("#evalStudentBody").querySelectorAll("tr"));
    const payload = [];
    let hasError = false;

    rows.forEach((row) => {
        const nameInput = row.querySelector("[data-field='name']");
        const scoreInput = row.querySelector("[data-field='score']");
        const name = nameInput?.value.trim();
        const scoreValue = scoreInput?.value.trim();

        if (!name && scoreValue === "") {
            return;
        }

        if (!name) {
            setFieldError(nameInput, "กรุณาระบุหัวข้อ");
            hasError = true;
            return;
        }

        if (scoreValue === "") {
            setFieldError(scoreInput, "กรุณาระบุคะแนน");
            hasError = true;
            return;
        }

        payload.push({ name, score: Number(scoreValue) });
    });

    if (hasError) return;

    const res = await fetch(`${API_BASE}/director/evaluation/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            director_code: directorCode,
            password,
            student_id: studentId,
            year,
            semester,
            data: payload
        })
    });

    const result = await res.json();
    if (!res.ok) {
        alert(result?.error || "บันทึกไม่สำเร็จ");
        return;
    }

    alert("บันทึกผลประเมินเรียบร้อย");
    await loadEvaluation();
    await loadTopics();
}

async function addTopic() {
    const name = qs("#evalTopicName").value.trim();
    const avgRaw = qs("#evalTopicAvg").value.trim();
    const avgScore = avgRaw === "" ? null : Number(avgRaw);
    const { year, semester } = getFilters();
    const directorCode = getDirectorCode();

    if (!name) {
        alert("กรุณากรอกหัวข้อ");
        return;
    }
    if (avgRaw !== "" && !Number.isFinite(avgScore)) {
        alert("กรุณากรอกคะแนนเฉลี่ยให้ถูกต้อง");
        return;
    }
    if (Number.isFinite(avgScore) && (avgScore < 0 || avgScore > 5)) {
        alert("คะแนนเฉลี่ยต้องอยู่ระหว่าง 0 ถึง 5");
        return;
    }
    if (!year || !semester) {
        alert("กรุณาระบุปีการศึกษาและภาคเรียน");
        return;
    }

    const password = window.prompt("กรอกรหัสผ่านผู้อำนวยการเพื่อยืนยัน");
    if (!password) return;

    const res = await fetch(`${API_BASE}/director/evaluation/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            director_code: directorCode,
            password,
            name,
            year,
            semester,
            avg_score: avgScore
        })
    });

    const result = await res.json();
    if (!res.ok) {
        alert(result?.error || "เพิ่มหัวข้อไม่สำเร็จ");
        return;
    }

    qs("#evalTopicName").value = "";
    qs("#evalTopicAvg").value = "";
    await loadTopics();
    await loadEvaluation();
}

async function handleTopicActions(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const name = btn.dataset.name;
    const password = window.prompt("กรอกรหัสผ่านผู้อำนวยการเพื่อยืนยัน");
    const { year, semester } = getFilters();
    const directorCode = getDirectorCode();

    if (!password) return;
    if (!year || !semester) {
        alert("กรุณาระบุปีการศึกษาและภาคเรียน");
        return;
    }

    if (action === "rename") {
        const input = qs(`#evalTopicBody input[data-role="rename"][data-name="${CSS.escape(name)}"]`);
        const newName = input?.value.trim();
        if (!newName) {
            alert("กรุณากรอกชื่อใหม่");
            return;
        }
        if (!confirm(`ต้องการเปลี่ยนชื่อหัวข้อ "${name}" เป็น "${newName}" หรือไม่?`)) return;

        const res = await fetch(`${API_BASE}/director/evaluation/topics/rename`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_code: directorCode,
                password,
                old_name: name,
                new_name: newName,
                year,
                semester
            })
        });

        const result = await res.json();
        if (!res.ok) {
            alert(result?.error || "เปลี่ยนชื่อไม่สำเร็จ");
            return;
        }

        alert("เปลี่ยนชื่อหัวข้อเรียบร้อย");
        await loadEvaluation();
        await loadTopics();
        return;
    }

    if (action === "delete") {
        if (!confirm(`ต้องการลบหัวข้อ "${name}" ทั้งหมดหรือไม่?`)) return;
        const res = await fetch(`${API_BASE}/director/evaluation/topics`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_code: directorCode,
                password,
                name,
                year,
                semester
            })
        });

        const result = await res.json();
        if (!res.ok) {
            alert(result?.error || "ลบไม่สำเร็จ");
            return;
        }

        alert("ลบหัวข้อเรียบร้อย");
        await loadEvaluation();
        await loadTopics();
    }
}
