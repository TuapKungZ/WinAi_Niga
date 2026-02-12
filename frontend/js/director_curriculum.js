import { requireDirectorLogin, qs, clearFieldErrors, setFieldError, openModal, closeModal } from "./app.js";
import { API_BASE, FILE_BASE } from "./config.js";

let subjects = [];
let teachers = [];
let sections = [];

window.onload = async () => {
    requireDirectorLogin();
    qs("#openSectionModalBtn").addEventListener("click", () => {
        resetForm();
        openModal("sectionModal");
    });
    qs("#searchSectionBtn").addEventListener("click", () => loadSections());
    qs("#filterSemester").addEventListener("change", () => loadSections());
    qs("#filterClassroom").addEventListener("change", () => loadSections());
    qs("#saveSectionBtn").addEventListener("click", saveSection);
    qs("#resetSectionBtn").addEventListener("click", () => {
        resetForm();
        closeModal("sectionModal");
    });
    await loadRefs();
    await loadSections();
};

async function loadRefs() {
    const [subRes, teacherRes] = await Promise.all([
        fetch(`${API_BASE}/director/subjects`),
        fetch(`${API_BASE}/director/teachers`)
    ]);
    subjects = await subRes.json();
    teachers = await teacherRes.json();

    const subSelect = qs("#sectionSubject");
    const groupSelect = qs("#sectionSubjectGroup");
    const teacherSelect = qs("#sectionTeacher");

    // Extract unique subject groups
    const groups = [...new Set(subjects.map(s => s.subject_group).filter(Boolean))].sort();
    groupSelect.innerHTML = `<option value="">ทั้งหมด</option>`;
    groups.forEach(g => {
        groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
    });

    function updateSubjectOptions() {
        const selectedGroup = groupSelect.value;
        subSelect.innerHTML = "";
        const filtered = selectedGroup
            ? subjects.filter(s => s.subject_group === selectedGroup)
            : subjects;

        filtered.forEach((s) => {
            subSelect.innerHTML += `<option value="${s.id}">${s.subject_code} - ${s.name}</option>`;
        });
    }

    groupSelect.onchange = updateSubjectOptions;

    updateSubjectOptions();

    teacherSelect.innerHTML = "";
    teachers.forEach((t) => {
        teacherSelect.innerHTML += `<option value="${t.id}">${t.teacher_code} - ${t.first_name || ""} ${t.last_name || ""}</option>`;
    });
}

async function loadSections() {
    const keyword = qs("#sectionSearch")?.value.trim() || "";
    const semester = qs("#filterSemester")?.value || "";
    const classroomValue = qs("#filterClassroom")?.value || "";

    const params = new URLSearchParams();
    if (keyword) params.set("search", keyword);
    if (semester) params.set("semester", semester);

    if (classroomValue) {
        const parts = classroomValue.split("/");
        if (parts.length === 2) {
            params.set("class_level", parts[0]);
            params.set("room", parts[1]);
        }
    }

    const res = await fetch(`${API_BASE}/director/sections?${params.toString()}`);
    sections = await res.json();
    if (keyword) {
        const needle = keyword.toLowerCase();
        sections = sections.filter((s) =>
            String(s.subject_code || "").toLowerCase().includes(needle)
        );
    }
    renderSections();
}

function renderSections() {
    const body = qs("#sectionsBody");
    body.innerHTML = "";
    if (!sections.length) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">ไม่มีข้อมูล</td></tr>`;
        return;
    }
    sections.forEach((s) => {
        body.innerHTML += `
            <tr>
                <td>${s.subject_code || "-"}</td>
                <td>${s.teacher_name || "-"}</td>
                <td>${s.year}/${s.semester}</td>
                <td>${s.class_level || "-"} / ${s.classroom || s.room || "-"}</td>
                <td>${s.day_of_week || "-"} ${s.time_range || ""}</td>
                <td>
                    <button class="btn-outline" onclick="editSection(${s.id})">แก้ไข</button>
                    <button class="btn-danger" onclick="deleteSection(${s.id})">ลบ</button>
                </td>
            </tr>
        `;
    });
}

window.editSection = function (id) {
    const s = sections.find((x) => x.id === id);
    if (!s) return;

    // Find subject to get its group
    const sub = subjects.find(x => x.id === s.subject_id);
    if (sub) {
        qs("#sectionSubjectGroup").value = sub.subject_group || "";
        // Manually trigger onchange to update subject list
        qs("#sectionSubjectGroup").onchange();
    }

    qs("#sectionId").value = s.id;
    qs("#sectionSubject").value = s.subject_id || "";
    qs("#sectionTeacher").value = s.teacher_id || "";
    qs("#sectionYear").value = s.year || 2568;
    qs("#sectionSemester").value = s.semester || 1;
    qs("#sectionLevel").value = s.class_level || "";
    qs("#sectionRoom").value = s.classroom || s.room || "";
    qs("#sectionDay").value = s.day_of_week || "";
    qs("#sectionTime").value = s.time_range || "";
    qs("#sectionClassroom").value = s.room || "";
    openModal("sectionModal");
};

window.deleteSection = async function (id) {
    if (!confirm("ต้องการลบตารางสอนนี้หรือไม่?")) return;
    await fetch(`${API_BASE}/director/sections/${id}`, { method: "DELETE" });
    loadSections();
};

async function saveSection() {
    clearFieldErrors(document.body);
    const id = qs("#sectionId").value;
    const payload = {
        subject_id: qs("#sectionSubject").value,
        teacher_id: qs("#sectionTeacher").value,
        year: Number(qs("#sectionYear").value),
        semester: Number(qs("#sectionSemester").value),
        class_level: qs("#sectionLevel").value.trim(),
        classroom: qs("#sectionRoom").value.trim(),
        day_of_week: qs("#sectionDay").value.trim(),
        time_range: qs("#sectionTime").value.trim(),
        room: qs("#sectionClassroom").value.trim()
    };

    if (!payload.subject_id || !payload.teacher_id) {
        if (!payload.subject_id) setFieldError(qs("#sectionSubject"), "กรุณาเลือกรายวิชา");
        if (!payload.teacher_id) setFieldError(qs("#sectionTeacher"), "กรุณาเลือกครูผู้สอน");
        return;
    }

    if (id) {
        await fetch(`${API_BASE}/director/sections/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } else {
        await fetch(`${API_BASE}/director/sections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }
    resetForm();
    loadSections();
    closeModal("sectionModal");
}

function resetForm() {
    qs("#sectionId").value = "";
    qs("#sectionSubjectGroup").value = "";
    if (qs("#sectionSubjectGroup").onchange) qs("#sectionSubjectGroup").onchange();
    qs("#sectionLevel").value = "";
    qs("#sectionRoom").value = "";
    qs("#sectionDay").value = "";
    qs("#sectionTime").value = "";
    qs("#sectionClassroom").value = "";
}
