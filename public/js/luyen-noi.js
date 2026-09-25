// =========================================================
// LUYỆN NÓI TIẾNG ANH - JAVASCRIPT NÂNG CAO
// CHẤM ĐIỂM CHUẨN IELTS/CEFR 5 TIÊU CHÍ
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // 1. XỬ LÝ FORM CHỌN CHẾ ĐỘ
    // =====================================================
    const kieuHocSelect = document.getElementById("kieuHoc");
    const boxChonBo = document.getElementById("boxChonBo");

    if (kieuHocSelect && boxChonBo) {
        function capNhatHienThiBo() {
            if (kieuHocSelect.value === "THEO_BO") {
                boxChonBo.style.display = "block";
            } else {
                boxChonBo.style.display = "none";
            }
        }
        kieuHocSelect.addEventListener("change", capNhatHienThiBo);
        capNhatHienThiBo();
    }

    // =====================================================
    // 2. KHỞI TẠO PHÒNG LUYỆN NÓI
    // =====================================================
    let danhSachTu = window.danhSachTuLuyenNoi;
    if (!Array.isArray(danhSachTu) || danhSachTu.length === 0) {
        const jsonDsTuData = document.getElementById("jsonDsTuData");
        if (jsonDsTuData && jsonDsTuData.textContent.trim()) {
            try {
                danhSachTu = JSON.parse(jsonDsTuData.textContent.trim());
            } catch (e) {
                console.warn("Parse fallback error:", e);
            }
        }
    }

    if (!Array.isArray(danhSachTu) || danhSachTu.length === 0) {
        console.warn("Chưa có danh sách từ để luyện nói.");
        return;
    }

    console.log("=== KHỞI TẠO BÀI LUYỆN NÓI ===");
    console.log("Số lượng từ cần luyện:", danhSachTu.length, danhSachTu);

    let currentIndex = 0;
    let scoresList = [];
    let lastResultData = null;

    // Elements
    const badgeProgress = document.getElementById("badgeProgress");
    const avgScoreText = document.getElementById("avgScoreText");
    const displayTiengAnh = document.getElementById("displayTiengAnh");
    const displayPhienAm = document.getElementById("displayPhienAm");
    const displayTiengViet = document.getElementById("displayTiengViet");
    const btnNgheChuan = document.getElementById("btnNgheChuan");
    const btnNgheCham = document.getElementById("btnNgheCham");

    const btnMic = document.getElementById("btnMic");
    const micStatus = document.getElementById("micStatus");
    const micTimer = document.getElementById("micTimer");
    const recordSeconds = document.getElementById("recordSeconds");
    const soundWave = document.getElementById("soundWave");
    const aiLoading = document.getElementById("aiLoading");

    const resultBox = document.getElementById("resultBox");
    const scoreBadge = document.getElementById("scoreBadge");
    const resRecognizedText = document.getElementById("resRecognizedText");
    const resIpaComparison = document.getElementById("resIpaComparison");
    const resPhonemeBreakdown = document.getElementById("resPhonemeBreakdown");
    const breakdownGrid = document.getElementById("breakdownGrid");
    const resFeedbackText = document.getElementById("resFeedbackText");
    const resSuggestionText = document.getElementById("resSuggestionText");
    const suggestionBox = document.getElementById("suggestionBox");
    const resEncouragementText = document.getElementById("resEncouragementText");
    const encouragementBox = document.getElementById("encouragementBox");

    const btnNoiLai = document.getElementById("btnNoiLai");
    const btnNgheLaiMau = document.getElementById("btnNgheLaiMau");
    const btnTuTiepTheo = document.getElementById("btnTuTiepTheo");
    const completionBox = document.getElementById("completionBox");
    const finalScoreVal = document.getElementById("finalScoreVal");
    const finalWordsCount = document.getElementById("finalWordsCount");

    // =====================================================
    // 3. HIỂN THỊ TỪ HIỆN TẠI
    // =====================================================
    function renderWord() {
        if (currentIndex >= danhSachTu.length) {
            hienThiTongKet();
            return;
        }

        const item = danhSachTu[currentIndex];
        console.log(`[Luyện nói ${currentIndex + 1}/${danhSachTu.length}] Từ:`, item.tiengAnh, "Phiên âm:", item.phienAm, "Nghĩa:", item.tiengViet);

        if (badgeProgress) {
            badgeProgress.textContent = `Từ ${currentIndex + 1} / ${danhSachTu.length}`;
        }

        if (displayTiengAnh) displayTiengAnh.textContent = item.tiengAnh || "";
        if (displayPhienAm) {
            let ipa = item.phienAm || "";
            if (ipa && !ipa.startsWith("/")) ipa = "/" + ipa;
            if (ipa && !ipa.endsWith("/")) ipa = ipa + "/";
            displayPhienAm.textContent = ipa || "/.../";
        }
        if (displayTiengViet) displayTiengViet.textContent = item.tiengViet || "";

        // Reset trạng thái Mic & Kết quả
        lastResultData = null;
        if (resultBox) resultBox.style.display = "none";
        if (soundWave) soundWave.style.display = "none";
        if (micTimer) micTimer.style.display = "none";
        if (aiLoading) aiLoading.style.display = "none";
        if (btnMic) {
            btnMic.classList.remove("recording");
            btnMic.disabled = false;
        }
        if (micStatus) {
            micStatus.textContent = "Bấm vào Mic để bắt đầu nói";
            micStatus.style.color = "#334155";
        }
    }

    // =====================================================
    // 4. PHÁT ÂM MẪU (EDGE NEURAL TTS MP3 STREAM)
    // =====================================================
    let currentSampleAudio = null;

    function phatAmMau(tocDoRate) {
        const item = danhSachTu[currentIndex];
        if (!item || !item.tiengAnh) return;

        if (currentSampleAudio) {
            currentSampleAudio.pause();
            if (currentSampleAudio.src && currentSampleAudio.src.startsWith("blob:")) {
                URL.revokeObjectURL(currentSampleAudio.src);
            }
            currentSampleAudio = null;
        }

        if (window.phatAmThanh) {
            window.phatAmThanh(item.tiengAnh, { rate: tocDoRate });
            return;
        }

        let url = "/audio/phat?text=" + encodeURIComponent(item.tiengAnh) + "&rate=" + encodeURIComponent(tocDoRate);
        currentSampleAudio = new Audio(url);
        currentSampleAudio.play().catch(err => console.warn("Lỗi play audio:", err));
    }

    if (btnNgheChuan) {
        btnNgheChuan.addEventListener("click", () => phatAmMau("+0%"));
    }
    if (btnNgheCham) {
        btnNgheCham.addEventListener("click", () => phatAmMau("-25%"));
    }
    if (btnNgheLaiMau) {
        btnNgheLaiMau.addEventListener("click", () => phatAmMau("+0%"));
    }

    // =====================================================
    // 5. GHI ÂM MICROPHONE BẰNG MEDIARECORDER
    // =====================================================
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordInterval = null;
    let secondsRecorded = 0;
    let mediaStream = null;

    function getSupportedMimeType() {
        const types = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/aac",
            "audio/ogg;codecs=opus",
            "audio/wav"
        ];
        for (let t of types) {
            if (MediaRecorder.isTypeSupported(t)) {
                return t;
            }
        }
        return "";
    }

    async function batDauGhiAm() {
        try {
            audioChunks = [];
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};

            mediaRecorder = new MediaRecorder(mediaStream, options);

            mediaRecorder.ondataavailable = function (e) {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = function () {
                const finalMime = mediaRecorder.mimeType || mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunks, { type: finalMime });
                guiAudioLenServer(audioBlob, finalMime);
            };

            mediaRecorder.start();
            isRecording = true;
            secondsRecorded = 0;

            // Cập nhật UI ghi âm
            if (btnMic) btnMic.classList.add("recording");
            if (soundWave) soundWave.style.display = "flex";
            if (micTimer) micTimer.style.display = "block";
            if (recordSeconds) recordSeconds.textContent = "0";
            if (micStatus) {
                micStatus.textContent = "🎙️ Đang ghi âm... Hãy phát âm to, rõ ràng!";
                micStatus.style.color = "#dc2626";
            }
            if (resultBox) resultBox.style.display = "none";

            recordInterval = setInterval(() => {
                secondsRecorded++;
                if (recordSeconds) recordSeconds.textContent = secondsRecorded;
                if (secondsRecorded >= 5) {
                    dungGhiAm();
                }
            }, 1000);

        } catch (err) {
            console.error("Lỗi truy cập Microphone:", err);
            alert("Không thể truy cập Microphone! Vui lòng cho phép quyền truy cập Micro trên trình duyệt.");
        }
    }

    function dungGhiAm() {
        if (!isRecording) return;
        isRecording = false;

        if (recordInterval) {
            clearInterval(recordInterval);
            recordInterval = null;
        }

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        // Cập nhật UI
        if (btnMic) {
            btnMic.classList.remove("recording");
            btnMic.disabled = true;
        }
        if (soundWave) soundWave.style.display = "none";
        if (micTimer) micTimer.style.display = "none";
        if (micStatus) {
            micStatus.textContent = "⏳ Đã nhận âm thanh, đang phân tích phát âm...";
            micStatus.style.color = "#2563eb";
        }
        if (aiLoading) aiLoading.style.display = "block";
    }

    if (btnMic) {
        btnMic.addEventListener("click", function () {
            if (!isRecording) {
                batDauGhiAm();
            } else {
                dungGhiAm();
            }
        });
    }

    // =====================================================
    // 6. GỬI AUDIO LÊN SERVER CHẤM ĐIỂM
    // =====================================================
    function guiAudioLenServer(audioBlob, mimeType) {
        const item = danhSachTu[currentIndex];
        if (!item) return;

        const formData = new FormData();
        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        formData.append("file", audioBlob, `recording.${extension}`);
        formData.append("tuGoc", item.tiengAnh || "");
        formData.append("phienAm", item.phienAm || "");

        console.log("GỬI FILE ÂM THANH LÊN SERVER:", item.tiengAnh, "Kích thước:", audioBlob.size, "bytes");

        fetch("/api/luyen-noi/cham-diem-audio", {
            method: "POST",
            body: formData
        })
        .then(res => {
            if (!res.ok) throw new Error("Lỗi HTTP " + res.status);
            return res.json();
        })
        .then(data => {
            console.log("KẾT QUẢ CHẤM ĐIỂM TỪ SERVER:", data);
            lastResultData = data;
            hienThiKetQuaChamDiem(data);
        })
        .catch(err => {
            console.error("Lỗi gọi API chấm điểm:", err);
            hienThiKetQuaChamDiem({
                score: 0,
                status: "error",
                recognizedText: "Lỗi kết nối",
                ipaRecognized: "",
                ipaTarget: "",
                breakdown: { phonemeAccuracy: 0, stress: 0, vowelQuality: 0, consonantClarity: 0, fluency: 0 },
                phonemeDetails: [],
                correctParts: [],
                incorrectParts: [],
                feedback: "Không thể kết nối đến máy chủ AI chấm điểm: " + err.message,
                suggestion: "Vui lòng kiểm tra lại kết nối mạng và thử lại.",
                encouragement: "Đừng nản lòng, hãy thử lại nhé!"
            });
        })
        .finally(() => {
            if (aiLoading) aiLoading.style.display = "none";
            if (btnMic) btnMic.disabled = false;
        });
    }

    // =====================================================
    // 7. HIỂN THỊ KẾT QUẢ CHẤM ĐIỂM NÂNG CAO
    // =====================================================
    function hienThiKetQuaChamDiem(data) {
        if (!resultBox) return;

        const score = (typeof data.score === "number") ? Math.max(0, Math.min(100, data.score)) : 0;
        scoresList[currentIndex] = score;
        capNhatDiemTrungBinh();

        // ---- Badge điểm số ----
        if (scoreBadge) {
            scoreBadge.textContent = `${score}/100`;
            scoreBadge.className = "score-badge px-3 py-1 rounded-pill fw-bold fs-5";
            if (score >= 90) scoreBadge.classList.add("score-excellent");
            else if (score >= 75) scoreBadge.classList.add("score-good");
            else if (score >= 50) scoreBadge.classList.add("score-average");
            else scoreBadge.classList.add("score-poor");
        }

        // ---- AI nghe được ----
        if (resRecognizedText) {
            resRecognizedText.textContent = data.recognizedText
                ? `"${data.recognizedText}"`
                : "(Không nghe rõ)";
        }

        // ---- So sánh IPA ----
        if (resIpaComparison) {
            const ipaTarget = data.ipaTarget || "";
            const ipaRecognized = data.ipaRecognized || "";
            if (ipaTarget || ipaRecognized) {
                resIpaComparison.innerHTML = `
                    <div class="ipa-row">
                        <span class="ipa-label text-secondary">Chuẩn:</span>
                        <span class="ipa-value ipa-target">${ipaTarget || "---"}</span>
                    </div>
                    <div class="ipa-row mt-1">
                        <span class="ipa-label text-secondary">Bạn nói:</span>
                        <span class="ipa-value ipa-recognized ${score >= 75 ? 'ipa-ok' : 'ipa-warn'}">${ipaRecognized || "---"}</span>
                    </div>
                `;
            } else {
                const item = danhSachTu[currentIndex];
                resIpaComparison.innerHTML = `<span class="text-muted small">/${item.phienAm || "..."}/</span>`;
            }
        }

        // ---- Breakdown 5 tiêu chí ----
        if (breakdownGrid) {
            const bd = data.breakdown || {};
            const criteria = [
                { key: "phonemeAccuracy", label: "Âm vị",    max: 40, icon: "🔤" },
                { key: "stress",          label: "Trọng âm",  max: 20, icon: "📍" },
                { key: "vowelQuality",    label: "Nguyên âm", max: 20, icon: "🔊" },
                { key: "consonantClarity",label: "Phụ âm",    max: 10, icon: "🔑" },
                { key: "fluency",         label: "Lưu loát",  max: 10, icon: "🌊" },
            ];
            breakdownGrid.innerHTML = "";
            criteria.forEach(c => {
                const val = typeof bd[c.key] === "number" ? bd[c.key] : 0;
                const pct = Math.round((val / c.max) * 100);
                let barClass = "bg-danger";
                if (pct >= 80) barClass = "bg-success";
                else if (pct >= 60) barClass = "bg-primary";
                else if (pct >= 40) barClass = "bg-warning";

                const div = document.createElement("div");
                div.className = "breakdown-item mb-2";
                div.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="breakdown-label small fw-semibold">${c.icon} ${c.label}</span>
                        <span class="breakdown-score small fw-bold">${val}/${c.max}</span>
                    </div>
                    <div class="progress breakdown-progress">
                        <div class="progress-bar ${barClass}" role="progressbar"
                             style="width: ${pct}%;" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="${c.max}">
                        </div>
                    </div>
                `;
                breakdownGrid.appendChild(div);
            });
        }

        // ---- Phoneme Detail Cards ----
        if (resPhonemeBreakdown) {
            resPhonemeBreakdown.innerHTML = "";
            const details = Array.isArray(data.phonemeDetails) ? data.phonemeDetails : [];
            const correct = Array.isArray(data.correctParts) ? data.correctParts : [];
            const incorrect = Array.isArray(data.incorrectParts) ? data.incorrectParts : [];

            if (details.length > 0) {
                // Hiển thị phoneme-level cards
                details.forEach(pd => {
                    const card = document.createElement("div");
                    let cls = "phoneme-card";
                    let icon = "";
                    if (pd.status === "correct") {
                        cls += " phoneme-card-correct";
                        icon = "✓";
                    } else if (pd.status === "missing") {
                        cls += " phoneme-card-missing";
                        icon = "○";
                    } else {
                        cls += " phoneme-card-incorrect";
                        icon = "✗";
                    }
                    card.className = cls;
                    card.innerHTML = `
                        <div class="phoneme-symbol">${pd.symbol || "?"}</div>
                        <div class="phoneme-word">${pd.word || ""}</div>
                        <div class="phoneme-icon">${icon}</div>
                        ${pd.note ? `<div class="phoneme-note">${pd.note}</div>` : ""}
                    `;
                    if (pd.note) {
                        card.setAttribute("title", pd.note);
                    }
                    resPhonemeBreakdown.appendChild(card);
                });
            } else if (correct.length > 0 || incorrect.length > 0) {
                // Fallback: hiển thị correctParts / incorrectParts
                correct.forEach(p => {
                    const span = document.createElement("span");
                    span.className = "phoneme-tag phoneme-correct";
                    span.textContent = `✓ ${p}`;
                    resPhonemeBreakdown.appendChild(span);
                });
                incorrect.forEach(p => {
                    const span = document.createElement("span");
                    span.className = "phoneme-tag phoneme-incorrect";
                    span.textContent = `✗ ${p}`;
                    resPhonemeBreakdown.appendChild(span);
                });
            } else {
                // Fallback cuối: hiển thị từ tổng thể
                const item = danhSachTu[currentIndex];
                const span = document.createElement("span");
                span.className = score >= 75 ? "phoneme-tag phoneme-correct" : "phoneme-tag phoneme-incorrect";
                span.textContent = item.tiengAnh || "";
                resPhonemeBreakdown.appendChild(span);
            }
        }

        // ---- Nhận xét ----
        if (resFeedbackText) {
            resFeedbackText.textContent = data.feedback
                || (score >= 80 ? "Phát âm rất tốt và rõ ràng!" : "Cần phát âm rõ ràng và chuẩn xác hơn.");
        }

        // ---- Hướng dẫn khẩu hình ----
        if (suggestionBox && resSuggestionText) {
            if (data.suggestion && data.suggestion.trim().length > 0) {
                resSuggestionText.textContent = data.suggestion;
                suggestionBox.style.display = "block";
            } else {
                suggestionBox.style.display = "none";
            }
        }

        // ---- Lời động viên ----
        if (encouragementBox && resEncouragementText) {
            if (data.encouragement && data.encouragement.trim().length > 0) {
                resEncouragementText.textContent = "✨ " + data.encouragement;
                encouragementBox.style.display = "block";
            } else {
                encouragementBox.style.display = "none";
            }
        }

        // ---- Trạng thái Mic ----
        if (micStatus) {
            if (score >= 90) {
                micStatus.textContent = "🏆 Xuất sắc! Phát âm chuẩn như người bản xứ!";
                micStatus.style.color = "#16a34a";
            } else if (score >= 75) {
                micStatus.textContent = "🎉 Tốt! Người bản xứ hiểu bạn dễ dàng!";
                micStatus.style.color = "#2563eb";
            } else if (score >= 50) {
                micStatus.textContent = "💪 Khá! Hãy luyện thêm để chuẩn hơn nhé!";
                micStatus.style.color = "#d97706";
            } else {
                micStatus.textContent = "📚 Hãy nghe mẫu và thử lại nhé!";
                micStatus.style.color = "#dc2626";
            }
        }

        resultBox.style.display = "block";

        // Auto-play mẫu nếu điểm thấp để người học so sánh
        if (score < 60) {
            setTimeout(() => phatAmMau("+0%"), 800);
        }
    }

    function capNhatDiemTrungBinh() {
        if (scoresList.length === 0 || !avgScoreText) return;
        const validScores = scoresList.filter(s => typeof s === "number");
        const sum = validScores.reduce((a, b) => a + b, 0);
        const avg = validScores.length > 0 ? Math.round(sum / validScores.length) : 0;
        avgScoreText.textContent = `${avg}%`;
    }

    // =====================================================
    // 8. ĐIỀU HƯỚNG BÀI TẬP
    // =====================================================
    if (btnNoiLai) {
        btnNoiLai.addEventListener("click", function () {
            if (resultBox) resultBox.style.display = "none";
            if (micStatus) {
                micStatus.textContent = "Bấm vào Mic để bắt đầu nói lại";
                micStatus.style.color = "#334155";
            }
        });
    }

    if (btnTuTiepTheo) {
        btnTuTiepTheo.addEventListener("click", function () {
            currentIndex++;
            renderWord();
        });
    }

    // =====================================================
    // 9. MÀN HÌNH TỔNG KẾT
    // =====================================================
    function hienThiTongKet() {
        const wordCard = document.querySelector(".word-card");
        const recordingSection = document.querySelector(".recording-section");
        const practiceHeader = document.querySelector(".practice-header");

        if (wordCard) wordCard.style.display = "none";
        if (recordingSection) recordingSection.style.display = "none";
        if (practiceHeader) practiceHeader.style.display = "none";
        if (resultBox) resultBox.style.display = "none";

        if (completionBox) {
            const validScores = scoresList.filter(s => typeof s === "number");
            const sum = validScores.reduce((a, b) => a + b, 0);
            const avg = validScores.length > 0 ? Math.round(sum / validScores.length) : 0;
            if (finalScoreVal) finalScoreVal.textContent = `${avg}/100`;
            if (finalWordsCount) finalWordsCount.textContent = `Đã luyện ${danhSachTu.length} từ vựng`;
            completionBox.style.display = "block";
        }
    }

    // Bắt đầu từ đầu tiên
    renderWord();

});
