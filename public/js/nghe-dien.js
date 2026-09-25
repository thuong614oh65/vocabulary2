// =========================================================
// XỬ LÝ TRANG NGHE ĐIỀN CÂU (DICTATION) - 2 CẤP ĐỘ + GỢI Ý
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    const formTaoBaiNghe = document.getElementById("formTaoBaiNghe");
    const btnTaoBai = document.getElementById("btnTaoBai");
    const loadingBox = document.getElementById("loadingBox");
    const dataRawCauNgheDien = document.getElementById("dataRawCauNgheDien");
    const dictationList = document.getElementById("dictationList");
    const tongSoCauText = document.getElementById("tongSoCauText");
    const btnChamDiem = document.getElementById("btnChamDiem");
    const btnLamLai = document.getElementById("btnLamLai");
    const resultBox = document.getElementById("resultBox");
    const resultScore = document.getElementById("resultScore");
    const resultComment = document.getElementById("resultComment");
    const resultIcon = document.getElementById("resultIcon");

    // Loading khi bấm tạo bài
    if (formTaoBaiNghe) {
        formTaoBaiNghe.addEventListener("submit", function () {
            if (loadingBox) loadingBox.style.display = "block";
            if (btnTaoBai) {
                btnTaoBai.disabled = true;
                btnTaoBai.innerHTML = "⏳ Đang tạo bài...";
            }
        });
    }

    // Nếu có dữ liệu từ AI -> Parse và render danh sách các câu
    if (dataRawCauNgheDien && dataRawCauNgheDien.textContent.trim()) {
        const rawText = dataRawCauNgheDien.textContent.trim();
        parseVaRenderDanhSachCau(rawText);
    }

    // =========================================================
    // PARSE VÀ RENDER DANH SÁCH CÂU (JSON + REGEX FALLBACK)
    // =========================================================
    function parseVaRenderDanhSachCau(text) {
        let dsCau = [];

        // 1. Thử parse JSON trước (Định dạng AI chuẩn nhất)
        try {
            let jsonText = text.trim();
            // Bỏ code block markdown ```json ... ``` nếu có
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
            }
            const startBracket = jsonText.indexOf("[");
            const endBracket = jsonText.lastIndexOf("]");
            if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
                const subJson = jsonText.substring(startBracket, endBracket + 1);
                const parsed = JSON.parse(subJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parsed.forEach(function (item, idx) {
                        let eng = (item.english || item.cau_tieng_anh || item.cau || "").trim();
                        let vi = (item.meaning || item.nghia_tieng_viet || item.nghia || "").trim();
                        if (eng) {
                            dsCau.push({
                                num: item.num || (idx + 1),
                                english: eng,
                                meaning: vi
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("JSON parse thất bại, chuyển sang regex fallback:", e);
        }

        // 2. Nếu JSON không ra kết quả, dùng Regex linh hoạt cho [CAU:1:English:Vietnamese] hoặc [CAU:1:English] [Vietnamese]
        if (dsCau.length === 0) {
            const regex = /\[(?:CAU|CÂU|cau|câu)[\s:]*(\d*)[\s:|]*([^\]:]+)(?::|\]\s*\[)?([^\]]*)\]?/gi;
            let match;
            let count = 0;

            while ((match = regex.exec(text)) !== null) {
                let numStr = match[1];
                let eng = (match[2] || "").trim();
                let vi = (match[3] || "").trim();

                // Lọc bỏ ký tự thừa
                eng = eng.replace(/^\[+|\]+$/g, "").trim();
                vi = vi.replace(/^\[+|\]+$/g, "").trim();

                if (eng.length > 2) {
                    count++;
                    dsCau.push({
                        num: numStr ? parseInt(numStr, 10) : count,
                        english: eng,
                        meaning: vi
                    });
                }
            }
        }

        // 3. Fallback bóc tách từng dòng nếu 2 cách trên chưa có kết quả
        if (dsCau.length === 0) {
            const lines = text.split("\n");
            let count = 0;
            lines.forEach(function (line) {
                let trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("```") || trimmed.startsWith("[")) return;

                // Xóa số thứ tự đầu dòng ví dụ "1. "
                trimmed = trimmed.replace(/^\d+[\.\-\)]\s*/, "").trim();

                // Tách tiếng Anh và tiếng Việt theo dấu : hoặc -
                let parts = trimmed.split(/[:\-\—]/);
                if (parts.length >= 2) {
                    let left = parts[0].trim();
                    let right = parts.slice(1).join(" - ").trim();
                    if (left.length > 2) {
                        count++;
                        dsCau.push({
                            num: count,
                            english: left,
                            meaning: right
                        });
                        return;
                    }
                }

                if (trimmed.length > 3) {
                    count++;
                    dsCau.push({
                        num: count,
                        english: trimmed,
                        meaning: ""
                    });
                }
            });
        }

        // Cập nhật số lượng câu hiển thị trên giao diện
        if (tongSoCauText) {
            tongSoCauText.textContent = dsCau.length;
        }

        if (!dictationList) return;
        dictationList.innerHTML = "";

        // Render từng câu hỏi
        dsCau.forEach(function (cau) {
            const card = document.createElement("div");
            card.className = "sentence-card";
            card.id = "card-cau-" + cau.num;
            card.dataset.num = cau.num;
            card.dataset.answer = cau.english;
            card.dataset.meaning = cau.meaning || "";

            const safeMeaning = cau.meaning 
                ? cau.meaning.replace(/</g, "&lt;").replace(/>/g, "&gt;") 
                : "(Đang nghe và viết lại câu theo ngữ cảnh)";

            card.innerHTML = `
                <div class="sentence-header">
                    <div class="sentence-number">
                        <span>#${cau.num}</span>
                    </div>

                    <div class="audio-controls">
                        <button type="button" class="btn btn-audio btn-audio-normal" title="Nghe với tốc độ chuẩn (1.0x)">
                            🔊 Nghe chuẩn (1.0x)
                        </button>
                        <button type="button" class="btn btn-audio btn-audio-slow" title="Nghe với tốc độ chậm (0.75x)">
                            🐢 Nghe chậm (0.75x)
                        </button>
                        <button type="button" class="btn btn-hint-toggle" id="btn-hint-${cau.num}" title="Xem nghĩa tiếng Việt của câu này">
                            💡 Gợi ý nghĩa
                        </button>
                    </div>
                </div>

                <!-- Khung gợi ý nghĩa tiếng Việt -->
                <div class="hint-box" id="hint-box-${cau.num}" style="display: none;">
                    <div class="hint-inner">
                        <span class="hint-badge">💡 Gợi ý nghĩa câu:</span>
                        <span class="hint-text">${safeMeaning}</span>
                    </div>
                </div>

                <div class="input-wrapper">
                    <input type="text" 
                           class="input-sentence" 
                           data-num="${cau.num}" 
                           placeholder="Gõ lại câu tiếng Anh bạn nghe được (bấm Enter để sang câu tiếp)..." 
                           autocomplete="off" 
                           spellcheck="false" />
                </div>

                <div class="feedback-box" id="feedback-${cau.num}">
                    <!-- Sẽ hiển thị khi bấm chấm điểm -->
                </div>
            `;

            // Gán sự kiện click an toàn qua JavaScript (KHÔNG DÙNG ONCLICK TRONG HTML)
            const btnNormal = card.querySelector(".btn-audio-normal");
            const btnSlow = card.querySelector(".btn-audio-slow");
            const btnHint = card.querySelector(".btn-hint-toggle");

            if (btnNormal) {
                btnNormal.addEventListener("click", function () {
                    phatAmCau(cau.english, 1.0);
                });
            }
            if (btnSlow) {
                btnSlow.addEventListener("click", function () {
                    phatAmCau(cau.english, 0.75);
                });
            }
            if (btnHint) {
                btnHint.addEventListener("click", function () {
                    toggleGoiY(cau.num);
                });
            }

            dictationList.appendChild(card);
        });

        // Xử lý Enter tự động chuyển câu tiếp theo
        const inputs = document.querySelectorAll(".input-sentence");
        inputs.forEach(function (input, i) {
            input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputs[i + 1]) {
                        inputs[i + 1].focus();
                        const nextCard = inputs[i + 1].closest(".sentence-card");
                        if (nextCard && nextCard.dataset.answer) {
                            phatAmCau(nextCard.dataset.answer, 1.0);
                        }
                    } else if (btnChamDiem) {
                        btnChamDiem.focus();
                    }
                }
            });
        });

        // Focus vào câu 1 và tự phát âm câu 1
        if (inputs.length > 0) {
            inputs[0].focus();
            if (dsCau.length > 0 && dsCau[0].english) {
                setTimeout(function () {
                    phatAmCau(dsCau[0].english, 1.0);
                }, 400);
            }
        }
    }

    // =========================================================
    // CHẤM ĐIỂM TẤT CẢ CÁC CÂU
    // =========================================================
    if (btnChamDiem) {
        btnChamDiem.addEventListener("click", function () {
            chamDiemTatCa();
        });
    }

    function chuanHoaCau(str) {
        if (!str) return "";
        return str
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function chamDiemTatCa() {
        const cards = document.querySelectorAll(".sentence-card");
        if (cards.length === 0) return;

        let soCauDung = 0;
        let tongSo = cards.length;

        cards.forEach(function (card) {
            const input = card.querySelector(".input-sentence");
            const feedbackBox = card.querySelector(".feedback-box");
            const rawCorrect = card.dataset.answer || "";
            const rawMeaning = card.dataset.meaning || "";
            const rawUser = input ? (input.value || "").trim() : "";

            const cleanCorrect = chuanHoaCau(rawCorrect);
            const cleanUser = chuanHoaCau(rawUser);

            card.classList.remove("correct", "wrong");
            feedbackBox.style.display = "block";

            if (cleanUser.length > 0 && cleanUser === cleanCorrect) {
                card.classList.add("correct");
                if (input) input.disabled = true;
                feedbackBox.innerHTML = `
                    <div class="feedback-correct">
                        ✅ Chính xác! ${rawMeaning ? `<span class="meaning-correct-hint">— <em>${rawMeaning}</em></span>` : ''}
                    </div>
                `;
                soCauDung++;
            } else {
                card.classList.add("wrong");
                feedbackBox.innerHTML = `
                    <div class="feedback-wrong-details">
                        <div class="correct-text">✨ Câu đúng: <strong>${rawCorrect}</strong></div>
                        ${rawMeaning ? `<div class="meaning-text">📖 Nghĩa tiếng Việt: <strong>${rawMeaning}</strong></div>` : ''}
                        <div class="user-text">✍️ Bạn đã nhập: <span class="text-danger fw-semibold">${rawUser || "(chưa nhập)"}</span></div>
                    </div>
                `;
            }
        });

        // Tổng kết kết quả
        const tiLe = Math.round((soCauDung / tongSo) * 100);
        if (resultBox && resultScore && resultComment) {
            resultBox.style.display = "block";
            resultScore.textContent = `Bạn làm đúng ${soCauDung}/${tongSo} câu (${tiLe}%)`;

            resultBox.classList.remove("good", "average", "poor");

            if (tiLe === 100) {
                resultBox.classList.add("good");
                if (resultIcon) resultIcon.textContent = "🏆";
                resultComment.textContent = "Tuyệt đối hoàn hảo! Khả năng nghe và chép của bạn cực kỳ xuất sắc!";
            } else if (tiLe >= 70) {
                resultBox.classList.add("good");
                if (resultIcon) resultIcon.textContent = "🎉";
                resultComment.textContent = "Rất tốt! Tai nghe tiếng Anh của bạn rất nhạy bén.";
            } else if (tiLe >= 40) {
                resultBox.classList.add("average");
                if (resultIcon) resultIcon.textContent = "👍";
                resultComment.textContent = "Khá tốt! Hãy bấm nghe lại các câu sai để quen với cách phát âm nối âm nhé.";
            } else {
                resultBox.classList.add("poor");
                if (resultIcon) resultIcon.textContent = "💪";
                resultComment.textContent = "Đừng lo lắng! Hãy bấm nút 💡 Gợi ý nghĩa và nghe lại nhiều lần để nhớ câu nhé.";
            }

            resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        if (btnLamLai) {
            btnLamLai.style.display = "inline-block";
        }
    }

    // =========================================================
    // LÀM LẠI BÀI NGHE
    // =========================================================
    if (btnLamLai) {
        btnLamLai.addEventListener("click", function () {
            const cards = document.querySelectorAll(".sentence-card");
            cards.forEach(function (card) {
                card.classList.remove("correct", "wrong");
                const input = card.querySelector(".input-sentence");
                if (input) {
                    input.value = "";
                    input.disabled = false;
                }
                const feedbackBox = card.querySelector(".feedback-box");
                if (feedbackBox) {
                    feedbackBox.style.display = "none";
                    feedbackBox.innerHTML = "";
                }

                // Reset hint box
                const num = card.dataset.num;
                const hintBox = document.getElementById("hint-box-" + num);
                const btnHint = document.getElementById("btn-hint-" + num);
                if (hintBox) hintBox.style.display = "none";
                if (btnHint) {
                    btnHint.classList.remove("active");
                    btnHint.innerHTML = "💡 Gợi ý nghĩa";
                }
            });

            if (resultBox) resultBox.style.display = "none";
            if (btnLamLai) btnLamLai.style.display = "none";

            const firstInput = document.querySelector(".input-sentence");
            if (firstInput) firstInput.focus();
        });
    }

});

let audioDangPhat = null;

// =========================================================
// PHÁT ÂM CÂU (EDGE NEURAL TTS MP3 STREAM - KHÔNG LƯU ĐĨA)
function phatAmCau(cau, tocDo) {
    if (!cau || typeof cau !== "string") return;
    cau = cau.trim().replace(/^\[+|\]+$/g, "").trim();
    if (!cau) return;

    // Dừng tất cả âm thanh đang phát
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (audioDangPhat) {
        audioDangPhat.pause();
        audioDangPhat.currentTime = 0;
        audioDangPhat = null;
    }

    const speed = tocDo || 1.0;
    console.log("ĐỌC CÂU:", cau, "(Tốc độ:", speed + "x)");

    // Tốc độ: chuẩn (1.0x) -> +0%, chậm (0.75x) -> -25%
    let rateStr = "+0%";
    if (speed < 0.9) {
        rateStr = "-25%";
    }

    if (window.phatAmThanh) {
        window.phatAmThanh(cau, { rate: rateStr });
        return;
    }

    let url = "/audio/phat?text=" + encodeURIComponent(cau) + "&rate=" + encodeURIComponent(rateStr);
    audioDangPhat = new Audio(url);
    audioDangPhat.play().catch(function (e) {
        console.warn("Lỗi phát âm thanh câu:", e);
    });
}

// =========================================================
// BẬT / TẮT GỢI Ý NGHĨA TIẾNG VIỆT
// =========================================================
function toggleGoiY(num) {
    const hintBox = document.getElementById("hint-box-" + num);
    const btnHint = document.getElementById("btn-hint-" + num);
    if (!hintBox) return;

    const isHidden = (hintBox.style.display === "none" || !hintBox.style.display || getComputedStyle(hintBox).display === "none");
    if (isHidden) {
        hintBox.style.display = "block";
        if (btnHint) {
            btnHint.classList.add("active");
            btnHint.innerHTML = "🙈 Ẩn gợi ý";
        }
    } else {
        hintBox.style.display = "none";
        if (btnHint) {
            btnHint.classList.remove("active");
            btnHint.innerHTML = "💡 Gợi ý nghĩa";
        }
    }
}

window.phatAmCau = phatAmCau;
window.toggleGoiY = toggleGoiY;
