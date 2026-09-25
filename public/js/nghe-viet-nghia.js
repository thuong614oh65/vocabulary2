// =========================================================
// XỬ LÝ TRANG NGHE VÀ VIẾT LẠI NGHĨA (LISTEN & TRANSLATE)
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

    // Nếu có dữ liệu từ AI hoặc Backend -> Parse và render danh sách các câu
    if (dataRawCauNgheDien && dataRawCauNgheDien.textContent.trim()) {
        const rawText = dataRawCauNgheDien.textContent.trim();
        parseVaRenderDanhSachCau(rawText);
    }

    // =========================================================
    // PARSE VÀ RENDER DANH SÁCH CÂU (JSON + REGEX FALLBACK)
    // =========================================================
    function parseVaRenderDanhSachCau(text) {
        let dsCau = [];

        // 1. Thử parse JSON trước (Định dạng AI/Backend chuẩn nhất)
        try {
            let jsonText = text.trim();
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
                        let ipa = (item.ipa || item.phienAm || "").trim();
                        if (eng) {
                            dsCau.push({
                                num: item.num || (idx + 1),
                                english: eng,
                                meaning: vi,
                                ipa: ipa
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("JSON parse thất bại, chuyển sang regex fallback:", e);
        }

        // 2. Regex fallback nếu JSON không ra kết quả
        if (dsCau.length === 0) {
            const regex = /\[(?:CAU|CÂU|cau|câu)[\s:]*(\d*)[\s:|]*([^\]:]+)(?::|\]\s*\[)?([^\]]*)\]?/gi;
            let match;
            let count = 0;

            while ((match = regex.exec(text)) !== null) {
                let numStr = match[1];
                let eng = (match[2] || "").trim();
                let vi = (match[3] || "").trim();

                eng = eng.replace(/^\[+|\]+$/g, "").trim();
                vi = vi.replace(/^\[+|\]+$/g, "").trim();

                if (eng.length > 2) {
                    count++;
                    dsCau.push({
                        num: numStr ? parseInt(numStr, 10) : count,
                        english: eng,
                        meaning: vi,
                        ipa: ""
                    });
                }
            }
        }

        // 3. Fallback theo từng dòng
        if (dsCau.length === 0) {
            const lines = text.split("\n");
            let count = 0;
            lines.forEach(function (line) {
                let trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("```") || trimmed.startsWith("[")) return;

                trimmed = trimmed.replace(/^\d+[\.\-\)]\s*/, "").trim();

                let parts = trimmed.split(/[:\-\—]/);
                if (parts.length >= 2) {
                    let left = parts[0].trim();
                    let right = parts.slice(1).join(" - ").trim();
                    if (left.length > 1) {
                        count++;
                        dsCau.push({
                            num: count,
                            english: left,
                            meaning: right,
                            ipa: ""
                        });
                        return;
                    }
                }

                if (trimmed.length > 2) {
                    count++;
                    dsCau.push({
                        num: count,
                        english: trimmed,
                        meaning: "",
                        ipa: ""
                    });
                }
            });
        }

        // Cập nhật số lượng câu hiển thị
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
            card.dataset.english = cau.english;
            card.dataset.meaning = cau.meaning || "";
            card.dataset.ipa = cau.ipa || "";

            const safeEnglish = cau.english.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeIpa = cau.ipa ? ` <span class="revealed-ipa">(${cau.ipa})</span>` : "";

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
                        <button type="button" class="btn btn-hint-toggle" id="btn-hint-${cau.num}" title="Xem câu tiếng Anh bạn đang nghe">
                            💡 Gợi ý câu
                        </button>
                    </div>
                </div>

                <!-- Khung gợi ý câu tiếng Anh -->
                <div class="hint-box" id="hint-box-${cau.num}" style="display: none;">
                    <div class="hint-inner">
                        <span class="hint-badge">💡 Câu tiếng Anh:</span>
                        <span class="hint-text hint-en-text">${safeEnglish}${safeIpa}</span>
                    </div>
                </div>

                <div class="input-wrapper">
                    <input type="text" 
                           class="input-sentence" 
                           data-num="${cau.num}" 
                           placeholder="Nghe câu trên và gõ lại nghĩa tiếng Việt (bấm Enter để sang câu tiếp)..." 
                           autocomplete="off" 
                           spellcheck="false" />
                </div>

                <div class="feedback-box" id="feedback-${cau.num}">
                    <!-- Sẽ hiển thị khi bấm chấm điểm -->
                </div>
            `;

            // Gán sự kiện cho các nút âm thanh và gợi ý
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

        // Xử lý phím Enter chuyển câu kế tiếp
        const inputs = document.querySelectorAll(".input-sentence");
        inputs.forEach(function (input, i) {
            input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputs[i + 1]) {
                        inputs[i + 1].focus();
                        const nextCard = inputs[i + 1].closest(".sentence-card");
                        if (nextCard && nextCard.dataset.english) {
                            phatAmCau(nextCard.dataset.english, 1.0);
                        }
                    } else if (btnChamDiem) {
                        btnChamDiem.focus();
                    }
                }
            });

            input.addEventListener("focus", function () {
                const parentCard = this.closest(".sentence-card");
                if (parentCard) {
                    parentCard.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        });

        // Tự động focus vào câu 1 và phát âm câu 1
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
    // HÀM CHUẨN HÓA TIẾNG VIỆT & CHẤM NGHĨA THÔNG MINH
    // =========================================================
    function boDauTiengViet(str) {
        if (!str) return "";
        return str
            .toString()
            .toLowerCase()
            .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
            .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
            .replace(/ì|í|ị|ỉ|ĩ/g, "i")
            .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
            .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
            .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
            .replace(/đ/g, "d")
            .replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "")
            .replace(/\u02C6|\u0306|\u031B/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Từ dừng (stop words) không mang nhiều ý nghĩa quyết định khi dịch
    const TU_DUNG_TIENG_VIET = new Set([
        "la", "thi", "o", "tai", "vao", "mot", "nhung", "cac", "cua", "va", "hay", 
        "ma", "de", "rat", "qua", "lam", "da", "dang", "se", "duoc", "bi", "boi",
        "con", "cai", "chiec", "qua", "su", "viec", "nguoi", "noi", "cho", "ay"
    ]);

    function layTuKhoa(str) {
        let words = boDauTiengViet(str).split(/\s+/).filter(w => w.length > 0);
        return words.filter(w => !TU_DUNG_TIENG_VIET.has(w));
    }

    function tachCacNghia(dapAnRaw) {
        if (!dapAnRaw) return [];
        let parts = dapAnRaw.split(/[,;/|\n\r]+/);
        let list = [];
        parts.forEach(function (p) {
            let tr = p.trim();
            if (!tr) return;
            list.push(tr);
            let inside = tr.match(/\(([^)]+)\)/g);
            if (inside) {
                inside.forEach(m => list.push(m.replace(/[()]/g, "").trim()));
                let outside = tr.replace(/\([^)]*\)/g, "").trim();
                if (outside) list.push(outside);
            }
        });
        return Array.from(new Set(list.filter(s => s.length > 0)));
    }

    function kiemTraNghiaDung(userStr, correctStr) {
        if (!userStr || !correctStr) return false;

        const cleanUser = boDauTiengViet(userStr);
        const cleanCorrect = boDauTiengViet(correctStr);

        // 1. Trùng khớp hoàn toàn (không kể dấu)
        if (cleanUser === cleanCorrect) return true;

        // 2. Trùng khớp với một trong các nghĩa phân cách
        const dsNghia = tachCacNghia(correctStr);
        for (let nghia of dsNghia) {
            let cNghia = boDauTiengViet(nghia);
            if (cleanUser === cNghia) return true;
        }

        // 3. So sánh độ bao phủ từ khóa chính (Keyword Coverage)
        const userKeywords = layTuKhoa(userStr);
        const correctKeywords = layTuKhoa(correctStr);

        if (correctKeywords.length === 0) {
            return cleanUser.includes(cleanCorrect) || cleanCorrect.includes(cleanUser);
        }

        let matched = 0;
        correctKeywords.forEach(function (kw) {
            if (userKeywords.some(ukw => ukw === kw || ukw.includes(kw) || kw.includes(ukw))) {
                matched++;
            }
        });

        const coverage = matched / correctKeywords.length;

        // Nếu người dùng phủ được từ 65% từ khóa trở lên và độ dài không quá ngắn
        if (coverage >= 0.65 && userKeywords.length >= Math.max(1, Math.floor(correctKeywords.length * 0.5))) {
            return true;
        }

        return false;
    }

    // =========================================================
    // CHẤM ĐIỂM TẤT CẢ CÁC CÂU
    // =========================================================
    if (btnChamDiem) {
        btnChamDiem.addEventListener("click", function () {
            chamDiemTatCa();
        });
    }

    function chamDiemTatCa() {
        const cards = document.querySelectorAll(".sentence-card");
        if (cards.length === 0) return;

        let soCauDung = 0;
        let tongSo = cards.length;

        cards.forEach(function (card) {
            const input = card.querySelector(".input-sentence");
            const feedbackBox = card.querySelector(".feedback-box");
            const rawEnglish = card.dataset.english || "";
            const rawMeaning = card.dataset.meaning || "";
            const rawIpa = card.dataset.ipa || "";
            const rawUser = input ? (input.value || "").trim() : "";

            const isCorrect = kiemTraNghiaDung(rawUser, rawMeaning);

            card.classList.remove("correct", "wrong");
            feedbackBox.style.display = "block";

            const safeEnglish = rawEnglish.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const ipaSpan = rawIpa ? `<span class="revealed-ipa">(${rawIpa})</span>` : "";

            if (isCorrect) {
                card.classList.add("correct");
                if (input) input.disabled = true;
                feedbackBox.innerHTML = `
                    <div class="feedback-correct">
                        <span class="correct-meaning-title">✅ Chính xác!</span>
                        <div class="mt-1">📖 Nghĩa chuẩn: <strong>${rawMeaning}</strong></div>
                        <div class="revealed-english mt-1">🔊 Câu tiếng Anh: <em>"${safeEnglish}"</em> ${ipaSpan}</div>
                    </div>
                `;
                soCauDung++;
            } else {
                card.classList.add("wrong");
                feedbackBox.innerHTML = `
                    <div class="feedback-wrong-details">
                        <div class="wrong-meaning-title">❌ Chưa chính xác!</div>
                        <div class="correct-text">✨ Nghĩa chuẩn tiếng Việt: <strong>${rawMeaning}</strong></div>
                        <div class="revealed-english">🔊 Câu tiếng Anh đã đọc: <strong>"${safeEnglish}"</strong> ${ipaSpan}</div>
                        <div class="user-text mt-1">✍️ Bạn đã nhập: <span class="text-danger fw-semibold">${rawUser || "(chưa nhập)"}</span></div>
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
                resultComment.textContent = "Xuất sắc tuyệt đối! Khả năng nghe và hiểu nghĩa của bạn cực kỳ tuyệt vời!";
            } else if (tiLe >= 70) {
                resultBox.classList.add("good");
                if (resultIcon) resultIcon.textContent = "🎉";
                resultComment.textContent = "Rất tốt! Bạn nắm bắt rất tốt ngữ nghĩa các câu tiếng Anh.";
            } else if (tiLe >= 40) {
                resultBox.classList.add("average");
                if (resultIcon) resultIcon.textContent = "👍";
                resultComment.textContent = "Khá tốt! Hãy bấm nghe lại các câu chưa đúng để ghi nhớ nghĩa của từ nhé.";
            } else {
                resultBox.classList.add("poor");
                if (resultIcon) resultIcon.textContent = "💪";
                resultComment.textContent = "Đừng nản lòng! Hãy bấm 💡 Gợi ý câu và nghe lại để quen dần với ngữ điệu nhé.";
            }

            resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        if (btnLamLai) {
            btnLamLai.style.display = "inline-block";
        }
    }

    // =========================================================
    // LÀM LẠI BÀI
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

                const num = card.dataset.num;
                const hintBox = document.getElementById("hint-box-" + num);
                const btnHint = document.getElementById("btn-hint-" + num);
                if (hintBox) hintBox.style.display = "none";
                if (btnHint) {
                    btnHint.classList.remove("active");
                    btnHint.innerHTML = "💡 Gợi ý câu";
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
// PHÁT ÂM CÂU (EDGE NEURAL TTS STREAM - KHÔNG LƯU ĐĨA)
// =========================================================
function phatAmCau(cau, tocDo) {
    if (!cau || typeof cau !== "string") return;
    cau = cau.trim().replace(/^\[+|\]+$/g, "").trim();
    if (!cau) return;

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
// BẬT / TẮT GỢI Ý CÂU TIẾNG ANH
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
            btnHint.innerHTML = "💡 Gợi ý câu";
        }
    }
}

window.phatAmCau = phatAmCau;
window.toggleGoiY = toggleGoiY;
