// =========================================================
// LUYỆN NHỚ ĐOẠN VĂN - JAVASCRIPT ENGINE
// Học thuộc đoạn văn & Viết lại chấm thời gian thực từng từ
// =========================================================

let currentParagraph = null;
let wordsList = []; // Array of { raw, clean, trailingPunct, done }
let currentIndex = 0;
let timerInterval = null;
let startTime = null;
let errorCount = 0;
let correctCount = 0;
let audioUtterance = null;
let peekTimer = null;

let savedParagraphs = Array.isArray(window.__INITIAL_SAVED_PARAGRAPHS) ? window.__INITIAL_SAVED_PARAGRAPHS : [];

// =========================================================
// 1. WEB AUDIO API CHIME & SOUND EFFECTS
// =========================================================
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

function playChimeSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        // Tone 1: 587.33 Hz (D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.18);

        // Tone 2: 880 Hz (A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.08);
        gain2.gain.setValueAtTime(0.2, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
    } catch (e) {}
}

function playWrongSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    } catch (e) {}
}

// =========================================================
// 2. TẠO ĐOẠN VĂN (AI HOẶC TỰ NHẬP)
// =========================================================

function chonChuDe(tenChuDe) {
    const inp = document.getElementById("aiChuDe");
    if (inp) {
        inp.value = tenChuDe;
        inp.focus();
    }
}
window.chonChuDe = chonChuDe;

async function taoDoanVanAi() {
    const chuDe = (document.getElementById("aiChuDe")?.value || "").trim() || "Đời sống hàng ngày";
    const doDai = document.getElementById("aiDoDai")?.value || "vua";
    const boId = document.getElementById("aiBoId")?.value || "";
    const chkLuu = document.getElementById("aiChkLuu")?.checked;

    const setupCard = document.getElementById("cardSetup");
    const loadingBox = document.getElementById("aiLoadingBox");
    const loadingTitle = document.getElementById("aiLoadingTitle");

    if (setupCard) setupCard.style.display = "none";
    if (loadingBox) {
        loadingBox.style.display = "block";
        if (loadingTitle) loadingTitle.textContent = `🤖 AI đang sáng tác đoạn văn về "${chuDe}"...`;
    }

    try {
        const payload = {
            chuDe,
            doDai,
            boId: (boId && boId !== "ALL") ? boId : null,
            dungTuCuaToi: (boId === "ALL")
        };

        const resp = await fetch("/api/doan-van/tao-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.status === 401) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            window.location.href = "/dangnhap";
            return;
        }

        const data = await resp.json();
        if (!resp.ok || !data.ok || !data.data) {
            throw new Error(data.error || "Không thể tạo đoạn văn bằng AI");
        }

        const pData = data.data;
        currentParagraph = {
            tieuDe: pData.tieuDe || chuDe,
            noiDungEn: pData.noiDungEn,
            dichVi: pData.dichVi,
            danhSachTuChinh: pData.danhSachTuChinh || [],
            soTu: pData.soTu,
            isSaved: false
        };

        // Nếu người dùng chọn lưu bài
        if (chkLuu) {
            await luuDoanVanHienTaiSilently();
        }

        if (loadingBox) loadingBox.style.display = "none";
        hienThiGiaiDoanHocThuoc();
    } catch (err) {
        console.error("Lỗi tạo đoạn văn AI:", err);
        alert(err.message || "Đã xảy ra lỗi khi tạo đoạn văn.");
        if (loadingBox) loadingBox.style.display = "none";
        if (setupCard) setupCard.style.display = "block";
    }
}
window.taoDoanVanAi = taoDoanVanAi;

async function batDauTuNhap() {
    const tieuDe = (document.getElementById("nhapTieuDe")?.value || "").trim();
    const noiDungEn = (document.getElementById("nhapNoiDungEn")?.value || "").trim();
    const chkLuu = document.getElementById("nhapChkLuu")?.checked;

    if (!noiDungEn) {
        alert("Vui lòng nhập hoặc dán đoạn văn tiếng Anh!");
        document.getElementById("nhapNoiDungEn")?.focus();
        return;
    }

    const words = noiDungEn.split(/\s+/).filter(Boolean);
    if (words.length < 5) {
        alert("Đoạn văn cần có ít nhất 5 từ!");
        return;
    }

    const setupCard = document.getElementById("cardSetup");
    const loadingBox = document.getElementById("aiLoadingBox");
    const loadingTitle = document.getElementById("aiLoadingTitle");

    if (setupCard) setupCard.style.display = "none";
    if (loadingBox) {
        loadingBox.style.display = "block";
        if (loadingTitle) loadingTitle.textContent = "🤖 Đang dịch nghĩa và chuẩn bị bài học...";
    }

    try {
        const resp = await fetch("/api/doan-van/phan-tich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noiDungEn })
        });

        let pData = null;
        if (resp.ok) {
            const data = await resp.json();
            if (data.ok && data.data) pData = data.data;
        }

        currentParagraph = {
            tieuDe: tieuDe || pData?.tieuDe || "Đoạn văn tự nhập",
            noiDungEn: noiDungEn,
            dichVi: pData?.dichVi || "",
            danhSachTuChinh: pData?.danhSachTuChinh || [],
            soTu: words.length,
            isSaved: false
        };

        if (chkLuu) {
            await luuDoanVanHienTaiSilently();
        }

        if (loadingBox) loadingBox.style.display = "none";
        hienThiGiaiDoanHocThuoc();
    } catch (err) {
        console.warn("Lỗi phân tích bài tự nhập:", err);
        // Fallback: start immediately even if translation fails
        currentParagraph = {
            tieuDe: tieuDe || "Đoạn văn tự nhập",
            noiDungEn: noiDungEn,
            dichVi: "",
            danhSachTuChinh: [],
            soTu: words.length,
            isSaved: false
        };
        if (loadingBox) loadingBox.style.display = "none";
        hienThiGiaiDoanHocThuoc();
    }
}
window.batDauTuNhap = batDauTuNhap;

// =========================================================
// 3. LƯU & QUẢN LÝ KHO BÀI ĐÃ LƯU
// =========================================================

async function luuDoanVanHienTaiSilently() {
    if (!currentParagraph || currentParagraph.isSaved) return;
    try {
        const resp = await fetch("/api/doan-van/luu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tieuDe: currentParagraph.tieuDe,
                noiDungEn: currentParagraph.noiDungEn,
                dichVi: currentParagraph.dichVi,
                soTu: currentParagraph.soTu
            })
        });
        const data = await resp.json();
        if (data.ok && data.item) {
            currentParagraph.id = data.item.id;
            currentParagraph.isSaved = true;
            // Thêm vào đầu danh sách đã lưu
            savedParagraphs.unshift(data.item);
            capNhatGiaoDienKhoBai();
        }
    } catch (e) {
        console.warn("Lỗi lưu bài tự động:", e);
    }
}

async function luuBaiHienTaiTuModal() {
    await luuDoanVanHienTaiSilently();
    const btn = document.getElementById("btnModalLuuBai");
    if (btn) {
        btn.textContent = "✅ Đã lưu vào kho!";
        btn.disabled = true;
    }
}
window.luuBaiHienTaiTuModal = luuBaiHienTaiTuModal;

function capNhatGiaoDienKhoBai() {
    const badge = document.getElementById("badgeSoLuongBai");
    if (badge) badge.textContent = savedParagraphs.length;

    const quickContainer = document.getElementById("quickSavedContainer");
    const quickChips = document.getElementById("quickSavedChips");
    if (quickContainer && quickChips) {
        if (savedParagraphs.length > 0) {
            quickContainer.style.display = "block";
            quickChips.innerHTML = savedParagraphs.slice(0, 5).map(b => `
                <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" onclick="taiBaiDaLuu(${b.id})">
                    📄 ${escapeHtml(b.tieuDe)} <small class="text-muted">(${b.soTu} từ)</small>
                </button>
            `).join("");
        } else {
            quickContainer.style.display = "none";
        }
    }
}

function moModalKhoBai() {
    renderListKhoBai(savedParagraphs);
    const modalEl = document.getElementById("modalKhoBai");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
    }
}
window.moModalKhoBai = moModalKhoBai;

function renderListKhoBai(items) {
    const container = document.getElementById("listKhoBaiContainer");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted">Chưa có bài nào được lưu trong kho. Hãy tạo hoặc nhập bài mới!</div>`;
        return;
    }

    container.innerHTML = items.map(b => `
        <div class="card p-3 mb-2 saved-item-card rounded-3 d-flex flex-row justify-content-between align-items-center flex-wrap gap-2">
            <div>
                <h6 class="fw-bold text-primary mb-1">${escapeHtml(b.tieuDe)}</h6>
                <div class="small text-muted text-truncate" style="max-width: 480px;">${escapeHtml(b.noiDungEn)}</div>
                <div class="small text-secondary mt-1">
                    <span class="badge bg-secondary-subtle text-secondary me-2">📏 ${b.soTu} từ</span>
                    <span>🕒 ${b.ngayTao ? new Date(b.ngayTao).toLocaleDateString("vi-VN") : ""}</span>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-primary px-3 fw-bold" onclick="taiBaiDaLuu(${b.id})" data-bs-dismiss="modal">
                    📖 Học bài này
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="xoaBaiDaLuu(${b.id}, event)" title="Xóa bài này">
                    🗑️
                </button>
            </div>
        </div>
    `).join("");
}

function locKhoBai(query) {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
        renderListKhoBai(savedParagraphs);
        return;
    }
    const filtered = savedParagraphs.filter(b => 
        (b.tieuDe && b.tieuDe.toLowerCase().includes(q)) ||
        (b.noiDungEn && b.noiDungEn.toLowerCase().includes(q))
    );
    renderListKhoBai(filtered);
}
window.locKhoBai = locKhoBai;

async function taiBaiDaLuu(id) {
    dungPhatAm();
    const item = savedParagraphs.find(b => Number(b.id) === Number(id));
    if (!item) {
        alert("Không tìm thấy bài học này!");
        return;
    }

    currentParagraph = {
        id: item.id,
        tieuDe: item.tieuDe,
        noiDungEn: item.noiDungEn,
        dichVi: item.dichVi,
        danhSachTuChinh: [],
        soTu: item.soTu || item.noiDungEn.split(/\s+/).filter(Boolean).length,
        isSaved: true
    };

    const modalEl = document.getElementById("modalKhoBai");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
    }

    document.getElementById("cardSetup").style.display = "none";
    hienThiGiaiDoanHocThuoc();
}
window.taiBaiDaLuu = taiBaiDaLuu;

async function xoaBaiDaLuu(id, evt) {
    if (evt) evt.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa bài này khỏi kho bài học đã lưu?")) return;

    try {
        const resp = await fetch(`/api/doan-van/xoa/${id}`, { method: "POST" });
        if (resp.ok) {
            savedParagraphs = savedParagraphs.filter(b => Number(b.id) !== Number(id));
            capNhatGiaoDienKhoBai();
            renderListKhoBai(savedParagraphs);
        }
    } catch (e) {
        alert("Không thể xóa bài học: " + e.message);
    }
}
window.xoaBaiDaLuu = xoaBaiDaLuu;

// =========================================================
// 4. GIAI ĐOẠN 1: HỌC THUỘC (STUDY PHASE)
// =========================================================

function hienThiGiaiDoanHocThuoc() {
    dungPhatAm();
    document.getElementById("cardSetup").style.display = "none";
    document.getElementById("cardVietLai").style.display = "none";
    const cardHocThuoc = document.getElementById("cardHocThuoc");
    if (!cardHocThuoc) return;

    cardHocThuoc.style.display = "block";

    // Tiêu đề & số từ
    document.getElementById("tieuDeHocThuoc").textContent = currentParagraph.tieuDe || "Đoạn văn học thuộc";
    document.getElementById("badgeSoTuHocThuoc").textContent = `${currentParagraph.soTu || 0} từ`;

    // Hiển thị đoạn văn với các từ có thể click nghe phát âm
    const boxText = document.getElementById("boxVanBanHocThuoc");
    if (boxText) {
        const rawText = currentParagraph.noiDungEn || "";
        // Tách thành các từ và giữ nguyên dấu câu
        const words = rawText.split(/\s+/).filter(Boolean);
        boxText.innerHTML = words.map(w => {
            const cleanWord = w.replace(/^[^\w]+|[^\w]+$/g, "");
            return `<span class="study-word" onclick="docTu('${escapeJs(cleanWord)}')" title="Bấm để nghe phát âm">${escapeHtml(w)}</span>`;
        }).join(" ");
    }

    // Hiển thị bản dịch tiếng Việt
    const boxDich = document.getElementById("boxDichVi");
    if (boxDich) {
        boxDich.style.display = "none";
        boxDich.textContent = currentParagraph.dichVi || "Chưa có bản dịch cho bài này.";
        const lbl = document.getElementById("lblToggleDich");
        if (lbl) lbl.textContent = "Xem bản dịch tiếng Việt";
    }

    // Từ vựng chính
    const boxKey = document.getElementById("boxKeyVocab");
    const listKey = document.getElementById("listKeyVocab");
    if (boxKey && listKey) {
        if (Array.isArray(currentParagraph.danhSachTuChinh) && currentParagraph.danhSachTuChinh.length > 0) {
            boxKey.style.display = "block";
            listKey.innerHTML = currentParagraph.danhSachTuChinh.map(t => `
                <div class="col-md-6 col-12">
                    <div class="p-2 bg-light rounded border d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(t.tiengAnh)}</strong>
                            <small class="text-muted fst-italic ms-1">${escapeHtml(t.phienAm || "")}</small>
                            <div class="small text-secondary">${escapeHtml(t.tiengViet || "")}</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escapeJs(t.tiengAnh)}')">🔊</button>
                    </div>
                </div>
            `).join("");
        } else {
            boxKey.style.display = "none";
        }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleDichVi() {
    const box = document.getElementById("boxDichVi");
    const lbl = document.getElementById("lblToggleDich");
    if (!box) return;
    const isShowing = box.style.display !== "none";
    box.style.display = isShowing ? "none" : "block";
    if (lbl) lbl.textContent = isShowing ? "Xem bản dịch tiếng Việt" : "Ẩn bản dịch tiếng Việt";
}
window.toggleDichVi = toggleDichVi;

function quayLaiThietLap() {
    dungPhatAm();
    document.getElementById("cardHocThuoc").style.display = "none";
    document.getElementById("cardVietLai").style.display = "none";
    document.getElementById("cardSetup").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}
window.quayLaiThietLap = quayLaiThietLap;

// =========================================================
// 5. GIAI ĐOẠN 2: VIẾT LẠI TỪNG TỪ (RETYPING ENGINE)
// =========================================================

function batDauGiaiDoanVietLai() {
    dungPhatAm();
    if (!currentParagraph || !currentParagraph.noiDungEn) return;

    // Phân tích văn bản thành mảng các từ
    const rawTokens = currentParagraph.noiDungEn.trim().split(/\s+/).filter(Boolean);
    wordsList = rawTokens.map(w => {
        // Tách từ sạch và dấu câu đuôi (như , . ! ? ; : " ')
        const match = w.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
        let clean = w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
        let trailingPunct = "";
        if (match) {
            clean = match[2].toLowerCase();
            trailingPunct = match[3] || "";
        }
        return {
            raw: w,
            clean: clean,
            trailingPunct: trailingPunct,
            done: false
        };
    });

    currentIndex = 0;
    errorCount = 0;
    correctCount = 0;
    startTime = Date.now();

    document.getElementById("cardHocThuoc").style.display = "none";
    const cardVietLai = document.getElementById("cardVietLai");
    cardVietLai.style.display = "block";

    document.getElementById("tieuDeVietLai").textContent = currentParagraph.tieuDe || "Đoạn văn";
    document.getElementById("lblTongSoTu").textContent = wordsList.length;

    capNhatTienDoStream();
    khoiDongTimer();

    const inp = document.getElementById("inputTuHienTai");
    if (inp) {
        inp.value = "";
        inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input";
        inp.disabled = false;
        setTimeout(() => inp.focus(), 100);
    }

    const hint = document.getElementById("hintText");
    if (hint) hint.style.display = "none";

    window.scrollTo({ top: 0, behavior: "smooth" });
}
window.batDauGiaiDoanVietLai = batDauGiaiDoanVietLai;

function quayLaiHocThuoc() {
    dungTimer();
    hienThiGiaiDoanHocThuoc();
}
window.quayLaiHocThuoc = quayLaiHocThuoc;

function khoiDongLaiVietLai() {
    batDauGiaiDoanVietLai();
}
window.khoiDongLaiVietLai = khoiDongLaiVietLai;

function khoiDongTimer() {
    dungTimer();
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
        const ss = String(elapsedSec % 60).padStart(2, "0");
        const timerEl = document.getElementById("metricTimer");
        if (timerEl) timerEl.textContent = `${mm}:${ss}`;

        // WPM: words / minutes
        const minutes = Math.max(elapsedSec / 60, 0.05);
        const wpm = Math.round(correctCount / minutes);
        const wpmEl = document.getElementById("metricWpm");
        if (wpmEl) wpmEl.innerHTML = `${wpm} <small class="fs-6">WPM</small>`;
    }, 500);
}

function dungTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function capNhatTienDoStream() {
    const streamBox = document.getElementById("boxParagraphStream");
    if (!streamBox) return;

    streamBox.innerHTML = wordsList.map((item, idx) => {
        if (idx < currentIndex) {
            return `<span class="stream-word done">${escapeHtml(item.raw)}</span>`;
        } else if (idx === currentIndex) {
            return `<span class="stream-word current" id="targetCurrentWord">${escapeHtml(item.raw)}</span>`;
        } else {
            // Upcoming word: show masked dots
            return `<span class="stream-word upcoming">••••</span>`;
        }
    }).join(" ");

    // Cuộn mượt đến từ hiện tại
    const currentEl = document.getElementById("targetCurrentWord");
    if (currentEl) {
        currentEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    // Cập nhật số liệu
    const percent = wordsList.length > 0 ? Math.round((currentIndex / wordsList.length) * 100) : 0;
    document.getElementById("lblSoTuDung").textContent = currentIndex;
    document.getElementById("lblPhanTram").textContent = `${percent}%`;
    const bar = document.getElementById("barTienDo");
    if (bar) bar.style.width = `${percent}%`;

    const totalAttempts = correctCount + errorCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;
    document.getElementById("metricAccuracy").textContent = `${accuracy}%`;
    document.getElementById("metricErrors").textContent = errorCount;
}

// Bắt sự kiện gõ phím chấm từ tức thì
const inputEl = document.getElementById("inputTuHienTai");
if (inputEl) {
    inputEl.addEventListener("keydown", function(e) {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            kiemTraTuHienTai();
        }
    });

    inputEl.addEventListener("input", function() {
        const val = inputEl.value.trim().toLowerCase();
        if (!val || currentIndex >= wordsList.length) return;
        const target = wordsList[currentIndex];
        
        // Nếu người dùng gõ đúng hoàn toàn từ sạch thì tự động chấm luôn không cần bấm space
        if (val === target.clean) {
            kiemTraTuHienTai();
        }
    });
}

function kiemTraTuHienTai() {
    if (currentIndex >= wordsList.length) return;

    const inp = document.getElementById("inputTuHienTai");
    const hint = document.getElementById("hintText");
    const pill = document.getElementById("feedbackPill");
    const val = (inp.value || "").trim();
    if (!val) return;

    const target = wordsList[currentIndex];
    const cleanUser = val.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");

    // So sánh từ người dùng với từ mục tiêu
    const isMatch = (cleanUser === target.clean) || (val.toLowerCase() === target.raw.toLowerCase());

    if (isMatch) {
        // ĐÚNG TỪ!
        playChimeSound();
        correctCount++;
        wordsList[currentIndex].done = true;
        currentIndex++;

        // Visual flash success
        inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input is-correct-flash";
        if (pill) {
            pill.className = "feedback-pill pill-correct";
            pill.textContent = "✓ Đúng!";
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 800);
        }
        if (hint) hint.style.display = "none";

        inp.value = "";
        capNhatTienDoStream();

        setTimeout(() => {
            if (inp) inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input";
        }, 180);

        // Kiểm tra xem đã hoàn thành toàn bộ đoạn văn chưa
        if (currentIndex >= wordsList.length) {
            xuLyHoanThanhBaiViet();
        }
    } else {
        // SAI TỪ!
        playWrongSound();
        errorCount++;

        inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input is-wrong-flash";
        if (pill) {
            pill.className = "feedback-pill pill-wrong";
            pill.textContent = "✕ Sai!";
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 800);
        }

        if (hint) {
            hint.textContent = `❌ Sai rồi! Từ đúng là: "${target.raw}"`;
            hint.style.display = "block";
        }

        capNhatTienDoStream();

        setTimeout(() => {
            if (inp) {
                inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input";
                inp.select();
            }
        }, 300);
    }
}

function goiYKyTuDau() {
    if (currentIndex >= wordsList.length) return;
    const target = wordsList[currentIndex];
    const inp = document.getElementById("inputTuHienTai");
    if (!inp) return;
    // Điền 1-2 ký tự đầu
    const hintLetters = target.clean.slice(0, 2);
    inp.value = hintLetters;
    inp.focus();
}
window.goiYKyTuDau = goiYKyTuDau;

function liecDoanVanGoc() {
    const box = document.getElementById("boxPeekOverlay");
    const content = document.getElementById("peekContent");
    const countdown = document.getElementById("peekCountdown");
    if (!box || !content) return;

    if (peekTimer) clearInterval(peekTimer);

    content.textContent = currentParagraph.noiDungEn || "";
    box.style.display = "block";

    let remaining = 3;
    if (countdown) countdown.textContent = remaining;

    peekTimer = setInterval(() => {
        remaining--;
        if (countdown) countdown.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(peekTimer);
            box.style.display = "none";
        }
    }, 1000);
}
window.liecDoanVanGoc = liecDoanVanGoc;

function docTuHienTai() {
    if (currentIndex >= wordsList.length) return;
    const target = wordsList[currentIndex];
    docTu(target.clean);
}
window.docTuHienTai = docTuHienTai;

function xuLyHoanThanhBaiViet() {
    dungTimer();
    dungPhatAm();

    const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");
    const timeStr = `${mm}:${ss}`;

    const minutes = Math.max(elapsedSec / 60, 0.05);
    const wpm = Math.round(wordsList.length / minutes);
    const totalAttempts = correctCount + errorCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

    document.getElementById("modalResultTime").textContent = timeStr;
    document.getElementById("modalResultWpm").textContent = `${wpm} WPM`;
    document.getElementById("modalResultAccuracy").textContent = `${accuracy}%`;
    document.getElementById("modalResultWords").textContent = wordsList.length;

    const btnLuu = document.getElementById("btnModalLuuBai");
    if (btnLuu) {
        if (!currentParagraph.isSaved) {
            btnLuu.style.display = "inline-block";
            btnLuu.textContent = "💾 Lưu bài này vào kho bài học";
            btnLuu.disabled = false;
        } else {
            btnLuu.style.display = "none";
        }
    }

    const modalEl = document.getElementById("modalHoanThanh");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
    }
}

// =========================================================
// 6. PHÁT ÂM THANH (TTS)
// =========================================================

function phatToanBai() {
    if (!currentParagraph || !currentParagraph.noiDungEn) return;
    dungPhatAm();

    const speedSelect = document.getElementById("selectTocDoDoc");
    const rateVal = speedSelect ? parseFloat(speedSelect.value) : 0.85;

    const btnPhat = document.getElementById("btnPhatToanBai");
    const btnDung = document.getElementById("btnDungPhat");

    if (window.phatAmThanh) {
        window.phatAmThanh(currentParagraph.noiDungEn, {
            rate: rateVal === 1.0 ? "+0%" : (rateVal < 1.0 ? `-${Math.round((1 - rateVal) * 100)}%` : `+${Math.round((rateVal - 1) * 100)}%`),
            onStart: () => {
                if (btnPhat) btnPhat.style.display = "none";
                if (btnDung) btnDung.style.display = "inline-flex";
            },
            onEnd: () => {
                if (btnPhat) btnPhat.style.display = "inline-flex";
                if (btnDung) btnDung.style.display = "none";
            }
        });
        return;
    }

    if (!window.speechSynthesis) return;
    audioUtterance = new SpeechSynthesisUtterance(currentParagraph.noiDungEn);
    audioUtterance.lang = "en-US";
    audioUtterance.rate = rateVal;

    audioUtterance.onstart = () => {
        if (btnPhat) btnPhat.style.display = "none";
        if (btnDung) btnDung.style.display = "inline-flex";
    };
    audioUtterance.onend = () => {
        if (btnPhat) btnPhat.style.display = "inline-flex";
        if (btnDung) btnDung.style.display = "none";
    };
    audioUtterance.onerror = () => {
        if (btnPhat) btnPhat.style.display = "inline-flex";
        if (btnDung) btnDung.style.display = "none";
    };

    window.speechSynthesis.speak(audioUtterance);
}
window.phatToanBai = phatToanBai;

function dungPhatAm() {
    if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    const btnPhat = document.getElementById("btnPhatToanBai");
    const btnDung = document.getElementById("btnDungPhat");
    if (btnPhat) btnPhat.style.display = "inline-flex";
    if (btnDung) btnDung.style.display = "none";
}
window.dungPhatAm = dungPhatAm;

function docTu(tu) {
    if (!tu) return;
    if (window.phatAmThanh) {
        window.phatAmThanh(tu);
        return;
    }
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(tu);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
}
window.docTu = docTu;

// Helpers
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}
