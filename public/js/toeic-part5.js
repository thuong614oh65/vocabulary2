/**
 * TOEIC PART 5 - TEST 1 SCRIPT
 * Quản lý bài thi xáo trộn ngẫu nhiên câu hỏi & đáp án, kiểm tra đáp án, phân tích chuyên sâu và âm thanh TTS
 */

(function () {
    "use strict";

    // Trạng thái dữ liệu gốc từ máy chủ
    let rawQuestions = [];

    // Trạng thái bài làm hiện tại (đã được đảo ngẫu nhiên)
    let questions = [];
    let currentIndex = 0;
    let userAnswers = {}; // { [indexInSession]: { selected: "A", isCorrect: true } }
    let currentFilter = "all";
    let currentAudio = null;

    // Khởi tạo khi trang tải
    document.addEventListener("DOMContentLoaded", function () {
        initEvents();
        fetchQuestions();
    });

    // Hàm xáo trộn mảng Fisher-Yates ngẫu nhiên đồng đều
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Xáo trộn cả danh sách câu hỏi VÀ 4 phương án A, B, C, D của từng câu
    function prepareRandomizedQuestions(rawList) {
        // 1. Đảo ngẫu nhiên thứ tự 30 câu hỏi
        const shuffledQuestionsList = shuffleArray(rawList);

        // 2. Đảo ngẫu nhiên vị trí 4 đáp án A, B, C, D của từng câu
        return shuffledQuestionsList.map(function (rawQ) {
            const rawOptions = [
                { 
                    originalKey: "A", 
                    text: rawQ.choiceA, 
                    analysis: (rawQ.choicesAnalysis && rawQ.choicesAnalysis["A"]) || "" 
                },
                { 
                    originalKey: "B", 
                    text: rawQ.choiceB, 
                    analysis: (rawQ.choicesAnalysis && rawQ.choicesAnalysis["B"]) || "" 
                },
                { 
                    originalKey: "C", 
                    text: rawQ.choiceC, 
                    analysis: (rawQ.choicesAnalysis && rawQ.choicesAnalysis["C"]) || "" 
                },
                { 
                    originalKey: "D", 
                    text: rawQ.choiceD, 
                    analysis: (rawQ.choicesAnalysis && rawQ.choicesAnalysis["D"]) || "" 
                }
            ];

            // Xáo trộn 4 đáp án
            const shuffledOptions = shuffleArray(rawOptions);

            const keys = ["A", "B", "C", "D"];
            let newCorrectAnswer = "A";
            const newChoicesAnalysis = {};

            keys.forEach(function (slotKey, idx) {
                const opt = shuffledOptions[idx];
                // Nếu đáp án này nguyên gốc là đáp án đúng, slot mới sẽ là correctAnswer
                if (opt.originalKey.toUpperCase() === rawQ.correctAnswer.toUpperCase()) {
                    newCorrectAnswer = slotKey;
                }
                newChoicesAnalysis[slotKey] = opt.analysis;
            });

            return {
                ...rawQ,
                originalQuestionNumber: rawQ.questionNumber,
                originalCorrectAnswer: rawQ.correctAnswer,
                choiceA: shuffledOptions[0].text,
                choiceB: shuffledOptions[1].text,
                choiceC: shuffledOptions[2].text,
                choiceD: shuffledOptions[3].text,
                correctAnswer: newCorrectAnswer,
                choicesAnalysis: newChoicesAnalysis
            };
        });
    }

    // Bắt đầu phiên làm bài mới với câu hỏi và đáp án được đảo ngẫu nhiên
    function startNewShuffledSession(showMessage) {
        if (!rawQuestions || rawQuestions.length === 0) return;

        questions = prepareRandomizedQuestions(rawQuestions);
        userAnswers = {};
        currentIndex = 0;

        renderPalette();
        renderQuestion(currentIndex);
        updateStats();

        if (showMessage) {
            showToast("🎲 Đã xáo trộn ngẫu nhiên toàn bộ câu hỏi & đáp án!");
        }
    }

    // Thông báo Toast nhỏ gọn
    function showToast(msg) {
        const toast = document.getElementById("toeicToast");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "flex";
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function () {
            toast.style.display = "none";
        }, 2200);
    }

    function initEvents() {
        // Nút đảo đề ngẫu nhiên mới
        const btnShuffle = document.getElementById("btnShuffleTest");
        if (btnShuffle) {
            btnShuffle.addEventListener("click", function () {
                const answeredCount = Object.keys(userAnswers).length;
                if (answeredCount > 0) {
                    if (!confirm(`Bạn đã làm ${answeredCount} câu. Bạn có chắc muốn tạo một bộ đề xáo trộn ngẫu nhiên mới không?`)) {
                        return;
                    }
                }
                startNewShuffledSession(true);
            });
        }

        // Nút chuyển câu
        document.getElementById("btnPrevQ").addEventListener("click", function () {
            navigateQuestion(-1);
        });

        document.getElementById("btnNextQ").addEventListener("click", function () {
            navigateQuestion(1);
        });

        // Nút đọc câu hỏi
        document.getElementById("btnReadQuestion").addEventListener("click", function () {
            readCurrentQuestion();
        });

        // Nút làm lại bài (giữ nguyên thứ tự đề hiện tại nhưng xóa kết quả đã chọn)
        document.getElementById("btnResetTest").addEventListener("click", function () {
            if (confirm("Bạn có chắc chắn muốn xóa toàn bộ kết quả đã chọn để làm lại bộ đề này không?")) {
                userAnswers = {};
                currentIndex = 0;
                renderPalette();
                renderQuestion(currentIndex);
                updateStats();
                showToast("🔄 Đã đặt lại toàn bộ đáp án!");
            }
        });

        // Lựa chọn đáp án A, B, C, D
        const choiceBtns = document.querySelectorAll(".choice-btn");
        choiceBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                const choice = this.getAttribute("data-choice");
                handleSelectAnswer(choice);
            });
        });

        // Bộ lọc bảng câu hỏi
        const filterBtns = document.querySelectorAll(".btn-filter");
        filterBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                filterBtns.forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                currentFilter = this.getAttribute("data-filter");
                applyFilter();
            });
        });

        // Phím tắt bàn phím tiện lợi
        document.addEventListener("keydown", function (e) {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            const key = e.key.toUpperCase();
            if (["A", "B", "C", "D"].includes(key)) {
                handleSelectAnswer(key);
            } else if (e.key === "ArrowLeft") {
                navigateQuestion(-1);
            } else if (e.key === "ArrowRight") {
                navigateQuestion(1);
            }
        });
    }

    // Tải danh sách 30 câu hỏi từ backend API
    function fetchQuestions() {
        const loadingEl = document.getElementById("quizLoading");
        const contentEl = document.getElementById("quizContent");

        fetch("/api/toeic-part-5/questions")
            .then(res => res.json())
            .then(data => {
                rawQuestions = data || [];
                if (rawQuestions.length === 0) {
                    loadingEl.innerHTML = '<div class="alert-danger">Không có dữ liệu câu hỏi TOEIC Part 5.</div>';
                    return;
                }

                loadingEl.style.display = "none";
                contentEl.style.display = "flex";

                // Khởi tạo ngay một phiên làm bài với câu hỏi và đáp án được đảo ngẫu nhiên
                startNewShuffledSession(false);
            })
            .catch(err => {
                console.error("Lỗi tải câu hỏi:", err);
                loadingEl.innerHTML = '<div class="alert-danger">Không thể tải dữ liệu câu hỏi. Vui lòng thử lại.</div>';
            });
    }

    // Hiển thị bảng 30 câu hỏi ở cột bên phải
    function renderPalette() {
        const grid = document.getElementById("questionPaletteGrid");
        grid.innerHTML = "";

        questions.forEach(function (q, idx) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "palette-q-btn";
            btn.setAttribute("data-index", idx);
            btn.setAttribute("data-qnum", q.originalQuestionNumber);

            btn.innerHTML = `
                <span class="palette-q-seq">${idx + 1}</span>
                <span class="palette-q-sub">#${q.originalQuestionNumber}</span>
            `;

            const record = userAnswers[idx];
            if (record) {
                if (record.isCorrect) {
                    btn.classList.add("is-correct");
                    btn.title = `Câu ${idx + 1} (Gốc #${q.originalQuestionNumber}): Đúng`;
                } else {
                    btn.classList.add("is-wrong");
                    btn.title = `Câu ${idx + 1} (Gốc #${q.originalQuestionNumber}): Sai (Đáp án đúng: ${q.correctAnswer})`;
                }
            } else {
                btn.title = `Câu ${idx + 1} (Gốc #${q.originalQuestionNumber})`;
            }

            if (idx === currentIndex) {
                btn.classList.add("active");
            }

            btn.addEventListener("click", function () {
                currentIndex = idx;
                renderQuestion(currentIndex);
            });

            grid.appendChild(btn);
        });
    }

    // Áp dụng bộ lọc câu hỏi theo 3 nhóm
    function applyFilter() {
        const btns = document.querySelectorAll(".palette-q-btn");
        btns.forEach(function (btn) {
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            const q = questions[idx];
            const record = userAnswers[idx];

            let visible = true;
            if (currentFilter === "wrong") {
                visible = record && !record.isCorrect;
            } else if (currentFilter === "cautruc") {
                visible = (q.questionType === "CAU_TRUC") || (q.category === "GRAMMAR");
            } else if (currentFilter === "loaitu") {
                visible = (q.questionType === "LOAI_TU");
            } else if (currentFilter === "nghia") {
                visible = (q.questionType === "NGHIA");
            }

            btn.style.display = visible ? "flex" : "none";
        });
    }

    // Cập nhật thống kê
    function updateStats() {
        let correct = 0;
        let wrong = 0;

        questions.forEach(function (q, idx) {
            const record = userAnswers[idx];
            if (record) {
                if (record.isCorrect) correct++;
                else wrong++;
            }
        });

        const remain = questions.length - (correct + wrong);

        document.getElementById("statCorrectCount").textContent = correct;
        document.getElementById("statWrongCount").textContent = wrong;
        document.getElementById("statRemainCount").textContent = remain;
        document.getElementById("topScoreText").textContent = `${correct} / ${questions.length}`;
    }

    // Hiển thị câu hỏi hiện tại
    function renderQuestion(index) {
        if (index < 0 || index >= questions.length) return;
        currentIndex = index;

        const q = questions[index];

        // Highlight palette
        const paletteBtns = document.querySelectorAll(".palette-q-btn");
        paletteBtns.forEach(b => b.classList.remove("active"));
        if (paletteBtns[index]) {
            paletteBtns[index].classList.add("active");
            paletteBtns[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }

        // Meta tags
        document.getElementById("qNumberBadge").innerHTML = `CÂU ${index + 1} / ${questions.length} <span class="q-orig-tag" title="Số thứ tự câu hỏi trong đề gốc PowerPoint">(Đề gốc: #${q.originalQuestionNumber})</span>`;
        
        const catTag = document.getElementById("qCategoryTag");
        const qType = q.questionType || (q.category === "GRAMMAR" ? "CAU_TRUC" : "LOAI_TU");

        if (qType === "CAU_TRUC") {
            catTag.textContent = "📐 CẤU TRÚC";
            catTag.className = "q-category-tag tag-cautruc";
        } else if (qType === "LOAI_TU") {
            catTag.textContent = "🏷️ LOẠI TỪ";
            catTag.className = "q-category-tag tag-loaitu";
        } else {
            catTag.textContent = "📖 NGHĨA";
            catTag.className = "q-category-tag tag-nghia";
        }

        document.getElementById("qSubCategoryTag").textContent = q.subCategory || "";

        // Mindmap hint
        const mmText = document.getElementById("qMindmapText");
        if (qType === "CAU_TRUC") {
            mmText.innerHTML = `Sơ đồ tư duy: <b>gram ➔ Cấu trúc & Công thức</b> &nbsp;|&nbsp; <em>${escapeHtml(q.subCategory || "")}</em>`;
        } else if (qType === "LOAI_TU") {
            mmText.innerHTML = `Sơ đồ tư duy: <b>vocab ➔ Loại từ (N, V, Adj, Adv)</b> &nbsp;|&nbsp; <em>${escapeHtml(q.subCategory || "")}</em>`;
        } else {
            mmText.innerHTML = `Sơ đồ tư duy: <b>vocab ➔ Nghĩa / Collocation</b> &nbsp;|&nbsp; <em>${escapeHtml(q.subCategory || "")}</em>`;
        }

        // Câu hỏi
        const sentenceBox = document.getElementById("qSentenceBox");
        // Làm nổi bật phần gạch ngang -------
        const styledSentence = escapeHtml(q.questionText).replace(
            /-------/g,
            '<span class="q-blank">-------</span>'
        );
        sentenceBox.innerHTML = styledSentence;

        // 4 Phương án đã được xáo trộn
        document.getElementById("textChoiceA").textContent = q.choiceA || "";
        document.getElementById("textChoiceB").textContent = q.choiceB || "";
        document.getElementById("textChoiceC").textContent = q.choiceC || "";
        document.getElementById("textChoiceD").textContent = q.choiceD || "";

        // Reset trạng thái các nút lựa chọn
        const choiceBtns = document.querySelectorAll(".choice-btn");
        choiceBtns.forEach(function (btn) {
            btn.className = "choice-btn";
            btn.disabled = false;
            const icon = btn.querySelector(".choice-status-icon");
            if (icon) icon.textContent = "";
        });

        // Cập nhật nút Prev, Next
        document.getElementById("btnPrevQ").disabled = (currentIndex === 0);
        document.getElementById("btnNextQ").disabled = (currentIndex === questions.length - 1);

        // Kiểm tra xem câu này người dùng đã trả lời chưa
        const recorded = userAnswers[currentIndex];
        const analysisCard = document.getElementById("analysisCard");

        if (recorded) {
            // Đã trả lời: hiển thị ngay đáp án và phần giải thích
            applyAnswerStyles(q, recorded.selected, recorded.isCorrect);
            displayAnalysisCard(q, recorded.selected, recorded.isCorrect);
        } else {
            // Chưa trả lời: ẩn card giải thích
            analysisCard.style.display = "none";
        }
    }

    // Xử lý khi người dùng chọn đáp án (A, B, C, D)
    function handleSelectAnswer(selectedChoice) {
        const q = questions[currentIndex];
        if (!q) return;

        const isCorrect = (selectedChoice.toUpperCase() === q.correctAnswer.toUpperCase());

        // Lưu trạng thái cho câu hỏi thứ `currentIndex`
        userAnswers[currentIndex] = {
            selected: selectedChoice.toUpperCase(),
            isCorrect: isCorrect
        };

        // Cập nhật giao diện
        applyAnswerStyles(q, selectedChoice, isCorrect);
        displayAnalysisCard(q, selectedChoice, isCorrect);
        updatePaletteItem(currentIndex, isCorrect);
        updateStats();

        // Cuộn mượt đến phần giải thích
        const analysisCard = document.getElementById("analysisCard");
        if (analysisCard) {
            analysisCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    // Đổi màu các nút đáp án A, B, C, D
    function applyAnswerStyles(q, userChoice, isCorrect) {
        const choiceBtns = document.querySelectorAll(".choice-btn");
        choiceBtns.forEach(function (btn) {
            const key = btn.getAttribute("data-choice");
            const icon = btn.querySelector(".choice-status-icon");

            btn.className = "choice-btn";

            if (key === q.correctAnswer) {
                btn.classList.add("is-correct");
                if (icon) icon.textContent = "✓";
            } else if (key === userChoice && !isCorrect) {
                btn.classList.add("is-wrong");
                if (icon) icon.textContent = "✗";
            }
        });
    }

    // Cập nhật một nút trên bảng câu hỏi
    function updatePaletteItem(idx, isCorrect) {
        const paletteBtns = document.querySelectorAll(".palette-q-btn");
        if (paletteBtns[idx]) {
            paletteBtns[idx].classList.remove("is-correct", "is-wrong");
            if (isCorrect) {
                paletteBtns[idx].classList.add("is-correct");
            } else {
                paletteBtns[idx].classList.add("is-wrong");
            }
        }
    }

    // Hiển thị bảng phân tích chi tiết siêu dễ hiểu theo 3 dạng: CẤU TRÚC / LOẠI TỪ / NGHĨA
    function displayAnalysisCard(q, userChoice, isCorrect) {
        const card = document.getElementById("analysisCard");
        const banner = document.getElementById("resultBanner");
        const icon = document.getElementById("resultIcon");
        const heading = document.getElementById("resultHeading");
        const desc = document.getElementById("resultDesc");
        const body = document.getElementById("analysisBody");

        card.style.display = "block";

        if (isCorrect) {
            banner.className = "analysis-result-banner correct";
            icon.textContent = "🎉";
            heading.textContent = "CHÍNH XÁC! (+1 Điểm)";
            desc.innerHTML = `Bạn đã chọn đúng đáp án <b>(${q.correctAnswer}) ${escapeHtml(getChoiceText(q, q.correctAnswer))}</b>`;
        } else {
            banner.className = "analysis-result-banner wrong";
            icon.textContent = "❌";
            heading.textContent = "CHƯA CHÍNH XÁC!";
            desc.innerHTML = `Bạn đã chọn <b>(${userChoice}) ${escapeHtml(getChoiceText(q, userChoice))}</b>, nhưng đáp án đúng phải là <b>(${q.correctAnswer}) ${escapeHtml(getChoiceText(q, q.correctAnswer))}</b>`;
        }

        const qType = q.questionType || (q.category === "GRAMMAR" ? "CAU_TRUC" : "LOAI_TU");

        // Helper render choices list
        function renderChoicesListHtml(isLoaiTu) {
            const choicesKeys = ["A", "B", "C", "D"];
            let html = '<div class="choices-analysis-list">';
            choicesKeys.forEach(function (k) {
                const isAns = (k === q.correctAnswer);
                let detail = (q.choicesAnalysis && q.choicesAnalysis[k]) ? q.choicesAnalysis[k] : `${getChoiceText(q, k)}`;
                html += `
                    <div class="choice-analysis-item ${isAns ? 'is-answer' : ''}">
                        <span class="choice-badge">${k}</span>
                        <div class="choice-detail">
                            <span class="choice-tag-pill ${isAns ? 'tag-correct-choice' : 'tag-wrong-choice'}">${isAns ? '✓ ĐÚNG' : '✗ LOẠI'}</span>
                            ${escapeHtml(detail)}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }

        let bodyHtml = "";

        if (qType === "CAU_TRUC") {
            // ==========================================
            // DẠNG 1: CÂU CẤU TRÚC / CÔNG THỨC
            // ==========================================
            bodyHtml = `
                <!-- Header Phân loại -->
                <div class="analysis-type-header type-cautruc">
                    <span class="type-icon">📐</span>
                    <span class="type-name">DẠNG CÂU: CẤU TRÚC & CÔNG THỨC</span>
                    <span class="type-sub">${escapeHtml(q.subCategory || '')}</span>
                </div>

                <!-- 1. Công thức / Cấu trúc ngữ pháp -->
                <div class="analysis-section formula-section">
                    <div class="section-title">
                        <span class="icon">📐</span>
                        <span>1. Cấu trúc / Công thức cốt lõi:</span>
                    </div>
                    <div class="formula-box">
                        ${escapeHtml(q.congThuc || q.grammarBreakdown || '')}
                    </div>
                    ${q.explanation ? `<div class="formula-explain"><b>Giải thích chi tiết:</b> ${escapeHtml(q.explanation)}</div>` : ''}
                </div>

                <!-- 2. Dấu hiệu nhìn vào để làm nhanh -->
                <div class="analysis-section cue-section">
                    <div class="section-title">
                        <span class="icon">⚡</span>
                        <span>2. Dấu hiệu nhìn vào gì để chọn nhanh chuẩn (3 giây):</span>
                    </div>
                    <div class="cue-box">
                        ${escapeHtml(q.dauHieuNhanBiet || q.quickTip || 'Nhìn vào các từ khóa đứng ngay trước và ngay sau chỗ trống để nhận diện cấu trúc.')}
                    </div>
                </div>

                <!-- 3. Phân tích từng đáp án sao chọn sao ko chọn -->
                <div class="analysis-section choices-section">
                    <div class="section-title">
                        <span class="icon">🔍</span>
                        <span>3. Phân tích từng đáp án (Sao chọn / Sao KHÔNG chọn):</span>
                    </div>
                    ${renderChoicesListHtml(false)}
                </div>

                <!-- 4. Dịch nghĩa toàn câu hoàn chỉnh -->
                <div class="analysis-section translation-section">
                    <div class="section-title">
                        <span class="icon">📖</span>
                        <span>4. Dịch nghĩa toàn câu hoàn chỉnh:</span>
                    </div>
                    <div class="translation-content">
                        "${escapeHtml(q.vietnameseTranslation || '')}"
                    </div>
                </div>

                <!-- 5. Mẹo làm bài 5s -->
                ${q.quickTip ? `
                <div class="analysis-section tip-section">
                    <div class="section-title">
                        <span class="icon">💡</span>
                        <span>5. Mẹo giải nhanh TOEIC (5s Exam Tip):</span>
                    </div>
                    <div class="tip-content">${escapeHtml(q.quickTip)}</div>
                </div>
                ` : ''}
            `;
        } else if (qType === "LOAI_TU") {
            // ==========================================
            // DẠNG 2: CÂU LOẠI TỪ (N - V - Adj - Adv)
            // ==========================================
            bodyHtml = `
                <!-- Header Phân loại -->
                <div class="analysis-type-header type-loaitu">
                    <span class="type-icon">🏷️</span>
                    <span class="type-name">DẠNG CÂU: LOẠI TỪ (Part of Speech: N - V - Adj - Adv)</span>
                    <span class="type-sub">${escapeHtml(q.subCategory || '')}</span>
                </div>

                <!-- 1. Vì sao ở đó lại thiếu loại từ đó? -->
                <div class="analysis-section why-section">
                    <div class="section-title">
                        <span class="icon">❓</span>
                        <span>1. Vì sao ở vị trí đó lại thiếu loại từ đó?</span>
                    </div>
                    <div class="why-box">
                        ${escapeHtml(q.lyDoChonLoaiTu || q.explanation || '')}
                    </div>
                    ${q.grammarBreakdown ? `<div class="grammar-sub-box"><b>Thành phần câu:</b> ${escapeHtml(q.grammarBreakdown)}</div>` : ''}
                </div>

                <!-- 2. Dấu hiệu nhìn vào gì để làm nhanh chuẩn câu đó -->
                <div class="analysis-section cue-section">
                    <div class="section-title">
                        <span class="icon">⚡</span>
                        <span>2. Dấu hiệu nhìn vào gì để làm nhanh chuẩn (3 giây):</span>
                    </div>
                    <div class="cue-box">
                        ${escapeHtml(q.dauHieuNhanBiet || 'Nhìn từ đứng ngay trước và ngay sau chỗ trống để xác định loại từ cần điền.')}
                    </div>
                </div>

                <!-- 3. Phân loại 4 đáp án (N, V, Adj, Adv) & Lý do chọn -->
                <div class="analysis-section choices-section">
                    <div class="section-title">
                        <span class="icon">🔍</span>
                        <span>3. Phân loại 4 đáp án (N, V, Adj, Adv) & Lý do chọn:</span>
                    </div>
                    ${renderChoicesListHtml(true)}
                </div>

                <!-- 4. Dịch nghĩa toàn câu hoàn chỉnh -->
                <div class="analysis-section translation-section">
                    <div class="section-title">
                        <span class="icon">📖</span>
                        <span>4. Dịch nghĩa toàn câu hoàn chỉnh:</span>
                    </div>
                    <div class="translation-content">
                        "${escapeHtml(q.vietnameseTranslation || '')}"
                    </div>
                </div>

                <!-- 5. Mẹo làm bài 5s -->
                ${q.quickTip ? `
                <div class="analysis-section tip-section">
                    <div class="section-title">
                        <span class="icon">💡</span>
                        <span>5. Mẹo giải nhanh TOEIC (5s Exam Tip):</span>
                    </div>
                    <div class="tip-content">${escapeHtml(q.quickTip)}</div>
                </div>
                ` : ''}
            `;
        } else {
            // ==========================================
            // DẠNG 3: CÂU NGHĨA (Từ vựng thuần / Collocation)
            // (Nghĩa thì dịch thôi, ko cần giải thích nhiều)
            // ==========================================
            bodyHtml = `
                <!-- Header Phân loại -->
                <div class="analysis-type-header type-nghia">
                    <span class="type-icon">📖</span>
                    <span class="type-name">DẠNG CÂU: TỪ VỰNG & NGHĨA THEO NGỮ CẢNH</span>
                    <span class="type-sub">${escapeHtml(q.subCategory || '')}</span>
                </div>

                <!-- 1. Từ khóa ngữ cảnh quyết định nghĩa -->
                <div class="analysis-section context-section">
                    <div class="section-title">
                        <span class="icon">🔑</span>
                        <span>1. Từ khóa ngữ cảnh quyết định (Context Clues):</span>
                    </div>
                    <div class="context-box">
                        ${escapeHtml(q.tuKhoaNguCanh || q.explanation || 'Dựa vào mối liên hệ nghĩa giữa chỗ trống và các từ vựng xung quanh trong câu.')}
                    </div>
                </div>

                <!-- 2. Dịch nghĩa 4 đáp án sao chọn sao ko chọn -->
                <div class="analysis-section choices-section">
                    <div class="section-title">
                        <span class="icon">🔍</span>
                        <span>2. Dịch nghĩa 4 đáp án (Sao chọn / Sao KHÔNG chọn):</span>
                    </div>
                    ${renderChoicesListHtml(false)}
                </div>

                <!-- 3. Dịch nghĩa toàn câu hoàn chỉnh -->
                <div class="analysis-section translation-section">
                    <div class="section-title">
                        <span class="icon">📖</span>
                        <span>3. Dịch nghĩa toàn câu hoàn chỉnh:</span>
                    </div>
                    <div class="translation-content">
                        "${escapeHtml(q.vietnameseTranslation || '')}"
                    </div>
                </div>

                <!-- 4. Cụm từ hay gặp / Mẹo nhớ -->
                ${q.quickTip ? `
                <div class="analysis-section tip-section">
                    <div class="section-title">
                        <span class="icon">💡</span>
                        <span>4. Cụm từ hay gặp & Mẹo ghi nhớ:</span>
                    </div>
                    <div class="tip-content">${escapeHtml(q.quickTip)}</div>
                </div>
                ` : ''}
            `;
        }

        if (body) {
            body.innerHTML = bodyHtml;
        }
    }

    function getChoiceText(q, key) {
        if (key === "A") return q.choiceA;
        if (key === "B") return q.choiceB;
        if (key === "C") return q.choiceC;
        if (key === "D") return q.choiceD;
        return "";
    }

    // Chuyển câu hỏi (-1: lùi, 1: tiến)
    function navigateQuestion(step) {
        const nextIdx = currentIndex + step;
        if (nextIdx >= 0 && nextIdx < questions.length) {
            renderQuestion(nextIdx);
        }
    }

    // Đọc câu hỏi qua audio TTS
    function readCurrentQuestion() {
        const q = questions[currentIndex];
        if (!q || !q.questionText) return;

        const cleanText = q.questionText.replace(/-------/g, "blank");
        const btn = document.getElementById("btnReadQuestion");
        btn.textContent = "⏳ Đang đọc...";

        if (window.phatAmThanh) {
            window.phatAmThanh(cleanText, {
                rate: "+0%",
                onEnd: function () {
                    btn.textContent = "🔊 Nghe câu";
                },
                onError: function () {
                    btn.textContent = "🔊 Nghe câu";
                }
            });
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const audioUrl = "/audio/phat?text=" + encodeURIComponent(cleanText) + "&rate=+0%";
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = function () {
            btn.textContent = "🔊 Nghe câu";
            currentAudio = null;
        };

        audio.onerror = function () {
            btn.textContent = "🔊 Nghe câu";
            currentAudio = null;
        };

        audio.play().catch(function () {
            btn.textContent = "🔊 Nghe câu";
            currentAudio = null;
        });
    }

    // Helper escape HTML
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();
