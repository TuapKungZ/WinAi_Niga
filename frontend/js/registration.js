import {
    qs,
    requireLogin,
    clearFieldErrors,
    setFieldError,
    setState,
    searchSubject,
    loadOpenSections,
    addToCart,
    loadCart,
    loadRegistered,
    confirmRegistration,
    removeCartItem,
    loadAdvisor
} from "./app.js";

let student;

window.onload = async () => {
    student = requireLogin();
    bindEvents();
    updateHero();
    await updateAdvisor();
    await loadCartTable();
};

function bindEvents() {
    qs("#btnSearch").addEventListener("click", searchHandler);

    qs("#regYear").addEventListener("change", () => {
        updateHero();
        updateAdvisor();
        loadCartTable();
    });
    qs("#regSemester").addEventListener("change", () => {
        updateHero();
        updateAdvisor();
        loadCartTable();
    });

    const confirmBtn = qs("#confirmRegistrationBtn");
    if (confirmBtn) confirmBtn.addEventListener("click", confirmCart);
}


async function updateAdvisor() {
    const target = document.getElementById("regHeroAdvisor");
    if (!target) return;
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;
    const data = await loadAdvisor(student.id, year, semester);
    const advisor = data?.advisor;
    if (!advisor) {
        target.textContent = "-";
        return;
    }
    const name = `${advisor.teacher_code || ""} ${advisor.first_name || ""} ${advisor.last_name || ""}`.trim();
    target.textContent = name || "-";
}

function updateHero(count = null) {
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;
    const heroYear = document.getElementById("regHeroYear");
    const heroTerm = document.getElementById("regHeroTerm");
    const heroCount = document.getElementById("regHeroCount");

    if (heroYear) heroYear.textContent = year;
    if (heroTerm) heroTerm.textContent = semester;
    if (heroCount && count !== null) heroCount.textContent = count;
}

// ค้นหารายวิชา
async function searchHandler() {
    const keyword = qs("#subjectSearch").value.trim();
    const searchResult = qs("#searchResult");
    clearFieldErrors(document.body);

    if (!keyword) {
        setFieldError(qs("#subjectSearch"), "กรุณากรอกคำค้นหา");
        return;
    }

    setState(searchResult, "loading", "กำลังค้นหารายวิชา...");
    const found = await searchSubject(keyword);

    if (found.length === 0) {
        searchResult.innerHTML = `
            <div style="background:#fff0f0; border:1px dashed #e74c3c; padding:15px; border-radius:8px; text-align:center;">
                <i class="fas fa-exclamation-circle" style="color:#e74c3c;"></i>
                ไม่พบรายวิชา
            </div>`;
        return;
    }

    const subj = found[0];
    searchResult.innerHTML = `
        <div class="student-activity-card" 
             style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h4>${subj.subject_code} - ${subj.name}</h4>
                <p style="color:#666;">
                    <b>หน่วยกิต:</b> ${subj.credit}
                </p>
            </div>
            <button class="btn-primary" onclick="selectSubject(${subj.id})">
                <i class="fa-solid fa-cart-plus"></i>
                เลือก
            </button>
        </div>
    `;
}

// เลือกวิชาแล้วเข้าตะกร้า
window.selectSubject = async (subject_id) => {
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;

    const sections = await loadOpenSections(year, semester);
    // BUG FIX: Filter by student's class_level and classroom/room
    const section = sections.find(s =>
        s.subject_id == subject_id &&
        s.class_level == student.class_level &&
        (String(s.classroom) == String(student.room) || String(s.room) == String(student.room))
    );

    if (!section) {
        alert("วิชานี้ไม่เปิดสอนในระดับชั้นหรือห้องเรียนของคุณ");
        return;
    }

    await addToCart(student.id, section.id, year, semester);
    await loadCartTable();

    const cartSection = document.querySelectorAll(".student-section")[2];
    if (cartSection) cartSection.scrollIntoView({ behavior: "smooth", block: "start" });
};

// โหลดตะกร้า
async function loadCartTable() {
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;
    const tbody = qs("#cartItems");

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="center">กำลังโหลดตะกร้า...</td>
        </tr>`;

    const items = await loadCart(student.id, year, semester);
    updateHero(items.length);

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="center">ยังไม่มีรายวิชาในตะกร้า</td>
            </tr>`;
    } else {
        tbody.innerHTML = "";
        items.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.subject_code}</td>
                <td style="text-align:left;">${item.subject_name}</td>
                <td class="center">${item.credit}</td>
                <td>${item.day_of_week ?? "-"} ${item.time_range ?? ""}</td>
                <td class="center">
                    <button class="btn-icon delete" onclick="removeItem(${item.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    await loadRegisteredTable();
}

// รายวิชาที่บันทึกแล้ว
async function loadRegisteredTable() {
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;
    const tbody = qs("#registeredItems");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="center">กำลังโหลด...</td>
        </tr>`;

    const items = await loadRegistered(student.id, year, semester);
    if (!items.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="center">ยังไม่มีรายวิชาที่บันทึกแล้ว</td>
            </tr>`;
        return;
    }

    tbody.innerHTML = "";
    items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.subject_code}</td>
            <td style="text-align:left;">${item.subject_name}</td>
            <td class="center">${item.credit}</td>
            <td>${item.day_of_week ?? "-"} ${item.time_range ?? ""}</td>
            <td class="center">
                <button class="btn-icon delete" onclick="removeRegisteredItem(${item.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ลบออกจากตะกร้า
window.removeItem = async (id) => {
    const ok = confirm("ต้องการลบวิชานี้ออกจากตะกร้าหรือไม่?");
    if (!ok) return;
    await removeCartItem(id);
    await loadCartTable();
};

// บันทึกรายวิชาในตะกร้า
async function confirmCart() {
    const year = qs("#regYear").value;
    const semester = qs("#regSemester").value;
    const ok = confirm("ยืนยันบันทึกรายวิชาที่เลือกทั้งหมดหรือไม่?");
    if (!ok) return;
    await confirmRegistration(student.id, year, semester);
    await loadCartTable();
}
// ลบออกจากวิชาที่บันทึกแล้ว (สำหรับทดสอบ)
window.removeRegisteredItem = async (id) => {
    const ok = confirm("ต้องการลบวิชานี้ออกจากรายการที่บันทึกแล้วหรือไม่? (ใช้สำหรับทดสอบระบบ)");
    if (!ok) return;
    await removeCartItem(id); // ใช้ API เดียวกับลบจากตะกร้า เพราะ backend ลบจาก registrations โดย ID
    await loadCartTable();
};
