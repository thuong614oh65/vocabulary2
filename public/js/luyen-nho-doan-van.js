// =========================================================
// LUYỆN NHỚ ĐOẠN VĂN - JAVASCRIPT ENGINE CHUẨN SƯ PHẠM
// 1. Đọc hiểu song ngữ sát từng từ (Literal Interlinear)
// 2. Dịch từng câu sang tiếng Anh (Chấm tức thời & Gợi ý từ)
// 3. Nhập toàn bài & Nộp chấm
// =========================================================

let currentParagraph = null;
let sentencesList = [];
let allWordsList = [];
let currentSentenceIdx = 0;

let timerInterval = null;
let startTime = null;
let audioUtterance = null;
let peekTimer = null;

let savedParagraphs = Array.isArray(window.__INITIAL_SAVED_PARAGRAPHS) ? window.__INITIAL_SAVED_PARAGRAPHS : [];

// =========================================================
// 1. WEB AUDIO API SOUND EFFECTS
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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
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
        osc.frequency.linearRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {}
}

// =========================================================
// 2. PARSE PARAGRAPH INTO SENTENCES & WORD TOKENS
// =========================================================

function cleanWord(w) {
    if (!w) return "";
    return w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
}

function tachDoanVanThanhCau(text, cauSongNgu = null) {
    if (!text) return [];

    let cleanSentences = [];
    if (Array.isArray(cauSongNgu) && cauSongNgu.length > 0) {
        cleanSentences = cauSongNgu.map((c, idx) => ({
            index: idx,
            en: (c.en || "").trim(),
            viSat: (c.viSat || c.vi || "").trim()
        }));
    } else {
        const rawSentences = text.match(/[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g) || [text];
        cleanSentences = rawSentences.map(s => s.trim()).filter(Boolean).map((s, idx) => ({
            index: idx,
            en: s,
            viSat: ""
        }));
    }

    let globalCounter = 0;
    return cleanSentences.map((sObj, sIdx) => {
        const rawTokens = sObj.en.split(/\s+/).filter(Boolean);
        const words = rawTokens.map(tok => {
            const match = tok.match(/^([^\w]*)([\w'’-]+)([^\w]*)$/);
            let prefix = "";
            let clean = cleanWord(tok);
            let trailing = "";
            if (match) {
                prefix = match[1] || "";
                clean = cleanWord(match[2]);
                trailing = match[3] || "";
            }
            return {
                raw: tok,
                clean: clean,
                prefix: prefix,
                trailing: trailing,
                sentenceIndex: sIdx,
                globalIndex: globalCounter++
            };
        });

        return {
            index: sIdx,
            en: sObj.en,
            viSat: sObj.viSat,
            words: words,
            userAnswer: "",
            score: null,
            diffTokens: null,
            isCompleted: false
        };
    });
}

// =========================================================
// 3. TẠO HOẶC NHẬP ĐOẠN VĂN
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
        if (loadingTitle) loadingTitle.textContent = `🤖 AI đang sáng tác bài học và dịch sát nghĩa từng từ về "${chuDe}"...`;
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
            cauSongNgu: pData.cauSongNgu || [],
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
        if (loadingTitle) loadingTitle.textContent = "🤖 AI đang phân tích từng câu và dịch sát nghĩa từng từ...";
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
            cauSongNgu: pData?.cauSongNgu || [],
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
            cauSongNgu: [],
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
        cauSongNgu: [],
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
// 5. BƯỚC 1: ĐỌC HIỂU SONG NGỮ SÁT TỪNG TỪ (INTERLINEAR)
// =========================================================

function hienThiGiaiDoanHocThuoc() {
    dungPhatAm();
    document.getElementById("cardSetup").style.display = "none";
    document.getElementById("cardDichTungCau").style.display = "none";
    document.getElementById("cardNhapToanBai").style.display = "none";

    const cardHocThuoc = document.getElementById("cardHocThuoc");
    if (!cardHocThuoc) return;
    cardHocThuoc.style.display = "block";

    sentencesList = tachDoanVanThanhCau(currentParagraph.noiDungEn, currentParagraph.cauSongNgu);
    allWordsList = sentencesList.flatMap(s => s.words);

    document.getElementById("tieuDeHocThuoc").textContent = currentParagraph.tieuDe || "Đoạn văn học thuộc";
    document.getElementById("badgeSoTuHocThuoc").textContent = `${allWordsList.length} từ • ${sentencesList.length} câu`;

    // Hiển thị danh sách các câu: 1 dòng tiếng Anh + 1 dòng tiếng Việt dịch sát từng từ
    const boxText = document.getElementById("boxVanBanHocThuoc");
    if (boxText) {
        boxText.innerHTML = sentencesList.map(s => {
            const viText = s.viSat || currentParagraph.dichVi || "Đang cập nhật bản dịch sát...";
            return `
                <div class="sentence-bilingual-card p-3 mb-3 bg-white rounded-3 border shadow-sm">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold px-2 py-1">
                            Câu ${s.index + 1} (${s.words.length} từ)
                        </span>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-outline-success fw-bold" onclick="phatAmVanBan('${escapeJs(s.en)}')">
                                🔊 Nghe câu
                            </button>
                        </div>
                    </div>

                    <!-- DÒNG 1: TIẾNG ANH (TỪNG TỪ CÓ THỂ CLICK NGHE) -->
                    <div class="sentence-en-text fs-5 fw-bold text-dark mb-2">
                        ${s.words.map(w => `
                            ${w.prefix ? `<span>${escapeHtml(w.prefix)}</span>` : ""}
                            <span class="study-word" onclick="docTu('${escapeJs(w.clean)}')" title="Bấm nghe phát âm '${escapeHtml(w.clean)}'">${escapeHtml(w.clean)}</span>
                            ${w.trailing ? `<span class="text-secondary">${escapeHtml(w.trailing)}</span>` : ""}
                        `).join(" ")}
                    </div>

                    <!-- DÒNG 2: TIẾNG VIỆT DỊCH SÁT TỪNG TỪ -->
                    <div class="sentence-vi-literal p-2 rounded">
                        <span class="fw-bold me-1">🇻🇳 Dịch sát từng từ:</span> ${escapeHtml(viText)}
                    </div>
                </div>
            `;
        }).join("");
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

function quayLaiThietLap() {
    dungPhatAm();
    document.getElementById("cardHocThuoc").style.display = "none";
    document.getElementById("cardDichTungCau").style.display = "none";
    document.getElementById("cardNhapToanBai").style.display = "none";
    document.getElementById("cardSetup").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}
window.quayLaiThietLap = quayLaiThietLap;

// =========================================================
// 6. BƯỚC 2: DỊCH TỪNG CÂU SANG TIẾNG ANH (CÓ CHẤM ĐIỂM)
// =========================================================

function batDauBuoc2DichTungCau(index = 0) {
    dungPhatAm();
    if (!currentParagraph || !currentParagraph.noiDungEn) return;

    document.getElementById("cardHocThuoc").style.display = "none";
    document.getElementById("cardNhapToanBai").style.display = "none";
    const cardDich = document.getElementById("cardDichTungCau");
    cardDich.style.display = "block";

    document.getElementById("tieuDeDichCau").textContent = currentParagraph.tieuDe || "Luyện dịch từng câu";
    chuyenDenCauDich(index);

    window.scrollTo({ top: 0, behavior: "smooth" });
}
window.batDauBuoc2DichTungCau = batDauBuoc2DichTungCau;

function chuyenDenCauDich(idx) {
    if (idx < 0 || idx >= sentencesList.length) return;
    currentSentenceIdx = idx;

    const sentence = sentencesList[currentSentenceIdx];

    // Cập nhật chỉ số câu & nút chuyển
    const navText = document.getElementById("lblChiSoCau");
    const btnPrev = document.getElementById("btnPrevDichCau");
    const btnNext = document.getElementById("btnNextDichCau");
    const pillsContainer = document.getElementById("dichSentencePillsContainer");

    if (navText) {
        const scoreStr = sentence.score !== null ? ` • Điểm: ${sentence.score}%` : "";
        navText.innerHTML = `Câu <strong>${idx + 1}</strong> / ${sentencesList.length} <small class="text-muted">(${sentence.words.length} từ${scoreStr})</small>`;
    }
    if (btnPrev) btnPrev.disabled = (idx === 0);
    if (btnNext) btnNext.disabled = (idx === sentencesList.length - 1);

    if (pillsContainer) {
        pillsContainer.innerHTML = sentencesList.map((s, i) => {
            let cls = "sentence-pill";
            if (i === currentSentenceIdx) cls += " active";
            else if (s.isCompleted) cls += " completed";
            return `<button type="button" class="${cls}" onclick="chuyenDenCauDich(${i})" title="Chuyển đến câu ${i + 1}">${i + 1}${s.isCompleted ? "✓" : ""}</button>`;
        }).join("");
    }

    // Hiển thị câu tiếng Việt sát nghĩa
    const promptEl = document.getElementById("promptCauTiengViet");
    if (promptEl) {
        promptEl.textContent = sentence.viSat || currentParagraph.dichVi || "Dịch câu này sang tiếng Anh:";
    }

    // Input box
    const inp = document.getElementById("inputDichCau");
    if (inp) {
        inp.value = sentence.userAnswer || "";
        setTimeout(() => inp.focus(), 100);
    }

    // Gợi ý pill ẩn đi
    const pill = document.getElementById("smartSuggestionBadge");
    if (pill) pill.style.display = "none";

    // Ẩn hoặc hiện diff cũ nếu đã chấm
    const diffBox = document.getElementById("boxDiffResult");
    if (diffBox) {
        if (sentence.diffTokens && sentence.diffTokens.length > 0) {
            hienThiKetQuaDiff(sentence.diffTokens, sentence.score);
        } else {
            diffBox.style.display = "none";
        }
    }
}
window.chuyenDenCauDich = chuyenDenCauDich;

function chuyenCauDichRelative(delta) {
    chuyenDenCauDich(currentSentenceIdx + delta);
}
window.chuyenCauDichRelative = chuyenCauDichRelative;

// =========================================================
// 7. DIFF & CHẤM ĐIỂM THÔNG MINH (LCS ALGORITHM)
// =========================================================

function diffWords(targetStr, userStr) {
    const targets = targetStr.trim().split(/\s+/).filter(Boolean);
    const users = userStr.trim().split(/\s+/).filter(Boolean);

    const m = targets.length, n = users.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (cleanWord(targets[i - 1]) === cleanWord(users[j - 1])) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    let i = m, j = n;
    const rawTokens = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && cleanWord(targets[i - 1]) === cleanWord(users[j - 1])) {
            rawTokens.unshift({ type: "correct", word: targets[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            rawTokens.unshift({ type: "extra", word: users[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            rawTokens.unshift({ type: "missing", word: targets[i - 1] });
            i--;
        }
    }

    // Kết hợp từ thiếu + thừa liền kề thành 'wrong'
    const combined = [];
    for (let k = 0; k < rawTokens.length; k++) {
        const curr = rawTokens[k];
        const next = rawTokens[k + 1];
        if (curr.type === "extra" && next && next.type === "missing") {
            combined.push({ type: "wrong", typedWord: curr.word, targetWord: next.word });
            k++;
        } else if (curr.type === "missing" && next && next.type === "extra") {
            combined.push({ type: "wrong", typedWord: next.word, targetWord: curr.word });
            k++;
        } else {
            combined.push(curr);
        }
    }

    const correctCount = combined.filter(t => t.type === "correct").length;
    const score = Math.round((correctCount / Math.max(1, targets.length)) * 100);
    return { tokens: combined, score, correctCount, totalCount: targets.length };
}

function chamDiemCauHienTai() {
    const sentence = sentencesList[currentSentenceIdx];
    if (!sentence) return;

    const inp = document.getElementById("inputDichCau");
    const userText = (inp ? inp.value : "").trim();
    if (!userText) {
        alert("Vui lòng nhập câu tiếng Anh trước khi chấm điểm!");
        if (inp) inp.focus();
        return;
    }

    sentence.userAnswer = userText;
    const res = diffWords(sentence.en, userText);
    sentence.score = res.score;
    sentence.diffTokens = res.tokens;

    if (res.score >= 90) {
        sentence.isCompleted = true;
        playChimeSound();
    } else {
        playWrongSound();
    }

    hienThiKetQuaDiff(res.tokens, res.score);

    // Cập nhật lại thanh điều hướng
    chuyenDenCauDich(currentSentenceIdx);
}
window.chamDiemCauHienTai = chamDiemCauHienTai;

function hienThiKetQuaDiff(tokens, score) {
    const box = document.getElementById("boxDiffResult");
    const container = document.getElementById("diffTokensContainer");
    const scoreBadge = document.getElementById("diffScoreBadge");
    if (!box || !container) return;

    box.style.display = "block";
    if (scoreBadge) {
        scoreBadge.textContent = `${score}% (${score >= 90 ? "Xuất sắc 🎉" : score >= 60 ? "Khá tốt 👍" : "Cần sửa lại ⚠️"})`;
        scoreBadge.className = `badge ${score >= 90 ? "bg-success" : score >= 60 ? "bg-primary" : "bg-warning text-dark"} fs-6`;
    }

    container.innerHTML = tokens.map(t => {
        if (t.type === "correct") {
            return `<span class="diff-word diff-correct">${escapeHtml(t.word)} ✓</span>`;
        } else if (t.type === "wrong") {
            return `<span class="diff-word diff-wrong"><del>${escapeHtml(t.typedWord)}</del> ➔ <span class="diff-target-correct">${escapeHtml(t.targetWord)}</span></span>`;
        } else if (t.type === "missing") {
            return `<span class="diff-word diff-missing">Thiếu: "${escapeHtml(t.word)}"</span>`;
        } else if (t.type === "extra") {
            return `<span class="diff-word diff-extra">${escapeHtml(t.word)} (thừa)</span>`;
        }
        return "";
    }).join(" ");

    // Nút chuyển câu tiếp
    const btnNext = document.getElementById("btnTiepTucCau");
    if (btnNext) {
        if (currentSentenceIdx < sentencesList.length - 1) {
            btnNext.style.display = "inline-block";
        } else {
            btnNext.style.display = "none";
        }
    }
}

// =========================================================
// 8. NÚT GỢI Ý TỪ TIẾP THEO THÔNG MINH (NEXT-WORD SUGGESTION)
// =========================================================

function getNextWordHint(targetStr, userStr) {
    const targets = targetStr.trim().split(/\s+/).filter(Boolean);
    const trimmed = (userStr || "").trim();
    if (!trimmed) {
        return targets.length > 0 ? { nextWord: targets[0], insertText: targets[0] + " ", isPartial: false } : null;
    }

    const endsWithSpace = /\s$/.test(userStr);
    const users = trimmed.split(/\s+/).filter(Boolean);

    // Tính số từ người dùng đã gõ đúng khớp
    let matchIdx = 0;
    const checkLen = endsWithSpace ? users.length : Math.max(0, users.length - 1);
    for (let u = 0; u < checkLen; u++) {
        const uClean = cleanWord(users[u]);
        for (let t = matchIdx; t < Math.min(matchIdx + 4, targets.length); t++) {
            if (cleanWord(targets[t]) === uClean) {
                matchIdx = t + 1;
                break;
            }
        }
    }

    // Nếu đang gõ dở một từ (chưa bấm space) và tiền tố khớp với từ mục tiêu
    if (!endsWithSpace && users.length > 0) {
        const lastWord = users[users.length - 1];
        const lastClean = cleanWord(lastWord);
        if (matchIdx < targets.length) {
            const targetClean = cleanWord(targets[matchIdx]);
            if (targetClean.startsWith(lastClean)) {
                const restLetters = targets[matchIdx].slice(lastWord.length);
                return {
                    nextWord: targets[matchIdx],
                    insertText: restLetters + " ",
                    isPartial: true
                };
            }
        }
    }

    if (matchIdx < targets.length) {
        return {
            nextWord: targets[matchIdx],
            insertText: (endsWithSpace ? "" : " ") + targets[matchIdx] + " ",
            isPartial: false
        };
    }
    return null;
}

function goiYTuTiepTheoChoCau() {
    const sentence = sentencesList[currentSentenceIdx];
    if (!sentence) return;

    const inp = document.getElementById("inputDichCau");
    if (!inp) return;

    const currentVal = inp.value;
    const hint = getNextWordHint(sentence.en, currentVal);

    const badge = document.getElementById("smartSuggestionBadge");
    if (!hint) {
        if (badge) {
            badge.style.display = "inline-block";
            badge.textContent = "🎉 Bạn đã gõ đủ các từ của câu này!";
        }
        return;
    }

    // Hiển thị gợi ý
    if (badge) {
        badge.style.display = "inline-block";
        badge.innerHTML = `👉 Từ tiếp theo: <strong>"${escapeHtml(hint.nextWord)}"</strong>`;
    }

    // Tự động điền vào ô nhập
    inp.value = currentVal + hint.insertText;
    inp.focus();

    // Di chuyển con trỏ xuống cuối
    inp.setSelectionRange(inp.value.length, inp.value.length);
}
window.goiYTuTiepTheoChoCau = goiYTuTiepTheoChoCau;

function phatAmCauHienTai() {
    const sentence = sentencesList[currentSentenceIdx];
    if (!sentence) return;
    phatAmVanBan(sentence.en);
}
window.phatAmCauHienTai = phatAmCauHienTai;

function liecCauHienTai() {
    const sentence = sentencesList[currentSentenceIdx];
    if (!sentence) return;

    const box = document.getElementById("boxPeekOverlayCau");
    const content = document.getElementById("peekContentCau");
    const countdown = document.getElementById("peekCountdownCau");
    if (!box || !content) return;

    if (peekTimer) clearInterval(peekTimer);
    content.textContent = sentence.en;
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
window.liecCauHienTai = liecCauHienTai;

// =========================================================
// 9. BƯỚC 3: NHẬP TOÀN BÀI & NỘP CHẤM
// =========================================================

function batDauBuoc3NhapToanBai() {
    dungPhatAm();
    if (!currentParagraph || !currentParagraph.noiDungEn) return;

    document.getElementById("cardHocThuoc").style.display = "none";
    document.getElementById("cardDichTungCau").style.display = "none";
    const cardToanBai = document.getElementById("cardNhapToanBai");
    cardToanBai.style.display = "block";

    document.getElementById("tieuDeToanBai").textContent = currentParagraph.tieuDe || "Nhập toàn bài & Nộp chấm";
    document.getElementById("lblTongSoTuToanBai").textContent = allWordsList.length;

    // Hiển thị danh sách các câu tiếng Việt sát nghĩa làm sườn tham khảo
    const boxRef = document.getElementById("boxThamKhaoToanBai");
    if (boxRef) {
        boxRef.innerHTML = sentencesList.map(s => `
            <div class="mb-2 pb-1 border-bottom border-light">
                <span class="badge bg-secondary-subtle text-secondary me-1">${s.index + 1}</span>
                <span class="text-dark fw-semibold">${escapeHtml(s.viSat || currentParagraph.dichVi || "")}</span>
            </div>
        `).join("");
    }

    const inp = document.getElementById("inputToanBai");
    if (inp) {
        inp.value = "";
        setTimeout(() => inp.focus(), 100);
    }

    const badge = document.getElementById("toanBaiSuggestionBadge");
    if (badge) badge.style.display = "none";

    khoiDongTimerToanBai();
    window.scrollTo({ top: 0, behavior: "smooth" });
}
window.batDauBuoc3NhapToanBai = batDauBuoc3NhapToanBai;

function khoiDongTimerToanBai() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
        const ss = String(elapsedSec % 60).padStart(2, "0");
        const timerEl = document.getElementById("toanBaiTimer");
        if (timerEl) timerEl.textContent = `${mm}:${ss}`;
    }, 500);
}

function goiYTuTiepTheoToanBai() {
    if (!currentParagraph || !currentParagraph.noiDungEn) return;
    const inp = document.getElementById("inputToanBai");
    if (!inp) return;

    const currentVal = inp.value;
    const hint = getNextWordHint(currentParagraph.noiDungEn, currentVal);

    const badge = document.getElementById("toanBaiSuggestionBadge");
    if (!hint) {
        if (badge) {
            badge.style.display = "inline-block";
            badge.textContent = "🎉 Bạn đã gõ đủ toàn bộ bài học!";
        }
        return;
    }

    if (badge) {
        badge.style.display = "inline-block";
        badge.innerHTML = `👉 Từ tiếp theo: <strong>"${escapeHtml(hint.nextWord)}"</strong>`;
    }

    inp.value = currentVal + hint.insertText;
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
}
window.goiYTuTiepTheoToanBai = goiYTuTiepTheoToanBai;

function nopBaiToanBo() {
    if (!currentParagraph || !currentParagraph.noiDungEn) return;
    const inp = document.getElementById("inputToanBai");
    const userText = (inp ? inp.value : "").trim();

    if (!userText) {
        alert("Vui lòng nhập đoạn văn của bạn trước khi nộp bài!");
        if (inp) inp.focus();
        return;
    }

    if (timerInterval) clearInterval(timerInterval);

    const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");
    const timeStr = `${mm}:${ss}`;

    const minutes = Math.max(elapsedSec / 60, 0.05);
    const userWordsCount = userText.split(/\s+/).filter(Boolean).length;
    const wpm = Math.round(userWordsCount / minutes);

    const res = diffWords(currentParagraph.noiDungEn, userText);

    // Đưa kết quả vào modal
    document.getElementById("modalResultTime").textContent = timeStr;
    document.getElementById("modalResultWpm").textContent = `${wpm} WPM`;
    document.getElementById("modalResultAccuracy").textContent = `${res.score}%`;
    document.getElementById("modalResultWords").textContent = `${res.correctCount}/${res.totalCount}`;

    // Render diff toàn bài vào modal
    const diffContainer = document.getElementById("modalDiffContainer");
    if (diffContainer) {
        diffContainer.innerHTML = res.tokens.map(t => {
            if (t.type === "correct") {
                return `<span class="diff-word diff-correct">${escapeHtml(t.word)}</span>`;
            } else if (t.type === "wrong") {
                return `<span class="diff-word diff-wrong"><del>${escapeHtml(t.typedWord)}</del> ➔ ${escapeHtml(t.targetWord)}</span>`;
            } else if (t.type === "missing") {
                return `<span class="diff-word diff-missing">Thiếu: ${escapeHtml(t.word)}</span>`;
            } else if (t.type === "extra") {
                return `<span class="diff-word diff-extra">${escapeHtml(t.word)}</span>`;
            }
            return "";
        }).join(" ");
    }

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

    if (res.score >= 80) {
        playChimeSound();
    } else {
        playWrongSound();
    }

    const modalEl = document.getElementById("modalHoanThanh");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
    }
}
window.nopBaiToanBo = nopBaiToanBo;

// =========================================================
// 10. QUÉT VÀ TRÍCH XUẤT TỪ MỚI TRONG ĐOẠN VĂN
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
    const btnQuet = document.getElementById("btnQuetTuMoiBai");
    const inputTenBo = document.getElementById("inputTenBoTuMoi");
    const selectBo = document.getElementById("selectBoDeLuuTu");

    const originalBtnHtml = btnQuet ? btnQuet.innerHTML : "";
    if (btnQuet) {
        btnQuet.disabled = true;
        btnQuet.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span><span>Đang tra từ mới...</span>';
    }

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

        // Tự động gợi ý tên bộ từ vựng
        if (inputTenBo) {
            const tieuDeClean = (currentParagraph.tieuDe || "Bài học").replace(/[^\p{L}\p{N}\s\-_]/gu, "").trim();
            inputTenBo.value = `Từ mới - ${tieuDeClean}`.slice(0, 50);
            inputTenBo.disabled = false;
        }

        // Cập nhật danh sách bộ nếu có
        if (selectBo && Array.isArray(data.dsBo) && data.dsBo.length > 0) {
            selectBo.innerHTML = `
                <option value="">-- Lưu thành bộ mới (theo tên ở bên) --</option>
                ${data.dsBo.map(b => `<option value="${b.id}">${escapeHtml(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("")}
            `;
        }

        if (countBadge) countBadge.textContent = `${dsTuMoi.length} từ`;
        if (tableBody) {
            tableBody.innerHTML = dsTuMoi.map((t, idx) => `
                <tr>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chk-tu-moi" checked value="${idx}" onchange="capNhatDemTuModal()">
                    </td>
                    <td>
                        <input class="form-control form-control-sm fw-bold text-primary val-tu-en" value="${escapeHtml(t.tiengAnh || '')}">
                    </td>
                    <td>
                        <input class="form-control form-control-sm text-muted val-tu-pa" value="${escapeHtml(t.phienAm || '')}">
                    </td>
                    <td>
                        <input class="form-control form-control-sm val-tu-vi" value="${escapeHtml(t.tiengViet || '')}">
                    </td>
                    <td>
                        <input class="form-control form-control-sm val-tu-vd" value="${escapeHtml(t.viDu || '')}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escapeJs(t.tiengAnh)}')">🔊</button>
                    </td>
                </tr>
            `).join("");
        }
        if (resultBox) resultBox.style.display = "block";
        capNhatDemTuModal();
    } catch (e) {
        if (loadingBox) loadingBox.style.display = "none";
        alert("Lỗi khi quét từ mới: " + e.message);
    } finally {
        if (btnQuet) {
            btnQuet.disabled = false;
            btnQuet.innerHTML = originalBtnHtml;
        }
    }
}
window.quetVaTrichXuatTuMoi = quetVaTrichXuatTuMoi;

function chonTatCaTuMoi(chkAll) {
    document.querySelectorAll(".chk-tu-moi").forEach(c => {
        c.checked = chkAll.checked;
    });
    capNhatDemTuModal();
}
window.chonTatCaTuMoi = chonTatCaTuMoi;

function capNhatDemTuModal() {
    const total = document.querySelectorAll(".chk-tu-moi").length;
    const checked = document.querySelectorAll(".chk-tu-moi:checked").length;
    const lbl = document.getElementById("lblSoTuModalChon");
    if (lbl) lbl.textContent = `${checked} / ${total}`;

    const btnLuu = document.getElementById("btnLuuTuMoiVaoBo");
    if (btnLuu) {
        btnLuu.disabled = (checked === 0);
    }
}
window.capNhatDemTuModal = capNhatDemTuModal;

function xuLyChonBoModal(val) {
    const inputTenBo = document.getElementById("inputTenBoTuMoi");
    if (!inputTenBo) return;
    if (val && val.trim() !== "") {
        inputTenBo.disabled = true;
        inputTenBo.classList.add("bg-secondary-subtle");
    } else {
        inputTenBo.disabled = false;
        inputTenBo.classList.remove("bg-secondary-subtle");
    }
}
window.xuLyChonBoModal = xuLyChonBoModal;

async function luuTatCaTuMoiDaChon() {
    const chks = Array.from(document.querySelectorAll(".chk-tu-moi:checked"));
    if (chks.length === 0) {
        alert("Vui lòng tích chọn ít nhất 1 từ để lưu!");
        return;
    }

    const dsTu = chks.map(c => {
        const tr = c.closest("tr");
        return {
            tiengAnh: tr.querySelector(".val-tu-en")?.value || "",
            phienAm: tr.querySelector(".val-tu-pa")?.value || "",
            tiengViet: tr.querySelector(".val-tu-vi")?.value || "",
            viDu: tr.querySelector(".val-tu-vd")?.value || ""
        };
    }).filter(t => t.tiengAnh.trim() !== "");

    const boId = document.getElementById("selectBoDeLuuTu")?.value || null;
    const tenBo = document.getElementById("inputTenBoTuMoi")?.value || "";

    const btnLuu = document.getElementById("btnLuuTuMoiVaoBo");
    if (btnLuu) {
        btnLuu.disabled = true;
        btnLuu.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> ⏳ Đang lưu...';
    }

    try {
        const resp = await fetch("/api/tu-vung/luu-hang-loat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dsTu, boId, tenBo })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error(data.error || "Không thể lưu từ mới lúc này");
        }

        alert(`✅ Đã lưu thành công ${data.soLuong || dsTu.length} từ vựng vào bộ học!`);
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
            btnLuu.innerHTML = "💾 Lưu các từ đã chọn vào Bộ học";
        }
    }
}
window.luuTatCaTuMoiDaChon = luuTatCaTuMoiDaChon;

// =========================================================
// 11. AUDIO TTS CONTROLLER
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

// Mặc định focus vào ô nhập đoạn văn khi vào trang
document.addEventListener("DOMContentLoaded", function () {
    const textarea = document.getElementById("nhapNoiDungEn");
    if (textarea) {
        setTimeout(() => textarea.focus(), 150);
    }
});
