import { requireDirectorLogin, qs, setState, clearFieldErrors, setFieldError, openModal, closeModal } from "./app.js";
import { API_BASE, FILE_BASE } from "./config.js";

let currentList = [];

window.onload = async () => {
    requireDirectorLogin();
    qs("#searchStudentBtn").addEventListener("click", () => loadStudents());
    qs("#openStudentModalBtn").addEventListener("click", () => {
        resetForm();
        openModal("studentModal");
    });
    qs("#saveStudentBtn").addEventListener("click", saveStudent);
    qs("#resetStudentBtn").addEventListener("click", () => {
        resetForm();
        closeModal("studentModal");
    });
    await loadStudents();
};

async function loadStudents() {
    const level = qs("#classLevelFilter")?.value || "";
    const room = qs("#roomFilter")?.value || "";
    const params = new URLSearchParams();
    if (level) params.set("class_level", level);
    if (room) params.set("room", room);

    setState(qs("#studentsBody"), "loading", "???????????????...");
    const res = await fetch(`${API_BASE}/director/students?${params.toString()}`);
    currentList = await res.json();
    renderStudents();
}


function renderStudents() {
    const body = qs("#studentsBody");
    body.innerHTML = "";
    if (!currentList.length) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">ไม่มีข้อมูล</td></tr>`;
        return;
    }
    currentList.forEach((s) => {
        body.innerHTML += `
            <tr>
                <td>${s.student_code}</td>
                <td>${s.first_name || ""} ${s.last_name || ""}</td>
                <td>${s.class_level || "-"} / ${s.classroom || s.room || "-"}</td>
                <td>
                    <button class="btn-outline" onclick="editStudent(${s.id})">แก้ไข</button>
                    <button class="btn-danger" onclick="deleteStudent(${s.id})">ลบ</button>
                </td>
            </tr>
        `;
    });
}

window.editStudent = function(id) {
    const s = currentList.find((x) => x.id === id);
    if (!s) return;
    qs("#studentId").value = s.id;
    qs("#studentCode").value = s.student_code || "";
    qs("#studentFirst").value = s.first_name || "";
    qs("#studentLast").value = s.last_name || "";
    qs("#studentLevel").value = s.class_level || "";
    qs("#studentRoom").value = s.classroom || s.room || "";
    openModal("studentModal");
};

window.deleteStudent = async function(id) {
    if (!confirm("ต้องการลบข้อมูลนักเรียนนี้หรือไม่?")) return;
    await fetch(`${API_BASE}/director/students/${id}`, { method: "DELETE" });
    loadStudents();
};

async function saveStudent() {
    clearFieldErrors(document.body);
    const id = qs("#studentId").value;
    const payload = {
        student_code: qs("#studentCode").value.trim(),
        first_name: qs("#studentFirst").value.trim(),
        last_name: qs("#studentLast").value.trim(),
        class_level: qs("#studentLevel").value.trim(),
        classroom: qs("#studentRoom").value.trim(),
        room: qs("#studentRoom").value.trim(),
        password: qs("#studentPass").value.trim()
    };

    if (!payload.student_code && !id) {
        setFieldError(qs("#studentCode"), "กรุณากรอกรหัสนักเรียน");
        return;
    }

    if (id) {
        await fetch(`${API_BASE}/director/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } else {
        await fetch(`${API_BASE}/director/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }
    resetForm();
    loadStudents();
    closeModal("studentModal");
}

function resetForm() {
    qs("#studentId").value = "";
    qs("#studentCode").value = "";
    qs("#studentFirst").value = "";
    qs("#studentLast").value = "";
    qs("#studentLevel").value = "";
    qs("#studentRoom").value = "";
    qs("#studentPass").value = "";
}
