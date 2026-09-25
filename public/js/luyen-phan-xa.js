/**
 * LOGIC ĐẤU TRƯỜNG PHẢN XẠ NHANH (SPEED REFLEX ARENA)
 * Tối ưu tốc độ nảy số nhận diện nghĩa & hình ảnh dưới 2 giây
 */

(function () {
    // =========================================================
    // 1. STATE TOÀN CỤC
    // =========================================================
    let cauHienTaiIdx = 0;
    let thoiGianGioiHan = 5.0; // Mặc định 5.0 giây (đủ thong thả nhìn ảnh, đọc từ và di chuột)
    let cheDoHienTai = "TOAN_DIEN"; // TOAN_DIEN, DUNG_SAI_ANH_VIET, DUNG_SAI_VIET_ANH, NHIN_TU, NGHIA_SANG_TU, NGHE, HINH_ANH

    let comboStreak = 0;
    let maxCombo = 0;
    let diemSo = 0;

    let thoiGianBatDauCau = 0;
    let timerFrameId = null;
    let dangXuLyDapAn = false;

    let tongThoiGianDung = 0;
    let soCauDung = 0;
    let danhSachTuNghen = []; // Lưu các từ trả lời sai hoặc quá 2 giây

    let audioHienTai = null;
    let dangThiDau = false; // Cờ kiểm soát: chỉ chạy logic trận khi người dùng thực sự đang thi đấu
    let dangTamDung = false; // Cờ tạm dừng khi modal xác nhận dừng trận đang mở
    let thoiGianConLaiKhiPause = 0; // Lưu thời gian còn lại chính xác để phục hồi khi hủy dừng
    let nextQuestionTimeout = null; // Timeout chuyển câu hỏi để có thể dọn dẹp triệt để khi rời trận

    // Dừng sạch sẽ 100% mọi tiến trình, âm thanh, đồng hồ của trận đấu
    function dungToanBoTranDau() {
        dangThiDau = false;
        dangTamDung = false;
        dangXuLyDapAn = false;

        dungDongHo();

        if (nextQuestionTimeout) {
            clearTimeout(nextQuestionTimeout);
            nextQuestionTimeout = null;
        }

        if (audioHienTai) {
            try {
                audioHienTai.pause();
                audioHienTai.currentTime = 0;
            } catch (e) {}
            audioHienTai = null;
        }
    }

    // Nút quay lại trang trước an toàn
    window.quayLaiTrangTruoc = function () {
        dungToanBoTranDau();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "/hoc";
        }
    };

    // =========================================================
    // 2. TẠO ÂM THANH HIỆU ỨNG BẰNG WEB AUDIO API (KHÔNG CẦN FILE MP3 NGOÀI)
    // =========================================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            try {
                audioCtx.resume().catch(function () {});
            } catch (e) {}
        }
        return audioCtx;
    }

    // Âm thanh Ding (khi đúng)
    function playSoundDing(isSuperFast) {
        if (!dangThiDau) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            // Nếu thần tốc < 1.2s -> âm cao trong trẻo hơn
            osc.frequency.setValueAtTime(isSuperFast ? 880 : 660, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(isSuperFast ? 1320 : 990, ctx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
    }

    // Âm thanh Buzz (khi sai / hết giờ)
    // Âm thanh thông báo khi sai hoặc hết giờ: Dùng sóng Sine trầm ấm, dịu tai (không chói gắt, không xì hơi)
    function playSoundBuzz() {
        if (!dangThiDau) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine"; // Sóng hình sin tròn trịa, êm ái
            osc.frequency.setValueAtTime(350, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.22);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.24);
        } catch (e) {}
    }

    // =========================================================
    // 3. KHỞI TẠO VÀ CHỌN CẤU HÌNH
    // =========================================================
    window.chonCheDo = function (cheDo, btnEl) {
        dungToanBoTranDau(); // Dập tắt trận đấu cũ ngay lập tức nếu đang dở dang
        cheDoHienTai = cheDo;
        document.querySelectorAll("#groupCheDo .btn-mode").forEach(function (b) {
            b.classList.remove("active");
        });
        if (btnEl) btnEl.classList.add("active");

        // Bắt đầu ngay chế độ vừa được chọn
        taiDuLieuVaChuanBi(true);
    };

    window.chonTocDo = function (tocDo, btnEl) {
        thoiGianGioiHan = parseFloat(tocDo);
        document.querySelectorAll(".px-speed-group .btn-speed").forEach(function (b) {
            b.classList.remove("active");
        });
        if (btnEl) btnEl.classList.add("active");

        const lblSpeed = document.getElementById("lblTocDoChon");
        if (lblSpeed) {
            lblSpeed.textContent = thoiGianGioiHan.toFixed(1) + " giây";
        }
    };

    window.doiBoTuPhanXa = function () {
        const wasInGame = dangThiDau;
        dungToanBoTranDau(); // Dập tắt trận cũ ngay lập tức
        taiDuLieuVaChuanBi(wasInGame);
    };

    // =========================================================
    // 4. TẢI DỮ LIỆU TỪ SERVER
    // =========================================================
    function taiDuLieuVaChuanBi(autoStart) {
        const selBo = document.getElementById("selBoTu");
        const boVal = selBo ? selBo.value : "";
        let kieuHoc = "THEO_BO";
        let boId = "";

        if (boVal === "TU_SAI") {
            kieuHoc = "TU_SAI";
        } else if (boVal === "NGAU_NHIEN") {
            kieuHoc = "NGAU_NHIEN";
        } else if (boVal === "DANG_HOC") {
            kieuHoc = "DANG_HOC";
        } else if (boVal) {
            boId = boVal;
        }

        const params = new URLSearchParams({
            kieuHoc: kieuHoc,
            cheDo: cheDoHienTai
        });
        if (boId) params.append("boId", boId);

        hienThiLoading(true);

        fetch("/api/luyen-phan-xa/du-lieu?" + params.toString())
            .then(function (res) {
                if (!res.ok) throw new Error("Không thể tải bộ từ");
                return res.json();
            })
            .then(function (data) {
                hienThiLoading(false);
                if (!data || data.length === 0) {
                    alert("Bộ từ này hiện chưa có từ vựng nào để luyện phản xạ!");
                    return;
                }
                danhSachCauHoi = data;
                tienNapAnhTrongBo(danhSachCauHoi);
                if (autoStart) {
                    batDauTranDau();
                } else {
                    quayVeLobby();
                }
            })
            .catch(function (err) {
                hienThiLoading(false);
                console.error("[LuyenPhanXa] Lỗi tải dữ liệu:", err);
                alert("Lỗi khi kết nối dữ liệu: " + err.message);
            });
    }

    function hienThiLoading(isLoading) {
        const elSpin = document.getElementById("arenaLoading");
        const elLobby = document.getElementById("arenaLobby");
        const elStage = document.getElementById("arenaStage");
        const elResult = document.getElementById("arenaResult");

        if (elSpin) elSpin.style.display = isLoading ? "block" : "none";
        if (isLoading) {
            if (elLobby) elLobby.style.display = "none";
            if (elStage) elStage.style.display = "none";
            if (elResult) elResult.style.display = "none";
        }
    }

    function quayVeLobby() {
        dungToanBoTranDau();

        comboStreak = 0;
        diemSo = 0;
        capNhatDiemSo();

        const elLobby = document.getElementById("arenaLobby");
        const elStage = document.getElementById("arenaStage");
        const elResult = document.getElementById("arenaResult");
        const elControls = document.querySelector(".px-controls-card");

        if (elLobby) elLobby.style.display = "block";
        if (elStage) elStage.style.display = "none";
        if (elResult) elResult.style.display = "none";
        if (elControls) elControls.style.display = "block";

        const lblSpeed = document.getElementById("lblTocDoChon");
        if (lblSpeed) lblSpeed.textContent = thoiGianGioiHan.toFixed(1) + " giây";
    }

    // =========================================================
    // 5. BẮT ĐẦU VÒNG ĐẤU PHẢN XẠ
    // =========================================================
    window.batDauTranDau = function () {
        dungToanBoTranDau();

        if (!danhSachCauHoi || danhSachCauHoi.length === 0) {
            taiDuLieuVaChuanBi(true);
            return;
        }

        // Khởi động AudioContext khi người dùng tương tác
        getAudioContext();

        // Bật cờ trận đấu
        dangThiDau = true;

        // Reset trạng thái
        cauHienTaiIdx = 0;
        comboStreak = 0;
        maxCombo = 0;
        diemSo = 0;
        tongThoiGianDung = 0;
        soCauDung = 0;
        danhSachTuNghen = [];

        capNhatDiemSo();

        const elLobby = document.getElementById("arenaLobby");
        const elStage = document.getElementById("arenaStage");
        const elResult = document.getElementById("arenaResult");
        const elControls = document.querySelector(".px-controls-card");

        if (elLobby) elLobby.style.display = "none";
        if (elResult) elResult.style.display = "none";
        if (elControls) elControls.style.display = "none"; // Ẩn khi đang đấu để tập trung tối đa
        if (elStage) elStage.style.display = "flex";

        hienThiCauHoi(0);
    };

    // =========================================================
    // 6. RENDER CÂU HỎI VÀ KÍCH HOẠT ĐỒNG HỒ NĂNG LƯỢNG
    // =========================================================
    function hienThiCauHoi(index) {
        if (!dangThiDau) return;

        if (index >= danhSachCauHoi.length) {
            ketThucTranDau();
            return;
        }

        dangXuLyDapAn = false;
        cauHienTaiIdx = index;
        const q = danhSachCauHoi[index];

        // Ẩn badge phản xạ trước đó
        const badgeSpeed = document.getElementById("pxSpeedBadge");
        if (badgeSpeed) badgeSpeed.style.display = "none";

        // Cập nhật chỉ số câu
        const elIdx = document.getElementById("lblIndexHienTai");
        const elTotal = document.getElementById("lblTongSoCau");
        if (elIdx) elIdx.textContent = (index + 1);
        if (elTotal) elTotal.textContent = danhSachCauHoi.length;

        // Cập nhật nhãn cấp độ thử thách
        const lblLevel = document.getElementById("lblLevelIndicator");
        if (lblLevel) {
            lblLevel.textContent = q.capDo || (cheDoHienTai === "TOAN_DIEN" ? "🌟 Toàn diện (Dễ ➔ Khó)" : "🎯 Đấu trường phản xạ");
        }

        // Các vùng hiển thị câu hỏi & nút bấm
        const boxImg = document.getElementById("boxTargetImage");
        const boxAudio = document.getElementById("boxTargetAudio");
        const boxWord = document.getElementById("boxTargetWord");
        const boxTF = document.getElementById("boxTargetTrueFalse");
        const grid4 = document.getElementById("gridAnswers4");
        const gridTF = document.getElementById("gridAnswersTF");

        if (boxImg) boxImg.style.display = "none";
        if (boxAudio) boxAudio.style.display = "none";
        if (boxWord) boxWord.style.display = "none";
        if (boxTF) boxTF.style.display = "none";

        const isTF = (q.loaiCauHoi === "DUNG_SAI" || q.loaiCauHoi === "DUNG_SAI_ANH_VIET" || q.loaiCauHoi === "DUNG_SAI_VIET_ANH");

        if (isTF) {
            if (grid4) grid4.style.display = "none";
            if (gridTF) gridTF.style.display = "grid";
            if (boxTF) boxTF.style.display = "flex";

            const elLeftBadge = document.getElementById("lblTfLeftBadge");
            const elLeftText = document.getElementById("lblTfLeftText");
            const elLeftIpa = document.getElementById("lblTfLeftIpa");
            const btnAudioLeft = document.getElementById("btnAudioLeft");
            const elConnector = document.getElementById("lblTfConnector");
            const elRightBadge = document.getElementById("lblTfRightBadge");
            const elRightText = document.getElementById("lblTfRightText");
            const btnAudioRight = document.getElementById("btnAudioRight");

            if (q.loaiCauHoi === "DUNG_SAI_VIET_ANH") {
                // Cột trái: Nghĩa tiếng Việt
                if (elLeftBadge) elLeftBadge.textContent = "🇻🇳 NGHĨA TIẾNG VIỆT";
                if (elLeftText) elLeftText.textContent = q.tiengViet;
                if (elLeftIpa) elLeftIpa.textContent = "";
                if (btnAudioLeft) btnAudioLeft.style.display = "none";

                if (elConnector) elConnector.textContent = "tiếng Anh là?";

                // Cột phải: Tiếng Anh
                if (elRightBadge) elRightBadge.textContent = "🇬🇧 TIẾNG ANH";
                if (elRightText) elRightText.textContent = q.luaChon[0] || q.tiengAnh;
                if (btnAudioRight) btnAudioRight.style.display = "inline-flex";

                phatAmThanhTu(q.luaChon[0] || q.tiengAnh);
            } else {
                // Cột trái: Tiếng Anh
                if (elLeftBadge) elLeftBadge.textContent = "🇬🇧 TIẾNG ANH";
                if (elLeftText) elLeftText.textContent = q.tiengAnh;
                if (elLeftIpa) elLeftIpa.textContent = q.phienAm || "";
                if (btnAudioLeft) btnAudioLeft.style.display = "inline-flex";

                if (elConnector) elConnector.textContent = "nghĩa là?";

                // Cột phải: Nghĩa tiếng Việt
                if (elRightBadge) elRightBadge.textContent = "🇻🇳 NGHĨA TIẾNG VIỆT";
                if (elRightText) elRightText.textContent = q.luaChon[0] || q.tiengViet;
                if (btnAudioRight) btnAudioRight.style.display = "none";

                phatAmThanhTu(q.tiengAnh, q.audioUrl);
            }
        } else {
            if (gridTF) gridTF.style.display = "none";
            if (grid4) grid4.style.display = "grid";

            // Render 4 đáp án
            for (let i = 0; i < 4; i++) {
                const btn = document.querySelector(`.btn-answer[data-idx="${i}"]`);
                const txt = document.getElementById(`ansText${i}`);
                if (btn && txt) {
                    btn.className = "btn-answer"; // Xóa class correct/wrong cũ
                    btn.disabled = false;
                    const optText = (q.luaChon && q.luaChon[i]) ? q.luaChon[i] : "";
                    txt.textContent = optText;
                }
            }

            if (q.loaiCauHoi === "HINH_ANH_SANG_TU") {
                if (boxImg) {
                    boxImg.style.display = "flex";
                    loadHinhAnh(q.hinhAnhUrl, q.tiengAnh, q.tiengViet);
                }
                phatAmThanhTu(q.tiengAnh, q.audioUrl);
            } else if (q.loaiCauHoi === "NGHE_SANG_NGHIA") {
                if (boxAudio) {
                    boxAudio.style.display = "flex";
                    phatAmThanhTu(q.tiengAnh, q.audioUrl);
                }
            } else if (q.loaiCauHoi === "NGHIA_SANG_TU") {
                // Hiển thị nghĩa tiếng Việt ➔ Bấm nhanh từ tiếng Anh
                if (boxWord) {
                    boxWord.style.display = "flex";
                    const badge = document.getElementById("lblTargetWordBadge");
                    if (badge) {
                        badge.style.display = "inline-block";
                        badge.textContent = "🇻🇳 NGHĨA TIẾNG VIỆT:";
                    }
                    const elWord = document.getElementById("lblTargetWord");
                    if (elWord) elWord.textContent = q.tiengViet;
                    const elIpa = document.getElementById("lblTargetIpa");
                    if (elIpa) elIpa.textContent = "Chọn từ tiếng Anh đúng bên dưới";
                    const btnAudio = document.getElementById("btnWordAudio");
                    if (btnAudio) btnAudio.style.display = "none";
                }
            } else {
                // TU_SANG_NGHIA: Nhìn từ tiếng Anh ➔ Bấm nhanh nghĩa tiếng Việt
                if (boxWord) {
                    boxWord.style.display = "flex";
                    const badge = document.getElementById("lblTargetWordBadge");
                    if (badge) badge.style.display = "none";
                    const elWord = document.getElementById("lblTargetWord");
                    if (elWord) elWord.textContent = q.tiengAnh;
                    const elIpa = document.getElementById("lblTargetIpa");
                    if (elIpa) elIpa.textContent = q.phienAm || "";
                    const btnAudio = document.getElementById("btnWordAudio");
                    if (btnAudio) btnAudio.style.display = "inline-flex";
                    phatAmThanhTu(q.tiengAnh, q.audioUrl);
                }
            }
        }

        // Bắt đầu đếm ngược năng lượng (Timer bar)
        khoiDongDongHoNangLuong();
    }

    // =========================================================
    // 7. BỘ TẠO THẺ TRỰC QUAN & NẠP ẢNH ĐA TẦNG (ZERO-FAIL)
    // =========================================================
    const imageCache = {}; // Cache URL ảnh

    // Bản đồ phân loại trực quan: Chỉ lấy 1 icon đại diện sạch sẽ (Không chữ thừa, không tag)
    function layKhauHinhTrucQuan(tuAnh, tuViet) {
        const eng = (tuAnh || "").toLowerCase().trim();

        const dict = {
            "company": "🏢", "firm": "🏢", "enterprise": "🏢",
            "interview": "👔", "interviewing": "👔",
            "annual": "📅", "yearly": "📅",
            "benefit": "🎁", "benefits": "🎁",
            "fee": "💳", "fees": "💳", "cost": "💳", "price": "💳",
            "arena": "🏟️", "stadium": "🏟️",
            "human": "👤", "person": "👤", "people": "👥",
            "resources": "📦", "resource": "📦",
            "conference": "👥", "meeting": "🤝",
            "salary": "💰", "wage": "💵", "income": "💰",
            "contract": "📜", "agreement": "📜",
            "schedule": "⏱️", "timetable": "⏱️",
            "employee": "🧑‍💼", "staff": "👥", "worker": "👷",
            "employer": "👔", "boss": "👔", "manager": "📋",
            "customer": "🛍️", "client": "🤝",
            "discount": "🏷️", "sale": "🏷️",
            "invoice": "🧾", "bill": "🧾",
            "report": "📊", "chart": "📊",
            "computer": "💻", "laptop": "💻", "technology": "💻",
            "hotel": "🏨", "flight": "✈️", "airport": "🛫", "travel": "✈️",
            "hospital": "🏥", "doctor": "🩺", "medical": "🏥",
            "restaurant": "🍽️", "food": "🍜",
            "book": "📖", "student": "🎓", "school": "🏫",
            "phone": "📱", "email": "✉️",
            "budget": "🪙", "policy": "⚖️", "deadline": "⏳", "project": "📁"
        };

        if (dict[eng]) return dict[eng];

        const vie = (tuViet || "").toLowerCase().trim();
        if (vie.includes("tiền") || vie.includes("phí") || vie.includes("giá") || vie.includes("lương")) return "💵";
        if (vie.includes("công ty") || vie.includes("doanh nghiệp") || vie.includes("văn phòng")) return "🏢";
        if (vie.includes("thời gian") || vie.includes("ngày") || vie.includes("năm") || vie.includes("lịch")) return "📅";
        if (vie.includes("người") || vie.includes("nhân viên") || vie.includes("khách")) return "👥";
        if (vie.includes("đi") || vie.includes("xe") || vie.includes("bay") || vie.includes("du lịch")) return "✈️";
        if (vie.includes("sân") || vie.includes("đấu") || vie.includes("thể thao")) return "🏟️";
        if (vie.includes("học") || vie.includes("sách") || vie.includes("trường")) return "📚";

        return "💡";
    }

    // Tìm kiếm ảnh qua Wikipedia REST API & Commons (CORS origin=*)
    async function timAnhWikipedia(word) {
        if (!word) return null;
        try {
            // Thử 1: Wikipedia REST summary (< 200ms)
            const r1 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
            if (r1.ok) {
                const d1 = await r1.json();
                if (d1.thumbnail && d1.thumbnail.source) {
                    return d1.thumbnail.source;
                }
            }
        } catch (e) {}

        try {
            // Thử 2: Wikipedia Search Action API (origin=*)
            const r2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(word)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`);
            if (r2.ok) {
                const d2 = await r2.json();
                const pages = d2.query && d2.query.pages;
                if (pages) {
                    for (let k in pages) {
                        if (pages[k].thumbnail && pages[k].thumbnail.source) {
                            return pages[k].thumbnail.source;
                        }
                    }
                }
            }
        } catch (e) {}

        try {
            // Thử 3: Wikimedia Commons
            const r3 = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(word)}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`);
            if (r3.ok) {
                const d3 = await r3.json();
                const pages = d3.query && d3.query.pages;
                if (pages) {
                    for (let k in pages) {
                        const info = pages[k].imageinfo;
                        if (info && info[0] && (info[0].thumburl || info[0].url)) {
                            return info[0].thumburl || info[0].url;
                        }
                    }
                }
            }
        } catch (e) {}

        return null;
    }

    // Nạp trước toàn bộ ảnh trong bộ từ chạy ngầm dưới nền
    function tienNapAnhTrongBo(list) {
        if (!list || !list.length) return;
        list.forEach(function (q, idx) {
            setTimeout(function () {
                const w = (q.tiengAnh || "").trim().toLowerCase();
                if (w && !imageCache[w]) {
                    timAnhWikipedia(w).then(function (url) {
                        if (url) {
                            imageCache[w] = url;
                            const pre = new Image();
                            pre.src = url;
                        }
                    });
                }
            }, idx * 250);
        });
    }

    // Hiển thị trực quan cho câu hỏi (Chỉ 1 ảnh duy nhất hoặc 1 icon duy nhất, sạch sẽ 100%)
    async function loadHinhAnh(urlCoSan, tuAnh, tuViet) {
        const img = document.getElementById("imgTargetVisual");
        const iconEl = document.getElementById("visualIcon3d");
        const overlay = document.getElementById("imgLoadingOverlay");

        // 1. Chỉ hiện 1 icon duy nhất ở giữa khi chưa có ảnh
        if (iconEl) iconEl.textContent = layKhauHinhTrucQuan(tuAnh, tuViet);

        // Ẩn ảnh cũ để không bị giật
        if (img) {
            img.style.display = "none";
            img.style.opacity = "0";
            img.removeAttribute("src");
        }

        // 2. Tìm ảnh thật chất lượng cao từ CDN
        const cleanWord = (tuAnh || "").trim().toLowerCase();
        let finalImageUrl = imageCache[cleanWord] || (urlCoSan && !urlCoSan.includes("pollinations.ai") ? urlCoSan : null);

        if (!finalImageUrl) {
            finalImageUrl = await timAnhWikipedia(cleanWord);
            if (finalImageUrl) {
                imageCache[cleanWord] = finalImageUrl;
            }
        }

        // 3. Phủ ảnh thật lên mượt mà
        if (finalImageUrl && img) {
            if (overlay) overlay.style.display = "flex";

            img.onload = function () {
                if (overlay) overlay.style.display = "none";
                img.style.display = "block";
                requestAnimationFrame(function () {
                    img.style.opacity = "1";
                });
            };

            img.onerror = function () {
                if (overlay) overlay.style.display = "none";
                img.style.display = "none";
            };

            img.src = finalImageUrl;
        } else {
            if (overlay) overlay.style.display = "none";
        }
    }

    // =========================================================
    // 8. ĐỒNG HỒ NĂNG LƯỢNG ĐẾM NGƯỢC (SMOOTH TIMER)
    // =========================================================
    function khoiDongDongHoNangLuong(isResume) {
        if (!dangThiDau || dangTamDung) return;

        if (timerFrameId) {
            cancelAnimationFrame(timerFrameId);
            timerFrameId = null;
        }

        const bar = document.getElementById("energyTimerBar");
        const lblMs = document.getElementById("lblDongHoMs");
        const durationMs = thoiGianGioiHan * 1000;
        if (!isResume) {
            thoiGianBatDauCau = performance.now();
        }

        function capNhatFrame(now) {
            if (!dangThiDau || dangTamDung) {
                timerFrameId = null;
                return;
            }

            const elapsed = now - thoiGianBatDauCau;
            const remaining = Math.max(0, durationMs - elapsed);
            const percent = (remaining / durationMs) * 100;

            if (bar) {
                bar.style.width = percent + "%";
            }
            if (lblMs) {
                lblMs.textContent = (remaining / 1000).toFixed(1) + "s";
            }

            if (remaining <= 0) {
                // Hết giờ -> Tự động tính là phản xạ chậm / sai
                timerFrameId = null;
                xuLyHetGio();
            } else {
                timerFrameId = requestAnimationFrame(capNhatFrame);
            }
        }

        timerFrameId = requestAnimationFrame(capNhatFrame);
    }

    function dungDongHo() {
        if (timerFrameId) {
            cancelAnimationFrame(timerFrameId);
            timerFrameId = null;
        }
    }

    // =========================================================
    // XÁC NHẬN DỪNG TRẬN ĐẤU AN TOÀN (TRÁNH BẤM NHẦM)
    // =========================================================
    window.yeuCauDungTran = function () {
        if (!dangThiDau) {
            quayVeLobby();
            return;
        }

        // Tạm dừng trận đấu
        dangTamDung = true;

        // Lưu lại chính xác số mili-giây còn lại tại thời điểm bấm Dừng
        const durationMs = thoiGianGioiHan * 1000;
        const elapsed = performance.now() - thoiGianBatDauCau;
        thoiGianConLaiKhiPause = Math.max(100, durationMs - elapsed);

        // Đóng băng đồng hồ
        dungDongHo();

        // Tạm dừng âm thanh nếu đang phát
        if (audioHienTai) {
            try { audioHienTai.pause(); } catch (e) {}
        }

        // Hiển thị modal xác nhận
        const modal = document.getElementById("modalConfirmStop");
        if (modal) modal.style.display = "flex";
    };

    window.huyDungTran = function () {
        dangTamDung = false;
        const modal = document.getElementById("modalConfirmStop");
        if (modal) modal.style.display = "none";

        // Khôi phục đồng hồ và âm thanh để người học tiếp tục chơi
        if (dangThiDau) {
            const durationMs = thoiGianGioiHan * 1000;
            thoiGianBatDauCau = performance.now() - (durationMs - thoiGianConLaiKhiPause);
            khoiDongDongHoNangLuong(true);

            if (audioHienTai && audioHienTai.paused) {
                try { audioHienTai.play().catch(function () {}); } catch (e) {}
            }
        }
    };

    window.dongYDungTran = function () {
        dangTamDung = false;
        const modal = document.getElementById("modalConfirmStop");
        if (modal) modal.style.display = "none";
        quayVeLobby();
    };

    // =========================================================
    // 9. XỬ LÝ CHỌN ĐÁP ÁN
    // =========================================================
    window.chonDapAn = function (selectedIdx) {
        if (!dangThiDau || dangTamDung || dangXuLyDapAn || cauHienTaiIdx >= danhSachCauHoi.length) return;
        dangXuLyDapAn = true;
        dungDongHo();

        const latencyMs = Math.round(performance.now() - thoiGianBatDauCau);
        const q = danhSachCauHoi[cauHienTaiIdx];
        const selectedText = (q.luaChon && q.luaChon[selectedIdx]) ? q.luaChon[selectedIdx] : "";
        const isCorrect = selectedText.trim().toLowerCase() === q.dapAnDung.trim().toLowerCase();

        const selectedBtn = document.querySelector(`.btn-answer[data-idx="${selectedIdx}"]`);

        // Tìm nút đáp án đúng thực tế để highlight
        let correctBtn = null;
        for (let i = 0; i < 4; i++) {
            const btn = document.querySelector(`.btn-answer[data-idx="${i}"]`);
            const txt = document.getElementById(`ansText${i}`);
            if (txt && txt.textContent.trim().toLowerCase() === q.dapAnDung.trim().toLowerCase()) {
                correctBtn = btn;
                break;
            }
        }

        xuLyKetQuaTraLoi(isCorrect, latencyMs, q, selectedBtn, correctBtn);
    };

    window.chonDapAnTF = function (userChonDung) {
        if (!dangThiDau || dangTamDung || dangXuLyDapAn || cauHienTaiIdx >= danhSachCauHoi.length) return;
        dangXuLyDapAn = true;
        dungDongHo();

        const latencyMs = Math.round(performance.now() - thoiGianBatDauCau);
        const q = danhSachCauHoi[cauHienTaiIdx];
        const isCorrect = (userChonDung === q.cauDungSaiLaDung);

        const btnTrue = document.querySelector(".btn-tf-true");
        const btnFalse = document.querySelector(".btn-tf-false");
        const clickedBtn = userChonDung ? btnTrue : btnFalse;
        const correctBtn = q.cauDungSaiLaDung ? btnTrue : btnFalse;

        xuLyKetQuaTraLoi(isCorrect, latencyMs, q, clickedBtn, correctBtn);
    };

    function xuLyHetGio() {
        if (!dangThiDau || dangXuLyDapAn || cauHienTaiIdx >= danhSachCauHoi.length) return;
        dangXuLyDapAn = true;

        const latencyMs = Math.round(thoiGianGioiHan * 1000);
        const q = danhSachCauHoi[cauHienTaiIdx];

        // Tìm nút đáp án đúng để hiện cho người học biết
        let correctBtn = null;
        const isTF = (q.loaiCauHoi === "DUNG_SAI" || q.loaiCauHoi === "DUNG_SAI_ANH_VIET" || q.loaiCauHoi === "DUNG_SAI_VIET_ANH");
        if (isTF) {
            correctBtn = q.cauDungSaiLaDung ? document.querySelector(".btn-tf-true") : document.querySelector(".btn-tf-false");
        } else {
            for (let i = 0; i < 4; i++) {
                const btn = document.querySelector(`.btn-answer[data-idx="${i}"]`);
                const txt = document.getElementById(`ansText${i}`);
                if (txt && txt.textContent.trim().toLowerCase() === q.dapAnDung.trim().toLowerCase()) {
                    correctBtn = btn;
                    break;
                }
            }
        }

        hienThiFeedback(false, latencyMs, true);
        playSoundBuzz();

        if (correctBtn) correctBtn.classList.add("correct");

        // Ghi nhận là từ bị nghẽn
        danhSachTuNghen.push({
            tu: q.tiengAnh,
            nghia: q.tiengViet,
            phienAm: q.phienAm,
            latency: latencyMs,
            lyDo: "Hết thời gian"
        });

        comboStreak = 0;
        capNhatDiemSo();

        guiKetQuaVeServer(q.id, false);

        if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
        nextQuestionTimeout = setTimeout(function () {
            if (dangThiDau) {
                hienThiCauHoi(cauHienTaiIdx + 1);
            }
        }, 900);
    }

    function xuLyKetQuaTraLoi(isCorrect, latencyMs, q, clickedBtn, correctBtn) {
        if (!dangThiDau) return;

        if (isCorrect) {
            if (clickedBtn) clickedBtn.classList.add("correct");

            soCauDung++;
            tongThoiGianDung += latencyMs;
            comboStreak++;
            if (comboStreak > maxCombo) maxCombo = comboStreak;

            const isSuperFast = latencyMs < 1200;
            const points = isSuperFast ? (150 + comboStreak * 15) : (100 + comboStreak * 10);
            diemSo += points;

            hienThiFeedback(true, latencyMs, false);
            playSoundDing(isSuperFast);

            // Nếu phản xạ quá chậm (> 2.0s) dù đúng thì vẫn đưa vào danh sách cần cải thiện
            if (latencyMs > 2000) {
                danhSachTuNghen.push({
                    tu: q.tiengAnh,
                    nghia: q.tiengViet,
                    phienAm: q.phienAm,
                    latency: latencyMs,
                    lyDo: "Nảy số còn chậm (> 2s)"
                });
            }

            guiKetQuaVeServer(q.id, true);
        } else {
            if (clickedBtn) clickedBtn.classList.add("wrong");
            if (correctBtn) correctBtn.classList.add("correct");

            comboStreak = 0;
            hienThiFeedback(false, latencyMs, false);
            playSoundBuzz();

            danhSachTuNghen.push({
                tu: q.tiengAnh,
                nghia: q.tiengViet,
                phienAm: q.phienAm,
                latency: latencyMs,
                lyDo: "Chọn chưa đúng"
            });

            guiKetQuaVeServer(q.id, false);
        }

        capNhatDiemSo();

        // Chờ 800ms để người học nhìn nhận đáp án rồi tự động chuyển câu tiếp
        if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
        nextQuestionTimeout = setTimeout(function () {
            if (dangThiDau) {
                hienThiCauHoi(cauHienTaiIdx + 1);
            }
        }, 800);
    }

    function hienThiFeedback(isCorrect, latencyMs, isTimeout) {
        const badge = document.getElementById("pxSpeedBadge");
        if (!badge) return;

        badge.style.display = "block";
        const sec = (latencyMs / 1000).toFixed(1);

        if (isTimeout) {
            badge.className = "px-speed-feedback slow";
            badge.textContent = `⚠️ HẾT GIỜ! (${sec}s) - Hãy quyết đoán hơn!`;
        } else if (isCorrect) {
            if (latencyMs < 1200) {
                badge.className = "px-speed-feedback";
                badge.textContent = `⚡ ${sec}s - PHẢN XẠ THẦN TỐC!`;
            } else if (latencyMs < 2000) {
                badge.className = "px-speed-feedback fast";
                badge.textContent = `🔥 ${sec}s - TỐC ĐỘ TỐT!`;
            } else {
                badge.className = "px-speed-feedback slow";
                badge.textContent = `⏳ ${sec}s - HƠI CHẬM! Cố gắng nảy số nhanh hơn!`;
            }
        } else {
            badge.className = "px-speed-feedback slow";
            badge.textContent = `❌ ${sec}s - CHƯA CHÍNH XÁC!`;
        }
    }

    function capNhatDiemSo() {
        const elCombo = document.getElementById("txtComboStreak");
        const elDiem = document.getElementById("txtDiemSo");
        if (elCombo) elCombo.textContent = comboStreak;
        if (elDiem) elDiem.textContent = diemSo;
    }

    function guiKetQuaVeServer(tuId, isCorrect) {
        try {
            const formData = new FormData();
            formData.append("tuId", tuId);
            formData.append("chinhXac", isCorrect);
            fetch("/api/luyen-phan-xa/ghi-nhan", {
                method: "POST",
                body: formData
            }).catch(function () {});
        } catch (e) {}
    }

    // =========================================================
    // 10. PHÁT AUDIO TỰ ĐỘNG
    // =========================================================
    function phatAmThanhTu(tu, audioUrl) {
        if (!dangThiDau) return;

        if (window.phatAmThanh) {
            window.phatAmThanh(tu, { rate: "+0%" });
            return;
        }

        if (audioHienTai) {
            try { audioHienTai.pause(); audioHienTai.currentTime = 0; } catch (e) {}
            audioHienTai = null;
        }

        const url = audioUrl || ("/audio/phat?text=" + encodeURIComponent(tu) + "&rate=+0%");
        const audio = new Audio(url);
        audioHienTai = audio;
        audio.play().catch(function () {});
    }

    window.phatLaiAudio = function () {
        if (dangThiDau && cauHienTaiIdx < danhSachCauHoi.length) {
            const q = danhSachCauHoi[cauHienTaiIdx];
            phatAmThanhTu(q.tiengAnh, q.audioUrl);
        }
    };

    // =========================================================
    // 11. KẾT THÚC TRẬN ĐẤU & TỔNG KẾT
    // =========================================================
    function ketThucTranDau() {
        dungToanBoTranDau();

        const elStage = document.getElementById("arenaStage");
        const elResult = document.getElementById("arenaResult");
        const elControls = document.querySelector(".px-controls-card");

        if (elStage) elStage.style.display = "none";
        if (elResult) elResult.style.display = "block";
        if (elControls) elControls.style.display = "block";

        // Tính tốc độ trung bình
        const avgSpeedSec = soCauDung > 0 ? ((tongThoiGianDung / soCauDung) / 1000).toFixed(1) : "0.0";
        const totalQ = danhSachCauHoi.length;
        const accuracyPct = totalQ > 0 ? Math.round((soCauDung / totalQ) * 100) : 0;

        document.getElementById("resAvgSpeed").textContent = avgSpeedSec + "s";
        document.getElementById("resAccuracy").textContent = accuracyPct + "%";
        document.getElementById("resMaxCombo").textContent = maxCombo;

        // Render danh sách từ bị nghẽn
        const boxSlow = document.getElementById("boxSlowWords");
        const tbodySlow = document.getElementById("tbodySlowWords");
        const btnRetry = document.getElementById("btnRetrySlow");

        if (danhSachTuNghen.length > 0) {
            if (boxSlow) boxSlow.style.display = "block";
            if (btnRetry) btnRetry.style.display = "inline-flex";

            if (tbodySlow) {
                tbodySlow.innerHTML = "";
                // Khử trùng lặp từ bị nghẽn
                const mapUnique = new Map();
                danhSachTuNghen.forEach(function (item) {
                    if (!mapUnique.has(item.tu)) mapUnique.set(item.tu, item);
                });

                mapUnique.forEach(function (item) {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td class="fw-bold text-primary">${item.tu} <small class="text-muted">${item.phienAm || ''}</small></td>
                        <td>${item.nghia}</td>
                        <td class="text-danger fw-bold">${(item.latency / 1000).toFixed(1)}s <small>(${item.lyDo})</small></td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="phatAudioWord('${item.tu}')">🔊</button>
                        </td>
                    `;
                    tbodySlow.appendChild(tr);
                });
            }
        } else {
            if (boxSlow) boxSlow.style.display = "none";
            if (btnRetry) btnRetry.style.display = "none";
        }
    }

    window.phatAudioWord = function (tu) {
        const audio = new Audio("/audio/tts?text=" + encodeURIComponent(tu) + "&rate=+0%");
        audio.play().catch(function () {});
    };

    // Luyện lại riêng những từ bị nghẽn
    window.luyenLaiTuNghen = function () {
        if (danhSachTuNghen.length === 0) return;

        // Lọc danh sách câu hỏi chỉ giữ lại các từ bị nghẽn
        const tuNghenSet = new Set(danhSachTuNghen.map(function (item) { return item.tu.toLowerCase(); }));
        danhSachCauHoi = danhSachCauHoi.filter(function (q) {
            return tuNghenSet.has(q.tiengAnh.toLowerCase());
        });

        batDauTranDau();
    };

    // =========================================================
    // 12. PHÍM TẮT BÀN PHÍM (KEYBOARD SHORTCUTS)
    // =========================================================
    document.addEventListener("keydown", function (e) {
        // Nếu đang ở ô input nào đó thì không bắt phím tắt
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

        // Nếu modal xác nhận dừng trận đang mở: Escape = Hủy dừng (tiếp tục), Enter = Đồng ý dừng
        if (dangTamDung) {
            if (e.key === "Escape") {
                e.preventDefault();
                huyDungTran();
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                dongYDungTran();
                return;
            }
            return;
        }

        // Space: Bắt đầu ván mới hoặc Nghe lại
        if (e.code === "Space") {
            const elLobby = document.getElementById("arenaLobby");
            if (elLobby && elLobby.style.display !== "none") {
                e.preventDefault();
                batDauTranDau();
                return;
            }
            const elStage = document.getElementById("arenaStage");
            if (elStage && elStage.style.display !== "none") {
                e.preventDefault();
                phatLaiAudio();
                return;
            }
        }

        // Nếu đang trong trận đấu
        const elStage = document.getElementById("arenaStage");
        if (!dangThiDau || !elStage || elStage.style.display === "none") return;

        const q = (danhSachCauHoi && cauHienTaiIdx < danhSachCauHoi.length) ? danhSachCauHoi[cauHienTaiIdx] : null;
        const isTF = q && (q.loaiCauHoi === "DUNG_SAI" || q.loaiCauHoi === "DUNG_SAI_ANH_VIET" || q.loaiCauHoi === "DUNG_SAI_VIET_ANH");

        if (isTF) {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                chonDapAnTF(false);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                chonDapAnTF(true);
            }
        } else {
            // Phím 1, 2, 3, 4
            if (e.key === "1") {
                e.preventDefault();
                chonDapAn(0);
            } else if (e.key === "2") {
                e.preventDefault();
                chonDapAn(1);
            } else if (e.key === "3") {
                e.preventDefault();
                chonDapAn(2);
            } else if (e.key === "4") {
                e.preventDefault();
                chonDapAn(3);
            }
        }
    });

    // Tự động tải dữ liệu ban đầu khi mở trang và BẮT ĐẦU LUÔN!
    document.addEventListener("DOMContentLoaded", function () {
        taiDuLieuVaChuanBi(true);
    });

})();
