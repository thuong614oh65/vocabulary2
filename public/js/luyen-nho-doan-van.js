// =========================================================
// LUYỆN NHỚ ĐOẠN VĂN - JAVASCRIPT ENGINE CHUẨN QUỐC TẾ
// Dựa trên phương pháp Active Recall của Memorize By Heart,
// MonkeyType & DailyDictation
// =========================================================

let currentParagraph = null;
let sentencesList = [];
let allWordsList = [];
let currentSentenceIdx = 0;
let currentWordInSentenceIdx = 0;
let globalWordIdx = 0;

let activeMode = "FIRST_LETTER"; // "FIRST_LETTER" | "SENTENCE_DICTATION" | "FULL_PASSAGE"
let maskStyle = "BLANK"; // "BLANK" | "FIRST_LETTER_HINT" | "GHOST"

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
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Tone 2: 880 Hz (A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.06);
        gain2.gain.setValueAtTime(0.18, now + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.3);
    } catch (e) {}
}

function playSentenceCompleteSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteTime = now + (idx * 0.07);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, noteTime);
            gain.gain.setValueAtTime(0.15, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(noteTime);
            osc.stop(noteTime + 0.25);
        });
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
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    } catch (e) {}
}

// =========================================================
// 2. PARSE & SEGMENT PARAGRAPH INTO SENTENCES & WORDS
// =========================================================

function phanTichDoanVanThanhCauVaTu(text) {
    if (!text) return { sentences: [], allWords: [] };

    // Tách các câu dựa theo dấu câu kết thúc (. ! ? hoặc xuống dòng)
    const rawSentences = text.match(/[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g) || [text];
    const cleanSentences = rawSentences.map(s => s.trim()).filter(Boolean);

    let globalCounter = 0;
    const allWords = [];

    const sentences = cleanSentences.map((sText, sIdx) => {
        // Tách từ trong câu
        const rawTokens = sText.split(/\s+/).filter(Boolean);
        const words = rawTokens.map(tok => {
            const match = tok.match(/^([^\w]*)([\w'’-]+)([^\w]*)$/);
            let prefix = "";
            let clean = tok.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
            let trailing = "";
            if (match) {
                prefix = match[1] || "";
                clean = match[2].toLowerCase();
                trailing = match[3] || "";
            }
            const firstLetter = clean ? clean.charAt(0) : "";

            const wordObj = {
                raw: tok,
                clean: clean,
                firstLetter: firstLetter,
                prefix: prefix,
                trailing: trailing,
                done: false,
                skipped: false,
                sentenceIndex: sIdx,
                globalIndex: globalCounter++
            };
            allWords.push(wordObj);
            return wordObj;
        });

        return {
            sentenceIndex: sIdx,
            rawText: sText,
            words: words,
            isCompleted: false
        };
    });

    return { sentences, allWords };
}

// =========================================================
// 3. TẠO ĐOẠN VĂN (AI HOẶC TỰ NHẬP)
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
        if (loadingTitle) loadingTitle.textContent = "🤖 Đang chuẩn bị bài học và dịch nghĩa...";
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
// 4. LƯU & QUẢN LÝ KHO BÀI ĐÃ LƯU
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
// 5. GIAI ĐOẠN 1: HỌC THUỘC (STUDY PHASE)
// =========================================================

function hienThiGiaiDoanHocThuoc() {
    dungPhatAm();
    document.getElementById("cardSetup").style.display = "none";
    document.getElementById("cardVietLai").style.display = "none";
    const cardHocThuoc = document.getElementById("cardHocThuoc");
    if (!cardHocThuoc) return;

    cardHocThuoc.style.display = "block";

    // Phân tích câu và từ
    const parsed = phanTichDoanVanThanhCauVaTu(currentParagraph.noiDungEn);
    sentencesList = parsed.sentences;
    allWordsList = parsed.allWords;

    document.getElementById("tieuDeHocThuoc").textContent = currentParagraph.tieuDe || "Đoạn văn học thuộc";
    document.getElementById("badgeSoTuHocThuoc").textContent = `${allWordsList.length} từ • ${sentencesList.length} câu`;

    // Hiển thị đoạn văn tự nhiên với các từ có thể click nghe phát âm
    const boxText = document.getElementById("boxVanBanHocThuoc");
    if (boxText) {
        boxText.innerHTML = sentencesList.map(s => `
            <div class="mb-3 p-2 rounded study-sentence">
                ${s.words.map(w => `
                    ${w.prefix ? `<span>${escapeHtml(w.prefix)}</span>` : ""}
                    <span class="study-word" onclick="docTu('${escapeJs(w.clean)}')" title="Bấm nghe phát âm">${escapeHtml(w.clean)}</span>
                    ${w.trailing ? `<span class="token-punct">${escapeHtml(w.trailing)}</span>` : ""}
                `).join(" ")}
                <button type="button" class="btn btn-sm btn-outline-secondary ms-2 py-0 px-2 rounded-pill" onclick="phatAmVanBan('${escapeJs(s.rawText)}')" title="Nghe câu này">
                    🔊
                </button>
            </div>
        `).join("");
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
// 6. GIAI ĐOẠN 2: LUYỆN NHỚ & VIẾT LẠI (ACTIVE RECALL & RETYPING)
// =========================================================

function batDauGiaiDoanVietLai() {
    dungPhatAm();
    if (!currentParagraph || !currentParagraph.noiDungEn) return;

    // Phân tích văn bản lại đảm bảo dữ liệu mới nhất
    const parsed = phanTichDoanVanThanhCauVaTu(currentParagraph.noiDungEn);
    sentencesList = parsed.sentences;
    allWordsList = parsed.allWords;

    currentSentenceIdx = 0;
    currentWordInSentenceIdx = 0;
    globalWordIdx = 0;
    errorCount = 0;
    correctCount = 0;
    startTime = Date.now();

    document.getElementById("cardHocThuoc").style.display = "none";
    const cardVietLai = document.getElementById("cardVietLai");
    cardVietLai.style.display = "block";

    document.getElementById("tieuDeVietLai").textContent = currentParagraph.tieuDe || "Đoạn văn";
    document.getElementById("lblTongSoTu").textContent = allWordsList.length;

    // Mặc định chọn chế độ Gõ chữ cái đầu (First-Letter) hoặc chế độ đang chọn
    apDungCheDo(activeMode);
    khoiDongTimer();

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

// Chuyển chế độ luyện tập
function chuyenCheDo(mode) {
    activeMode = mode;
    apDungCheDo(mode);
}
window.chuyenCheDo = chuyenCheDo;

function apDungCheDo(mode) {
    // Cập nhật tab active
    document.querySelectorAll(".mode-tab-pill").forEach(p => p.classList.remove("active"));
    const activeTab = document.getElementById(`tabMode_${mode}`);
    if (activeTab) activeTab.classList.add("active");

    const sentenceNav = document.getElementById("sentenceNavBar");
    const hintBanner = document.getElementById("modeInstructionBanner");
    const inputEl = document.getElementById("inputTuHienTai");

    if (mode === "FIRST_LETTER") {
        if (sentenceNav) sentenceNav.style.display = "flex";
        if (hintBanner) {
            hintBanner.className = "alert alert-info py-2 px-3 small fw-bold mb-3 d-flex align-items-center gap-2";
            hintBanner.innerHTML = "⚡ <strong>Siêu trí nhớ (First-Letter Recall):</strong> Chỉ cần nhấn phím <u>chữ cái đầu tiên</u> của mỗi từ. Gõ đúng sẽ sáng xanh và tự nhảy sang từ tiếp theo ngay lập tức!";
            hintBanner.style.display = "flex";
        }
        if (inputEl) {
            inputEl.placeholder = "⚡ Nhấn phím chữ cái đầu của từ...";
            inputEl.value = "";
        }
    } else if (mode === "SENTENCE_DICTATION") {
        if (sentenceNav) sentenceNav.style.display = "flex";
        if (hintBanner) {
            hintBanner.className = "alert alert-primary py-2 px-3 small fw-bold mb-3 d-flex align-items-center gap-2";
            hintBanner.innerHTML = "✍️ <strong>Luyện theo câu (Sentence Dictation):</strong> Gõ hoàn chỉnh từng từ rồi nhấn phím Space hoặc Enter để chuyển từ. Hoàn thành từng câu sẽ tự chuyển câu!";
            hintBanner.style.display = "flex";
        }
        if (inputEl) {
            inputEl.placeholder = "Gõ từ tiếp theo rồi nhấn Space hoặc Enter...";
            inputEl.value = "";
        }
    } else if (mode === "FULL_PASSAGE") {
        if (sentenceNav) sentenceNav.style.display = "none";
        if (hintBanner) {
            hintBanner.className = "alert alert-secondary py-2 px-3 small fw-bold mb-3 d-flex align-items-center gap-2";
            hintBanner.innerHTML = "📜 <strong>Luyện gõ toàn bài (Typewriter):</strong> Dòng chữ tự nhiên, gõ liên tục từ đầu đến cuối đoạn văn!";
            hintBanner.style.display = "flex";
        }
        if (inputEl) {
            inputEl.placeholder = "Gõ từ tiếp theo rồi nhấn Space hoặc Enter...";
            inputEl.value = "";
        }
    }

    renderProseStage();
    capNhatSentenceNav();
    capNhatTienDoMetrics();

    if (inputEl) {
        inputEl.focus();
    }
}

// Chuyển kiểu che từ (Blank / FirstLetter / Ghost)
function datKieuCheTu(style) {
    maskStyle = style;
    document.querySelectorAll(".btn-mask-style").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`btnMask_${style}`);
    if (btn) btn.classList.add("active");
    renderProseStage();
}
window.datKieuCheTu = datKieuCheTu;

// Điều hướng câu
function chuyenCau(delta) {
    const nextIdx = currentSentenceIdx + delta;
    if (nextIdx >= 0 && nextIdx < sentencesList.length) {
        currentSentenceIdx = nextIdx;
        currentWordInSentenceIdx = 0;
        renderProseStage();
        capNhatSentenceNav();
        const inputEl = document.getElementById("inputTuHienTai");
        if (inputEl) {
            inputEl.value = "";
            inputEl.focus();
        }
    }
}
window.chuyenCau = chuyenCau;

function chuyenDenCau(idx) {
    if (idx >= 0 && idx < sentencesList.length) {
        currentSentenceIdx = idx;
        currentWordInSentenceIdx = 0;
        renderProseStage();
        capNhatSentenceNav();
        const inputEl = document.getElementById("inputTuHienTai");
        if (inputEl) {
            inputEl.value = "";
            inputEl.focus();
        }
    }
}
window.chuyenDenCau = chuyenDenCau;

function capNhatSentenceNav() {
    const navText = document.getElementById("sentenceNavText");
    const btnPrev = document.getElementById("btnPrevSentence");
    const btnNext = document.getElementById("btnNextSentence");
    const pillsContainer = document.getElementById("sentencePillsContainer");

    if (sentencesList.length === 0) return;

    const currentSentence = sentencesList[currentSentenceIdx];
    if (navText && currentSentence) {
        const completedWords = currentSentence.words.filter(w => w.done).length;
        navText.innerHTML = `Câu <strong>${currentSentenceIdx + 1}</strong> / ${sentencesList.length} <small class="text-muted">(${completedWords}/${currentSentence.words.length} từ)</small>`;
    }

    if (btnPrev) btnPrev.disabled = (currentSentenceIdx === 0);
    if (btnNext) btnNext.disabled = (currentSentenceIdx === sentencesList.length - 1);

    if (pillsContainer) {
        pillsContainer.innerHTML = sentencesList.map((s, idx) => {
            const isAllDone = s.words.length > 0 && s.words.every(w => w.done);
            let cls = "sentence-pill";
            if (idx === currentSentenceIdx) cls += " active";
            else if (isAllDone) cls += " completed";
            return `<button type="button" class="${cls}" onclick="chuyenDenCau(${idx})" title="Chuyển đến câu ${idx + 1}">${idx + 1}${isAllDone ? "✓" : ""}</button>`;
        }).join("");
    }
}

// =========================================================
// 7. RENDER NATURAL PROSE STAGE (KHÔNG Ô VUÔNG RỜI RẠC)
// =========================================================

function renderProseStage() {
    const stage = document.getElementById("boxParagraphStream");
    if (!stage) return;

    if (activeMode === "FULL_PASSAGE") {
        // Render toàn bộ đoạn văn liền mạch
        let html = "";
        sentencesList.forEach((s, sIdx) => {
            const wordsHtml = s.words.map(w => renderSingleWordToken(w, w.globalIndex === globalWordIdx)).join(" ");
            html += `<span class="prose-sentence-wrap">${wordsHtml}</span> `;
        });
        stage.innerHTML = html;
    } else {
        // Render câu hiện tại (Sentence Dictation & First Letter Recall)
        const currentSentence = sentencesList[currentSentenceIdx];
        if (!currentSentence) return;

        const wordsHtml = currentSentence.words.map((w, wIdx) => {
            const isCurrent = (wIdx === currentWordInSentenceIdx);
            return renderSingleWordToken(w, isCurrent);
        }).join(" ");

        stage.innerHTML = `
            <div class="active-sentence-prose">
                ${wordsHtml}
            </div>
        `;
    }

    // Cuộn mượt đến từ hiện tại
    const currentEl = document.getElementById("targetCurrentWord");
    if (currentEl) {
        currentEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
}

function renderSingleWordToken(w, isCurrent) {
    const prefixHtml = w.prefix ? `<span class="token-prefix">${escapeHtml(w.prefix)}</span>` : "";
    const trailingHtml = w.trailing ? `<span class="token-punct">${escapeHtml(w.trailing)}</span>` : "";

    if (w.done) {
        // Đã hoàn thành từ này
        return `<span class="word-token done">${prefixHtml}${escapeHtml(w.clean)}${trailingHtml}</span>`;
    } else if (w.skipped) {
        // Đã bỏ qua
        return `<span class="word-token skipped">${prefixHtml}${escapeHtml(w.clean)}${trailingHtml}</span>`;
    } else if (isCurrent) {
        // Từ hiện tại đang nhắm đến
        let displayTarget = "";
        if (activeMode === "FIRST_LETTER") {
            // Chế độ first letter: hiển thị chữ cái đầu tiên và gạch dưới các chữ còn lại
            const first = w.clean.charAt(0);
            const rest = "_".repeat(Math.max(1, w.clean.length - 1));
            displayTarget = `<span class="text-primary fw-bold">${escapeHtml(first)}</span><span class="text-muted">${rest}</span>`;
        } else {
            // Hiển thị từ sạch có con trỏ
            displayTarget = escapeHtml(w.clean);
        }
        return `<span class="word-token current" id="targetCurrentWord">${prefixHtml}${displayTarget}${trailingHtml}</span>`;
    } else {
        // Từ sắp tới (Upcoming)
        let maskContent = "";
        if (maskStyle === "BLANK") {
            maskContent = "_".repeat(Math.min(w.clean.length, 8));
            return `<span class="word-token upcoming mask-blank">${prefixHtml}${maskContent}${trailingHtml}</span>`;
        } else if (maskStyle === "FIRST_LETTER_HINT") {
            const first = w.clean.charAt(0);
            const rest = "_".repeat(Math.max(1, w.clean.length - 1));
            return `<span class="word-token upcoming mask-firstletter">${prefixHtml}${first}${rest}${trailingHtml}</span>`;
        } else {
            // GHOST
            return `<span class="word-token upcoming mask-ghost">${prefixHtml}${escapeHtml(w.clean)}${trailingHtml}</span>`;
        }
    }
}

// Lấy từ hiện tại cần kiểm tra
function getActiveTargetWord() {
    if (activeMode === "FULL_PASSAGE") {
        return allWordsList[globalWordIdx] || null;
    } else {
        const sentence = sentencesList[currentSentenceIdx];
        if (!sentence) return null;
        return sentence.words[currentWordInSentenceIdx] || null;
    }
}

// =========================================================
// 8. BẮT PHÍM & XỬ LÝ GÕ THỜI GIAN THỰC
// =========================================================

const inputEl = document.getElementById("inputTuHienTai");
if (inputEl) {
    // Sự kiện phím cho chế độ GÕ CHỮ CÁI ĐẦU (FIRST_LETTER) & ENTER / SPACE
    inputEl.addEventListener("keydown", function(e) {
        if (activeMode === "FIRST_LETTER") {
            // Bỏ qua các phím điều khiển đặc biệt
            if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
                return;
            }

            e.preventDefault();

            // Nếu nhấn phím Space: gợi ý hoặc bỏ qua
            if (e.key === " ") {
                goiYKyTuDau();
                return;
            }

            // Xử lý phím ký tự gõ
            if (e.key.length === 1) {
                kiemTraKyTuDau(e.key.toLowerCase());
            }
        } else {
            // Chế độ GÕ CẢ TỪ (SENTENCE_DICTATION & FULL_PASSAGE)
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                kiemTraTuHienTai();
            }
        }
    });

    // Auto-check khi gõ đúng từ trong chế độ thường
    inputEl.addEventListener("input", function() {
        if (activeMode === "FIRST_LETTER") return;

        const val = inputEl.value.trim().toLowerCase();
        const target = getActiveTargetWord();
        if (!target) return;

        // Nếu người dùng gõ hoàn toàn khớp từ sạch thì chấm luôn không cần bấm space
        if (val === target.clean) {
            kiemTraTuHienTai();
        }
    });
}

// Kiểm tra ký tự đầu tiên (Mode First Letter)
function kiemTraKyTuDau(charTyped) {
    const target = getActiveTargetWord();
    if (!target) return;

    const inp = document.getElementById("inputTuHienTai");
    const pill = document.getElementById("feedbackPill");
    const hint = document.getElementById("hintText");

    const expectedFirst = target.firstLetter.toLowerCase();

    if (charTyped === expectedFirst) {
        // ĐÚNG KÝ TỰ ĐẦU!
        playChimeSound();
        correctCount++;
        target.done = true;

        if (pill) {
            pill.className = "feedback-pill pill-correct";
            pill.textContent = `✓ "${target.clean}"`;
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 600);
        }
        if (hint) hint.style.display = "none";

        chuyenSangTuTiepTheo();
    } else {
        // SAI KÝ TỰ!
        playWrongSound();
        errorCount++;

        if (inp) {
            inp.classList.add("is-wrong-flash");
            setTimeout(() => { if (inp) inp.classList.remove("is-wrong-flash"); }, 300);
        }

        if (pill) {
            pill.className = "feedback-pill pill-wrong";
            pill.textContent = `Phím đúng: "${expectedFirst.toUpperCase()}"`;
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 800);
        }

        if (hint) {
            hint.textContent = `💡 Từ tiếp theo là: "${target.clean}" (Chữ cái đầu: ${expectedFirst.toUpperCase()})`;
            hint.style.display = "block";
        }

        capNhatTienDoMetrics();
    }
}

// Kiểm tra cả từ (Mode Full Word)
function kiemTraTuHienTai() {
    const target = getActiveTargetWord();
    if (!target) return;

    const inp = document.getElementById("inputTuHienTai");
    const pill = document.getElementById("feedbackPill");
    const hint = document.getElementById("hintText");

    const val = (inp.value || "").trim();
    if (!val) return;

    const cleanUser = val.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
    const isMatch = (cleanUser === target.clean) || (val.toLowerCase() === target.raw.toLowerCase());

    if (isMatch) {
        // ĐÚNG TỪ!
        playChimeSound();
        correctCount++;
        target.done = true;

        inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input-main is-correct-flash";
        if (pill) {
            pill.className = "feedback-pill pill-correct";
            pill.textContent = "✓ Đúng!";
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 700);
        }
        if (hint) hint.style.display = "none";

        inp.value = "";
        setTimeout(() => {
            if (inp) inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input-main";
        }, 180);

        chuyenSangTuTiepTheo();
    } else {
        // SAI TỪ!
        playWrongSound();
        errorCount++;

        inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input-main is-wrong-flash";
        if (pill) {
            pill.className = "feedback-pill pill-wrong";
            pill.textContent = "✕ Sai!";
            pill.style.display = "block";
            setTimeout(() => { if (pill) pill.style.display = "none"; }, 800);
        }

        if (hint) {
            hint.textContent = `❌ Chưa chính xác! Từ đúng là: "${target.clean}"`;
            hint.style.display = "block";
        }

        capNhatTienDoMetrics();

        setTimeout(() => {
            if (inp) {
                inp.className = "form-control form-control-lg text-center fw-bold fs-4 typing-input-main";
                inp.select();
            }
        }, 300);
    }
}

// Chuyển sang từ tiếp theo
function chuyenSangTuTiepTheo() {
    if (activeMode === "FULL_PASSAGE") {
        globalWordIdx++;
        renderProseStage();
        capNhatTienDoMetrics();

        if (globalWordIdx >= allWordsList.length) {
            xuLyHoanThanhBaiViet();
        }
    } else {
        const sentence = sentencesList[currentSentenceIdx];
        currentWordInSentenceIdx++;

        if (currentWordInSentenceIdx >= sentence.words.length) {
            // HOÀN THÀNH CÂU!
            sentence.isCompleted = true;
            playSentenceCompleteSound();

            const pill = document.getElementById("feedbackPill");
            if (pill) {
                pill.className = "feedback-pill pill-correct";
                pill.textContent = "🎉 Hoàn thành câu!";
                pill.style.display = "block";
                setTimeout(() => { if (pill) pill.style.display = "none"; }, 1000);
            }

            renderProseStage();
            capNhatSentenceNav();
            capNhatTienDoMetrics();

            // Nếu còn câu tiếp theo -> tự động chuyển sau 600ms
            if (currentSentenceIdx < sentencesList.length - 1) {
                setTimeout(() => {
                    chuyenCau(1);
                }, 600);
            } else {
                // Đã xong toàn bài!
                setTimeout(() => {
                    xuLyHoanThanhBaiViet();
                }, 800);
            }
        } else {
            renderProseStage();
            capNhatSentenceNav();
            capNhatTienDoMetrics();
        }
    }
}

// Cập nhật số liệu tiến độ & WPM
function capNhatTienDoMetrics() {
    const totalWords = allWordsList.length;
    const completedWords = allWordsList.filter(w => w.done).length;
    const percent = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0;

    const lblDung = document.getElementById("lblSoTuDung");
    const lblPhanTram = document.getElementById("lblPhanTram");
    const bar = document.getElementById("barTienDo");

    if (lblDung) lblDung.textContent = completedWords;
    if (lblPhanTram) lblPhanTram.textContent = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;

    const totalAttempts = correctCount + errorCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;
    const accEl = document.getElementById("metricAccuracy");
    const errEl = document.getElementById("metricErrors");

    if (accEl) accEl.textContent = `${accuracy}%`;
    if (errEl) errEl.textContent = errorCount;
}

// Khởi động bộ đếm giờ
function khoiDongTimer() {
    dungTimer();
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
        const ss = String(elapsedSec % 60).padStart(2, "0");
        const timerEl = document.getElementById("metricTimer");
        if (timerEl) timerEl.textContent = `${mm}:${ss}`;

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

// Các nút trợ giúp
function goiYKyTuDau() {
    const target = getActiveTargetWord();
    if (!target) return;
    const hint = document.getElementById("hintText");
    if (hint) {
        hint.textContent = `💡 Gợi ý: Từ bắt đầu bằng "${target.firstLetter.toUpperCase()}" ➔ "${target.clean}"`;
        hint.style.display = "block";
    }
    const inp = document.getElementById("inputTuHienTai");
    if (inp) inp.focus();
}
window.goiYKyTuDau = goiYKyTuDau;

function boQuaTuHienTai() {
    const target = getActiveTargetWord();
    if (!target) return;
    target.skipped = true;
    errorCount++;
    chuyenSangTuTiepTheo();
    const inp = document.getElementById("inputTuHienTai");
    if (inp) {
        inp.value = "";
        inp.focus();
    }
}
window.boQuaTuHienTai = boQuaTuHienTai;

function docTuHienTai() {
    const target = getActiveTargetWord();
    if (!target) return;
    docTu(target.clean);
}
window.docTuHienTai = docTuHienTai;

function phatAmCauHienTai(tocDo = 0.85) {
    const sentence = sentencesList[currentSentenceIdx];
    if (!sentence) return;
    phatAmVanBan(sentence.rawText, tocDo);
}
window.phatAmCauHienTai = phatAmCauHienTai;

function liecDoanVanGoc() {
    const box = document.getElementById("boxPeekOverlay");
    const content = document.getElementById("peekContent");
    const countdown = document.getElementById("peekCountdown");
    if (!box || !content) return;

    if (peekTimer) clearInterval(peekTimer);

    // Nếu ở chế độ câu thì liếc câu hiện tại, nếu toàn bài thì liếc toàn bài
    if (activeMode === "FULL_PASSAGE") {
        content.textContent = currentParagraph.noiDungEn || "";
    } else {
        const sentence = sentencesList[currentSentenceIdx];
        content.textContent = sentence ? sentence.rawText : (currentParagraph.noiDungEn || "");
    }

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

// Xử lý hoàn thành bài
function xuLyHoanThanhBaiViet() {
    dungTimer();
    dungPhatAm();

    const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");
    const timeStr = `${mm}:${ss}`;

    const minutes = Math.max(elapsedSec / 60, 0.05);
    const wpm = Math.round(allWordsList.length / minutes);
    const totalAttempts = correctCount + errorCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

    document.getElementById("modalResultTime").textContent = timeStr;
    document.getElementById("modalResultWpm").textContent = `${wpm} WPM`;
    document.getElementById("modalResultAccuracy").textContent = `${accuracy}%`;
    document.getElementById("modalResultWords").textContent = allWordsList.length;

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
// 9. QUÉT VÀ TRÍCH XUẤT TỪ MỚI TRONG ĐOẠN VĂN
// =========================================================

function moModalQuetTuMoi() {
    if (!currentParagraph || !currentParagraph.noiDungEn) {
        alert("Vui lòng tải hoặc tạo một đoạn văn trước khi quét từ mới!");
        return;
    }
    const modalEl = document.getElementById("modalQuetTuMoi");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
        quetVaTrichXuatTuMoi();
    }
}
window.moModalQuetTuMoi = moModalQuetTuMoi;

async function quetVaTrichXuatTuMoi() {
    const loadingBox = document.getElementById("quetLoadingBox");
    const resultBox = document.getElementById("quetResultBox");
    const countBadge = document.getElementById("quetCountBadge");
    const tableBody = document.getElementById("quetTableBody");
    const emptyBox = document.getElementById("quetEmptyBox");

    if (loadingBox) loadingBox.style.display = "block";
    if (resultBox) resultBox.style.display = "none";
    if (emptyBox) emptyBox.style.display = "none";

    try {
        const resp = await fetch("/api/tu-vung/quet-doan-van", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doanVan: currentParagraph.noiDungEn })
        });

        if (loadingBox) loadingBox.style.display = "none";

        if (!resp.ok) {
            throw new Error("Không thể quét từ mới lúc này.");
        }

        const data = await resp.json();
        const dsTuMoi = data.ketQua || [];

        if (dsTuMoi.length === 0) {
            if (emptyBox) emptyBox.style.display = "block";
            return;
        }

        if (countBadge) countBadge.textContent = `${dsTuMoi.length} từ`;
        if (tableBody) {
            tableBody.innerHTML = dsTuMoi.map((t, idx) => `
                <tr>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chk-tu-moi" checked value="${idx}" data-word='${escapeHtml(JSON.stringify(t))}'>
                    </td>
                    <td class="fw-bold text-primary">${escapeHtml(t.tiengAnh)}</td>
                    <td class="text-muted fst-italic">${escapeHtml(t.phienAm || "")}</td>
                    <td>${escapeHtml(t.tiengViet || "")}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escapeJs(t.tiengAnh)}')">🔊</button>
                    </td>
                </tr>
            `).join("");
        }
        if (resultBox) resultBox.style.display = "block";
    } catch (e) {
        if (loadingBox) loadingBox.style.display = "none";
        alert("Lỗi khi quét từ mới: " + e.message);
    }
}
window.quetVaTrichXuatTuMoi = quetVaTrichXuatTuMoi;

function chonTatCaTuMoi(chkAll) {
    document.querySelectorAll(".chk-tu-moi").forEach(c => {
        c.checked = chkAll.checked;
    });
}
window.chonTatCaTuMoi = chonTatCaTuMoi;

async function luuTatCaTuMoiDaChon() {
    const boId = document.getElementById("selectBoDeLuuTu")?.value;
    const chks = Array.from(document.querySelectorAll(".chk-tu-moi:checked"));
    if (chks.length === 0) {
        alert("Vui lòng tích chọn ít nhất 1 từ để lưu!");
        return;
    }

    const dsTu = chks.map(c => JSON.parse(c.getAttribute("data-word")));
    const btnLuu = document.getElementById("btnLuuTuMoiVaoBo");
    if (btnLuu) {
        btnLuu.disabled = true;
        btnLuu.textContent = "⏳ Đang lưu...";
    }

    try {
        let boIdSuDung = boId;
        if (!boIdSuDung) {
            // Tạo bộ mới tự động
            const tenBoMoi = `Từ mới - ${currentParagraph.tieuDe || "Bài học"}`.slice(0, 50);
            const rBo = await fetch("/api/bo-tu-vung/them", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenBo: tenBoMoi })
            });
            const dBo = await rBo.json();
            if (dBo.ok && dBo.bo) {
                boIdSuDung = dBo.bo.id;
            }
        }

        // Lưu từng từ vào bộ
        for (const t of dsTu) {
            await fetch("/api/tu-vung/them", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tiengAnh: t.tiengAnh,
                    tiengViet: t.tiengViet,
                    phienAm: t.phienAm || "",
                    boId: boIdSuDung
                })
            });
        }

        alert(`✅ Đã lưu thành công ${dsTu.length} từ mới vào bộ từ vựng của bạn!`);
        const modalEl = document.getElementById("modalQuetTuMoi");
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }
    } catch (e) {
        alert("Lỗi khi lưu từ mới: " + e.message);
    } finally {
        if (btnLuu) {
            btnLuu.disabled = false;
            btnLuu.textContent = "💾 Lưu các từ đã chọn vào Bộ học";
        }
    }
}
window.luuTatCaTuMoiDaChon = luuTatCaTuMoiDaChon;

// =========================================================
// 10. TEXT-TO-SPEECH AUDIO CONTROLLER
// =========================================================

function phatToanBai() {
    if (!currentParagraph || !currentParagraph.noiDungEn) return;
    const rateVal = parseFloat(document.getElementById("selectTocDoDoc")?.value || "0.85");
    phatAmVanBan(currentParagraph.noiDungEn, rateVal);
}
window.phatToanBai = phatToanBai;

function phatAmVanBan(text, rateVal = 0.85) {
    if (!text) return;
    dungPhatAm();

    const btnPhat = document.getElementById("btnPhatToanBai");
    const btnDung = document.getElementById("btnDungPhat");

    if (window.phatAmThanh) {
        window.phatAmThanh(text, {
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
    audioUtterance = new SpeechSynthesisUtterance(text);
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
window.phatAmVanBan = phatAmVanBan;

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
