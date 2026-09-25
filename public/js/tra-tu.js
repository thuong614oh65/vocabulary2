/**
 * TRA TỪ & DỊCH THUẬT ANH - VIỆT / VIỆT - ANH
 * Frontend JavaScript Controller
 */

// =========================================================
// BIẾN TOÀN CỤC & KHỞI TẠO
// =========================================================
let currentMode = 'AUTO';
let currentResultData = null;
let currentAudioObj = null;
let recognition = null;
let isRecording = false;

const STORAGE_KEY_HISTORY = 'VOCAB_TRA_TU_HISTORY';

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo lịch sử tra cứu từ LocalStorage
    hienThiLichSu();

    // Khởi tạo chế độ ban đầu từ Server nếu có
    const initModeEl = document.getElementById('initMode');
    if (initModeEl && initModeEl.value) {
        setMode(initModeEl.value);
    } else {
        setMode('AUTO');
    }

    // Kiểm tra có từ khóa ban đầu truyền từ URL không
    const initQueryEl = document.getElementById('initQuery');
    if (initQueryEl && initQueryEl.value.trim()) {
        document.getElementById('txtInput').value = initQueryEl.value.trim();
        thucHienTraTu();
    }

    // Bắt sự kiện phím Enter trong ô nhập liệu
    const txtInput = document.getElementById('txtInput');
    txtInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            thucHienTraTu();
        }
    });

    // Khởi tạo Web Speech Recognition (Mic)
    initSpeechRecognition();
});

// =========================================================
// 1. CHỌN CHẾ ĐỘ DỊCH & ĐỔI CHIỀU (SWAP)
// =========================================================
function setMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));

    const btnEnVi = document.getElementById('btnModeEnVi');
    const btnViEn = document.getElementById('btnModeViEn');
    const btnAuto = document.getElementById('btnModeAuto');
    const txtInput = document.getElementById('txtInput');

    if (mode === 'EN_VI') {
        btnEnVi.classList.add('active');
        txtInput.placeholder = "Nhập từ vựng, cụm từ hoặc câu tiếng Anh cần tra...";
    } else if (mode === 'VI_EN') {
        btnViEn.classList.add('active');
        txtInput.placeholder = "Nhập từ vựng, cụm từ hoặc câu tiếng Việt cần tra/dịch...";
    } else {
        btnAuto.classList.add('active');
        txtInput.placeholder = "Nhập từ vựng, cụm từ hoặc câu tiếng Anh / tiếng Việt (Tự động nhận diện)...";
    }
}

function swapLanguage() {
    const txtInput = document.getElementById('txtInput');
    const resTranslation = document.getElementById('resTranslation');

    let nextMode = 'EN_VI';
    if (currentMode === 'EN_VI') {
        nextMode = 'VI_EN';
    } else if (currentMode === 'VI_EN') {
        nextMode = 'EN_VI';
    } else {
        // Nếu đang ở AUTO, kiểm tra text hiện tại
        if (currentResultData && currentResultData.loaiDich === 'EN_VI') {
            nextMode = 'VI_EN';
        } else {
            nextMode = 'EN_VI';
        }
    }

    // Nếu đã có kết quả dịch, lấy bản dịch đưa lên ô input và tra lại
    if (currentResultData && currentResultData.banDich) {
        txtInput.value = currentResultData.banDich;
        setMode(nextMode);
        thucHienTraTu();
    } else {
        setMode(nextMode);
        txtInput.focus();
    }
}

// =========================================================
// 2. XỬ LÝ NHẬP LIỆU: CLEAR, GỢI Ý, MICROPHONE
// =========================================================
function clearInput() {
    const txtInput = document.getElementById('txtInput');
    txtInput.value = '';
    txtInput.focus();
}

function quickSearch(word) {
    const txtInput = document.getElementById('txtInput');
    txtInput.value = word;
    thucHienTraTu();
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('btnMic').classList.add('recording');
            showToast("🎙️ Đang lắng nghe giọng nói của bạn...");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                document.getElementById('txtInput').value = transcript;
                thucHienTraTu();
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            showToast("⚠️ Không nhận diện được giọng nói. Vui lòng thử lại.");
        };

        recognition.onend = () => {
            isRecording = false;
            document.getElementById('btnMic').classList.remove('recording');
        };
    }
}

function toggleSpeechRecognition() {
    if (!recognition) {
        showToast("⚠️ Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói.");
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        // Thiết lập ngôn ngữ nghe theo mode
        if (currentMode === 'VI_EN') {
            recognition.lang = 'vi-VN';
        } else {
            recognition.lang = 'en-US';
        }
        recognition.start();
    }
}

// =========================================================
// 3. THỰC HIỆN TRA TỪ / DỊCH QUA API
// =========================================================
async function thucHienTraTu() {
    const txtInput = document.getElementById('txtInput');
    const text = txtInput.value.trim();

    if (!text) {
        showToast("⚠️ Vui lòng nhập từ hoặc câu cần tra.");
        txtInput.focus();
        return;
    }

    // Ẩn kết quả cũ, hiện loading
    document.getElementById('resultContainer').style.display = 'none';
    document.getElementById('errorBox').style.display = 'none';
    document.getElementById('loadingBox').style.display = 'block';
    document.getElementById('btnTraTu').disabled = true;

    try {
        const response = await fetch('/api/tra-tu/dich', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                mode: currentMode
            })
        });

        if (!response.ok) {
            throw new Error(`Mã lỗi máy chủ: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.thanhCong) {
            throw new Error(data.thongBaoLoi || "Không tìm thấy dữ liệu từ điển.");
        }

        currentResultData = data;
        renderResult(data);

        // Lưu vào lịch sử tra cứu
        luuLichSu({
            word: data.tuGoc,
            translation: data.banDich,
            mode: data.loaiDich,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });

    } catch (err) {
        console.error("Lỗi tra từ:", err);
        document.getElementById('errorMsg').textContent = "⚠️ " + err.message;
        document.getElementById('errorBox').style.display = 'block';
    } finally {
        document.getElementById('loadingBox').style.display = 'none';
        document.getElementById('btnTraTu').disabled = false;
    }
}

// =========================================================
// 4. HIỂN THỊ DỮ LIỆU KẾT QUẢ
// =========================================================
function renderResult(data) {
    const resContainer = document.getElementById('resultContainer');

    // 1. Thẻ kết quả chính
    document.getElementById('resWord').textContent = data.tuGoc || '';
    document.getElementById('resPos').textContent = data.tuLoai || 'Từ vựng';
    
    const isEnVi = (data.loaiDich === 'EN_VI');
    document.getElementById('resDirection').textContent = isEnVi ? '🇬🇧 EN ➔ 🇻🇳 VI' : '🇻🇳 VI ➔ 🇬🇧 EN';

    // Phiên âm IPA
    const phoneticRow = document.getElementById('phoneticRow');
    const resPhonetic = document.getElementById('resPhonetic');
    if (data.phienAm && data.phienAm.trim()) {
        resPhonetic.textContent = data.phienAm;
        resPhonetic.style.display = 'inline-block';
        phoneticRow.style.display = 'flex';
    } else {
        resPhonetic.style.display = 'none';
    }

    // Nghĩa dịch chính
    document.getElementById('resTranslation').textContent = data.banDich || 'Không có bản dịch';

    // Ghi chú cách dùng / ngữ cảnh
    const usageNoteBox = document.getElementById('usageNoteBox');
    const resUsageNote = document.getElementById('resUsageNote');
    if (data.giaiThich && data.giaiThich.trim()) {
        resUsageNote.textContent = data.giaiThich;
        usageNoteBox.style.display = 'flex';
    } else {
        usageNoteBox.style.display = 'none';
    }

    // Các nghĩa / từ tương đương khác
    const otherMeaningsBox = document.getElementById('otherMeaningsBox');
    const resOtherMeanings = document.getElementById('resOtherMeanings');
    resOtherMeanings.innerHTML = '';
    if (data.cacNghiaKhac && data.cacNghiaKhac.length > 0) {
        data.cacNghiaKhac.forEach(item => {
            const tag = document.createElement('span');
            tag.className = 'other-tag-item';
            tag.textContent = item;
            tag.onclick = () => quickSearch(item);
            resOtherMeanings.appendChild(tag);
        });
        otherMeaningsBox.style.display = 'flex';
    } else {
        otherMeaningsBox.style.display = 'none';
    }

    // 2. Ví dụ câu thực tế
    const examplesSection = document.getElementById('examplesSection');
    const resExamplesList = document.getElementById('resExamplesList');
    resExamplesList.innerHTML = '';
    if (data.viDu && data.viDu.length > 0) {
        data.viDu.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'example-item';
            item.innerHTML = `
                <div class="example-body">
                    <div class="example-en">${escapeHtml(ex.cauTiengAnh)}</div>
                    ${ex.cauTiengViet ? `<div class="example-vi">${escapeHtml(ex.cauTiengViet)}</div>` : ''}
                </div>
                <button type="button" class="btn-speak-sentence" onclick="phatAmCau('${escapeHtmlAttr(ex.cauTiengAnh)}')" title="Phát âm câu này">
                    🔊
                </button>
            `;
            resExamplesList.appendChild(item);
        });
        examplesSection.style.display = 'block';
    } else {
        examplesSection.style.display = 'none';
    }

    // 3. Định nghĩa chi tiết
    const definitionsSection = document.getElementById('definitionsSection');
    const resDefinitionsList = document.getElementById('resDefinitionsList');
    resDefinitionsList.innerHTML = '';
    if (data.dinhNghia && data.dinhNghia.length > 0) {
        data.dinhNghia.forEach(d => {
            const defItem = document.createElement('div');
            defItem.className = 'def-item';
            
            let exHtml = '';
            if (d.examples && d.examples.length > 0) {
                exHtml = `<div class="def-example-box">Ví dụ: "${escapeHtml(d.examples[0])}"</div>`;
            }

            defItem.innerHTML = `
                ${d.partOfSpeech ? `<div class="def-pos">${escapeHtml(d.partOfSpeech)}</div>` : ''}
                ${d.definitionEn ? `<div class="def-en">• ${escapeHtml(d.definitionEn)}</div>` : ''}
                ${d.definitionVi ? `<div class="def-vi">➔ ${escapeHtml(d.definitionVi)}</div>` : ''}
                ${exHtml}
            `;
            resDefinitionsList.appendChild(defItem);
        });
        definitionsSection.style.display = 'block';
    } else {
        definitionsSection.style.display = 'none';
    }

    // 4. Đồng nghĩa & Trái nghĩa
    const synonymsSection = document.getElementById('synonymsSection');
    const synGroup = document.getElementById('synGroup');
    const antGroup = document.getElementById('antGroup');
    const resSynonyms = document.getElementById('resSynonyms');
    const resAntonyms = document.getElementById('resAntonyms');

    resSynonyms.innerHTML = '';
    resAntonyms.innerHTML = '';

    let hasSyn = false;
    let hasAnt = false;

    if (data.dongNghia && data.dongNghia.length > 0) {
        data.dongNghia.forEach(s => {
            const tag = document.createElement('span');
            tag.className = 'syn-tag';
            tag.textContent = s;
            tag.onclick = () => quickSearch(s);
            resSynonyms.appendChild(tag);
        });
        synGroup.style.display = 'flex';
        hasSyn = true;
    } else {
        synGroup.style.display = 'none';
    }

    if (data.traiNghia && data.traiNghia.length > 0) {
        data.traiNghia.forEach(a => {
            const tag = document.createElement('span');
            tag.className = 'ant-tag';
            tag.textContent = a;
            tag.onclick = () => quickSearch(a);
            resAntonyms.appendChild(tag);
        });
        antGroup.style.display = 'flex';
        hasAnt = true;
    } else {
        antGroup.style.display = 'none';
    }

    if (hasSyn || hasAnt) {
        synonymsSection.style.display = 'block';
    } else {
        synonymsSection.style.display = 'none';
    }

    // Hiển thị toàn bộ khung kết quả mượt mà
    resContainer.style.display = 'flex';
}

// =========================================================
// 5. PHÁT ÂM (AUDIO & SPEECH SYNTHESIS)
// =========================================================
function phatAmTiengAnh(rate = 1.0) {
    if (!currentResultData) return;

    // Xác định từ/câu tiếng Anh cần đọc
    let englishText = currentResultData.tuGoc;
    if (currentResultData.loaiDich === 'VI_EN') {
        englishText = currentResultData.banDich;
    }

    if (!englishText) return;

    if (window.phatAmThanh) {
        let rateStr = (rate < 0.9) ? "-25%" : "+0%";
        window.phatAmThanh(englishText, { rate: rateStr });
        return;
    }

    let rateStr = (rate < 0.9) ? "-25%" : "+0%";
    let url = "/audio/phat?text=" + encodeURIComponent(englishText) + "&rate=" + encodeURIComponent(rateStr);
    currentAudioObj = new Audio(url);
    currentAudioObj.play().catch(() => {});
}

function phatAmCau(sentence) {
    if (!sentence) return;
    if (window.phatAmThanh) {
        window.phatAmThanh(sentence, { rate: "+0%" });
        return;
    }
    let url = "/audio/phat?text=" + encodeURIComponent(sentence) + "&rate=+0%";
    currentAudioObj = new Audio(url);
    currentAudioObj.play().catch(() => {});
}

// =========================================================
// 6. SAO CHÉP & TOAST NOTIFICATION
// =========================================================
function copyText(text, btnElement) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast("📋 Đã sao chép vào bộ nhớ tạm!");
        if (btnElement) {
            const oldHtml = btnElement.innerHTML;
            btnElement.innerHTML = "✅ Đã chép";
            setTimeout(() => {
                btnElement.innerHTML = oldHtml;
            }, 1500);
        }
    }).catch(err => {
        showToast("❌ Không thể sao chép: " + err);
    });
}

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('appToast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// =========================================================
// 7. MODAL LƯU TỪ VÀO BỘ TỪ
// =========================================================
function moModalLuuTu() {
    if (!currentResultData) {
        showToast("⚠️ Chưa có từ nào để lưu.");
        return;
    }

    let tiengAnh = currentResultData.tuGoc;
    let tiengViet = currentResultData.banDich;

    if (currentResultData.loaiDich === 'VI_EN') {
        tiengAnh = currentResultData.banDich;
        tiengViet = currentResultData.tuGoc;
    }

    document.getElementById('saveTiengAnh').value = tiengAnh || '';
    document.getElementById('saveTiengViet').value = tiengViet || '';
    document.getElementById('savePhienAm').value = currentResultData.phienAm || '';
    
    let viDuStr = '';
    if (currentResultData.viDu && currentResultData.viDu.length > 0) {
        viDuStr = currentResultData.viDu[0].cauTiengAnh;
        if (currentResultData.viDu[0].cauTiengViet) {
            viDuStr += ' (' + currentResultData.viDu[0].cauTiengViet + ')';
        }
    }
    document.getElementById('saveViDu').value = viDuStr;

    // Reset alert
    const saveAlert = document.getElementById('saveAlert');
    saveAlert.style.display = 'none';

    // Mở modal Bootstrap
    const modalEl = document.getElementById('modalLuuTu');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function toggleBoMoiInput(val) {
    const groupBoMoi = document.getElementById('groupBoMoi');
    if (val === 'NEW') {
        groupBoMoi.style.display = 'block';
        document.getElementById('saveTenBoMoi').focus();
    } else {
        groupBoMoi.style.display = 'none';
    }
}

async function submitLuuTu() {
    const tiengAnh = document.getElementById('saveTiengAnh').value.trim();
    const tiengViet = document.getElementById('saveTiengViet').value.trim();
    const phienAm = document.getElementById('savePhienAm').value.trim();
    const viDu = document.getElementById('saveViDu').value.trim();
    const boIdVal = document.getElementById('saveBoId').value;
    const tenBoMoi = document.getElementById('saveTenBoMoi').value.trim();

    const saveAlert = document.getElementById('saveAlert');
    const btnSubmit = document.getElementById('btnXacNhanLuu');

    if (!tiengAnh || !tiengViet) {
        saveAlert.className = 'alert alert-danger';
        saveAlert.textContent = 'Vui lòng nhập đầy đủ Từ tiếng Anh và Nghĩa tiếng Việt.';
        saveAlert.style.display = 'block';
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Đang lưu...';

    try {
        let boId = null;
        if (boIdVal && boIdVal !== 'NEW') {
            boId = parseInt(boIdVal);
        }

        const res = await fetch('/api/tra-tu/luu-nhanh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tiengAnh,
                tiengViet,
                phienAm,
                viDu,
                boId: boId,
                tenBoMoi: (boIdVal === 'NEW') ? tenBoMoi : null
            })
        });

        const data = await res.json();

        if (data.success) {
            saveAlert.className = 'alert alert-success';
            saveAlert.textContent = '🎉 ' + data.message;
            saveAlert.style.display = 'block';
            showToast("💾 Đã lưu từ vựng thành công!");
            
            setTimeout(() => {
                const modalEl = document.getElementById('modalLuuTu');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }, 1200);
        } else {
            saveAlert.className = 'alert alert-warning';
            saveAlert.textContent = '⚠️ ' + data.message;
            saveAlert.style.display = 'block';
        }
    } catch (err) {
        saveAlert.className = 'alert alert-danger';
        saveAlert.textContent = 'Lỗi lưu từ: ' + err.message;
        saveAlert.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '💾 Lưu ngay';
    }
}

// =========================================================
// 8. QUẢN LÝ LỊCH SỬ TRA CỨU (LOCALSTORAGE)
// =========================================================
function layDanhSachLichSu() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function luuLichSu(item) {
    let list = layDanhSachLichSu();
    // Xóa từ cũ nếu trùng
    list = list.filter(x => x.word.toLowerCase() !== item.word.toLowerCase());
    // Thêm vào đầu
    list.unshift(item);
    // Giới hạn 20 mục
    if (list.length > 20) {
        list = list.slice(0, 20);
    }
    try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    } catch (e) {}
    hienThiLichSu();
}

function hienThiLichSu() {
    const list = layDanhSachLichSu();
    const container = document.getElementById('historyList');

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="history-empty text-muted">Chưa có lịch sử tra cứu nào.</div>';
        return;
    }

    container.innerHTML = '';
    list.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span class="history-word" onclick="quickSearch('${escapeHtmlAttr(item.word)}')">${escapeHtml(item.word)}</span>
            <span class="history-meaning" onclick="quickSearch('${escapeHtmlAttr(item.word)}')">(${escapeHtml(item.translation || '')})</span>
            <button type="button" class="btn-del-item" onclick="xoaMotMucLichSu(${index}, event)" title="Xóa mục này">✕</button>
        `;
        container.appendChild(div);
    });
}

function xoaMotMucLichSu(index, event) {
    if (event) event.stopPropagation();
    let list = layDanhSachLichSu();
    list.splice(index, 1);
    try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    } catch (e) {}
    hienThiLichSu();
}

function xoaToanBoLichSu() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu?")) {
        try {
            localStorage.removeItem(STORAGE_KEY_HISTORY);
        } catch (e) {}
        hienThiLichSu();
        showToast("🗑️ Đã xóa sạch lịch sử tra cứu.");
    }
}

// =========================================================
// TIỆN ÍCH HELPER
// =========================================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeHtmlAttr(str) {
    if (!str) return '';
    return str
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");
}
