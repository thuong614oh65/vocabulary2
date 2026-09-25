// =========================================================================
// LUYỆN ĐỀ TOEIC SPEAKING Q7-9 (INTERACTIONS & AI SCORING)
// =========================================================================

let currentExamData = null;
let prepTimerInterval = null;
let prepSecondsLeft = 45;
let questionVisibility = { 1: false, 2: false, 3: false }; // Mặc định tất cả câu hỏi đều ẨN

document.addEventListener('DOMContentLoaded', () => {
    initTabEvents();
    initTemplateButtons();
    initUploadEvents();
    initSampleTestButtons();
    initLiveMeters();
    initAudioButtons();
    initHiddenQuestionControls();
    initSubmitButton();
});

// -------------------------------------------------------------
// 1. TƯƠNG TÁC TABS & TEMPLATES
// -------------------------------------------------------------
function initTabEvents() {
    const btnAiAuto = document.getElementById('btnAiAutoGenerate');
    if (btnAiAuto) {
        btnAiAuto.addEventListener('click', () => {
            showLoading('AI đang sáng tạo đề thi mới...', 'Tạo bảng thông tin, tình huống cuộc gọi và 3 câu hỏi...');
            fetch('/api/luyen-de/tao-tu-dong', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    hideLoading();
                    if (data.error) {
                        alert('Lỗi: ' + data.error);
                        return;
                    }
                    loadExamIntoPractice(data);
                })
                .catch(err => {
                    hideLoading();
                    alert('Lỗi kết nối: ' + err);
                });
        });
    }

    const btnSubmitText = document.getElementById('btnSubmitText');
    if (btnSubmitText) {
        btnSubmitText.addEventListener('click', () => {
            const text = document.getElementById('customTextInput').value.trim();
            if (!text) {
                alert('Vui lòng nhập nội dung bảng thông tin / lịch trình trước!');
                return;
            }
            showLoading('AI đang phân tích văn bản...', 'Tạo câu hỏi chuẩn TOEIC Speaking Q7-9...');
            fetch('/api/luyen-de/tao-tu-van-ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vanBan: text })
            })
            .then(res => res.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    alert('Lỗi: ' + data.error);
                    return;
                }
                loadExamIntoPractice(data);
            })
            .catch(err => {
                hideLoading();
                alert('Lỗi: ' + err);
            });
        });
    }
}

function initTemplateButtons() {
    const templates = {
        'hoi-nghi': `Annual Technology & AI Summit
Grand Plaza Convention Center, Hall B
Friday, October 15th

09:00 a.m. - 09:45 a.m. | Keynote: Future of Artificial Intelligence | Dr. Kevin Vance
09:45 a.m. - 10:30 a.m. | Speech: Cloud Computing in Business | Sarah Jenkins
10:30 a.m. - 11:30 a.m. | Workshop: Machine Learning for Beginners (Postponed to 2:00 p.m.)
11:30 a.m. - 01:00 p.m. | Lunch Break (Buffet included in registration)
01:00 p.m. - 02:30 p.m. | Panel Discussion: Cyber Security Strategies | Alex Turner & Lisa Wong
02:30 p.m. - 04:00 p.m. | Product Showcase & Networking | All Guest Exhibitors`,

        'tour': `Southeast Island Exploration Itinerary
Departure: Central Pier, Gate 4
Date: Saturday, August 20th

08:00 a.m. | Departure by Express Catamaran
09:30 a.m. - 11:30 a.m. | Coral Reef Snorkeling & Scuba Diving (Instructor: Captain David)
12:00 p.m. - 01:30 p.m. | Seafood BBQ Lunch at Coconut Bay
01:45 p.m. - 03:15 p.m. | Tropical Rain Forest Trekking & Bird Watching
03:30 p.m. - 04:30 p.m. | Souvenir Shopping & Local Craft Village
05:00 p.m. | Return ferry departs back to Central Pier`,

        'cv': `Candidate Profile: Jessica Miller
Position Applied: Senior Marketing Specialist
Contact: jessica.m@email.com | (555) 382-9102

Education:
- Master of Marketing Management, Boston University (2018)
- Bachelor of Business Administration, New York University (2015)

Work Experience:
- Marketing Lead : Apex Digital Solutions (2020 - Present)
  * Managed $2M digital ad budgets, grew organic traffic by 140%
- Social Media Coordinator : Bright Media Group (2018 - 2020)

Skills & Certifications:
- Google Ads & Analytics Certified, SEO/SEM Specialist
- Fluent in English & French`
    };

    document.querySelectorAll('.btn-template').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            if (templates[type]) {
                document.getElementById('customTextInput').value = templates[type];
            }
        });
    });
}

// -------------------------------------------------------------
// 2. TẢI ẢNH LÊN (DROPZONE)
// -------------------------------------------------------------
function initUploadEvents() {
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('examImageInput');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    const btnSubmitUpload = document.getElementById('btnSubmitUpload');

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleImageFile(fileInput.files[0]);
        }
    });

    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn một file ảnh hợp lệ!');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewContainer.classList.remove('d-none');
            previewContainer.scrollIntoView({ behavior: 'smooth' });
        };
        reader.readAsDataURL(file);
    }

    if (btnSubmitUpload) {
        btnSubmitUpload.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (!file) {
                alert('Vui lòng chọn ảnh trước!');
                return;
            }
            const formData = new FormData();
            formData.append('file', file);

            showLoading('AI đang nhận diện hình ảnh (OCR)...', 'Trích xuất dữ liệu bảng và tạo câu hỏi TOEIC Q7-9...');
            fetch('/api/luyen-de/tao-tu-anh', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    alert('Lỗi: ' + data.error);
                    return;
                }
                loadExamIntoPractice(data);
            })
            .catch(err => {
                hideLoading();
                alert('Lỗi: ' + err);
            });
        });
    }
}

// -------------------------------------------------------------
// 3. 15 ĐỀ MẪU TỪ đề thi.docx
// -------------------------------------------------------------
function initSampleTestButtons() {
    document.querySelectorAll('.sample-test-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            loadSampleTest(id);
        });
    });
}

function loadSampleTest(id) {
    showLoading(`Đang mở Đề thi mẫu #${id}...`, 'Đang thiết lập phòng luyện thi TOEIC Speaking...');
    fetch(`/api/luyen-de/de-mau/${id}`)
        .then(res => res.json())
        .then(data => {
            hideLoading();
            if (data.error) {
                alert('Lỗi: ' + data.error);
                return;
            }
            loadExamIntoPractice(data);
        })
        .catch(err => {
            hideLoading();
            alert('Lỗi kết nối: ' + err);
        });
}

// -------------------------------------------------------------
// 4. LOAD ĐỀ VÀO KHU VỰC LÀM BÀI
// -------------------------------------------------------------
function loadExamIntoPractice(data) {
    currentExamData = data;

    // Ẩn khu vực chọn đề, hiện khu vực làm bài
    document.getElementById('modeSelectionSection').style.display = 'none';
    document.getElementById('practiceArena').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';

    // Đặt tiêu đề
    document.getElementById('examTitleDisplay').textContent = data.tieuDe || 'Mẫu thông tin đề thi';

    // Hiển thị Mẫu thông tin (Ảnh hoặc Text)
    const imgDisplay = document.getElementById('examImageDisplay');
    const textDisplay = document.getElementById('examTextDisplay');
    const textSummary = document.getElementById('examTextSummary');

    if (data.loaiNoiDung === 'IMAGE' && data.anhUrl) {
        imgDisplay.src = data.anhUrl;
        imgDisplay.classList.remove('d-none');
        textDisplay.classList.add('d-none');
        
        // Hiển thị chữ trích xuất từ ảnh
        if (data.tomTatNoiDung || data.vanBanThongTin) {
            textSummary.innerHTML = (data.tomTatNoiDung || data.vanBanThongTin);
            textSummary.classList.remove('d-none');
        } else {
            textSummary.classList.add('d-none');
        }
    } else {
        imgDisplay.classList.add('d-none');
        textSummary.classList.add('d-none');
        textDisplay.innerHTML = data.vanBanThongTin || '<p>Không có văn bản.</p>';
        textDisplay.classList.remove('d-none');
    }

    // Tình huống cuộc gọi
    document.getElementById('scenarioText').textContent = data.tinhHuong || 'You are answering an inquiry.';

    // 3 Câu hỏi
    document.getElementById('q1Text').textContent = data.cauHoi1 || 'Question 1';
    document.getElementById('q2Text').textContent = data.cauHoi2 || 'Question 2';
    document.getElementById('q3Text').textContent = data.cauHoi3 || 'Question 3';

    // Reset các ô nhập
    ['ans1Input', 'ans2Input', 'ans3Input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    updateLiveMeter(1, '');
    updateLiveMeter(2, '');
    updateLiveMeter(3, '');

    // MẶC ĐỊNH CHUẨN THI THẬT: ẨN CÂU HỎI (Học viên nghe audio hoặc bấm Xem câu hỏi)
    setAllQuestionsVisibility(false);
    const btnModeExam = document.getElementById('btnModeExam');
    const btnModePractice = document.getElementById('btnModePractice');
    if (btnModeExam) btnModeExam.classList.add('active');
    if (btnModePractice) btnModePractice.classList.remove('active');

    // Reset và bắt đầu đếm 45s đọc đề
    resetPrepTimer();

    // Nút đổi đề khác
    document.getElementById('btnChangeExam').onclick = () => {
        if (confirm('Bạn có muốn quay lại chọn đề khác không?')) {
            document.getElementById('modeSelectionSection').style.display = 'block';
            document.getElementById('practiceArena').style.display = 'none';
            document.getElementById('resultSection').style.display = 'none';
            clearInterval(prepTimerInterval);
        }
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------
// 5. BỘ ĐẾM 45s ĐỌC ĐỀ
// -------------------------------------------------------------
function resetPrepTimer() {
    clearInterval(prepTimerInterval);
    prepSecondsLeft = 45;
    const badge = document.getElementById('prepTimer');
    const btn = document.getElementById('btnStartPrepTimer');
    badge.textContent = '45 giây';
    btn.textContent = 'Bắt đầu đếm';

    btn.onclick = () => {
        if (btn.textContent === 'Tạm dừng') {
            clearInterval(prepTimerInterval);
            btn.textContent = 'Tiếp tục';
            return;
        }
        btn.textContent = 'Tạm dừng';
        prepTimerInterval = setInterval(() => {
            prepSecondsLeft--;
            if (prepSecondsLeft <= 0) {
                clearInterval(prepTimerInterval);
                badge.textContent = 'Hết 45s đọc đề!';
                btn.textContent = 'Bắt đầu lại';
                speakText('Preparation time is now over. Please begin answering Question 1.');
            } else {
                badge.textContent = prepSecondsLeft + ' giây';
            }
        }, 1000);
    };
}

// -------------------------------------------------------------
// 6. BỘ ĐẾM SỐ TỪ & THỜI GIAN NÓI REAL-TIME
// -------------------------------------------------------------
function initLiveMeters() {
    [1, 2, 3].forEach(idx => {
        const input = document.getElementById(`ans${idx}Input`);
        if (input) {
            input.addEventListener('input', () => {
                updateLiveMeter(idx, input.value);
            });
        }
    });
}

function updateLiveMeter(idx, text) {
    const words = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0) : [];
    const wordCount = words.length;
    // Tốc độ nói trung bình tiếng Anh ~ 2.2 từ / giây (130 wpm)
    const spokenSecs = Math.round(wordCount / 2.2);

    document.getElementById(`wordCount${idx}`).textContent = wordCount;
    document.getElementById(`timeEst${idx}`).textContent = spokenSecs;

    const statusBadge = document.getElementById(`meterStatus${idx}`);
    const isQ3 = (idx === 3);

    if (wordCount === 0) {
        statusBadge.textContent = 'Chưa nhập';
        statusBadge.className = 'meter-status';
        return;
    }

    if (!isQ3) {
        // Câu 1 & 2 (15s quy định, chuẩn 20-35 từ)
        if (wordCount < 12) {
            statusBadge.textContent = '⚠️ Hơi ngắn (<12 từ)';
            statusBadge.className = 'meter-status warning';
        } else if (wordCount <= 38) {
            statusBadge.textContent = '✅ Tốc độ vừa vặn (~10-15s)';
            statusBadge.className = 'meter-status good';
        } else {
            statusBadge.textContent = '⚠️ Quá dài (>38 từ - Nguy cơ bị ngắt lời)';
            statusBadge.className = 'meter-status danger';
        }
    } else {
        // Câu 3 (30s quy định, chuẩn 45-75 từ)
        if (wordCount < 30) {
            statusBadge.textContent = '⚠️ Hơi ngắn cho câu 30s';
            statusBadge.className = 'meter-status warning';
        } else if (wordCount <= 80) {
            statusBadge.textContent = '✅ Dung lượng lý tưởng (~20-28s)';
            statusBadge.className = 'meter-status good';
        } else {
            statusBadge.textContent = '⚠️ Quá dài (>80 từ - Sẽ bị ngắt lời)';
            statusBadge.className = 'meter-status danger';
        }
    }
}

// -------------------------------------------------------------
// 7. PHÁT ÂM THANH CÂU HỎI & TÌNH HUỐNG (TTS WEB SPEECH)
// -------------------------------------------------------------
let currentPlayingBtn = null;
let currentAudioObj = null;

function initAudioButtons() {
    const btnPlayScenario = document.getElementById('btnPlayScenario');
    if (btnPlayScenario) {
        btnPlayScenario.addEventListener('click', () => {
            if (currentExamData && currentExamData.tinhHuong) {
                speakText(currentExamData.tinhHuong, btnPlayScenario);
            }
        });
    }

    document.querySelectorAll('.btn-play-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (currentExamData) {
                if (target === 'q1' && currentExamData.cauHoi1) speakText(currentExamData.cauHoi1, btn);
                if (target === 'q2' && currentExamData.cauHoi2) speakText(currentExamData.cauHoi2, btn);
                if (target === 'q3' && currentExamData.cauHoi3) speakText(currentExamData.cauHoi3, btn);
            }
        });
    });
}

function speakText(text, btnElement) {
    if (!text) return;

    // Reset nút đang phát âm thanh trước đó nếu có
    if (currentPlayingBtn && currentPlayingBtn !== btnElement) {
        currentPlayingBtn.classList.remove('playing');
        const orig = currentPlayingBtn.getAttribute('data-original-html');
        if (orig) currentPlayingBtn.innerHTML = orig;
        currentPlayingBtn = null;
    }

    let originalHtml = '';
    if (btnElement) {
        currentPlayingBtn = btnElement;
        originalHtml = btnElement.getAttribute('data-original-html') || btnElement.innerHTML;
        btnElement.setAttribute('data-original-html', originalHtml);
        btnElement.classList.add('playing');
        btnElement.innerHTML = '🔊 <span>Đang đọc...</span>';
    }

    const resetBtn = () => {
        if (btnElement) {
            btnElement.classList.remove('playing');
            btnElement.innerHTML = originalHtml;
        }
        if (currentPlayingBtn === btnElement) {
            currentPlayingBtn = null;
        }
    };

    // Dừng giọng đọc fallback nếu đang chạy
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    if (currentAudioObj) {
        currentAudioObj.pause();
        if (currentAudioObj.src && currentAudioObj.src.startsWith("blob:")) {
            URL.revokeObjectURL(currentAudioObj.src);
        }
        currentAudioObj = null;
    }

    const cleanText = text.replace(/\(.*?\)/g, '').trim();

    if (window.phatAmThanh) {
        window.phatAmThanh(cleanText, {
            rate: "+0%",
            onEnd: resetBtn,
            onError: resetBtn
        }).then(resetBtn).catch(resetBtn);
        return;
    }

    const url = "/audio/phat?text=" + encodeURIComponent(cleanText) + "&rate=+0%";
    currentAudioObj = new Audio(url);
    currentAudioObj.onended = resetBtn;
    currentAudioObj.onerror = resetBtn;
    currentAudioObj.play().catch(err => {
        console.warn("Lỗi phát âm thanh:", err);
        resetBtn();
    });
}

// -------------------------------------------------------------
// 7B. ĐIỀU KHIỂN ẨN / HIỆN CÂU HỎI (CHUẨN THI THẬT TOEIC)
// -------------------------------------------------------------
function initHiddenQuestionControls() {
    // 1. Nút xem / ẩn từng câu hỏi
    document.querySelectorAll('.btn-toggle-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-target'), 10);
            toggleQuestion(idx);
        });
    });

    // 2. Nút hiện / ẩn tất cả câu hỏi
    const btnToggleAll = document.getElementById('btnToggleAllQuestions');
    if (btnToggleAll) {
        btnToggleAll.addEventListener('click', () => {
            toggleAllQuestions();
        });
    }

    // 3. Nút chuyển đổi chế độ thi thật vs luyện tập
    const btnModeExam = document.getElementById('btnModeExam');
    const btnModePractice = document.getElementById('btnModePractice');

    if (btnModeExam) {
        btnModeExam.addEventListener('click', () => {
            btnModeExam.classList.add('active');
            if (btnModePractice) btnModePractice.classList.remove('active');
            setAllQuestionsVisibility(false);
        });
    }

    if (btnModePractice) {
        btnModePractice.addEventListener('click', () => {
            btnModePractice.classList.add('active');
            if (btnModeExam) btnModeExam.classList.remove('active');
            setAllQuestionsVisibility(true);
        });
    }
}

function toggleQuestion(idx, forceState) {
    const newState = (forceState !== undefined) ? forceState : !questionVisibility[idx];
    questionVisibility[idx] = newState;

    const banner = document.getElementById(`q${idx}HiddenBanner`);
    const qText = document.getElementById(`q${idx}Text`);
    const badge = document.getElementById(`q${idx}StateBadge`);
    const btn = document.getElementById(`btnToggleQ${idx}`);

    if (newState) {
        // Trạng thái: HIỆN CÂU HỎI
        if (banner) banner.classList.add('d-none');
        if (qText) qText.classList.remove('d-none');
        if (badge) {
            badge.textContent = '👁️ Đang hiện';
            badge.className = 'badge bg-success-subtle text-success border px-2 py-1 rounded-pill small q-state-badge';
        }
        if (btn) {
            btn.innerHTML = '🙈 Ẩn câu hỏi';
            btn.className = 'btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold btn-toggle-q';
        }
    } else {
        // Trạng thái: ẨN CÂU HỎI
        if (banner) banner.classList.remove('d-none');
        if (qText) qText.classList.add('d-none');
        if (badge) {
            badge.textContent = '🔒 Đang ẩn';
            badge.className = 'badge bg-secondary-subtle text-secondary border px-2 py-1 rounded-pill small q-state-badge';
        }
        if (btn) {
            btn.innerHTML = '👁️ Xem câu hỏi';
            btn.className = 'btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold btn-toggle-q';
        }
    }

    updateToggleAllButtonText();
}

function setAllQuestionsVisibility(visible) {
    [1, 2, 3].forEach(idx => {
        toggleQuestion(idx, visible);
    });
}

function toggleAllQuestions() {
    // Nếu có ít nhất một câu đang ẩn -> hiện tất cả
    const anyHidden = Object.values(questionVisibility).some(v => !v);
    setAllQuestionsVisibility(anyHidden);
}

function updateToggleAllButtonText() {
    const btnToggleAll = document.getElementById('btnToggleAllQuestions');
    if (!btnToggleAll) return;
    const allVisible = Object.values(questionVisibility).every(v => v);
    if (allVisible) {
        btnToggleAll.innerHTML = '🙈 Ẩn tất cả câu hỏi';
    } else {
        btnToggleAll.innerHTML = '👁️ Hiện tất cả câu hỏi';
    }
}

// -------------------------------------------------------------
// 8. NỘP BÀI & CHẤM ĐIỂM BẰNG GEMINI AI
// -------------------------------------------------------------
function initSubmitButton() {
    const btnSubmit = document.getElementById('btnSubmitAnswers');
    if (!btnSubmit) return;

    btnSubmit.addEventListener('click', () => {
        const a1 = document.getElementById('ans1Input').value.trim();
        const a2 = document.getElementById('ans2Input').value.trim();
        const a3 = document.getElementById('ans3Input').value.trim();

        if (!a1 && !a2 && !a3) {
            alert('Vui lòng nhập câu trả lời cho ít nhất một câu trước khi chấm điểm!');
            return;
        }

        const payload = {
            tieuDe: currentExamData.tieuDe || 'Đề thi TOEIC Speaking',
            loaiNoiDung: currentExamData.loaiNoiDung || 'IMAGE',
            thongTinDeBai: currentExamData.vanBanThongTin || currentExamData.tieuDe,
            tinhHuong: currentExamData.tinhHuong || '',
            cauHoi1: currentExamData.cauHoi1 || '',
            cauTraLoi1: a1,
            cauHoi2: currentExamData.cauHoi2 || '',
            cauTraLoi2: a2,
            cauHoi3: currentExamData.cauHoi3 || '',
            cauTraLoi3: a3
        };

        showLoading('⚡ Gemini Flash AI đang chấm điểm...', 'Đang đối chiếu trích dẫn, sửa câu và tính điểm chuẩn TOEIC...');

        fetch('/api/luyen-de/cham-diem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            hideLoading();
            if (data.error) {
                alert('Lỗi chấm điểm: ' + data.error);
                return;
            }
            renderEvaluationResults(data);
        })
        .catch(err => {
            hideLoading();
            alert('Lỗi kết nối: ' + err);
        });
    });
}

// -------------------------------------------------------------
// 9. HIỂN THỊ KẾT QUẢ CHẤM ĐIỂM
// -------------------------------------------------------------
function renderEvaluationResults(res) {
    document.getElementById('practiceArena').style.display = 'none';
    const resultSec = document.getElementById('resultSection');
    resultSec.style.display = 'block';
    document.body.classList.remove('in-practice-mode');

    // Tổng điểm & Xếp loại
    document.getElementById('totalScoreNum').textContent = res.tongDiem != null ? res.tongDiem : '-';
    document.getElementById('xepLoaiBadge').textContent = (res.xepLoai || 'Hoàn thành').toUpperCase();
    document.getElementById('nhanXetTongQuanText').textContent = res.nhanXetTongQuan || 'Bạn đã hoàn thành bài thi TOEIC Speaking Q7-9.';

    // 1. Hiển thị lại toàn bộ đoạn văn / bảng thông tin đề tài để học viên đối chiếu
    if (currentExamData) {
        const titleEl = document.getElementById('resultPromptTitle');
        if (titleEl) titleEl.textContent = currentExamData.tieuDe || 'Mẫu thông tin & Đề bài gốc';
        
        const scenarioWrapper = document.getElementById('resultPromptScenarioWrapper');
        const scenarioEl = document.getElementById('resultPromptScenario');
        if (scenarioWrapper && scenarioEl) {
            if (currentExamData.tinhHuong) {
                scenarioEl.textContent = currentExamData.tinhHuong;
                scenarioWrapper.classList.remove('d-none');
            } else {
                scenarioWrapper.classList.add('d-none');
            }
        }

        const imgWrapper = document.getElementById('resultPromptImgWrapper');
        const imgEl = document.getElementById('resultPromptImg');
        if (imgWrapper && imgEl) {
            if (currentExamData.loaiNoiDung === 'IMAGE' && currentExamData.anhUrl) {
                imgEl.src = currentExamData.anhUrl;
                imgWrapper.classList.remove('d-none');
            } else {
                imgWrapper.classList.add('d-none');
            }
        }

        const promptTextEl = document.getElementById('resultPromptText');
        if (promptTextEl) {
            const rawText = currentExamData.vanBanThongTin || currentExamData.tomTatNoiDung || '';
            promptTextEl.innerHTML = rawText ? rawText : '<em>Không có văn bản bảng.</em>';
        }

        const btnTogglePrompt = document.getElementById('btnToggleResultPrompt');
        const promptBody = document.getElementById('resultPromptBody');
        if (btnTogglePrompt && promptBody) {
            btnTogglePrompt.onclick = () => {
                const isHidden = promptBody.classList.contains('d-none');
                if (isHidden) {
                    promptBody.classList.remove('d-none');
                    btnTogglePrompt.innerHTML = '👁️ Thu gọn đề bài';
                } else {
                    promptBody.classList.add('d-none');
                    btnTogglePrompt.innerHTML = '👁️ Mở xem đề bài';
                }
            };
        }
    }

    // 2. Chi tiết từng câu hỏi
    const container = document.getElementById('questionResultsContainer');
    container.innerHTML = '';

    const questions = [
        { qText: currentExamData ? currentExamData.cauHoi1 : 'Câu 1', ans: document.getElementById('ans1Input') ? document.getElementById('ans1Input').value.trim() : '', time: 15 },
        { qText: currentExamData ? currentExamData.cauHoi2 : 'Câu 2', ans: document.getElementById('ans2Input') ? document.getElementById('ans2Input').value.trim() : '', time: 15 },
        { qText: currentExamData ? currentExamData.cauHoi3 : 'Câu 3', ans: document.getElementById('ans3Input') ? document.getElementById('ans3Input').value.trim() : '', time: 30 }
    ];

    if (res.danhSachCauHoi && res.danhSachCauHoi.length > 0) {
        res.danhSachCauHoi.forEach((item, idx) => {
            const qInfo = questions[idx] || { qText: `Câu ${idx+1}`, ans: '', time: 15 };
            const card = document.createElement('div');
            card.className = 'result-q-card';

            const scoreBadgeColor = item.diem === 3 ? 'bg-success' : (item.diem === 2 ? 'bg-primary' : 'bg-danger');

            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h4 class="h5 fw-bold text-slate-800 mb-0">Câu ${item.soThuTu || (idx+1)} (${qInfo.time} giây)</h4>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="badge ${scoreBadgeColor} px-3 py-2 rounded-pill fw-bold fs-6">
                            ⭐ Điểm: ${item.diem != null ? item.diem : 0} / 3
                        </span>
                    </div>
                </div>

                <!-- 1. Câu hỏi -->
                <div class="p-3 bg-light rounded-3 mb-3 border">
                    <div class="fw-bold text-slate-700 mb-1">❓ Câu hỏi:</div>
                    <div class="text-slate-800 fw-semibold">${qInfo.qText}</div>
                </div>

                <!-- 2. Đoạn văn trích dẫn từ đề bài (Dữ liệu gốc y như đề) -->
                ${item.trichDanDeBai ? `
                <div class="prompt-citation-box">
                    <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                        <div class="fw-bold text-sky-900 small d-flex align-items-center gap-1">
                            <span>📌</span> <span>Dữ liệu gốc trong đề bài (Cần dùng để trả lời câu này):</span>
                        </div>
                        <span class="badge bg-primary text-white border px-2 py-1 rounded-pill small">Dữ liệu đề bài</span>
                    </div>
                    <div class="prompt-citation-text font-monospace mb-2" style="background: #ffffff; border: 1.5px dashed #0284c7; padding: 10px 14px; border-radius: 8px;">
                        ${item.trichDanDeBai.replace(/\n/g, '<br>')}
                    </div>
                    ${item.huongDanChemTu ? `
                    <div class="p-3 rounded-3 bg-white border border-sky-200 mt-2">
                        <div class="small fw-bold text-sky-900 mb-1">💡 Chêm từ vào dữ liệu đề để ghép thành câu hoàn chỉnh:</div>
                        <div class="text-slate-800" style="font-size: 14.5px; line-height: 1.6;">
                            ${formatInsertionGuide(item.huongDanChemTu)}
                        </div>
                        <div class="small text-muted mt-2 pt-1 border-top d-flex align-items-center gap-2" style="font-size: 12px;">
                            <span>Chú thích:</span>
                            <span class="chem-tu-tag">Từ chêm thêm</span>
                            <span>+</span>
                            <span class="fw-bold text-slate-800">Dữ liệu gốc từ đề</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- 3. Câu trả lời ban đầu của bạn -->
                <div class="p-3 rounded-3 mb-3 border ${qInfo.ans ? 'bg-white' : 'bg-light'}">
                    <div class="fw-bold text-slate-700 mb-1">✍️ Câu trả lời ban đầu của bạn:</div>
                    <div class="text-slate-800">${qInfo.ans ? qInfo.ans : '<em class="text-muted">Chưa nhập câu trả lời</em>'}</div>
                    <div class="mt-2 small text-muted">
                        📊 Dung lượng: <strong>${item.soTu || 0} từ</strong> • ⏱️ Thời gian nói ước tính: <strong>~${item.thoiGianNoiUocTinh || 0}s</strong>
                    </div>
                </div>

                <!-- 4. Chấm sửa & Hoàn thiện câu trả lời của bạn -->
                ${item.suaCauNguoiDung ? `
                <div class="user-correction-box">
                    <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                        <div class="fw-bold text-amber-900 small d-flex align-items-center gap-1">
                            <span>🛠️</span> <span>Sửa & Hoàn thiện từ câu của bạn (Để nói tự nhiên và đúng ngữ pháp):</span>
                        </div>
                        <span class="badge bg-warning-subtle text-warning-emphasis border px-2 py-1 rounded-pill small">Chấm sửa câu của bạn</span>
                    </div>
                    <div class="user-correction-text">
                        ${item.suaCauNguoiDung}
                    </div>
                    ${item.giaiThichSuaCau ? `
                    <div class="user-correction-explain">
                        <strong>🔍 Điểm cần hoàn thiện:</strong> ${item.giaiThichSuaCau}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- 5. Đánh giá thông tin & Thời gian nói -->
                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded-3 h-100 border">
                            <div class="fw-bold text-slate-700 mb-1">📋 Đánh giá thông tin:</div>
                            <div class="text-slate-800 small">${item.danhGiaThongTin || 'Chính xác'}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded-3 h-100 border">
                            <div class="fw-bold text-slate-700 mb-1">⏱️ Đánh giá tốc độ & thời gian nói:</div>
                            <div class="text-slate-800 small">${item.danhGiaThoiGian || 'Vừa vặn'}</div>
                        </div>
                    </div>
                </div>

                <!-- 6. Nhận xét chi tiết -->
                ${item.nhanXetChiTiet ? `
                    <div class="p-3 bg-light rounded-3 mb-3 border">
                        <div class="fw-bold text-slate-700 mb-1">🔍 Nhận xét chi tiết (Ngữ pháp / Giới từ / Giọng điệu):</div>
                        <div class="text-slate-800 small" style="white-space: pre-line;">${item.nhanXetChiTiet}</div>
                    </div>
                ` : ''}

                <!-- 7. Model Spoken Answer (Câu trả lời mẫu chuẩn bản xứ) -->
                <div class="model-answer-box">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <span class="fw-bold text-success">🌟 Câu trả lời mẫu chuẩn bản xứ (Đạt điểm tối đa):</span>
                        <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="speakText('${(item.cauTraLoiMau || '').replace(/'/g, "\\'")}')">
                            🔊 Nghe đọc mẫu
                        </button>
                    </div>
                    <div class="fw-semibold text-slate-900 mb-1 fs-6">${item.cauTraLoiMau || ''}</div>
                    ${item.dichTiengVietMau ? `<div class="small text-muted fst-italic">Dịch nghĩa: ${item.dichTiengVietMau}</div>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }

    resultSec.scrollIntoView({ behavior: 'smooth' });
}

function formatInsertionGuide(text) {
    if (!text) return '';
    // Làm nổi bật các cụm từ chêm thêm nằm trong ngoặc vuông [từ chêm vào]
    return text.replace(/\[(.*?)\]/g, '<span class="chem-tu-tag">$1</span>');
}

// -------------------------------------------------------------
// LOADING HELPERS
// -------------------------------------------------------------
function showLoading(title, subtitle) {
    document.getElementById('loadingTitle').textContent = title || 'Đang xử lý...';
    document.getElementById('loadingSubtitle').textContent = subtitle || 'Vui lòng chờ giây lát';
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// -------------------------------------------------------------
// XỬ LÝ BÔI ĐEN DỊCH NGHĨA (TOOLTIP TRANSLATION)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.getElementById('translateTooltip');
    const tooltipButtons = document.getElementById('tooltipButtons');
    const btnTranslate = document.getElementById('btnTranslateTooltip');
    const btnSpeak = document.getElementById('btnSpeakTooltip');
    const resultBox = document.getElementById('translateResultBox');
    const loading = document.getElementById('translateLoading');
    const content = document.getElementById('translateContent');
    let selectedText = "";

    // Lắng nghe sự kiện bôi đen (mouseup)
    document.addEventListener('mouseup', (e) => {
        if (!tooltip) return;
        // Nếu click vào bên trong tooltip thì không làm gì cả
        if (tooltip.contains(e.target)) return;

        // Bỏ qua nếu đang click vào các input, textarea để tránh xung đột
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
            tooltip.classList.add('d-none');
            resultBox.classList.add('d-none');
            selectedText = "";
            return;
        }

        // Lấy chữ được bôi đen
        let text = window.getSelection().toString().trim();
        if (text.length > 0 && text.length < 500) { // Giới hạn không dịch đoạn quá dài
            selectedText = text;
            
            // Tính toán vị trí hiển thị tooltip (ngay dưới đoạn bôi đen)
            const range = window.getSelection().getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Căn tooltip nằm ngay dưới văn bản được bôi đen
            tooltip.style.left = `${Math.max(10, rect.left + window.scrollX + (rect.width/2) - 30)}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
            
            // Reset trạng thái tooltip
            resultBox.classList.add('d-none');
            tooltipButtons.classList.remove('d-none');
            tooltip.classList.remove('d-none');
        } else {
            // Ẩn tooltip nếu click ra ngoài hoặc không có text
            tooltip.classList.add('d-none');
            resultBox.classList.add('d-none');
            selectedText = "";
        }
    });

    // Khi bấm nút Đọc
    if (btnSpeak) {
        btnSpeak.addEventListener('click', () => {
            if (!selectedText) return;
            speakText(selectedText);
        });
    }

    // Khi bấm nút Dịch
    if (btnTranslate) {
        btnTranslate.addEventListener('click', () => {
            if (!selectedText) return;
            
            tooltipButtons.classList.add('d-none');
            resultBox.classList.remove('d-none');
            loading.classList.remove('d-none');
            content.innerHTML = "";

            fetch('/api/tra-tu/dich', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: selectedText,
                    mode: 'AUTO',
                    quickMode: true
                })
            })
            .then(res => res.json())
            .then(data => {
                loading.classList.add('d-none');
                if (data.thanhCong && data.banDich) {
                    let html = `<div class="fw-bold text-primary mb-1">${data.tuGoc || selectedText}</div>`;
                    if (data.phienAm) html += `<div class="text-muted small mb-1">${data.phienAm}</div>`;
                    html += `<div class="fw-semibold">${data.banDich}</div>`;
                    
                    if (data.giaiThich) {
                        html += `<div class="mt-2 text-muted small" style="white-space: pre-line;">${data.giaiThich}</div>`;
                    }
                    content.innerHTML = html;
                } else {
                    content.innerHTML = `<div class="text-danger">${data.thongBaoLoi || 'Không thể dịch đoạn văn này.'}</div>`;
                }
            })
            .catch(err => {
                loading.classList.add('d-none');
                content.innerHTML = `<div class="text-danger">Lỗi kết nối.</div>`;
            });
        });
    }
});
