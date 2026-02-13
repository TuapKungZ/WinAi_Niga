import { requireDirectorLogin, qs, clearFieldErrors, setFieldError, openModal, closeModal, loadComponent } from "./app.js";
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
    await loadComponent("../../component/teacher_form.html", "#modalContainer");
    qs("#searchTeacherBtn").addEventListener("click", () => loadTeachers());
    qs("#departmentFilter").addEventListener("change", () => loadTeachers());
    qs("#openTeacherModalBtn").addEventListener("click", () => {
        resetForm();
        openModal("teacherModal");
    });
    qs("#saveTeacherBtn").addEventListener("click", saveTeacher);
    qs("#resetTeacherBtn").addEventListener("click", () => {
        resetForm();
        closeModal("teacherModal");
    });
    await loadTeachers();
};

async function loadTeachers() {
    const keyword = qs("#teacherSearch").value.trim();
    const dept = qs("#departmentFilter").value;
    const res = await fetch(`${API_BASE}/director/teachers?search=${encodeURIComponent(keyword)}&department=${encodeURIComponent(dept)}`);
    currentList = await res.json();
    renderTeachers();
}

function renderTeachers() {
    const body = qs("#teachersBody");
    body.innerHTML = "";
    if (!currentList.length) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">???????????</td></tr>`;
        return;
    }
    currentList.forEach((t) => {
        const fullName = `${t.first_name || ""} ${t.last_name || ""}`.trim();
        body.innerHTML += `
            <tr>
                <td>${t.teacher_code}</td>
                <td>${fullName || "-"}</td>
                <td>${t.position || "-"}</td>
                <td>${t.department || "-"}</td>
                <td>${t.status || "-"}</td>
                <td>
                    <button class="btn-outline" onclick="editTeacher(${t.id})">แก้ไข</button>
                    <button class="btn-danger" onclick="deleteTeacher(${t.id})">ลบ</button>
                </td>
            </tr>
        `;
    });
}

window.editTeacher = function (id) {
    const t = currentList.find((x) => x.id === id);
    if (!t) return;
    qs("#teacherId").value = t.id;
    qs("#teacherCode").value = t.teacher_code || "";
    qs("#teacherPrefix").value = t.prefix || "";
    qs("#teacherFirst").value = t.first_name || "";
    qs("#teacherLast").value = t.last_name || "";
    qs("#teacherNationalId").value = t.national_id || "";
    qs("#teacherBirthday").value = t.birthday ? String(t.birthday).slice(0, 10) : "";
    qs("#teacherGender").value = t.gender || "";
    qs("#teacherBlood").value = t.blood_group || "";
    qs("#teacherEmployment").value = t.employment_type || "";
    qs("#teacherPosition").value = t.position || "";
    qs("#teacherRank").value = t.academic_rank || "";
    qs("#teacherDepartment").value = t.department || "";
    qs("#teacherStartDate").value = t.start_date ? String(t.start_date).slice(0, 10) : "";
    qs("#teacherEndDate").value = t.end_date ? String(t.end_date).slice(0, 10) : "";
    qs("#teacherLicense").value = t.license_no || "";
    qs("#teacherSalary").value = t.salary ?? "";
    qs("#teacherStatus").value = t.status || "????";
    qs("#teacherPhone").value = t.phone || "";
    qs("#teacherEmail").value = t.email || "";
    qs("#teacherLine").value = t.line_id || "";
    const photoEl = qs("#teacherPhoto");
    if (photoEl) photoEl.value = t.photo_url || "";
    openModal("teacherModal");
};

window.deleteTeacher = async function (id) {
    if (!confirm("?????????????????????????????")) return;
    await fetch(`${API_BASE}/director/teachers/${id}`, { method: "DELETE" });
    loadTeachers();
};

async function saveTeacher() {
    clearFieldErrors(document.body);
    const id = qs("#teacherId").value;
    const photoFile = qs("#teacherPhotoFile")?.files?.[0];
    const payload = {
        teacher_code: qs("#teacherCode").value.trim(),
        prefix: qs("#teacherPrefix").value.trim(),
        first_name: qs("#teacherFirst").value.trim(),
        last_name: qs("#teacherLast").value.trim(),
        national_id: qs("#teacherNationalId").value.trim(),
        birthday: qs("#teacherBirthday").value || null,
        gender: qs("#teacherGender").value.trim(),
        blood_group: qs("#teacherBlood").value.trim(),
        employment_type: qs("#teacherEmployment").value.trim(),
        position: qs("#teacherPosition").value.trim(),
        academic_rank: qs("#teacherRank").value.trim(),
        department: qs("#teacherDepartment").value.trim(),
        start_date: qs("#teacherStartDate").value || null,
        end_date: qs("#teacherEndDate").value || null,
        license_no: qs("#teacherLicense").value.trim(),
        salary: qs("#teacherSalary").value ? Number(qs("#teacherSalary").value) : null,
        status: qs("#teacherStatus").value.trim(),
        phone: qs("#teacherPhone").value.trim(),
        email: qs("#teacherEmail").value.trim(),
        line_id: qs("#teacherLine").value.trim(),
        photo_url: qs("#teacherPhoto") ? qs("#teacherPhoto").value.trim() : "",
        password: qs("#teacherPass") ? qs("#teacherPass").value.trim() : ""
    };

    if (!payload.teacher_code && !id) {
        setFieldError(qs("#teacherCode"), "????????????????");
        return;
    }

    let savedId = id;
    if (id) {
        await fetch(`${API_BASE}/director/teachers/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } else {
        const res = await fetch(`${API_BASE}/director/teachers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        savedId = data.id;
    }

    if (photoFile && savedId) {
        try {
            const uploaded = await uploadProfilePhoto("teacher", savedId, photoFile);
            const photoEl = qs("#teacherPhoto");
            if (photoEl) photoEl.value = uploaded.url || "";
        } catch (err) {
            alert(err.message);
        }
    }
    resetForm();
    loadTeachers();
    closeModal("teacherModal");
}

function resetForm() {
    qs("#teacherId").value = "";
    qs("#teacherCode").value = "";
    qs("#teacherPrefix").value = "";
    qs("#teacherFirst").value = "";
    qs("#teacherLast").value = "";
    qs("#teacherNationalId").value = "";
    qs("#teacherBirthday").value = "";
    qs("#teacherGender").value = "";
    qs("#teacherBlood").value = "";
    qs("#teacherEmployment").value = "";
    qs("#teacherPosition").value = "";
    qs("#teacherRank").value = "";
    qs("#teacherDepartment").value = "";
    qs("#teacherStartDate").value = "";
    qs("#teacherEndDate").value = "";
    qs("#teacherLicense").value = "";
    qs("#teacherSalary").value = "";
    qs("#teacherStatus").value = "????";
    qs("#teacherPhone").value = "";
    qs("#teacherEmail").value = "";
    qs("#teacherLine").value = "";
    const photoEl = qs("#teacherPhoto");
    if (photoEl) photoEl.value = "";
    if (qs("#teacherPhotoFile")) qs("#teacherPhotoFile").value = "";
    const passEl = qs("#teacherPass");
    if (passEl) passEl.value = "";
}
