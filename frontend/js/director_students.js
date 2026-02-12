import { requireDirectorLogin, qs, setState, clearFieldErrors, setFieldError, openModal, closeModal } from "./app.js";
import { API_BASE } from "./config.js";

let currentList = [];

async function uploadProfilePhoto(role, id, file) {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("role", role);
    formData.append("id", String(id));
    const res = await fetch(`${API_BASE}/upload/profile`, {
        method: "POST",
        body: formData
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ");
    }
    return res.json();
}

window.onload = async () => {
    requireDirectorLogin();

    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100));

    const openBtn = qs("#openStudentModalBtn");
    const saveBtn = qs("#saveStudentBtn");
    const resetBtn = qs("#resetStudentBtn");
    const searchBtn = qs("#searchStudentBtn");

    if (searchBtn) searchBtn.addEventListener("click", () => loadStudents());
    if (openBtn) openBtn.addEventListener("click", () => {
        resetForm();
        openModal("studentModal");
    });
    if (saveBtn) saveBtn.addEventListener("click", saveStudent);
    if (resetBtn) resetBtn.addEventListener("click", () => {
        resetForm();
        closeModal("studentModal");
    });

    // Photo box click handler
    const photoBox = qs("#photoBoxClick");
    const photoFileInput = qs("#studentPhotoFile");
    if (photoBox && photoFileInput) {
        photoBox.addEventListener("click", () => {
            photoFileInput.click();
        });
    }

    await loadStudents();
};

async function loadStudents() {
    const level = qs("#classLevelFilter")?.value || "";
    const room = qs("#roomFilter")?.value || "";
    const params = new URLSearchParams();
    if (level) params.set("class_level", level);
    if (room) params.set("room", room);

    setState(qs("#studentsBody"), "loading", "กำลังโหลด...");
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

window.editStudent = function (id) {
    const s = currentList.find((x) => x.id === id);
    if (!s) return;
    qs("#studentId").value = s.id;
    qs("#studentCode").value = s.student_code || "";
    qs("#studentPrefix").value = s.prefix || "";
    qs("#studentFirst").value = s.first_name || "";
    qs("#studentLast").value = s.last_name || "";
    qs("#studentGender").value = s.gender || "";
    qs("#studentBirthday").value = s.birthday ? String(s.birthday).slice(0, 10) : "";
    qs("#studentPhone").value = s.phone || "";
    qs("#studentLevel").value = s.class_level || "";
    qs("#studentRoom").value = s.classroom || s.room || "";
    qs("#studentStatus").value = s.status || "กำลังศึกษา";
    qs("#parentName").value = s.parent_name || "";
    qs("#parentPhone").value = s.parent_phone || "";
    qs("#studentAddress").value = s.address || "";
    openModal("studentModal");
};

window.deleteStudent = async function (id) {
    if (!confirm("ต้องการลบข้อมูลนักเรียนนี้หรือไม่?")) return;
    await fetch(`${API_BASE}/director/students/${id}`, { method: "DELETE" });
    loadStudents();
};

async function saveStudent() {
    clearFieldErrors(document.body);
    const id = qs("#studentId").value;
    const photoFile = qs("#studentPhotoFile")?.files?.[0];
    const payload = {
        student_code: qs("#studentCode").value.trim(),
        prefix: qs("#studentPrefix").value.trim(),
        first_name: qs("#studentFirst").value.trim(),
        last_name: qs("#studentLast").value.trim(),
        gender: qs("#studentGender").value.trim(),
        birthday: qs("#studentBirthday").value || null,
        phone: qs("#studentPhone").value.trim(),
        class_level: qs("#studentLevel").value.trim(),
        classroom: qs("#studentRoom").value.trim(),
        room: qs("#studentRoom").value.trim(),
        status: qs("#studentStatus").value.trim(),
        parent_name: qs("#parentName").value.trim(),
        parent_phone: qs("#parentPhone").value.trim(),
        address: qs("#studentAddress").value.trim(),
        password: qs("#studentPass").value.trim()
    };

    if (!payload.student_code && !id) {
        setFieldError(qs("#studentCode"), "กรุณากรอกรหัสนักเรียน");
        return;
    }

    let savedId = id;
    if (id) {
        await fetch(`${API_BASE}/director/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } else {
        const res = await fetch(`${API_BASE}/director/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        savedId = data.id;
    }

    if (photoFile && savedId) {
        try {
            await uploadProfilePhoto("student", savedId, photoFile);
        } catch (err) {
            alert(err.message);
        }
    }
    resetForm();
    loadStudents();
    closeModal("studentModal");
}

function resetForm() {
    qs("#studentId").value = "";
    qs("#studentCode").value = "";
    qs("#studentPrefix").value = "";
    qs("#studentFirst").value = "";
    qs("#studentLast").value = "";
    qs("#studentGender").value = "";
    qs("#studentBirthday").value = "";
    qs("#studentPhone").value = "";
    qs("#studentLevel").value = "";
    qs("#studentRoom").value = "";
    qs("#studentStatus").value = "กำลังศึกษา";
    qs("#parentName").value = "";
    qs("#parentPhone").value = "";
    qs("#studentAddress").value = "";
    if (qs("#studentPhotoFile")) qs("#studentPhotoFile").value = "";
    qs("#studentPass").value = "";
}
