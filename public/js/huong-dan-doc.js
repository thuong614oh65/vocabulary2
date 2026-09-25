/**
 * HƯỚNG DẪN CÁCH ĐỌC CHUẨN (GOOGLE DỊCH & ELSA SPEAK STYLE)
 * Quản lý âm thanh tập trung: Đảm bảo toàn trang CHỈ CÓ 1 ÂM THANH DUY NHẤT.
 * Bật bất kỳ âm thanh nào mới sẽ lập tức ngắt âm thanh cũ đang phát.
 */
(function () {
    let hdAudioHienTai = null;
    let hdTimeoutList = [];
    let hangDangChon = null;
    let duLieuHienTai = null;
    let recognition = null;
    let dangThuAm = false;
    const clientHuongDanCache = new Map();

    // =========================================================
    // 1. BỘ ĐIỀU PHỐI ÂM THANH TOÀN TRANG (MASTER AUDIO CONTROLLER)
    // Bắt và quản lý mọi âm thanh HTML5 Audio và SpeechSynthesis
    // =========================================================
    let audioDangPhatToanCuc = null;

    // Hook HTMLMediaElement.prototype.play (bắt tất cả new Audio().play() trên toàn trang)
    const playGoc = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
        // 1. Dừng SpeechSynthesis nếu đang phát
        if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }

        // 2. Dừng bất kỳ Audio nào khác đang phát trước đó
        if (audioDangPhatToanCuc && audioDangPhatToanCuc !== this) {
            try {
                audioDangPhatToanCuc.pause();
                audioDangPhatToanCuc.currentTime = 0;
            } catch (e) {}
        }

        // 3. Đánh dấu audio hiện tại
        audioDangPhatToanCuc = this;

        const self = this;
        const xoaAudio = function () {
            if (audioDangPhatToanCuc === self) {
                audioDangPhatToanCuc = null;
            }
        };
        this.addEventListener("ended", xoaAudio, { once: true });
        this.addEventListener("pause", xoaAudio, { once: true });

        return playGoc.apply(this, arguments);
    };

    // Hook window.speechSynthesis.speak (bắt tất cả giọng đọc trình duyệt)
    if (window.speechSynthesis) {
        const speakGoc = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function (utterance) {
            // 1. Dừng bất kỳ Audio nào đang phát
            if (audioDangPhatToanCuc) {
                try {
                    audioDangPhatToanCuc.pause();
                    audioDangPhatToanCuc.currentTime = 0;
                } catch (e) {}
                audioDangPhatToanCuc = null;
            }

            // 2. Dừng lượt SpeechSynthesis trước đó
            try { window.speechSynthesis.cancel(); } catch (e) {}

            return speakGoc(utterance);
        };
    }

    // =========================================================
    // 2. DỪNG TẤT CẢ ÂM THANH TOÀN BỘ TRANG VÀ MODAL
    // =========================================================
    function dungAudioHuongDan() {
        // 1. Hủy lượt đọc & đánh vần bên hoc-chon.js (nếu có)
        if (typeof window.huyDocHocChon === "function") {
            try { window.huyDocHocChon(); } catch (e) {}
        } else if (typeof window.dungTatCaAmThanh === "function") {
            try { window.dungTatCaAmThanh(); } catch (e) {}
        }

        // 2. Dừng audio toàn cục
        if (audioDangPhatToanCuc) {
            try {
                audioDangPhatToanCuc.pause();
                audioDangPhatToanCuc.currentTime = 0;
            } catch (e) {}
                audioDangPhatToanCuc = null;
        }

        // 3. Dừng audio nội bộ của modal
        if (hdAudioHienTai) {
            try {
                hdAudioHienTai.pause();
                hdAudioHienTai.currentTime = 0;
            } catch (e) {}
            hdAudioHienTai = null;
        }

        // 4. Dừng SpeechSynthesis
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }

        // 5. Xóa các timeout đang chờ (cho đánh vần / tách âm)
        hdTimeoutList.forEach(function (t) { clearTimeout(t); });
        hdTimeoutList = [];

        // 6. Gỡ class playing ở các nút
        document.querySelectorAll(".btn-hd-audio, .btn-hd-blending-speak").forEach(function (btn) {
            btn.classList.remove("playing");
        });

        // 7. Gỡ class active-playing ở các thẻ âm tiết
        document.querySelectorAll(".hd-syllable-chip").forEach(function (chip) {
            chip.classList.remove("active-playing");
        });
    }

    // Đưa ra global để hoc-chon.js có thể gọi ngắt khi cần
    window.dungAudioHuongDan = dungAudioHuongDan;

    // =========================================================
    // 3. TỰ ĐỘNG KHỞI TẠO VÀ MỞ MODAL HƯỚNG DẪN ĐỌC
    // =========================================================
    function ensureModalExists() {
        let modal = document.getElementById("modalHuongDanDoc");
        if (!modal) {
            const modalDiv = document.createElement("div");
            modalDiv.id = "modalHuongDanDoc";
            modalDiv.className = "modal-hd-overlay";
            modalDiv.innerHTML =
                '<div class="modal-hd-container">' +
                    '<div class="modal-hd-header">' +
                        '<h5 class="modal-hd-title">🗣️ Hướng dẫn cách đọc chuẩn</h5>' +
                        '<button type="button" class="modal-hd-close" onclick="dongHuongDanDoc(false)" title="Đóng">&times;</button>' +
                    '</div>' +
                    '<div class="modal-hd-body">' +
                        '<div id="hdLoadingBox" class="modal-hd-loading">' +
                            '<div class="modal-hd-spinner"></div>' +
                            '<div>Đang phân tích phát âm chuẩn...</div>' +
                        '</div>' +
                        '<div id="hdContentBox" style="display: none; flex-direction: column; gap: 16px;">' +
                            '<div class="hd-word-hero">' +
                                '<div class="hd-hero-top-row">' +
                                    '<button type="button" class="btn-hd-hero-audio" onclick="phatAudioHuongDan(1.0, this)" title="Nghe phát âm chuẩn cả từ">🔊</button>' +
                                    '<span class="hd-word" id="hdTuChinh">...</span>' +
                                    '<span class="hd-phonetic-ipa" id="hdPhienAmIpa"></span>' +
                                '</div>' +
                                '<div class="hd-meaning" id="hdNghia"></div>' +
                            '</div>' +
                            '<!-- THANH NÚT NGHE PHÁT ÂM (Đổi lên ngay sau ảnh 3) -->' +
                            '<div class="hd-audio-bar">' +
                                '<button type="button" class="btn-hd-audio btn-primary-audio" onclick="phatAudioHuongDan(1.0, this)" title="Nghe với tốc độ người bản xứ bình thường">🔊 Chuẩn (1.0x)</button>' +
                                '<button type="button" class="btn-hd-audio" onclick="phatAudioHuongDan(0.6, this)" title="Nghe chậm rõ từng âm như Google Dịch">🐢 Chậm (0.6x)</button>' +
                                '<button type="button" class="btn-hd-audio" onclick="phatTatCaAmThanhSoundWhy(this)" title="Đọc từng âm tiết rồi đọc cả từ">🎶 Tách âm tiết</button>' +
                            '</div>' +
                            '<!-- KHỐI TÁCH ÂM SOUNDWHY (SYLLABLE CARDS) -->' +
                            '<div class="hd-soundwhy-section" id="hdSoundWhySection">' +
                                '<div class="hd-sw-title-bar">' +
                                    '<span class="hd-sw-title">🎧 Phân rã ngữ âm chuẩn SoundWhy</span>' +
                                    '<span class="hd-sw-badge">Phonics & Blending</span>' +
                                '</div>' +
                                '<div class="hd-sw-cards-container" id="hdSwCardsContainer"></div>' +
                                '<div class="hd-sw-play-center">' +
                                    '<button type="button" class="btn-sw-play-sounds" id="btnSwPlaySounds" onclick="phatTatCaAmThanhSoundWhy(this)" title="Nghe tuần tự từng âm có đèn sáng rồi ghép cả từ">' +
                                        '<span class="sw-play-icon">▶</span> Play sounds' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="hd-syllables-box" id="hdSyllablesBox" style="display: none;">' +
                                '<div class="hd-syllable-chips" id="hdSyllableChips"></div>' +
                            '</div>' +
                            '<!-- CÁC QUY TẮC SƠ ĐỒ ĐÁNH VẦN LIÊN QUAN -->' +
                            '<div id="hdMindmapLinks" class="hd-mindmap-links" style="display: none;"></div>' +
                            '<div class="hd-speech-box">' +
                                '<button type="button" id="btnMicPractice" class="btn-mic-practice" onclick="batDauLuyenDoc()">🎙️ Bấm để thử phát âm</button>' +
                                '<div id="hdSpeechResult" class="hd-speech-result"></div>' +
                            '</div>' +
                            '<div class="hd-tips-grid">' +
                                '<div class="hd-tip-card mouth">' +
                                    '<div class="hd-tip-title">👄 Khẩu hình & vị trí lưỡi:</div>' +
                                    '<div id="hdTipKhauHinh">Mở miệng vừa phải, thả lỏng môi...</div>' +
                                '</div>' +
                                '<div class="hd-tip-card ending" id="hdCardAmDuoi" style="display: none;">' +
                                    '<div class="hd-tip-title">🔔 Chú ý âm đuôi (Ending sound):</div>' +
                                    '<div id="hdTipAmDuoi">...</div>' +
                                '</div>' +
                                '<div class="hd-tip-card warning">' +
                                    '<div class="hd-tip-title">⚠️ Lỗi người Việt hay gặp:</div>' +
                                    '<div id="hdTipLoi">...</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="modal-hd-footer">' +
                        '<button type="button" class="btn-hd-close-secondary" onclick="dongHuongDanDoc(false)">Đóng</button>' +
                        '<button type="button" class="btn-hd-back-study" id="btnHdBackStudy" onclick="dongHuongDanDoc(true)" title="Đóng modal và con trỏ tự động quay lại ô nhập để học tiếp">← Quay lại tiếp tục học tiếp</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modalDiv);
            modal = modalDiv;

            modal.addEventListener("click", function (e) {
                if (e.target === modal) {
                    dongHuongDanDoc(false);
                }
            });
        }
        return modal;
    }

    window.moHuongDanDoc = function (btnElement, tu, phienAm, nghia) {
        if (!tu) return;

        // Lưu dòng bảng hiện tại để khi đóng modal có thể tự focus ô nhập
        hangDangChon = null;
        if (btnElement) {
            hangDangChon = btnElement.closest("tr");
        }

        // Dừng mọi âm thanh đang phát trước đó
        dungAudioHuongDan();

        const modal = ensureModalExists();
        const loadingBox = document.getElementById("hdLoadingBox");
        const contentBox = document.getElementById("hdContentBox");

        if (!modal) return;

        // Ẩn nút "Quay lại tiếp tục học" nếu không có ô nhập câu trả lời trên trang
        const btnBack = document.getElementById("btnHdBackStudy");
        if (btnBack) {
            btnBack.style.display = (hangDangChon && hangDangChon.querySelector(".cau-tra-loi")) ? "inline-flex" : "none";
        }

        const tuKey = (tu || "").trim().toLowerCase();

        // 1. Nếu đã có trong Client Cache -> Hiển thị ngay lập tức (0ms delay)
        if (clientHuongDanCache.has(tuKey)) {
            const cachedData = clientHuongDanCache.get(tuKey);
            duLieuHienTai = cachedData;
            hienThiDuLieuModal(cachedData);
            modal.classList.add("show");
            if (loadingBox) loadingBox.style.display = "none";
            if (contentBox) contentBox.style.display = "flex";
            phatAudioTu(tu, 1.0);
            return;
        }

        modal.classList.add("show");
        if (loadingBox) loadingBox.style.display = "block";
        if (contentBox) contentBox.style.display = "none";

        // Tự động phát âm 1 lần tốc độ chuẩn ngay khi mở modal (như Google Dịch)
        phatAudioTu(tu, 1.0);

        // Gọi API lấy dữ liệu phân tích ngữ âm (kèm timeout 3.5s chống đứng quay)
        const params = new URLSearchParams({
            tu: tu,
            phienAm: phienAm || "",
            nghia: nghia || ""
        });

        let controller = null;
        let timeoutId = null;
        if (window.AbortController) {
            controller = new AbortController();
            timeoutId = setTimeout(function () {
                try { controller.abort(); } catch (e) {}
            }, 3500);
        }

        const fetchOptions = controller ? { signal: controller.signal } : {};

        fetch("/api/huong-dan-doc?" + params.toString(), fetchOptions)
            .then(function (res) {
                if (timeoutId) clearTimeout(timeoutId);
                if (!res.ok) throw new Error("Lỗi mạng khi tải hướng dẫn");
                return res.json();
            })
            .then(function (data) {
                clientHuongDanCache.set(tuKey, data);
                duLieuHienTai = data;
                hienThiDuLieuModal(data);
                if (loadingBox) loadingBox.style.display = "none";
                if (contentBox) contentBox.style.display = "flex";
            })
            .catch(function (err) {
                if (timeoutId) clearTimeout(timeoutId);
                console.warn("[HuongDanDoc] Dùng dữ liệu dự phòng:", err);
                const fallbackData = taoDuLieuDuPhong(tu, phienAm, nghia);
                duLieuHienTai = fallbackData;
                hienThiDuLieuModal(fallbackData);
                if (loadingBox) loadingBox.style.display = "none";
                if (contentBox) contentBox.style.display = "flex";
            });
    };

    // =========================================================
    // 4. ĐÓNG MODAL
    // =========================================================
    window.dongHuongDanDoc = function (tiepTucHoc) {
        dungAudioHuongDan();

        if (recognition && dangThuAm) {
            try { recognition.stop(); } catch (e) {}
            dangThuAm = false;
        }

        const modal = document.getElementById("modalHuongDanDoc");
        if (modal) {
            modal.classList.remove("show");
        }

        // Nếu bấm "Quay lại tiếp tục học tiếp" -> focus và cuộn vào ô nhập
        if (tiepTucHoc && hangDangChon) {
            const input = hangDangChon.querySelector(".cau-tra-loi");
            if (input) {
                setTimeout(function () {
                    input.focus();
                    input.select();
                    if (typeof window.cuonVaoGiuaManHinh === "function") {
                        window.cuonVaoGiuaManHinh(input);
                    }
                }, 100);
            }
        }
    };

    window.moSoDoDanhVanChoTuHienTai = function () {
        if (duLieuHienTai && duLieuHienTai.tu) {
            dungAudioHuongDan();
            window.open("/so-do-danh-van?tu=" + encodeURIComponent(duLieuHienTai.tu), "_blank");
        }
    };

    // =========================================================
    // ĐỊNH DẠNG ÂM BỒI TIẾNG VIỆT & HIGHLIGHT ÂM ĐUÔI THEO ẢNH MẪU
    function dinhDangAmBoiHtml(str) {
        if (!str) return "";
        return String(str);
    }

    // =========================================================
    // HỖ TRỢ HIỂN THỊ CHỮ CÁI CHUẨN SOUNDWHY.COM
    // =========================================================
    function taoLettersHtmlChoAmTiet(syllable, isLastSyllable, fullWord, phonicsMapping) {
        if (!syllable) return "";
        let html = "";
        const wordLower = (fullWord || "").toLowerCase().trim();
        const isFullWordEndingWithE = wordLower.length > 2 && wordLower.endsWith("e") && !wordLower.endsWith("ee") && !wordLower.endsWith("ye");

        for (let i = 0; i < syllable.length; i++) {
            const char = syllable[i];
            const lowerChar = char.toLowerCase();
            let cls = "consonant";

            // Nguyên âm tiếng Anh: a, e, i, o, u (hoặc y nếu không phải chữ đầu)
            const isVowelChar = "aeiou".indexOf(lowerChar) !== -1 || (lowerChar === "y" && i > 0);

            // Chữ câm: chữ 'e' ở cuối từ (như schedule, time, place...)
            const isSilentE = (isLastSyllable && i === syllable.length - 1 && lowerChar === "e" && isFullWordEndingWithE);

            if (isSilentE) {
                cls = "silent";
            } else if (isVowelChar) {
                cls = "vowel";
            }

            html += '<span class="hd-sw-letter ' + cls + '"' + (isSilentE ? ' title="Chữ câm - không phát âm"' : '') + '>' + char + '</span>';
        }
        return html;
    }

    function renderSoundWhy(data) {
        if (!data) return;

        // 1. Render các thẻ âm tiết to (Syllable Cards)
        const swContainer = document.getElementById("hdSwCardsContainer");
        if (swContainer) {
            swContainer.innerHTML = "";
            const amTiet = data.amTiet || [data.tu];
            const amTietIpa = data.amTietIpa || [];
            const amTietBoi = data.amTietBoi || [];
            const amTietDoc = data.amTietDoc || [];
            const amNhan = typeof data.amNhanIndex === "number" ? data.amNhanIndex : -1;
            const fullWord = data.tu || "";

            amTiet.forEach(function (rawSyllable, idx) {
                const syllable = rawSyllable.replace(/\s*\([^)]*\)/g, "").trim();
                const isLast = (idx === amTiet.length - 1);
                const isStressed = (idx === amNhan);

                const card = document.createElement("div");
                card.className = "hd-sw-card" + (isStressed ? " stressed" : "");
                card.dataset.idx = idx;
                card.title = "Bấm để nghe âm tiết: " + syllable;

                let ipaText = amTietIpa[idx] ? "/" + amTietIpa[idx].replace(/[/|\\[\\]]/g, "") + "/" : "";
                let boiText = amTietBoi[idx] || "";
                let boiHtml = dinhDangAmBoiHtml(boiText);
                let docText = (amTietDoc && amTietDoc[idx]) ? amTietDoc[idx] : syllable;

                // Tạo các chữ cái có màu chuẩn SoundWhy (Nguyên âm xanh lá, chữ câm xám)
                let lettersHtml = taoLettersHtmlChoAmTiet(syllable, isLast, fullWord, data.phonicsMapping);

                card.innerHTML =
                    (isStressed ? '<span class="hd-sw-card-stress-badge">⭐ Trọng âm</span>' : '') +
                    '<div class="hd-sw-card-letters">' + lettersHtml + '</div>' +
                    (ipaText ? '<div class="hd-sw-card-ipa">' + ipaText + '</div>' : '');

                card.addEventListener("click", function () {
                    dungAudioHuongDan();
                    document.querySelectorAll(".hd-sw-card").forEach(function (c) { c.classList.remove("active-playing"); });
                    card.classList.add("active-playing");
                    docAmTiet(syllable, docText, function () {
                        card.classList.remove("active-playing");
                    });
                });

                swContainer.appendChild(card);
            });
        }
    }

    // =========================================================
    // 5. RENDER NỘI DUNG VÀO MODAL
    // =========================================================
    function hienThiDuLieuModal(data) {
        // Từ chính & Nghĩa
        const elTu = document.getElementById("hdTuChinh");
        const elIpa = document.getElementById("hdPhienAmIpa");
        const elVn = document.getElementById("hdPhienAmTiengViet");
        const elNghia = document.getElementById("hdNghia");

        const elVsStrip = document.getElementById("hdVisualStrip");
        const elVsWord = document.getElementById("hdVsWord");
        const elVsRespell = document.getElementById("hdVsRespell");
        const elVsMeaning = document.getElementById("hdVsMeaning");

        const rawVn = data.phienAmTiengViet || data.tu || "";
        const formattedVnHtml = dinhDangAmBoiHtml(rawVn);
        const nghiaClean = data.nghia ? data.nghia.replace(/^\(|\)$/g, "").trim() : "";

        if (elTu) elTu.textContent = data.tu || "";
        if (elIpa) elIpa.textContent = data.phienAm ? (data.phienAm.startsWith("/") ? data.phienAm : "/" + data.phienAm + "/") : "";
        if (elVn) elVn.innerHTML = '🇻🇳 <span class="hd-vn-prefix">Âm Việt:</span> ' + formattedVnHtml;
        if (elNghia) elNghia.textContent = data.nghia ? "(" + data.nghia + ")" : "";

        // Card trực quan chuẩn theo ảnh mẫu (Word – Âm bồi – Nghĩa 🔊)
        if (elVsStrip) {
            elVsStrip.style.display = "none";
        }
        if (elVn && elVn.parentElement) elVn.parentElement.style.display = "none";
        if (elNghia) elNghia.style.display = "block";

        // Render khối SoundWhy (Syllable Cards & Phonics Pills)
        renderSoundWhy(data);

        // Tách âm tiết (Syllables legacy container nếu có)
        const chipContainer = document.getElementById("hdSyllableChips");
        if (chipContainer && chipContainer.offsetParent !== null) {
            chipContainer.innerHTML = "";
            const amTiet = data.amTiet || [data.tu];
            const amTietIpa = data.amTietIpa || [];
            const amTietBoi = data.amTietBoi || [];
            const amTietDoc = data.amTietDoc || [];
            const amNhan = typeof data.amNhanIndex === "number" ? data.amNhanIndex : -1;

            amTiet.forEach(function (rawSyllable, idx) {
                const syllable = rawSyllable.replace(/\s*\([^)]*\)/g, "").trim();
                const chip = document.createElement("div");
                chip.className = "hd-syllable-chip" + (idx === amNhan ? " stressed" : "");
                chip.title = "Bấm để nghe âm tiết: " + syllable;

                let ipaText = amTietIpa[idx] ? "/" + amTietIpa[idx] + "/" : "";
                let boiText = amTietBoi[idx] || "";
                let boiHtml = dinhDangAmBoiHtml(boiText);
                let docText = (amTietDoc && amTietDoc[idx]) ? amTietDoc[idx] : syllable;

                chip.innerHTML = 
                    '<span class="syllable-stress-tag">⭐ Trọng âm</span>' +
                    '<span class="syllable-en">' + syllable + '</span>' +
                    (ipaText ? '<span class="syllable-ipa">' + ipaText + '</span>' : '');

                chip.addEventListener("click", function () {
                    dungAudioHuongDan();
                    chip.classList.add("active-playing");
                    docAmTiet(syllable, docText, function () {
                        chip.classList.remove("active-playing");
                    });
                });

                chipContainer.appendChild(chip);
            });
        }

        // Hướng dẫn khẩu hình
        const elKhauHinh = document.getElementById("hdTipKhauHinh");
        if (elKhauHinh) {
            elKhauHinh.textContent = data.khauHinh || "Mở khẩu hình thoải mái, đặt lưỡi tự nhiên và phát âm rõ ràng.";
        }

        // Âm đuôi (Ending sound)
        const boxAmDuoi = document.getElementById("hdCardAmDuoi");
        const elAmDuoi = document.getElementById("hdTipAmDuoi");
        if (data.amDuoi && data.amDuoi.trim()) {
            if (boxAmDuoi) boxAmDuoi.style.display = "block";
            if (elAmDuoi) elAmDuoi.textContent = data.amDuoi;
        } else {
            if (boxAmDuoi) boxAmDuoi.style.display = "none";
        }

        // Lỗi thường gặp
        const elLoi = document.getElementById("hdTipLoi");
        if (elLoi) {
            elLoi.textContent = data.loiThuongGap || "Chú ý nhấn đúng trọng âm và phát âm đầy đủ các âm tiết.";
        }

        // Render khối "Ghép các âm tiết lại thành từ"
        renderBlendingBox(data);

        // Reset trạng thái thu âm luyện đọc
        const micBtn = document.getElementById("btnMicPractice");
        const micResult = document.getElementById("hdSpeechResult");
        if (micBtn) {
            micBtn.classList.remove("listening");
            micBtn.innerHTML = "🎙️ Bấm để thử phát âm";
        }
        if (micResult) {
            micResult.innerHTML = "";
        }
    }


    // =========================================================
    // DANH MỤC CÁC QUY TẮC ĐÁNH VẦN CÓ TRONG SƠ ĐỒ ĐÁNH VẦN (36+ QUY TẮC)
    // =========================================================
    const DANH_MUC_QUY_TAC_SO_DO = [
        // Nhóm 1: Nguyên âm đặc biệt & Biến âm R
        { id: "w_or", cum: "w + or", ipa: "/ɜː/", regex: /w[oO]r/i, icon: "🌟", label: 'w + or ➔ /ɜː/ (biến âm như trong work, word)' },
        { id: "ar", cum: "ar", ipa: "/ɑː/", regex: /ar/i, icon: "⭐", label: 'ar ➔ /ɑː/ (nguyên âm dài như trong car, park)' },
        { id: "er_ir_ur", cum: "er/ir/ur", ipa: "/ɜː/", regex: /er|ir|ur/i, icon: "⭐", label: 'er / ir / ur ➔ /ɜː/ (như trong her, bird, turn)' },
        { id: "all_al", cum: "all/al", ipa: "/ɔːl/", regex: /all|^al/i, icon: "⭐", label: 'all / al ➔ /ɔːl/ (như trong ball, call, also)' },
        { id: "or_normal", cum: "or", ipa: "/ɔː/", regex: /or/i, icon: "⭐", label: 'or ➔ /ɔː/ (như trong horse, fork, sport)' },
        { id: "wa_qua", cum: "wa/qua", ipa: "/ɒ/", regex: /wa|qua/i, icon: "⭐", label: 'wa / qua biến âm /ɒ/ (như trong water, watch)' },

        // Nhóm 2: Đuôi từ & Hậu tố thông dụng
        { id: "ability_suffix", cum: "-ability", ipa: "/əˈbɪl.ə.ti/", regex: /ability/i, icon: "🏷️", label: 'Hậu tố "-ability" ➔ /əˈbɪl.ə.ti/' },
        { id: "ty_ending", cum: "-ty", ipa: "/ti/", regex: /ty$/i, icon: "🏷️", label: 'Đuôi danh từ "-ty" ➔ /ti/' },
        { id: "fy_end", cum: "-fy", ipa: "/aɪ/", regex: /fy$/i, icon: "🏷️", label: 'Đuôi "-fy" ➔ /aɪ/ (như trong modify, qualify)' },
        { id: "consonant_le", cum: "-le", ipa: "/əl/", regex: /[bcdfghjklmnpqrstvwxyz]le$/i, icon: "🏷️", label: 'Đuôi "[phụ âm + le]" ➔ /əl/ (như table, apple)' },
        { id: "ise_ize", cum: "-ise/-ize", ipa: "/aɪz/", regex: /ise$|ize$/i, icon: "🏷️", label: 'Đuôi "-ise / -ize" ➔ /aɪz/ (như organize, realize)' },
        { id: "tion_sion", cum: "-tion/-sion", ipa: "/ʃn/", regex: /tion|sion/i, icon: "🏷️", label: 'Đuôi "-tion / -sion" ➔ /ʃn/ (như registration, action)' },
        { id: "ture_end", cum: "-ture", ipa: "/tʃə/", regex: /ture$/i, icon: "🏷️", label: 'Đuôi "-ture" ➔ /tʃə/ (như picture, nature)' },
        { id: "cial_tial", cum: "-cial/-tial", ipa: "/ʃəl/", regex: /cial|tial/i, icon: "🏷️", label: 'Đuôi "-cial / -tial" ➔ /ʃəl/ (như special, official)' },
        { id: "ious_eous", cum: "-ious/-eous", ipa: "/əs/", regex: /ious|eous/i, icon: "🏷️", label: 'Đuôi "-ious / -eous" ➔ /əs/ (như famous, delicious)' },
        { id: "ate_adj_noun", cum: "-ate", ipa: "/ət/", regex: /ate$/i, icon: "🏷️", label: 'Đuôi "-ate" ➔ /ət/ (như climate, accurate)' },
        { id: "ment_end", cum: "-ment", ipa: "/mənt/", regex: /ment$/i, icon: "🏷️", label: 'Đuôi "-ment" ➔ /mənt/ (như payment, movement)' },
        { id: "ness_end", cum: "-ness", ipa: "/nəs/", regex: /ness$/i, icon: "🏷️", label: 'Đuôi "-ness" ➔ /nəs/ (như kindness, business)' },

        // Nhóm 3: Nguyên âm đôi & Nguyên âm dài
        { id: "ou_sound", cum: "ou", ipa: "/aʊ/", regex: /ou/i, icon: "🔤", label: 'Nguyên âm đôi "ou" ➔ /aʊ/ (như trong coun, house, sound)' },
        { id: "ea_ee", cum: "ee/ea", ipa: "/iː/", regex: /ee|ea/i, icon: "🔤", label: 'Nguyên âm dài "ee / ea" ➔ /iː/ (như fee, see, tea)' },
        { id: "oo_long", cum: "oo", ipa: "/uː/", regex: /oo/i, icon: "🔤", label: 'Cụm "oo" ➔ /uː/ & /ʊ/ (như moon, food, book)' },
        { id: "oa_sound", cum: "oa", ipa: "/oʊ/", regex: /oa/i, icon: "🔤", label: 'Nguyên âm "oa" ➔ /oʊ/ (như boat, coat, road)' },
        { id: "igh_sound", cum: "igh", ipa: "/aɪ/", regex: /igh/i, icon: "🔤", label: 'Cụm "igh" ➔ /aɪ/ (như high, night, light)' },
        { id: "oy_oi", cum: "oy/oi", ipa: "/ɔɪ/", regex: /oy|oi/i, icon: "🔤", label: 'Cặp "oy / oi" ➔ /ɔɪ/ (như boy, toy, coin)' },
        { id: "aw_au", cum: "aw/au", ipa: "/ɔː/", regex: /aw|au/i, icon: "🔤", label: 'Cặp "aw / au" ➔ /ɔː/ (như law, saw, cause)' },
        { id: "ai_ay", cum: "ai/ay", ipa: "/eɪ/", regex: /ai|ay/i, icon: "🔤", label: 'Cặp "ai / ay" ➔ /eɪ/ (như day, play, train)' },

        // Nhóm 4: Phụ âm kép & Phụ âm câm
        { id: "ch_sound", cum: "ch", ipa: "/tʃ/", regex: /ch/i, icon: "🐥", label: 'Phụ âm kép "ch" ➔ /tʃ/ (như trong lunch, chair)' },
        { id: "sh_sound", cum: "sh", ipa: "/ʃ/", regex: /sh/i, icon: "🐥", label: 'Phụ âm kép "sh" ➔ /ʃ/ (như trong shop, workshop, fish)' },
        { id: "th_unvoiced", cum: "th", ipa: "/θ/ & /ð/", regex: /th/i, icon: "🐥", label: 'Phụ âm kép "th" ➔ /θ/ & /ð/ (như think, this)' },
        { id: "ph_sound", cum: "ph", ipa: "/f/", regex: /ph/i, icon: "🐥", label: 'Phụ âm "ph" ➔ /f/ (như phone, photo)' },
        { id: "silent_kn_wr", cum: "kn/wr", ipa: "âm câm", regex: /^kn|^wr/i, icon: "🐥", label: 'Âm câm "kn / wr" (như know, knife, write)' },
        { id: "silent_mb", cum: "mb", ipa: "b câm", regex: /mb$/i, icon: "🐥", label: 'Đuôi "-mb" câm chữ "b" (như climb, lamb)' },
        { id: "silent_wh", cum: "wh", ipa: "h/w câm", regex: /^wh/i, icon: "🐥", label: 'Cụm "wh" (như what, where, when)' },

        // Nhóm 5: Quy tắc biến âm C & G
        { id: "ac_prefix", cum: "ac-", ipa: "/ək/", regex: /^ac/i, icon: "🔀", label: 'Tiền tố "ac-" ➔ /ək/ (như trong account, accept)' },
        { id: "soft_c", cum: "c + e/i/y", ipa: "/s/", regex: /c[eiy]/i, icon: "🔀", label: 'C Mềm (c + e, i, y) ➔ /s/ (như city, nice, circle)' },
        { id: "soft_g", cum: "g + e/i/y", ipa: "/dʒ/", regex: /g[eiy]/i, icon: "🔀", label: 'G Mềm (g + e, i, y) ➔ /dʒ/ (như gem, giraffe, registration)' }
    ];

    // =========================================================
    // 5B. RENDER CÁC QUY TẮC SƠ ĐỒ ĐÁNH VẦN LIÊN QUAN
    // =========================================================
    function renderBlendingBox(data) {
        // Render các nút chuyển sang Sơ đồ đánh vần luyện âm
        let mmlContainer = document.getElementById("hdMindmapLinks");
        if (!mmlContainer) return;
        mmlContainer.innerHTML = "";

        // 1. Quét tìm TẤT CẢ các quy tắc trong từ khớp với Bảng Sơ đồ đánh vần
        const tuLower = (data.tu || "").trim().toLowerCase();
        const matchedRules = [];
        const seenRuleIds = new Set();

        if (data.maQuyTacLienKet && !seenRuleIds.has(data.maQuyTacLienKet)) {
            matchedRules.push({
                id: data.maQuyTacLienKet,
                label: data.tenQuyTacLienKet || "Quy tắc liên quan",
                icon: "⭐"
            });
            seenRuleIds.add(data.maQuyTacLienKet);
        }

        DANH_MUC_QUY_TAC_SO_DO.forEach(function (r) {
            if (seenRuleIds.has(r.id)) return;
            if (r.id === "or_normal" && /w[oO]r/i.test(tuLower)) return; // Tránh nhầm với w_or
            if (r.id === "ea_ee" && seenRuleIds.has("ee_double")) return;

            if (r.regex.test(tuLower)) {
                matchedRules.push(r);
                seenRuleIds.add(r.id);
            }
        });

        // Nếu có quy tắc khớp với bảng Sơ đồ đánh vần: hiển thị các nút chuyển sang học quy tắc
        if (matchedRules.length > 0) {
            mmlContainer.style.display = "flex";
            const ruleTitle = document.createElement("div");
            ruleTitle.className = "hd-mml-title rule-title";
            ruleTitle.innerHTML = '<span>🌟</span> Quy tắc đánh vần trong Sơ đồ (bấm vào âm/quy tắc chưa biết đọc để sang luyện, xong quay lại học tiếp):';
            mmlContainer.appendChild(ruleTitle);

            const ruleList = document.createElement("div");
            ruleList.className = "hd-mml-buttons rule-buttons";

            matchedRules.forEach(function (rule) {
                const btnRule = document.createElement("button");
                btnRule.type = "button";
                btnRule.className = "btn-hd-mindmap-sound rule-highlight";
                const icon = rule.icon || "⭐";
                btnRule.innerHTML = icon + ' ' + (rule.label || rule.id) + ' ➔';
                btnRule.title = 'Mở Sơ đồ đánh vần quy tắc: ' + (rule.label || rule.id) + ' (luyện xong quay lại học tiếp)';
                btnRule.onclick = function () {
                    moSoDoLuyenAm(null, rule.id);
                };
                ruleList.appendChild(btnRule);
            });

            mmlContainer.appendChild(ruleList);
        } else {
            mmlContainer.style.display = "none";
        }
    }

    // Chuyển sang Sơ đồ đánh vần để luyện âm chưa biết đọc
    window.moSoDoLuyenAm = function(am, ruleId) {
        dungAudioHuongDan();
        try {
            sessionStorage.setItem("urlQuayLaiHoc", window.location.href);
        } catch (e) {}

        let url = "/so-do-danh-van";
        if (ruleId) {
            url += "?id=" + encodeURIComponent(ruleId);
        } else if (am) {
            url += "?tu=" + encodeURIComponent(am);
        }

        // Mở trong tab mới để không mất tiến trình học hiện tại
        const win = window.open(url, "_blank");
        if (!win || win.closed || typeof win.closed === "undefined") {
            window.location.href = url;
        }
    };

    // =========================================================
    // 6. PHÁT AUDIO (CHUẨN 1.0x HOẶC CHẬM 0.6x)
    // =========================================================
    window.phatAudioHuongDan = function (tocDo, btnEl) {
        if (!duLieuHienTai || !duLieuHienTai.tu) return;
        
        // Dừng tất cả âm thanh đang phát trước đó
        dungAudioHuongDan();

        if (btnEl) btnEl.classList.add("playing");

        phatAudioTu(duLieuHienTai.tu, tocDo, function () {
            if (btnEl) btnEl.classList.remove("playing");
        });
    };

    function phatAudioTu(tu, tocDo, onEnd) {
        const isSlow = tocDo && tocDo < 0.9;
        const rateParam = isSlow ? "-35%" : "+0%";

        if (window.phatAmThanh) {
            window.phatAmThanh(tu, {
                rate: rateParam,
                playbackRate: isSlow ? 0.7 : 1.0,
                onEnd: onEnd,
                onError: onEnd
            });
            return;
        }

        const urlPhat = "/audio/phat?text=" + encodeURIComponent(tu) + "&rate=" + encodeURIComponent(rateParam);
        const audio = new Audio(urlPhat);
        if (isSlow) {
            audio.playbackRate = 0.7;
        }
        hdAudioHienTai = audio;

        audio.onended = function () {
            hdAudioHienTai = null;
            if (onEnd) onEnd();
        };

        audio.onerror = function () {
            hdAudioHienTai = null;
            if (onEnd) onEnd();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(function () {
                hdAudioHienTai = null;
                if (onEnd) onEnd();
            });
        }
    }

    // =========================================================
    // 7. ĐỌC TỪNG ÂM TIẾT CHUẨN XÁC THEO TỪ CHÍNH (NEURAL TTS)
    // =========================================================
    const SYLLABLE_PHONETIC_MAP = {
        "re": "ree",
        "cruit": "croot",
        "ing": "ting",
        "co": "caw",
        "com": "come",
        "con": "kahn",
        "col": "kahl",
        "me": "muh",
        "dy": "dee",
        "ty": "tee",
        "ly": "lee",
        "ny": "nee",
        "ry": "ree",
        "sy": "see",
        "cy": "see",
        "gy": "jee",
        "py": "pee",
        "by": "bee",
        "my": "mee",
        "ky": "kee",
        "vy": "vee",
        "zy": "zee",
        "ti": "tee",
        "ci": "see",
        "di": "dee",
        "ni": "nee",
        "li": "lee",
        "ri": "ree",
        "si": "see",
        "pi": "pee",
        "bi": "bee",
        "mi": "mee",
        "gi": "jee",
        "al": "ull",
        "el": "ell",
        "il": "ill",
        "ol": "ohl",
        "ul": "uhl",
        "le": "ull",
        "ble": "bull",
        "ple": "pull",
        "tle": "tull",
        "dle": "dull",
        "cle": "cull",
        "fle": "full",
        "gle": "gull",
        "tion": "shun",
        "sion": "shun",
        "ture": "chur",
        "ous": "us",
        "ful": "full",
        "ment": "muhnt",
        "dent": "duhnt",
        "tant": "tuhnt",
        "ness": "ness",
        "sage": "sidge",
        "bage": "bidge",
        "tuce": "tiss",
        "for": "fer",
        "por": "pour",
        "ta": "tuh",
        "pa": "puh",
        "ca": "kuh",
        "ba": "buh",
        "ma": "muh",
        "na": "nuh",
        "da": "duh",
        "fa": "fuh",
        "ga": "guh",
        "la": "luh",
        "ra": "ruh",
        "sa": "suh",
        "va": "vuh",
        "ex": "ecks",
        "im": "ihm",
        "in": "inn",
        "un": "unn",
        "dis": "diss",
        "sub": "sub",
        "i": "ih",
        "a": "uh",
        "u": "you",
        "nu": "you",
        "ac": "uh",
        "coun": "count",
        "bil": "bill",
        "sche": "skeh",
        "dule": "jool",
        "sched": "sked",
        "ule": "jool",
        "post": "post",
        "pone": "pown",
        "poned": "pound",
        "can": "can",
        "cel": "sul",
        "celled": "suld",
        "celed": "suld",
        "lay": "lay",
        "layed": "layd",
        "vail": "vale",
        "psy": "sigh",
        "cho": "koh",
        "rhy": "rih",
        "thm": "thum",
        "fri": "frih",
        "chi": "kye",
        "colo": "ker",
        "nel": "nul",
        "wednes": "wenz",
        "scien": "shun",
        "tious": "shus",
        "chie": "chiv",
        "vous": "vus"
    };

    function chuyenAmTietSangPhatAmChuan(syllable, docText) {
        if (docText && docText.trim() !== "" && docText.toLowerCase() !== (syllable || "").toLowerCase()) {
            return docText.trim();
        }
        const s = (syllable || "").toLowerCase().trim();
        if (SYLLABLE_PHONETIC_MAP[s]) {
            return SYLLABLE_PHONETIC_MAP[s];
        }
        if (s.length >= 2 && s.endsWith("y") && s !== "by" && s !== "my") {
            return s.slice(0, -1) + "ee";
        }
        if (s.length >= 2 && s.endsWith("i") && s !== "hi" && s !== "pi") {
            return s.slice(0, -1) + "ee";
        }
        return s;
    }

    function docAmTiet(syllable, docText, onEnd) {
        const toSpeak = chuyenAmTietSangPhatAmChuan(syllable, docText);

        if (window.phatAmThanh) {
            window.phatAmThanh(toSpeak, {
                rate: "-15%",
                onEnd: onEnd,
                onError: onEnd
            });
            return;
        }

        const ttsUrl = "/audio/phat?text=" + encodeURIComponent(toSpeak) + "&rate=-15%";
        const audio = new Audio(ttsUrl);
        hdAudioHienTai = audio;

        audio.onended = function () {
            hdAudioHienTai = null;
            if (onEnd) onEnd();
        };

        audio.onerror = function () {
            hdAudioHienTai = null;
            if (onEnd) onEnd();
        };

        const p = audio.play();
        if (p !== undefined) {
            p.catch(function () {
                hdAudioHienTai = null;
                if (onEnd) onEnd();
            });
        }
    }

    // =========================================================
    // 8. ĐÁNH VẦN TỪNG CHỮ CÁI (SPELLING BẢN XỨ CHUẨN 100%)
    // Dùng bộ 26 file MP3 phát âm chữ cái bản xứ (/audio/alphabet/{a-z}.mp3)
    // =========================================================
    function phatAudioChuCai(char, onEnd) {
        const c = (char || "").toLowerCase();
        if (c >= 'a' && c <= 'z') {
            const audio = new Audio("/audio/alphabet/" + c + ".mp3");
            hdAudioHienTai = audio;
            let done = false;
            function finish() {
                if (done) return;
                done = true;
                hdAudioHienTai = null;
                if (onEnd) onEnd();
            }
            audio.onended = finish;
            audio.onerror = function () {
                phatSpeechChuCai(c, finish);
            };
            const p = audio.play();
            if (p !== undefined) {
                p.catch(function () {
                    phatSpeechChuCai(c, finish);
                });
            }
        } else {
            phatSpeechChuCai(c, onEnd);
        }
    }

    function phatSpeechChuCai(char, onEnd) {
        const text = (char || "").toUpperCase();
        if (window.phatAmThanh) {
            window.phatAmThanh(text, { onEnd: onEnd, onError: onEnd });
        } else {
            const audio = new Audio("/audio/phat?text=" + encodeURIComponent(text) + "&rate=+0%");
            hdAudioHienTai = audio;
            audio.onended = function () { hdAudioHienTai = null; if (onEnd) onEnd(); };
            audio.onerror = function () { hdAudioHienTai = null; if (onEnd) onEnd(); };
            audio.play().catch(function () { hdAudioHienTai = null; if (onEnd) onEnd(); });
        }
    }

    window.danhVanHuongDan = function (btnEl) {
        if (!duLieuHienTai || !duLieuHienTai.tu) return;

        // Dừng tất cả âm thanh trước đó
        dungAudioHuongDan();

        if (btnEl) btnEl.classList.add("playing");

        const letters = duLieuHienTai.tu.replace(/[^a-zA-Z]/g, "").split("");
        if (letters.length === 0) {
            if (btnEl) btnEl.classList.remove("playing");
            return;
        }

        let idx = 0;
        function docChuTiep() {
            if (idx >= letters.length) {
                // Đánh vần xong -> đọc lại cả từ hoàn chỉnh tốc độ chuẩn!
                const t = setTimeout(function () {
                    phatAudioTu(duLieuHienTai.tu, 1.0, function () {
                        if (btnEl) btnEl.classList.remove("playing");
                    });
                }, 400);
                hdTimeoutList.push(t);
                return;
            }
            const char = letters[idx];
            idx++;

            phatAudioChuCai(char, function () {
                const t = setTimeout(docChuTiep, 200);
                hdTimeoutList.push(t);
            });
        }

        docChuTiep();
    };

    // =========================================================
    // 9. ĐỌC TÁCH TỪNG ÂM TIẾT SOUNDWHY & GHÉP CẢ TỪ (PLAY SOUNDS)
    // =========================================================
    window.phatTatCaAmThanhSoundWhy = function (btnEl) {
        if (!duLieuHienTai || !duLieuHienTai.tu) return;

        // Dừng tất cả âm thanh trước đó
        dungAudioHuongDan();

        const btnSw = document.getElementById("btnSwPlaySounds");
        const blendingBtn = document.getElementById("btnBlendingSpeak");
        if (btnEl) btnEl.classList.add("playing");
        if (btnSw) btnSw.classList.add("playing");
        if (blendingBtn) blendingBtn.classList.add("playing");

        const amTietList = duLieuHienTai.amTiet && duLieuHienTai.amTiet.length > 0 
            ? duLieuHienTai.amTiet 
            : [duLieuHienTai.tu];
        const amTietDocList = duLieuHienTai.amTietDoc || [];

        const swCards = document.querySelectorAll(".hd-sw-card");
        const chips = document.querySelectorAll(".hd-syllable-chip");

        let idx = 0;
        function docAmTiep() {
            if (idx >= amTietList.length) {
                // Tắt highlight từng âm
                swCards.forEach(function (c) { c.classList.remove("active-playing"); });
                chips.forEach(function (c) { c.classList.remove("active-playing"); });

                // Bật sáng tất cả các thẻ âm tiết cùng lúc và đọc hoàn chỉnh cả từ!
                swCards.forEach(function (c) { c.classList.add("active-playing", "all-glow"); });

                const t = setTimeout(function () {
                    phatAudioTu(duLieuHienTai.tu, 1.0, function () {
                        swCards.forEach(function (c) { c.classList.remove("active-playing", "all-glow"); });
                        if (btnEl) btnEl.classList.remove("playing");
                        if (btnSw) btnSw.classList.remove("playing");
                        if (blendingBtn) blendingBtn.classList.remove("playing");
                    });
                }, 380);
                hdTimeoutList.push(t);
                return;
            }

            const currentIdx = idx;
            const syllable = amTietList[currentIdx].replace(/\s*\([^)]*\)/g, "").trim();
            const speakText = (amTietDocList[currentIdx]) ? amTietDocList[currentIdx] : syllable;
            idx++;

            // Highlight thẻ SoundWhy đang phát âm
            swCards.forEach(function (c, i) {
                if (i === currentIdx) c.classList.add("active-playing");
                else c.classList.remove("active-playing");
            });
            chips.forEach(function (c, i) {
                if (i === currentIdx) c.classList.add("active-playing");
                else c.classList.remove("active-playing");
            });

            docAmTiet(syllable, speakText, function () {
                const t = setTimeout(docAmTiep, 300);
                hdTimeoutList.push(t);
            });
        }

        docAmTiep();
    };

    window.docTachAmHuongDan = function (btnEl) {
        window.phatTatCaAmThanhSoundWhy(btnEl);
    };

    // =========================================================
    // 10. LUYỆN NÓI / NHẬN DIỆN GIỌNG NÓI (WEB SPEECH API)
    // =========================================================
    window.batDauLuyenDoc = function () {
        const micBtn = document.getElementById("btnMicPractice");
        const micResult = document.getElementById("hdSpeechResult");
        if (!micBtn || !micResult || !duLieuHienTai) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            micResult.innerHTML = '<span style="color: #ea580c;">Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (khuyên dùng Google Chrome).</span>';
            return;
        }

        // Tắt toàn bộ âm thanh khi người dùng chuẩn bị phát âm
        dungAudioHuongDan();

        if (dangThuAm && recognition) {
            recognition.stop();
            return;
        }

        try {
            recognition = new SpeechRec();
            recognition.lang = "en-US";
            recognition.interimResults = false;
            recognition.maxAlternatives = 3;

            recognition.onstart = function () {
                dangThuAm = true;
                micBtn.classList.add("listening");
                micBtn.innerHTML = "🔴 Đang nghe... Hãy nói to!";
                micResult.innerHTML = '<span style="color: #0284c7;">Đang nghe phát âm của bạn...</span>';
            };

            recognition.onresult = function (event) {
                dangThuAm = false;
                micBtn.classList.remove("listening");
                micBtn.innerHTML = "🎙️ Thử lại lần nữa";

                let recognized = "";
                if (event.results && event.results[0] && event.results[0][0]) {
                    recognized = event.results[0][0].transcript.trim().toLowerCase();
                }

                const target = duLieuHienTai.tu.trim().toLowerCase();
                // Bỏ dấu câu nếu có
                const cleanRecognized = recognized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

                if (cleanRecognized.includes(target) || target.includes(cleanRecognized)) {
                    micResult.innerHTML = 
                        '<span style="color: #16a34a; font-weight: 700;">' +
                        '🎉 Xuất sắc! Phát âm chuẩn: "<b>' + recognized + '</b>"' +
                        '</span>';
                } else {
                    micResult.innerHTML = 
                        '<span style="color: #dc2626;">' +
                        'Bạn vừa phát âm: "<b>' + recognized + '</b>". Hãy nghe lại âm chuẩn và thử lại nhé!' +
                        '</span>';
                }
            };

            recognition.onerror = function (e) {
                dangThuAm = false;
                micBtn.classList.remove("listening");
                micBtn.innerHTML = "🎙️ Bấm để thử phát âm";
                if (e.error !== "no-speech") {
                    micResult.innerHTML = '<span style="color: #64748b;">Không nhận được giọng nói. Bấm mic và thử lại nhé!</span>';
                }
            };

            recognition.onend = function () {
                dangThuAm = false;
                micBtn.classList.remove("listening");
                if (micBtn.innerHTML.includes("Đang nghe")) {
                    micBtn.innerHTML = "🎙️ Bấm để thử phát âm";
                }
            };

            recognition.start();
        } catch (err) {
            console.error("[HuongDanDoc] Speech recognition error:", err);
            micBtn.classList.remove("listening");
            micBtn.innerHTML = "🎙️ Bấm để thử phát âm";
        }
    };

    // =========================================================
    // 11. DỮ LIỆU DỰ PHÒNG CHUẨN HÓA TIẾNG VIỆT
    // =========================================================
    function taoDuLieuDuPhong(tu, phienAm, nghia) {
        return {
            tu: tu,
            phienAm: phienAm || "",
            nghia: nghia || "",
            amTiet: [tu],
            amTietIpa: [phienAm || ""],
            amTietBoi: [tu],
            amTietDoc: [tu],
            amNhanIndex: 0,
            phienAmTiengViet: tu,
            trongAm: "Nhấn âm 1",
            khauHinh: "Mở miệng tự nhiên, thả lỏng môi và phát âm rõ âm.",
            amDuoi: "",
            loiThuongGap: "Chú ý đọc trọn vẹn từ và nhấn đúng trọng âm.",
            meoGhiNho: ""
        };
    }

    // =========================================================
    // 12. SỰ KIỆN PHÍM & CLICK NGOÀI MODAL
    // =========================================================
    document.addEventListener("keydown", function (e) {
        const modal = document.getElementById("modalHuongDanDoc");
        if (e.key === "Escape" && modal && modal.classList.contains("show")) {
            dongHuongDanDoc(false);
        }
    });
})();
