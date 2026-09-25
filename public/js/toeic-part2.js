// =========================================================
// XỬ LÝ TRANG LUYỆN NGHE TOEIC PART 2 (ẨN ĐỀ & ẨN ĐÁP ÁN)
// Xáo trộn ngẫu nhiên cả câu hỏi và các lựa chọn A, B, C
// Tải âm thanh chuẩn từ Server (/audio/tts)
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    // --- State ---
    let deGocRaw = []; // Dữ liệu thô ban đầu để xáo trộn mới
    let danhSachCau = [];
    let cauHienTaiIndex = 0;
    let trangThaiCacCau = []; // { selected: null, graded: false, isCorrect: false }
    let audioCache = new Map(); // key: text + "_" + rate, value: blobUrl
    let audioDangPhat = null;
    let dangPhatToanBo = false;
    let yeuCauDungPhat = false;
    let tocDoDoc = "+0%";
    let cheDoHienTai = "GOC"; // "GOC" hoặc "AI"

    // --- Elements ---
    const btnModeGoc = document.getElementById("btnModeGoc");
    const btnModeAi = document.getElementById("btnModeAi");
    const aiConfigBox = document.getElementById("aiConfigBox");
    const selectSoCauAi = document.getElementById("selectSoCauAi");
    const btnTaoDeAi = document.getElementById("btnTaoDeAi");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingTitle = document.getElementById("loadingTitle");
    const loadingDesc = document.getElementById("loadingDesc");

    // Practice Arena Elements
    const badgeCauSo = document.getElementById("badgeCauSo");
    const countDung = document.getElementById("countDung");
    const countSai = document.getElementById("countSai");
    const countConLai = document.getElementById("countConLai");
    const speedGroup = document.getElementById("speedGroup");
    const btnTronCau = document.getElementById("btnTronCau");

    // Audio & Status
    const audioStatusText = document.getElementById("audioStatusText");
    const btnPhatToanBo = document.getElementById("btnPhatToanBo");
    const playIcon = document.getElementById("playIcon");
    const playAllText = document.getElementById("playAllText");
    const btnNgheDe = document.getElementById("btnNgheDe");
    const btnNgheA = document.getElementById("btnNgheA");
    const btnNgheB = document.getElementById("btnNgheB");
    const btnNgheC = document.getElementById("btnNgheC");

    // Question Box
    const questionBox = document.getElementById("questionBox");
    const questionHiddenView = document.getElementById("questionHiddenView");
    const questionRevealedView = document.getElementById("questionRevealedView");
    const revealedQuestionEn = document.getElementById("revealedQuestionEn");
    const revealedQuestionVi = document.getElementById("revealedQuestionVi");

    // Choice Cards
    const cardChoiceA = document.getElementById("cardChoiceA");
    const cardChoiceB = document.getElementById("cardChoiceB");
    const cardChoiceC = document.getElementById("cardChoiceC");
    const choiceCards = [cardChoiceA, cardChoiceB, cardChoiceC];

    const choiceAHidden = document.getElementById("choiceAHidden");
    const choiceARevealed = document.getElementById("choiceARevealed");
    const choiceAEn = document.getElementById("choiceAEn");
    const choiceAVi = document.getElementById("choiceAVi");
    const iconResultA = document.getElementById("iconResultA");

    const choiceBHidden = document.getElementById("choiceBHidden");
    const choiceBRevealed = document.getElementById("choiceBRevealed");
    const choiceBEn = document.getElementById("choiceBEn");
    const choiceBVi = document.getElementById("choiceBVi");
    const iconResultB = document.getElementById("iconResultB");

    const choiceCHidden = document.getElementById("choiceCHidden");
    const choiceCRevealed = document.getElementById("choiceCRevealed");
    const choiceCEn = document.getElementById("choiceCEn");
    const choiceCVi = document.getElementById("choiceCVi");
    const iconResultC = document.getElementById("iconResultC");

    // Action & Tips
    const btnChamDiem = document.getElementById("btnChamDiem");
    const btnLamLaiCau = document.getElementById("btnLamLaiCau");
    const tipsBox = document.getElementById("tipsBox");
    const tipsContent = document.getElementById("tipsContent");

    // Footer Navigation
    const btnCauTruoc = document.getElementById("btnCauTruoc");
    const btnCauTiep = document.getElementById("btnCauTiep");
    const questionPillsBar = document.getElementById("questionPillsBar");

    // Modal
    const modalScoreText = document.getElementById("modalScoreText");
    const modalScorePercent = document.getElementById("modalScorePercent");
    const modalScoreComment = document.getElementById("modalScoreComment");
    const modalScoreDetail = document.getElementById("modalScoreDetail");
    const modalPillsGrid = document.getElementById("modalPillsGrid");
    const btnLamLaiToanBo = document.getElementById("btnLamLaiToanBo");

    // =========================================================
    // HÀM TRỘN NGẪU NHIÊN CẢ CÂU HỎI VÀ CÁC ĐÁP ÁN A, B, C
    // =========================================================
    function tronNgauNhien(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = copy[i];
            copy[i] = copy[j];
            copy[j] = temp;
        }
        return copy;
    }

    function tronDapAnCuaCau(cauGoc) {
        const list = [
            { en: cauGoc.dapAnA, vi: cauGoc.dapAnAVi || "", dung: (cauGoc.dapAnDung === 'A') },
            { en: cauGoc.dapAnB, vi: cauGoc.dapAnBVi || "", dung: (cauGoc.dapAnDung === 'B') },
            { en: cauGoc.dapAnC, vi: cauGoc.dapAnCVi || "", dung: (cauGoc.dapAnDung === 'C') }
        ];

        // Xáo trộn 3 lựa chọn
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }

        let newDapAnDung = 'A';
        if (list[0].dung) newDapAnDung = 'A';
        else if (list[1].dung) newDapAnDung = 'B';
        else if (list[2].dung) newDapAnDung = 'C';

        return {
            ...cauGoc,
            dapAnA: list[0].en,
            dapAnAVi: list[0].vi,
            dapAnB: list[1].en,
            dapAnBVi: list[1].vi,
            dapAnC: list[2].en,
            dapAnCVi: list[2].vi,
            dapAnDung: newDapAnDung
        };
    }

    function xaoTronToanBoDe(danhSach) {
        // 1. Trộn thứ tự các câu hỏi
        const dsTron = tronNgauNhien(danhSach);
        // 2. Trộn luôn cả 3 đáp án A, B, C của từng câu hỏi
        return dsTron.map(cau => tronDapAnCuaCau(cau));
    }

    // =========================================================
    // 1. KHỞI TẠO DỮ LIỆU BAN ĐẦU
    // =========================================================
    khoiTaoUngDung();

    function khoiTaoUngDung() {
        ganSuKien();
        taiDeGoc();
    }

    function ganSuKien() {
        // Chuyển Tab Đề Gốc / AI
        btnModeGoc.addEventListener("click", () => {
            if (cheDoHienTai === "GOC") return;
            cheDoHienTai = "GOC";
            btnModeGoc.classList.add("active");
            btnModeAi.classList.remove("active");
            aiConfigBox.style.display = "none";
            taiDeGoc();
        });

        btnModeAi.addEventListener("click", () => {
            if (cheDoHienTai === "AI") return;
            cheDoHienTai = "AI";
            btnModeAi.classList.add("active");
            btnModeGoc.classList.remove("active");
            aiConfigBox.style.display = "block";
            taoDeBangAi();
        });

        btnTaoDeAi.addEventListener("click", () => {
            taoDeBangAi();
        });

        // Nút Trộn câu & đáp án ngẫu nhiên
        if (btnTronCau) {
            btnTronCau.addEventListener("click", () => {
                if (deGocRaw.length > 0) {
                    dungTatCaAudio();
                    danhSachCau = xaoTronToanBoDe(deGocRaw);
                    khoiTaoDanhSachTrangThai();
                    cauHienTaiIndex = 0;
                    hienThiCauHienTai();
                    setAudioStatus("🔀 Đã xáo trộn ngẫu nhiên cả câu hỏi và các đáp án A, B, C!", "ready");
                }
            });
        }

        // Tốc độ đọc
        document.querySelectorAll(".speed-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                tocDoDoc = this.dataset.rate || "+0%";
            });
        });

        // Audio controls
        btnPhatToanBo.addEventListener("click", () => {
            if (dangPhatToanBo) {
                dungTatCaAudio();
            } else {
                phatToanBoCauHienTai();
            }
        });

        btnNgheDe.addEventListener("click", () => {
            const cau = layCauHienTai();
            if (cau) phatDoanText(cau.cauHoi, "question");
        });

        btnNgheA.addEventListener("click", () => {
            const cau = layCauHienTai();
            if (cau) phatDoanText("(A) " + cau.dapAnA, "A");
        });

        btnNgheB.addEventListener("click", () => {
            const cau = layCauHienTai();
            if (cau) phatDoanText("(B) " + cau.dapAnB, "B");
        });

        btnNgheC.addEventListener("click", () => {
            const cau = layCauHienTai();
            if (cau) phatDoanText("(C) " + cau.dapAnC, "C");
        });

        // Nút nghe riêng trong từng card
        document.querySelectorAll(".btn-listen-single").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const target = btn.dataset.target;
                const cau = layCauHienTai();
                if (!cau) return;
                if (target === "A") phatDoanText("(A) " + cau.dapAnA, "A");
                if (target === "B") phatDoanText("(B) " + cau.dapAnB, "B");
                if (target === "C") phatDoanText("(C) " + cau.dapAnC, "C");
            });
        });

        // Chọn đáp án A, B, C
        choiceCards.forEach(card => {
            card.addEventListener("click", () => {
                const state = layTrangThaiHienTai();
                if (state && state.graded) return;

                const choice = card.dataset.choice;
                chonDapAn(choice);
            });
        });

        // Chấm điểm
        btnChamDiem.addEventListener("click", () => {
            chamDiemCauHienTai();
        });

        // Làm lại câu này
        btnLamLaiCau.addEventListener("click", () => {
            lamLaiCauHienTai();
        });

        // Điều hướng câu
        btnCauTruoc.addEventListener("click", () => {
            if (cauHienTaiIndex > 0) {
                chuyenSangCau(cauHienTaiIndex - 1);
            }
        });

        btnCauTiep.addEventListener("click", () => {
            if (cauHienTaiIndex < danhSachCau.length - 1) {
                chuyenSangCau(cauHienTaiIndex + 1);
            } else {
                const modal = new bootstrap.Modal(document.getElementById("modalTongKet"));
                capNhatModalTongKet();
                modal.show();
            }
        });

        // Làm lại toàn bộ từ đầu (tự động xáo trộn mới)
        btnLamLaiToanBo.addEventListener("click", () => {
            lamLaiToanBo();
            const modalEl = document.getElementById("modalTongKet");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        });

        // Phím tắt bàn phím
        document.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

            const key = e.key.toUpperCase();
            if (key === "A" || key === "1") {
                chonDapAn("A");
            } else if (key === "B" || key === "2") {
                chonDapAn("B");
            } else if (key === "C" || key === "3") {
                chonDapAn("C");
            } else if (key === "ENTER") {
                const state = layTrangThaiHienTai();
                if (state && !state.graded && state.selected) {
                    chamDiemCauHienTai();
                } else if (state && state.graded && cauHienTaiIndex < danhSachCau.length - 1) {
                    chuyenSangCau(cauHienTaiIndex + 1);
                }
            } else if (key === " " && !e.repeat) {
                e.preventDefault();
                btnPhatToanBo.click();
            } else if (e.key === "ArrowLeft") {
                if (cauHienTaiIndex > 0) chuyenSangCau(cauHienTaiIndex - 1);
            } else if (e.key === "ArrowRight") {
                if (cauHienTaiIndex < danhSachCau.length - 1) chuyenSangCau(cauHienTaiIndex + 1);
            }
        });
    }

    // =========================================================
    // 2. TẢI DỮ LIỆU ĐỀ GỐC & TẠO ĐỀ AI (TỰ ĐỘNG XÁO TRỘN RANDOM CẢ ĐÁP ÁN)
    // =========================================================
    function showLoading(title, desc) {
        loadingTitle.textContent = title || "Đang tải dữ liệu...";
        loadingDesc.textContent = desc || "Hệ thống đang chuẩn bị câu hỏi...";
        loadingOverlay.style.display = "flex";
    }

    function hideLoading() {
        loadingOverlay.style.display = "none";
    }

    function taiDeGoc() {
        dungTatCaAudio();
        showLoading("Đang tải đề thi có sẵn...", "Đang nạp 25 câu hỏi từ file Test 1-Toeic-2-Part 2");
        fetch("/api/toeic-part2/de-goc")
            .then(res => {
                if (!res.ok) throw new Error("Lỗi tải đề gốc: " + res.status);
                return res.json();
            })
            .then(data => {
                hideLoading();
                if (Array.isArray(data) && data.length > 0) {
                    deGocRaw = data;
                    // Xáo trộn ngẫu nhiên cả câu hỏi và các đáp án A, B, C
                    danhSachCau = xaoTronToanBoDe(deGocRaw);
                    khoiTaoDanhSachTrangThai();
                    cauHienTaiIndex = 0;
                    hienThiCauHienTai();
                } else {
                    alert("Không tìm thấy câu hỏi nào trong đề có sẵn.");
                }
            })
            .catch(err => {
                hideLoading();
                console.error(err);
                alert("Lỗi kết nối khi tải đề gốc: " + err.message);
            });
    }

    function taoDeBangAi() {
        dungTatCaAudio();
        const soCau = parseInt(selectSoCauAi.value, 10) || 5;
        showLoading("AI Gemini đang tạo đề mới...", `Đang thiết kế bộ ${soCau} câu hỏi TOEIC Part 2 theo format chuẩn ETS...`);
        btnTaoDeAi.disabled = true;

        fetch("/api/toeic-part2/tao-de-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ soCau: soCau })
        })
        .then(res => {
            if (!res.ok) throw new Error("Lỗi tạo đề AI: " + res.status);
            return res.json();
        })
        .then(data => {
            hideLoading();
            btnTaoDeAi.disabled = false;
            if (Array.isArray(data) && data.length > 0) {
                deGocRaw = data;
                // Xáo trộn ngẫu nhiên cả câu hỏi và các đáp án A, B, C
                danhSachCau = xaoTronToanBoDe(deGocRaw);
                khoiTaoDanhSachTrangThai();
                cauHienTaiIndex = 0;
                hienThiCauHienTai();
            } else if (data.error) {
                alert("Lỗi AI: " + data.error);
            } else {
                alert("AI không trả về danh sách câu hỏi hợp lệ. Vui lòng thử lại!");
            }
        })
        .catch(err => {
            hideLoading();
            btnTaoDeAi.disabled = false;
            console.error(err);
            alert("Lỗi khi kết nối với AI Gemini: " + err.message);
        });
    }

    function khoiTaoDanhSachTrangThai() {
        trangThaiCacCau = danhSachCau.map(() => ({
            selected: null,
            graded: false,
            isCorrect: false
        }));
        capNhatScoreboard();
        renderPillsBar();
    }

    function layCauHienTai() {
        return danhSachCau[cauHienTaiIndex] || null;
    }

    function layTrangThaiHienTai() {
        return trangThaiCacCau[cauHienTaiIndex] || null;
    }

    // =========================================================
    // 3. HIỂN THỊ CÂU HỎI & TRẠNG THÁI (ẨN HOẶC MỞ KHÓA)
    // =========================================================
    function hienThiCauHienTai() {
        dungTatCaAudio();
        const cau = layCauHienTai();
        const state = layTrangThaiHienTai();
        if (!cau || !state) return;

        // Cập nhật số thứ tự câu hiển thị từ 1 đến tổng số câu
        const displayNum = cauHienTaiIndex + 1;
        badgeCauSo.textContent = `Câu ${displayNum < 10 ? '0' + displayNum : displayNum} / ${danhSachCau.length}`;

        // Reset highlight audio
        xoaTatCaHighlightAudio();
        capNhatNutPhatToanBo(false);
        setAudioStatus("🎧 Bấm nút 'Phát toàn bộ' để bắt đầu nghe Câu hỏi và các Lựa chọn (A, B, C)", "ready");

        // Điền nội dung văn bản (chuẩn bị sẵn)
        revealedQuestionEn.textContent = cau.cauHoi;
        revealedQuestionVi.textContent = "➔ Dịch nghĩa: " + (cau.cauHoiVi || "");

        choiceAEn.textContent = cau.dapAnA;
        choiceAVi.textContent = cau.dapAnAVi || "";

        choiceBEn.textContent = cau.dapAnB;
        choiceBVi.textContent = cau.dapAnBVi || "";

        choiceCEn.textContent = cau.dapAnC;
        choiceCVi.textContent = cau.dapAnCVi || "";

        // Hiển thị đáp án đúng nổi bật ở đầu mẹo giải
        const dapAnDung = (cau.dapAnDung || "").toUpperCase().trim();
        let noiDungDapAnDung = "";
        if (dapAnDung === 'A') noiDungDapAnDung = `${cau.dapAnA} (${cau.dapAnAVi || ''})`;
        else if (dapAnDung === 'B') noiDungDapAnDung = `${cau.dapAnB} (${cau.dapAnBVi || ''})`;
        else if (dapAnDung === 'C') noiDungDapAnDung = `${cau.dapAnC} (${cau.dapAnCVi || ''})`;

        tipsContent.innerHTML = `
            <div class="mb-2 p-2 rounded-3 bg-white border border-warning-subtle text-dark fw-bold">
                🎯 Đáp án đúng: <span class="badge bg-success fs-6">${dapAnDung}</span> - ${noiDungDapAnDung}
            </div>
            <div>${cau.meo || "Không có mẹo giải cho câu này."}</div>
        `;

        // Xóa class trạng thái cũ trên cards
        choiceCards.forEach(c => {
            c.classList.remove("selected", "result-correct", "result-wrong", "audio-highlight");
        });
        iconResultA.innerHTML = "";
        iconResultB.innerHTML = "";
        iconResultC.innerHTML = "";

        // Kiểm tra xem câu này đã được chấm hay chưa
        if (state.graded) {
            // ĐÃ CHẤM: Hiển thị toàn bộ văn bản đề, đáp án, mẹo giải
            questionHiddenView.style.display = "none";
            questionRevealedView.style.display = "block";
            questionBox.classList.add("revealed");

            choiceAHidden.style.display = "none";
            choiceARevealed.style.display = "block";

            choiceBHidden.style.display = "none";
            choiceBRevealed.style.display = "block";

            choiceCHidden.style.display = "none";
            choiceCRevealed.style.display = "block";

            // Tô màu đáp án đúng và lựa chọn của người dùng
            const selectedCard = document.getElementById("cardChoice" + state.selected);
            const correctCard = document.getElementById("cardChoice" + dapAnDung);

            if (correctCard) {
                correctCard.classList.add("result-correct");
                const iconCorrect = document.getElementById("iconResult" + dapAnDung);
                if (iconCorrect) iconCorrect.innerHTML = '<span class="badge bg-success rounded-pill px-2 py-1">✓ Đáp án đúng</span>';
            }

            if (!state.isCorrect && selectedCard) {
                selectedCard.classList.add("result-wrong");
                const iconWrong = document.getElementById("iconResult" + state.selected);
                if (iconWrong) iconWrong.innerHTML = '<span class="badge bg-danger rounded-pill px-2 py-1">✗ Lựa chọn của bạn</span>';
            }

            tipsBox.style.display = "block";
            btnChamDiem.style.display = "none";
            btnLamLaiCau.style.display = "inline-block";
        } else {
            // CHƯA CHẤM: ẨN ĐỀ VÀ ẨN ĐÁP ÁN
            questionHiddenView.style.display = "block";
            questionRevealedView.style.display = "none";
            questionBox.classList.remove("revealed");

            choiceAHidden.style.display = "block";
            choiceARevealed.style.display = "none";

            choiceBHidden.style.display = "block";
            choiceBRevealed.style.display = "none";

            choiceCHidden.style.display = "block";
            choiceCRevealed.style.display = "none";

            tipsBox.style.display = "none";
            btnChamDiem.style.display = "inline-block";
            btnLamLaiCau.style.display = "none";

            if (state.selected) {
                const card = document.getElementById("cardChoice" + state.selected);
                if (card) card.classList.add("selected");
                btnChamDiem.disabled = false;
            } else {
                btnChamDiem.disabled = true;
            }
        }

        // Cập nhật nút điều hướng
        btnCauTruoc.disabled = (cauHienTaiIndex === 0);
        if (cauHienTaiIndex === danhSachCau.length - 1) {
            btnCauTiep.innerHTML = "Xem bảng điểm 📊";
        } else {
            btnCauTiep.innerHTML = "Câu tiếp ➡️";
        }

        capNhatPillsActive();
    }

    // =========================================================
    // 4. CHỌN ĐÁP ÁN, CHẤM ĐIỂM & LÀM LẠI
    // =========================================================
    function chonDapAn(choice) {
        const state = layTrangThaiHienTai();
        if (!state || state.graded) return;

        state.selected = choice;

        choiceCards.forEach(c => c.classList.remove("selected"));
        const card = document.getElementById("cardChoice" + choice);
        if (card) card.classList.add("selected");

        btnChamDiem.disabled = false;
    }

    function chamDiemCauHienTai() {
        dungTatCaAudio();
        const cau = layCauHienTai();
        const state = layTrangThaiHienTai();
        if (!cau || !state || !state.selected) return;

        state.graded = true;
        const dapAnDung = (cau.dapAnDung || "").toUpperCase().trim();
        state.isCorrect = (state.selected === dapAnDung);

        if (state.isCorrect) {
            setAudioStatus("🎉 Chính xác! Bạn đã chọn đúng đáp án " + dapAnDung, "correct");
        } else {
            setAudioStatus("❌ Tiếc quá, chưa chính xác! Đáp án đúng là " + dapAnDung + ". Hãy xem mẹo giải bên dưới.", "wrong");
        }

        capNhatScoreboard();
        renderPillsBar();
        hienThiCauHienTai();

        setTimeout(() => {
            if (tipsBox) tipsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 150);
    }

    function lamLaiCauHienTai() {
        const state = layTrangThaiHienTai();
        if (!state) return;
        state.selected = null;
        state.graded = false;
        state.isCorrect = false;

        capNhatScoreboard();
        renderPillsBar();
        hienThiCauHienTai();
    }

    function lamLaiToanBo() {
        danhSachCau = xaoTronToanBoDe(deGocRaw.length > 0 ? deGocRaw : danhSachCau);
        khoiTaoDanhSachTrangThai();
        cauHienTaiIndex = 0;
        hienThiCauHienTai();
        setAudioStatus("🔀 Đã làm mới và xáo trộn ngẫu nhiên toàn bộ câu hỏi & đáp án!", "ready");
    }

    function chuyenSangCau(index) {
        if (index < 0 || index >= danhSachCau.length) return;
        cauHienTaiIndex = index;
        hienThiCauHienTai();
    }

    // =========================================================
    // 5. THANH TIẾN TRÌNH PILLS & SCOREBOARD (ĐÁNH SỐ 1 ĐẾN N)
    // =========================================================
    function capNhatScoreboard() {
        let dung = 0, sai = 0, conLai = 0;
        trangThaiCacCau.forEach(st => {
            if (!st.graded) {
                conLai++;
            } else if (st.isCorrect) {
                dung++;
            } else {
                sai++;
            }
        });
        countDung.textContent = dung;
        countSai.textContent = sai;
        countConLai.textContent = conLai;
    }

    function renderPillsBar() {
        questionPillsBar.innerHTML = "";
        danhSachCau.forEach((cau, idx) => {
            const pill = document.createElement("button");
            pill.type = "button";
            const num = idx + 1;
            pill.textContent = num;
            pill.className = "q-pill";
            pill.title = "Đến câu " + num;

            const st = trangThaiCacCau[idx];
            if (st && st.graded) {
                pill.classList.add(st.isCorrect ? "correct" : "wrong");
            }
            if (idx === cauHienTaiIndex) {
                pill.classList.add("active");
            }

            pill.addEventListener("click", () => {
                chuyenSangCau(idx);
            });

            questionPillsBar.appendChild(pill);
        });
    }

    function capNhatPillsActive() {
        const pills = questionPillsBar.querySelectorAll(".q-pill");
        pills.forEach((p, idx) => {
            if (idx === cauHienTaiIndex) {
                p.classList.add("active");
                p.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            } else {
                p.classList.remove("active");
            }
        });
    }

    function capNhatModalTongKet() {
        let dung = 0, sai = 0, tong = danhSachCau.length;
        trangThaiCacCau.forEach(st => {
            if (st.graded && st.isCorrect) dung++;
            else if (st.graded && !st.isCorrect) sai++;
        });

        const percent = tong > 0 ? Math.round((dung / tong) * 100) : 0;
        modalScoreText.textContent = `${dung}/${tong}`;
        modalScorePercent.textContent = `${percent}%`;

        if (percent >= 80) {
            modalScoreComment.textContent = "🌟 Xuất sắc! Phản xạ nghe Part 2 của bạn rất tuyệt vời!";
        } else if (percent >= 60) {
            modalScoreComment.textContent = "👍 Khá tốt! Hãy chú ý các bẫy từ đồng âm và câu trả lời gián tiếp nhé.";
        } else {
            modalScoreComment.textContent = "💪 Cố gắng lên! Hãy đọc kỹ phần Mẹo giải & Bẫy TOEIC để nâng cao phản xạ.";
        }

        modalPillsGrid.innerHTML = "";
        danhSachCau.forEach((cau, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            const num = idx + 1;
            btn.textContent = num;
            btn.className = "q-pill";
            btn.setAttribute("data-bs-dismiss", "modal");

            const st = trangThaiCacCau[idx];
            if (st && st.graded) {
                btn.classList.add(st.isCorrect ? "correct" : "wrong");
            }

            btn.addEventListener("click", () => {
                chuyenSangCau(idx);
            });

            modalPillsGrid.appendChild(btn);
        });
    }

    // =========================================================
    // 6. XỬ LÝ ÂM THANH CHUẨN SERVER (/audio/tts EDGE TTS)
    // =========================================================
    async function layAudioBlobUrlTuServer(text, rate) {
        const cleanText = text.trim();
        const cacheKey = cleanText + "___" + rate;
        if (audioCache.has(cacheKey)) {
            return audioCache.get(cacheKey);
        }

        const response = await fetch("/audio/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText, rate: rate })
        });

        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioCache.set(cacheKey, blobUrl);
        return blobUrl;
    }

    function dungTatCaAudio() {
        yeuCauDungPhat = true;
        dangPhatToanBo = false;
        capNhatNutPhatToanBo(false);

        if (audioDangPhat) {
            audioDangPhat.pause();
            audioDangPhat.currentTime = 0;
            audioDangPhat = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        xoaTatCaHighlightAudio();
    }

    function phatAmThanhTuUrl(url) {
        return new Promise((resolve) => {
            audioDangPhat = new Audio(url);

            audioDangPhat.onended = () => {
                audioDangPhat = null;
                resolve(true);
            };

            audioDangPhat.onerror = (e) => {
                console.warn("Lỗi phát audio blob:", e);
                audioDangPhat = null;
                resolve(false);
            };

            audioDangPhat.play().catch(err => {
                console.warn("Play error:", err);
                resolve(false);
            });
        });
    }

    function phatSpeechSynthesisFallback(text) {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) return resolve(false);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "en-US";
            utterance.rate = (tocDoDoc === "-15%") ? 0.85 : (tocDoDoc === "+15%") ? 1.15 : 1.0;

            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);

            window.speechSynthesis.speak(utterance);
        });
    }

    async function phatDoanText(text, viTriHighlight) {
        dungTatCaAudio();
        yeuCauDungPhat = false;

        highlightAudioPart(viTriHighlight);
        setAudioStatus("🔊 Đang đọc: " + (viTriHighlight === 'question' ? 'Câu hỏi...' : `Đáp án (${viTriHighlight})...`), "playing");

        try {
            const url = await layAudioBlobUrlTuServer(text, tocDoDoc);
            await phatAmThanhTuUrl(url);
        } catch (err) {
            console.warn("Không thể tải TTS từ server, dùng SpeechSynthesis dự phòng:", err.message);
            await phatSpeechSynthesisFallback(text);
        }

        unhighlightAudioPart(viTriHighlight);
        setAudioStatus("🎧 Đã đọc xong. Mời bạn nghe tiếp hoặc chọn đáp án!", "ready");
    }

    async function phatToanBoCauHienTai() {
        const cau = layCauHienTai();
        if (!cau) return;

        dungTatCaAudio();
        dangPhatToanBo = true;
        yeuCauDungPhat = false;
        capNhatNutPhatToanBo(true);

        const sleep = ms => new Promise(r => setTimeout(r, ms));

        try {
            // 1. Đọc Câu hỏi
            if (yeuCauDungPhat) return;
            highlightAudioPart("question");
            setAudioStatus("🔊 Đang đọc Đề bài (Câu hỏi)...", "playing");

            try {
                const urlQ = await layAudioBlobUrlTuServer(cau.cauHoi, tocDoDoc);
                await phatAmThanhTuUrl(urlQ);
            } catch (err) {
                await phatSpeechSynthesisFallback(cau.cauHoi);
            }
            unhighlightAudioPart("question");

            if (yeuCauDungPhat) return;
            await sleep(1000);
            if (yeuCauDungPhat) return;

            // 2. Đọc Đáp án A
            highlightAudioPart("A");
            setAudioStatus("🔊 Đang đọc Lựa chọn (A)...", "playing");

            try {
                const urlA = await layAudioBlobUrlTuServer("(A) " + cau.dapAnA, tocDoDoc);
                await phatAmThanhTuUrl(urlA);
            } catch (err) {
                await phatSpeechSynthesisFallback("(A) " + cau.dapAnA);
            }
            unhighlightAudioPart("A");

            if (yeuCauDungPhat) return;
            await sleep(1000);
            if (yeuCauDungPhat) return;

            // 3. Đọc Đáp án B
            highlightAudioPart("B");
            setAudioStatus("🔊 Đang đọc Lựa chọn (B)...", "playing");

            try {
                const urlB = await layAudioBlobUrlTuServer("(B) " + cau.dapAnB, tocDoDoc);
                await phatAmThanhTuUrl(urlB);
            } catch (err) {
                await phatSpeechSynthesisFallback("(B) " + cau.dapAnB);
            }
            unhighlightAudioPart("B");

            if (yeuCauDungPhat) return;
            await sleep(1000);
            if (yeuCauDungPhat) return;

            // 4. Đọc Đáp án C
            highlightAudioPart("C");
            setAudioStatus("🔊 Đang đọc Lựa chọn (C)...", "playing");

            try {
                const urlC = await layAudioBlobUrlTuServer("(C) " + cau.dapAnC, tocDoDoc);
                await phatAmThanhTuUrl(urlC);
            } catch (err) {
                await phatSpeechSynthesisFallback("(C) " + cau.dapAnC);
            }
            unhighlightAudioPart("C");

            // Đọc xong toàn bộ
            dangPhatToanBo = false;
            capNhatNutPhatToanBo(false);
            setAudioStatus("👉 Đã đọc xong! Mời bạn chọn đáp án (A), (B) hoặc (C) rồi bấm Chấm điểm.", "done");

        } catch (e) {
            console.error("Lỗi trong chuỗi phát toàn bộ:", e);
            dangPhatToanBo = false;
            capNhatNutPhatToanBo(false);
            xoaTatCaHighlightAudio();
        }
    }

    // =========================================================
    // 7. TIỆN ÍCH HIGHLIGHT & STATUS UI
    // =========================================================
    function setAudioStatus(text, type) {
        audioStatusText.textContent = text;
    }

    function capNhatNutPhatToanBo(isPlaying) {
        if (isPlaying) {
            btnPhatToanBo.classList.add("playing");
            playIcon.textContent = "⏸️";
            playAllText.textContent = "Tạm dừng đọc";
        } else {
            btnPhatToanBo.classList.remove("playing");
            playIcon.textContent = "▶️";
            playAllText.textContent = "Phát toàn bộ (Đề ➔ A ➔ B ➔ C)";
        }
    }

    function highlightAudioPart(part) {
        xoaTatCaHighlightAudio();
        if (part === "question") {
            questionBox.classList.add("audio-highlight");
        } else if (part === "A") {
            cardChoiceA.classList.add("audio-highlight");
        } else if (part === "B") {
            cardChoiceB.classList.add("audio-highlight");
        } else if (part === "C") {
            cardChoiceC.classList.add("audio-highlight");
        }
    }

    function unhighlightAudioPart(part) {
        if (part === "question") {
            questionBox.classList.remove("audio-highlight");
        } else if (part === "A") {
            cardChoiceA.classList.remove("audio-highlight");
        } else if (part === "B") {
            cardChoiceB.classList.remove("audio-highlight");
        } else if (part === "C") {
            cardChoiceC.classList.remove("audio-highlight");
        }
    }

    function xoaTatCaHighlightAudio() {
        questionBox.classList.remove("audio-highlight");
        cardChoiceA.classList.remove("audio-highlight");
        cardChoiceB.classList.remove("audio-highlight");
        cardChoiceC.classList.remove("audio-highlight");
    }

});