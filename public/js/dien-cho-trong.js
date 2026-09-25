// =========================================================
// XỬ LÝ TRANG ĐIỀN VÀO CHỖ TRỐNG
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    const formTaoBaiTap = document.getElementById("formTaoBaiTap");
    const btnTaoBai = document.getElementById("btnTaoBai");
    const loadingBox = document.getElementById("loadingBox");
    const dataDoanVanRaw = document.getElementById("dataDoanVanRaw");
    const paragraphContent = document.getElementById("paragraphContent");
    const wordBankList = document.getElementById("wordBankList");
    const soLuongOTrong = document.getElementById("soLuongOTrong");
    const btnChamDiem = document.getElementById("btnChamDiem");
    const btnLamLai = document.getElementById("btnLamLai");
    const btnNgheTatCa = document.getElementById("btnNgheTatCa");
    const btnDungNghe = document.getElementById("btnDungNghe");
    const resultBox = document.getElementById("resultBox");
    const resultScore = document.getElementById("resultScore");
    const resultComment = document.getElementById("resultComment");
    const resultIcon = document.getElementById("resultIcon");
    const translationBox = document.getElementById("translationBox");
    const translationBody = document.getElementById("translationBody");

    let noiDungDichTiengViet = "";

    // Loading khi bấm tạo bài
    if (formTaoBaiTap) {
        formTaoBaiTap.addEventListener("submit", function () {
            if (loadingBox) loadingBox.style.display = "block";
            if (btnTaoBai) btnTaoBai.disabled = true;
        });
    }

    // Nếu có đoạn văn thô từ AI -> Parse và render
    if (dataDoanVanRaw && dataDoanVanRaw.textContent.trim()) {
        const rawText = dataDoanVanRaw.textContent.trim();
        parseVaRenderDoanVan(rawText);
    }

    // =========================================================
    // PARSE ĐOẠN VĂN VÀ RENDER GIAO DIỆN
    // Thẻ mẫu: [[BLANK:1:word:nghĩa]]
    // =========================================================
    function parseVaRenderDoanVan(text) {
        let doanVanTiengAnh = text;
        noiDungDichTiengViet = "";

        // Tách khối bản dịch tiếng Việt nếu có (chỉ hiển thị sau khi bấm chấm điểm)
        const matchDich = text.match(/\[(?:DỊCH_TIẾNG_VIỆT|DICH_TIENG_VIET|DỊCH TIẾNG VIỆT|DICH TIENG VIET|DỊCH|DICH|BAN_DICH|BẢN_DỊCH)\]([\s\S]*?)\[\/(?:DỊCH_TIẾNG_VIỆT|DICH_TIENG_VIET|DỊCH TIẾNG VIỆT|DICH TIENG VIET|DỊCH|DICH|BAN_DICH|BẢN_DỊCH)\]/i)
                       || text.match(/(?:\[(?:DỊCH_TIẾNG_VIỆT|DICH_TIENG_VIET|DỊCH TIẾNG VIỆT|DICH TIENG VIET|DỊCH|DICH)\]|(?:\*{1,3}|#{1,4}\s*)?(?:Bản dịch tiếng Việt|Ban dich tieng Viet|Bản dịch|Dịch nghĩa)[:\*\s]*)([\s\S]*)/i);
        if (matchDich) {
            noiDungDichTiengViet = matchDich[1].replace(/\[\/(?:DỊCH_TIẾNG_VIỆT|DICH_TIENG_VIET|DỊCH TIẾNG VIỆT|DICH TIENG VIET|DỊCH|DICH|BAN_DICH|BẢN_DỊCH)\]/gi, "").trim();
            doanVanTiengAnh = text.substring(0, matchDich.index).trim();
        }

        const regex = /\[\[BLANK:(\d+):([^:]+):?([^\]]*)\]\]/g;
        let dsDapAn = [];
        let index = 0;

        // Thay thế các thẻ [[BLANK:...]] thành các ô input
        const htmlParsed = doanVanTiengAnh.replace(regex, function (match, num, word, meaning) {
            index++;
            const itemNum = num || index;
            const targetWord = word.trim();
            const targetMeaning = meaning ? meaning.trim() : "";

            dsDapAn.push({
                num: itemNum,
                word: targetWord,
                meaning: targetMeaning
            });

            return `
                <span class="blank-wrapper">
                    <span class="blank-num">${itemNum}</span>
                    <input type="text" 
                           class="blank-input" 
                           data-num="${itemNum}" 
                           data-answer="${targetWord}" 
                           data-meaning="${targetMeaning}" 
                           placeholder="..." 
                           autocomplete="off" 
                           spellcheck="false" />
                    <button type="button" class="btn-speaker-inline" onclick="docTuDien('${targetWord}')" title="Nghe từ này">🔊</button>
                    <span class="correct-answer-hint" style="display: none;">${targetWord}</span>
                </span>
            `;
        });

        // Gắn vào đoạn văn
        if (paragraphContent) {
            paragraphContent.innerHTML = htmlParsed;
        }

        // Cập nhật số lượng ô
        if (soLuongOTrong) {
            soLuongOTrong.textContent = dsDapAn.length;
        }

        // Render Word Bank (Gợi ý nghĩa tiếng Việt)
        if (wordBankList) {
            wordBankList.innerHTML = "";
            dsDapAn.forEach(function (item) {
                const chip = document.createElement("div");
                chip.className = "word-chip";
                chip.innerHTML = `
                    <span class="chip-num">${item.num}</span>
                    <span class="chip-meaning">${item.meaning || item.word}</span>
                `;
                wordBankList.appendChild(chip);
            });
        }

        // Xử lý phím Enter để tự động nhảy sang ô tiếp theo
        const inputs = document.querySelectorAll(".blank-input");
        inputs.forEach(function (input, i) {
            input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputs[i + 1]) {
                        inputs[i + 1].focus();
                    } else if (btnChamDiem) {
                        btnChamDiem.focus();
                    }
                }
            });
        });

        // Tự động focus vào ô đầu tiên
        if (inputs.length > 0) {
            inputs[0].focus();
        }
    }

    // =========================================================
    // CHẤM ĐIỂM BÀI LÀM
    // =========================================================
    if (btnChamDiem) {
        btnChamDiem.addEventListener("click", function () {
            chamDiemBaiLam();
        });
    }

    function chamDiemBaiLam() {
        const inputs = document.querySelectorAll(".blank-input");
        if (inputs.length === 0) return;

        let soCauDung = 0;
        let tongSoCau = inputs.length;

        inputs.forEach(function (input) {
            const userAnswer = input.value.trim().toLowerCase();
            const correctAnswer = (input.dataset.answer || "").trim().toLowerCase();
            const hintSpan = input.parentElement.querySelector(".correct-answer-hint");

            // So sánh câu trả lời (cho phép bỏ qua khoảng trắng thừa hoặc ký tự đặc biệt nhẹ)
            if (userAnswer === correctAnswer || (userAnswer.length > 0 && correctAnswer.includes(userAnswer) && userAnswer.length >= correctAnswer.length - 1)) {
                input.classList.remove("wrong");
                input.classList.add("correct");
                input.disabled = true;
                if (hintSpan) hintSpan.style.display = "none";
                soCauDung++;
            } else {
                input.classList.remove("correct");
                input.classList.add("wrong");
                if (hintSpan) hintSpan.style.display = "block";
            }
        });

        // Hiển thị kết quả tổng kết
        const tiLe = Math.round((soCauDung / tongSoCau) * 100);
        if (resultBox && resultScore && resultComment) {
            resultBox.style.display = "block";
            resultScore.textContent = `Bạn làm đúng ${soCauDung}/${tongSoCau} từ (${tiLe}%)`;

            resultBox.classList.remove("good", "average", "poor");

            if (tiLe === 100) {
                resultBox.classList.add("good");
                if (resultIcon) resultIcon.textContent = "🏆";
                resultComment.textContent = "Xuất sắc! Bạn đã điền chính xác 100% tất cả các từ!";
            } else if (tiLe >= 70) {
                resultBox.classList.add("good");
                if (resultIcon) resultIcon.textContent = "🎉";
                resultComment.textContent = "Rất tốt! Bạn nắm từ vựng rất chắc chắn.";
            } else if (tiLe >= 40) {
                resultBox.classList.add("average");
                if (resultIcon) resultIcon.textContent = "👍";
                resultComment.textContent = "Khá tốt! Hãy xem lại các từ màu đỏ và thử lại nhé.";
            } else {
                resultBox.classList.add("poor");
                if (resultIcon) resultIcon.textContent = "💪";
                resultComment.textContent = "Đừng nản lòng! Hãy xem đáp án gợi ý và bấm 'Làm lại' để ghi nhớ từ vựng sâu hơn.";
            }

            resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Hiển thị bản dịch tiếng Việt của đoạn văn
        if (translationBox && translationBody && noiDungDichTiengViet) {
            translationBody.textContent = noiDungDichTiengViet;
            translationBox.style.display = "block";
        }

        if (btnLamLai) {
            btnLamLai.style.display = "inline-block";
        }
    }

    // =========================================================
    // LÀM LẠI BÀI TẬP HIỆN TẠI
    // =========================================================
    if (btnLamLai) {
        btnLamLai.addEventListener("click", function () {
            dungDocDoanVan();
            const inputs = document.querySelectorAll(".blank-input");
            inputs.forEach(function (input) {
                input.value = "";
                input.disabled = false;
                input.classList.remove("correct", "wrong");
                const hintSpan = input.parentElement.querySelector(".correct-answer-hint");
                if (hintSpan) hintSpan.style.display = "none";
            });

            if (resultBox) resultBox.style.display = "none";
            if (translationBox) translationBox.style.display = "none";
            if (btnLamLai) btnLamLai.style.display = "none";

            if (inputs.length > 0) inputs[0].focus();
        });
    }

    // =========================================================
    // DỪNG ĐỌC ĐOẠN VĂN
    // =========================================================
    function dungDocDoanVan() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (audioDoanVan) {
            audioDoanVan.pause();
            audioDoanVan.currentTime = 0;
            if (audioDoanVan.src && audioDoanVan.src.startsWith("blob:")) {
                URL.revokeObjectURL(audioDoanVan.src);
            }
            audioDoanVan = null;
        }
        if (btnDungNghe) {
            btnDungNghe.style.display = "none";
        }
        console.log("ĐÃ DỪNG ĐỌC ĐOẠN VĂN.");
    }

    if (btnDungNghe) {
        btnDungNghe.addEventListener("click", function () {
            dungDocDoanVan();
        });
    }

    // =========================================================
    // ĐỌC TOÀN BỘ ĐOẠN VĂN (EDGE NEURAL TTS MP3 STREAM - KHÔNG LƯU ĐĨA)
    // =========================================================
    let audioDoanVan = null;

    if (btnNgheTatCa) {
        btnNgheTatCa.addEventListener("click", function () {
            if (!paragraphContent) return;

            // Dừng âm thanh cũ nếu đang phát
            dungDocDoanVan();

            // Lấy toàn bộ text sạch của đoạn văn (thay ô input bằng đáp án đúng)
            let clone = paragraphContent.cloneNode(true);
            clone.querySelectorAll(".blank-input").forEach(function (inp) {
                inp.replaceWith(document.createTextNode(inp.dataset.answer || ""));
            });
            clone.querySelectorAll(".btn-speaker-inline, .blank-num, .correct-answer-hint").forEach(function (el) {
                el.remove();
            });

            let fullText = clone.textContent.replace(/\s+/g, " ").trim();
            if (!fullText) return;

            if (audioDienTu) {
                audioDienTu.pause();
                audioDienTu = null;
            }

            console.log("ĐỌC TOÀN BỘ ĐOẠN VĂN:", fullText);

            if (btnDungNghe) {
                btnDungNghe.style.display = "inline-block";
            }

            if (window.phatAmThanh) {
                window.phatAmThanh(fullText, {
                    rate: "-5%",
                    onStart: function () {
                        console.log("BẮT ĐẦU ĐỌC ĐOẠN VĂN (MP3 Chuẩn Server)...");
                        if (btnDungNghe) btnDungNghe.style.display = "inline-block";
                    },
                    onEnd: function () {
                        console.log("ĐỌC XONG ĐOẠN VĂN.");
                        if (btnDungNghe) btnDungNghe.style.display = "none";
                    },
                    onError: function (err) {
                        console.warn("LỖI PHÁT MP3 ĐOẠN VĂN:", err);
                        if (btnDungNghe) btnDungNghe.style.display = "none";
                    }
                });
                return;
            }
        });
    }

});

// =========================================================
// PHÁT ÂM TỪNG TỪ
// =========================================================
let audioDienTu = null;

function docTuDien(tu) {
    if (!tu) return;

    if (window.phatAmThanh) {
        window.phatAmThanh(tu, { rate: "+0%" });
        return;
    }

    let duongDan = "/audio/phat?text=" + encodeURIComponent(tu) + "&rate=+0%";
    audioDienTu = new Audio(duongDan);
    audioDienTu.play().catch(function (e) {
        console.warn("Lỗi phát audio:", e);
    });
}

window.docTuDien = docTuDien;
