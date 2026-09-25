/**
 * SƠ ĐỒ TƯ DUY QUY LUẬT ĐÁNH VẦN TIẾNG ANH (PHONICS MINDMAP)
 * Tự động tính toán tọa độ tỏa tròn, vẽ đường cong mũi tên SVG
 * Hỗ trợ tự đọc khi di chuột (Hover-to-read) & Icon hướng dẫn phát âm chi tiết
 */

(function () {
    // State toàn cục
    let dsQuyLuat = window.SERVER_DATA_DS_QUY_LUAT || [];
    let quyLuatHienTai = window.SERVER_DATA_QUY_LUAT_HIEN_TAI || null;
    let currentCategoryKey = window.SERVER_DATA_CAT_HIEN_TAI || "NGUYEN_AM_DAC_BIET";
    let danhSachAmNhomHienTai = [];
    let currentView = "CATEGORY_HUB"; // "CATEGORY_HUB" | "SOUND_LIST" | "MINDMAP"
    let audioHienTai = null;
    let hoverTimeout = null;
    let autoPlayTimer = null;
    let dangAutoPlay = false;
    let cheDoViewGrid = false;

    // Metadata 6 nhóm quy luật đánh vần chuẩn
    const CATEGORY_META = {
        "NGUYEN_AM_DAC_BIET": {
            key: "NGUYEN_AM_DAC_BIET",
            name: "Nguyên âm đặc biệt & Biến âm R",
            icon: "🌟",
            color: "#f59e0b",
            bgLight: "#fef3c7",
            badgeBg: "#fef3c7",
            desc: "Các quy tắc biến âm khi nguyên âm đi liền với r, w hoặc phụ âm đặc biệt (w+or, ar, or, er/ir/ur, al/all, wa/qua)."
        },
        "DUOI_TU_HAU_TO": {
            key: "DUOI_TU_HAU_TO",
            name: "Đuôi từ & Hậu tố thông dụng",
            icon: "🏷️",
            color: "#3b82f6",
            bgLight: "#eff6ff",
            badgeBg: "#dbeafe",
            desc: "Các quy tắc phát âm chuẩn xác cho các đuôi hậu tố như -ise/-ize, -tion, -sion, -ture, -cial/-tial."
        },
        "NGUYEN_AM_DOI": {
            key: "NGUYEN_AM_DOI",
            name: "Nguyên âm đôi & Nguyên âm dài",
            icon: "🔤",
            color: "#10b981",
            bgLight: "#ecfdf5",
            badgeBg: "#d1fae5",
            desc: "Tổng hợp các cặp nguyên âm đôi và nguyên âm dài phổ biến nhất như ea, ee, oo, oa, igh, oy/oi, aw/au."
        },
        "PHU_AM_KEP_CAM": {
            key: "PHU_AM_KEP_CAM",
            name: "Phụ âm kép & Phụ âm câm",
            icon: "🤫",
            color: "#8b5cf6",
            bgLight: "#f5f3ff",
            badgeBg: "#ede9fe",
            desc: "Cách đọc các cặp phụ âm ch, sh, th vô thanh, th hữu thanh, ph, và các phụ âm câm kn-, wr-, wh-, -mb."
        },
        "BIEN_AM_C_G": {
            key: "BIEN_AM_C_G",
            name: "Quy tắc biến âm C & G (Mềm / Cứng)",
            icon: "🔀",
            color: "#ec4899",
            bgLight: "#fdf2f8",
            badgeBg: "#fce7f3",
            desc: "Quy luật biến âm sống còn khi chữ C và G đứng trước e, i, y (Soft C /s/ & Soft G /dʒ/)."
        },
        "ALL": {
            key: "ALL",
            name: "Tất cả quy tắc đánh vần",
            icon: "📚",
            color: "#6366f1",
            bgLight: "#eef2ff",
            badgeBg: "#e0e7ff",
            desc: "Kho lưu trữ đầy đủ toàn bộ 30+ quy luật đánh vần tiếng Anh từ cơ bản đến nâng cao."
        }
    };

    // =========================================================
    // 1. QUẢN LÝ ÂM THANH DUY NHẤT (AUDIO CONTROLLER)
    // =========================================================
    function dungAudio() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        if (autoPlayTimer) {
            clearTimeout(autoPlayTimer);
            autoPlayTimer = null;
        }
        if (audioHienTai) {
            try {
                audioHienTai.pause();
                audioHienTai.currentTime = 0;
            } catch (e) {}
            audioHienTai = null;
        }
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        document.querySelectorAll(".sd-word-card.playing").forEach(function (c) {
            c.classList.remove("playing");
        });
    }

    function phatAmThanh(vanBan, audioUrl, callback) {
        dungAudio();
        if (!vanBan && !audioUrl) return;

        // ƯU TIÊN 1: Phát trực tiếp file âm thanh tĩnh chuẩn (ví dụ: /audio/ipa/dzh.mp3)
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audioHienTai = audio;
            audio.onended = function () {
                audioHienTai = null;
                if (typeof callback === "function") callback();
            };
            audio.onerror = function () {
                audioHienTai = null;
                if (typeof callback === "function") callback();
            };
            audio.play().catch(function () {
                audioHienTai = null;
                if (typeof callback === "function") callback();
            });
            return;
        }

        if (window.phatAmThanh && vanBan) {
            window.phatAmThanh(vanBan, {
                rate: "+0%",
                onEnd: callback,
                onError: callback
            });
            return;
        }

        const url = audioUrl || ("/audio/phat?text=" + encodeURIComponent(vanBan) + "&rate=+0%");
        const audio = new Audio(url);
        audioHienTai = audio;

        audio.onended = function () {
            audioHienTai = null;
            if (typeof callback === "function") callback();
        };

        audio.onerror = function () {
            audioHienTai = null;
            if (typeof callback === "function") callback();
        };

        audio.play().catch(function () {
            audioHienTai = null;
            if (typeof callback === "function") callback();
        });
    }

    // =========================================================
    // 2. ĐIỀU HƯỚNG 3 CẤP MÀN HÌNH (LEVEL 1 -> LEVEL 2 -> LEVEL 3)
    // =========================================================
    function chuyenManHinh(viewName) {
        currentView = viewName;
        const vHub = document.getElementById("viewCategoryHub");
        const vList = document.getElementById("viewSoundListArena");
        const vMindmap = document.getElementById("viewMindmapArena");

        if (vHub) vHub.style.display = (viewName === "CATEGORY_HUB") ? "block" : "none";
        if (vList) vList.style.display = (viewName === "SOUND_LIST") ? "block" : "none";
        if (vMindmap) vMindmap.style.display = (viewName === "MINDMAP") ? "block" : "none";

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.quayLaiBangDanhMuc = function () {
        dungAudio();
        chuyenManHinh("CATEGORY_HUB");
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, "", "/quy-luat-danh-van/so-do");
        }
    };

    window.quayLaiDanhSachAm = function () {
        dungAudio();
        chuyenManHinh("SOUND_LIST");
        if (window.history && window.history.replaceState && currentCategoryKey) {
            window.history.replaceState({}, "", "/quy-luat-danh-van/so-do?cat=" + encodeURIComponent(currentCategoryKey));
        }
    };

    window.chonNhomTuBangNgoai = function (catKey) {
        currentCategoryKey = catKey;
        hienThiDanhSachAmTheoNhom(catKey);
        chuyenManHinh("SOUND_LIST");
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, "", "/quy-luat-danh-van/so-do?cat=" + encodeURIComponent(catKey));
        }
    };

    window.moSoDoTuDanhSach = function (ruleId) {
        chuyenManHinh("MINDMAP");
        taiQuyLuat(ruleId);
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, "", "/quy-luat-danh-van/so-do?id=" + encodeURIComponent(ruleId));
        }
    };

    window.chuyenAmKeTiep = function (step) {
        if (!quyLuatHienTai || !danhSachAmNhomHienTai || danhSachAmNhomHienTai.length === 0) return;
        const currIdx = danhSachAmNhomHienTai.findIndex(function (r) { return r.id === quyLuatHienTai.id; });
        if (currIdx === -1) return;
        const nextIdx = currIdx + step;
        if (nextIdx >= 0 && nextIdx < danhSachAmNhomHienTai.length) {
            taiQuyLuat(danhSachAmNhomHienTai[nextIdx].id);
        }
    };

    window.moHuongDanAmTheoQuyTac = function (ruleId) {
        const found = dsQuyLuat.find(function (r) { return r.id === ruleId; });
        if (found) {
            quyLuatHienTai = found;
            moHuongDanAmTrungTam();
        } else {
            taiQuyLuat(ruleId);
        }
    };

    // =========================================================
    // 3. RENDER BẢNG DANH MỤC Ở NGOÀI (LEVEL 1 - CATEGORY HUB)
    // =========================================================
    function renderCategoryHub() {
        const grid = document.getElementById("categoryGrid");
        if (!grid) return;
        grid.innerHTML = "";

        Object.keys(CATEGORY_META).forEach(function (key) {
            const cat = CATEGORY_META[key];
            const matchingRules = (key === "ALL")
                ? dsQuyLuat
                : dsQuyLuat.filter(function (r) { return r.phanLoai === key; });

            const count = matchingRules.length;
            const previewRules = matchingRules.slice(0, 5);

            const card = document.createElement("div");
            card.className = "sd-cat-card";
            card.style.setProperty("--cat-accent", cat.color);
            card.style.setProperty("--cat-bg-light", cat.bgLight);
            card.style.setProperty("--cat-badge-bg", cat.badgeBg);
            card.onclick = function () {
                chonNhomTuBangNgoai(key);
            };

            let previewHtml = previewRules.map(function (r) {
                return `<span class="sd-cat-preview-pill"><strong>${r.cumChu}</strong> <small>(${r.docLaIpa})</small></span>`;
            }).join("");

            if (matchingRules.length > 5) {
                previewHtml += `<span class="sd-cat-preview-pill text-muted">+${matchingRules.length - 5} nữa...</span>`;
            }

            card.innerHTML = `
                <div>
                    <div class="sd-cat-card-header">
                        <div class="sd-cat-icon-box">${cat.icon}</div>
                        <div class="sd-cat-title-wrap">
                            <h3 class="sd-cat-title">${cat.name}</h3>
                            <span class="sd-cat-badge">${count} quy tắc</span>
                        </div>
                    </div>
                    <p class="sd-cat-desc">${cat.desc}</p>
                    <div class="sd-cat-preview-sounds">
                        ${previewHtml}
                    </div>
                </div>
                <div class="sd-cat-footer-btn">
                    <span>👉 Mở bảng danh sách các âm (${count} âm)</span>
                    <span>➔</span>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    // =========================================================
    // 4. RENDER BẢNG CÁC ÂM CỦA NHÓM (LEVEL 2 - SOUNDS LIST)
    // =========================================================
    function hienThiDanhSachAmTheoNhom(catKey) {
        const cat = CATEGORY_META[catKey] || CATEGORY_META["ALL"];
        currentCategoryKey = cat.key;

        // Cập nhật Breadcrumb & Banner
        const lblCrumb = document.getElementById("lblBreadcrumbGroup");
        if (lblCrumb) lblCrumb.textContent = `${cat.icon} ${cat.name}`;

        const lblIcon = document.getElementById("lblGroupBannerIcon");
        const lblTitle = document.getElementById("lblGroupBannerTitle");
        const lblCount = document.getElementById("lblGroupBannerCount");
        const lblDesc = document.getElementById("lblGroupBannerDesc");

        if (lblIcon) lblIcon.textContent = cat.icon;
        if (lblTitle) lblTitle.textContent = cat.name;
        if (lblDesc) lblDesc.textContent = cat.desc;

        // Lọc danh sách quy luật
        const rules = (catKey === "ALL")
            ? dsQuyLuat
            : dsQuyLuat.filter(function (r) { return r.phanLoai === catKey; });

        danhSachAmNhomHienTai = rules;
        if (lblCount) lblCount.textContent = `${rules.length} quy tắc`;

        // Render danh sách các thẻ âm
        const soundsGrid = document.getElementById("soundsGrid");
        if (!soundsGrid) return;
        soundsGrid.innerHTML = "";

        if (rules.length === 0) {
            soundsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">
                Chưa có quy tắc nào trong nhóm này.
            </div>`;
            return;
        }

        rules.forEach(function (ql) {
            const card = document.createElement("div");
            card.className = "sd-sound-card";

            const sampleWords = (ql.danhSachTu || []).slice(0, 5);
            let wordsHtml = sampleWords.map(function (w) {
                return `
                    <span class="sd-sc-word-chip" onclick="event.stopPropagation(); phatAmThanh('${w.tu}', '${w.audioUrl || ''}')" title="Bấm để nghe đọc">
                        <strong>${w.tu}</strong> <small class="text-muted">${w.phienAm || ''}</small>
                    </span>
                `;
            }).join("");

            card.innerHTML = `
                <div>
                    <div class="sd-sc-header">
                        <div class="sd-sc-main-sound">
                            <span class="sd-sc-letter">${ql.cumChu}</span>
                            <span class="sd-sc-ipa">${ql.docLaIpa}</span>
                        </div>
                        <div class="sd-sc-actions">
                            <button type="button" class="btn-sc-audio" onclick="event.stopPropagation(); phatAmThanh('${ql.cumChu}', '${ql.audioUrl || ''}')" title="Nghe âm này">🔊</button>
                            <button type="button" class="btn-sc-guide" onclick="event.stopPropagation(); moHuongDanAmTheoQuyTac('${ql.id}')" title="Xem khẩu hình chi tiết">🗣️</button>
                        </div>
                    </div>
                    <h4 class="sd-sc-title">${ql.tieuDeQuyTac || ql.cumChu}</h4>
                    <p class="sd-sc-desc">${ql.moTaQuyTac || ''}</p>
                    
                    <div class="sd-sc-words-wrap">
                        <div class="sd-sc-words-label">Các từ tiêu biểu:</div>
                        <div class="sd-sc-words-list">
                            ${wordsHtml || '<span class="text-muted small">Đang cập nhật...</span>'}
                        </div>
                    </div>
                </div>

                <button type="button" class="btn-sc-open-mindmap" onclick="moSoDoTuDanhSach('${ql.id}')">
                    📖 Học quy tắc & từ ví dụ ➔
                </button>
            `;

            soundsGrid.appendChild(card);
        });
    }

    // =========================================================
    // 5. KHỞI TẠO KHI TẢI TRANG
    // =========================================================
    document.addEventListener("DOMContentLoaded", function () {
        // Tự động chuyển grid nếu màn hình nhỏ (Mobile)
        if (window.innerWidth < 850) {
            cheDoViewGrid = true;
            const board = document.getElementById("sdMindmapContainer");
            if (board) board.classList.add("view-grid");
        }

        function khoiTaoGiaoDien() {
            // Cập nhật nút quay lại bài học nếu có lưu url trước đó
            const btnBackStudy = document.getElementById("btnSdBackStudy");
            if (btnBackStudy) {
                try {
                    const urlQuayLai = sessionStorage.getItem("urlQuayLaiHoc");
                    if (urlQuayLai) {
                        btnBackStudy.href = urlQuayLai;
                        btnBackStudy.innerHTML = "← Quay lại học tiếp";
                        btnBackStudy.classList.add("fw-bold");
                        btnBackStudy.title = "Quay lại trang học từ vựng bạn vừa rời đi";
                        btnBackStudy.addEventListener("click", function (e) {
                            if (window.opener && !window.opener.closed) {
                                e.preventDefault();
                                window.opener.focus();
                                window.close();
                            }
                        });
                    }
                } catch (e) {}
            }

            renderCategoryHub();

            const moBangNgoai = (window.SERVER_DATA_MO_BANG_NGOAI === true);
            const catHienTai = window.SERVER_DATA_CAT_HIEN_TAI || "";
            const idHienTai = window.SERVER_DATA_ID_HIEN_TAI || "";

            if (moBangNgoai && !catHienTai && !idHienTai) {
                // Mặc định vào Bảng danh mục ở ngoài (Level 1)
                chuyenManHinh("CATEGORY_HUB");
            } else if (catHienTai && !idHienTai) {
                // Vào thẳng danh sách các âm của nhóm (Level 2)
                chonNhomTuBangNgoai(catHienTai);
            } else if (idHienTai || quyLuatHienTai) {
                // Vào thẳng Mindmap của âm đó (Level 3)
                const targetId = idHienTai || (quyLuatHienTai ? quyLuatHienTai.id : "");
                chuyenManHinh("MINDMAP");
                taiQuyLuat(targetId);
            } else {
                chuyenManHinh("CATEGORY_HUB");
            }
        }

        // Tải danh sách quy tắc nếu chưa có
        if (!dsQuyLuat || dsQuyLuat.length === 0) {
            fetch("/api/so-do-danh-van/danh-sach")
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    dsQuyLuat = data;
                    khoiTaoGiaoDien();
                })
                .catch(function () {
                    khoiTaoGiaoDien();
                });
        } else {
            khoiTaoGiaoDien();
        }

        // Tự vẽ lại đường nối SVG khi thay đổi kích thước cửa sổ
        window.addEventListener("resize", function () {
            if (!cheDoViewGrid && currentView === "MINDMAP") {
                veCacDuongMuiTenSvg();
            }
        });
    });

    // =========================================================
    // 6. TẢI VÀ HIỂN THỊ CHI TIẾT 1 QUY TẮC
    // =========================================================
    window.taiQuyLuat = function (id) {
        dungAudio();
        dangAutoPlay = false;
        capNhatNutAutoPlay(false);

        // Kiểm tra trong danh sách cục bộ
        const timThay = dsQuyLuat.find(function (item) { return item.id === id; });
        if (timThay && timThay.danhSachTu && timThay.danhSachTu.length > 0) {
            quyLuatHienTai = timThay;
            if (timThay.phanLoai && currentCategoryKey !== timThay.phanLoai) {
                currentCategoryKey = timThay.phanLoai;
                danhSachAmNhomHienTai = dsQuyLuat.filter(function (r) { return r.phanLoai === timThay.phanLoai; });
            }
            renderSoDoMindmap(timThay);
            return;
        }

        // Tải từ API
        hienThiLoading(true, "Đang tải dữ liệu quy luật...");
        fetch("/api/so-do-danh-van/chi-tiet?id=" + encodeURIComponent(id))
            .then(function (r) {
                if (!r.ok) throw new Error("Không tìm thấy quy tắc");
                return r.json();
            })
            .then(function (data) {
                hienThiLoading(false);
                quyLuatHienTai = data;
                if (data.phanLoai && currentCategoryKey !== data.phanLoai) {
                    currentCategoryKey = data.phanLoai;
                    danhSachAmNhomHienTai = dsQuyLuat.filter(function (r) { return r.phanLoai === data.phanLoai; });
                }
                renderSoDoMindmap(data);
            })
            .catch(function (err) {
                hienThiLoading(false);
                console.error("[SoDoDanhVan] Lỗi tải quy tắc:", err);
            });
    };

    // =========================================================
    // 5. RENDER BÀI HỌC QUY LUẬT ĐÁNH VẦN CHUẨN SÁCH (BOOK LESSON VIEW)
    // =========================================================
    function renderSoDoMindmap(ql) {
        if (!ql) return;

        // Cập nhật Banner bài học
        const elCat = document.getElementById("lblBannerCategory");
        const elTitle = document.getElementById("lblBannerTitle");
        const elDesc = document.getElementById("lblBookRuleDesc");
        const elFormulaLetter = document.getElementById("lblFormulaLetter");
        const elFormulaIpa = document.getElementById("lblFormulaIpa");
        const elCount = document.getElementById("lblExampleCount");

        const catMeta = CATEGORY_META[ql.phanLoai] || CATEGORY_META["ALL"];
        if (elCat) elCat.textContent = catMeta ? `${catMeta.icon} ${catMeta.name}` : "Quy luật đánh vần";
        if (elTitle) elTitle.textContent = ql.tieuDeQuyTac || ql.cumChu;
        if (elDesc) elDesc.textContent = ql.moTaQuyTac || `Các từ có [${ql.cumChu}] thì được phát âm chuẩn là ${ql.docLaIpa}.`;

        // Cập nhật công thức: [Mặt chữ] ➔ /Phiên âm/
        if (elFormulaLetter) {
            elFormulaLetter.textContent = ql.matChu || `[${ql.cumChu}]`;
        }
        if (elFormulaIpa) {
            elFormulaIpa.textContent = ql.docLaIpa;
        }

        // Cập nhật Top Navigation
        const lblNavCat = document.getElementById("lblNavCatBackName");
        if (lblNavCat) lblNavCat.textContent = catMeta ? catMeta.name : "Nhóm";

        const lblStep = document.getElementById("lblStepSoundInfo");
        if (lblStep) lblStep.textContent = `${ql.cumChu} (${ql.docLaIpa})`;

        if (!danhSachAmNhomHienTai || danhSachAmNhomHienTai.length === 0) {
            danhSachAmNhomHienTai = dsQuyLuat.filter(function (r) { return r.phanLoai === ql.phanLoai; });
        }

        const currIdx = danhSachAmNhomHienTai.findIndex(function (r) { return r.id === ql.id; });
        const btnPrev = document.getElementById("btnPrevSound");
        const btnNext = document.getElementById("btnNextSound");
        if (btnPrev) btnPrev.disabled = (currIdx <= 0);
        if (btnNext) btnNext.disabled = (currIdx === -1 || currIdx >= danhSachAmNhomHienTai.length - 1);

        // Render danh sách các từ ví dụ tiêu biểu (ngẫu nhiên 8 từ mỗi lần vào)
        render8TuViDu(ql, false);

        // Render thanh chuyển nhanh các âm khác trong cùng nhóm
        renderQuickSoundsList(ql);
    }

    let danhSachTu8TuHienThi = [];

    function lay8TuNgauNhien(ds) {
        if (!ds || ds.length <= 8) return ds ? [...ds] : [];
        const shuffled = [...ds].sort(function () { return 0.5 - Math.random(); });
        return shuffled.slice(0, 8);
    }

    window.doi8TuNgauNhien = function () {
        if (!quyLuatHienTai || !quyLuatHienTai.danhSachTu || quyLuatHienTai.danhSachTu.length === 0) return;
        render8TuViDu(quyLuatHienTai, true);
    };

    function render8TuViDu(ql, isShuffle) {
        const grid = document.getElementById("bookExamplesGrid");
        const elCount = document.getElementById("lblExampleCount");
        const btnRefresh = document.getElementById("btnRefreshWords");
        const dsGoc = ql.danhSachTu || [];

        // Mỗi lần vào hoặc bấm đổi từ -> Lấy ngẫu nhiên 8 từ khác nhau
        danhSachTu8TuHienThi = lay8TuNgauNhien(dsGoc);

        if (elCount) {
            if (dsGoc.length > 8) {
                elCount.textContent = danhSachTu8TuHienThi.length + " / " + dsGoc.length;
            } else {
                elCount.textContent = danhSachTu8TuHienThi.length;
            }
        }

        if (btnRefresh) {
            btnRefresh.style.display = (dsGoc.length > 8) ? "inline-flex" : "none";
        }

        if (grid) {
            grid.innerHTML = "";

            if (danhSachTu8TuHienThi.length === 0) {
                grid.innerHTML = '<div class="col-12 text-center text-muted py-4">Đang cập nhật các từ ví dụ cho quy luật này...</div>';
            } else {
                danhSachTu8TuHienThi.forEach(function (t) {
                    const card = document.createElement("div");
                    card.className = "sd-book-word-card";
                    if (isShuffle) {
                        card.style.animation = "fadeIn 0.3s ease";
                    }
                    card.setAttribute("data-tu", t.tu);

                    const wordHtml = taoChuHighlight(t.tu, t.phanHighlight || ql.cumChu);
                    const ipaHtml = taoIpaHighlight(t.phienAm, t.phanIpaHighlight || ql.docLaIpa);

                    card.innerHTML = `
                        <div>
                            <div class="sd-bwc-header">
                                <span class="sd-bwc-icon">${t.icon || '💡'}</span>
                                <div class="sd-bwc-word">${wordHtml}</div>
                            </div>
                            <div class="sd-bwc-ipa">${ipaHtml}</div>
                            <div class="sd-bwc-meaning">${t.nghia || ''}</div>
                        </div>
                        <div class="sd-bwc-actions">
                            <button type="button" class="btn-bwc-audio" title="Nghe phát âm từ này" onclick="event.stopPropagation(); clickPhatAmTu('${t.tu}', '${t.audioUrl || ''}', this.closest('.sd-book-word-card'))">
                                🔊 Nghe đọc
                            </button>
                            <button type="button" class="btn-bwc-spell" title="Xem hướng dẫn đánh vần từng âm như tiếng Việt" onclick="event.stopPropagation(); moHuongDanTu('${t.tu}', '${t.phienAm || ''}', '${t.nghia || ''}', this)">
                                🗣️ Đánh vần
                            </button>
                        </div>
                    `;

                    // Hover tự động đọc
                    card.addEventListener("mouseenter", function () {
                        hoverPhatAmTu(t.tu, t.audioUrl || '', card);
                    });

                    grid.appendChild(card);
                });
            }
        }
    }

    // Render danh sách chip chuyển nhanh âm trong nhóm
    function renderQuickSoundsList(ql) {
        const list = document.getElementById("quickSoundsList");
        if (!list) return;
        list.innerHTML = "";

        if (!danhSachAmNhomHienTai || danhSachAmNhomHienTai.length === 0) {
            danhSachAmNhomHienTai = dsQuyLuat.filter(function (r) { return r.phanLoai === ql.phanLoai; });
        }

        danhSachAmNhomHienTai.forEach(function (r) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "sd-quick-sound-chip" + (r.id === ql.id ? " active" : "");
            chip.innerHTML = `<strong>${r.cumChu}</strong> <small>(${r.docLaIpa})</small>`;
            chip.title = `Chuyển sang bài học: ${r.tieuDeQuyTac || r.cumChu}`;
            chip.onclick = function () {
                taiQuyLuat(r.id);
            };
            list.appendChild(chip);
        });
    }

    // Highlight phần chữ theo quy tắc màu đỏ đậm
    function taoChuHighlight(tu, phanHl) {
        if (!tu) return "";
        if (!phanHl) return tu;

        const idx = tu.toLowerCase().indexOf(phanHl.toLowerCase());
        if (idx === -1) return tu;

        const before = tu.substring(0, idx);
        const match = tu.substring(idx, idx + phanHl.length);
        const after = tu.substring(idx + phanHl.length);

        return `${before}<span class="hl-red">${match}</span>${after}`;
    }

    // Highlight âm IPA theo quy tắc màu đỏ
    function taoIpaHighlight(ipa, phanIpaHl) {
        if (!ipa) return "";
        if (!phanIpaHl) return ipa;

        const cleanIpa = ipa.replace(/[/\[\]]/g, "");
        const cleanPhan = phanIpaHl.replace(/[/\[\]]/g, "");
        const idx = cleanIpa.indexOf(cleanPhan);
        if (idx === -1) return ipa.startsWith("/") ? ipa : `/${ipa}/`;

        const before = cleanIpa.substring(0, idx);
        const match = cleanIpa.substring(idx, idx + cleanPhan.length);
        const after = cleanIpa.substring(idx + cleanPhan.length);

        return `/${before}<span class="hl-red">${match}</span>${after}/`;
    }

    // =========================================================
    // 8. TỰ ĐỘNG ĐỌC KHI HOVER & CLICK PHÁT ÂM
    // =========================================================
    function kiemTraCoChoPhepAutoRead() {
        const chk = document.getElementById("chkAutoHoverRead");
        return chk ? chk.checked : true;
    }

    window.hoverPhatAmNodeTrungTam = function () {
        if (!kiemTraCoChoPhepAutoRead() || dangAutoPlay) return;
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(function () {
            clickPhatAmNodeTrungTam();
        }, 150);
    };

    // Bảng âm thanh IPA bản xứ chuẩn có sẵn trong thư mục /audio/ipa/
    const BANG_AM_THANH_IPA = {
        "dzh": "/audio/ipa/dzh.mp3",
        "dʒ": "/audio/ipa/dzh.mp3",
        "tʃ": "/audio/ipa/tsh.mp3",
        "tsh": "/audio/ipa/tsh.mp3",
        "s": "/audio/ipa/s.mp3",
        "ʃ": "/audio/ipa/sh.mp3",
        "sh": "/audio/ipa/sh.mp3",
        "ʒ": "/audio/ipa/zh.mp3",
        "θ": "/audio/ipa/th_v.mp3",
        "ð": "/audio/ipa/th_d.mp3",
        "ɜː": "/audio/ipa/er_long.mp3",
        "ɚ": "/audio/ipa/er_long.mp3",
        "ɝ": "/audio/ipa/er_long.mp3",
        "ɑː": "/audio/ipa/ah_long.mp3",
        "ɔː": "/audio/ipa/aw_long.mp3",
        "æ": "/audio/ipa/ae.mp3",
        "e": "/audio/ipa/e.mp3",
        "iː": "/audio/ipa/i_long.mp3",
        "ɪ": "/audio/ipa/i_short.mp3",
        "uː": "/audio/ipa/u_long.mp3",
        "ʊ": "/audio/ipa/u_short.mp3",
        "ʌ": "/audio/ipa/uh.mp3",
        "ɒ": "/audio/ipa/o_short.mp3",
        "ə": "/audio/ipa/schwa.mp3",
        "eɪ": "/audio/ipa/ei.mp3",
        "aɪ": "/audio/ipa/ai.mp3",
        "ɔɪ": "/audio/ipa/oi.mp3",
        "aʊ": "/audio/ipa/au.mp3",
        "f": "/audio/ipa/f.mp3"
    };

    function timAudioIpaChoQuyLuat(ql) {
        if (!ql) return null;
        if (ql.audioUrl && ql.audioUrl.startsWith("/audio/ipa/")) return ql.audioUrl;

        // Các quy tắc hậu tố/tiền tố nên đọc chuẩn bằng Neural TTS (ví dụ: -tion/-sion đọc là "shun")
        if (ql.id === "tion_sion" || ql.id === "ability_suffix" || ql.id === "ty_ending" ||
            ql.id === "ture_end" || ql.id === "cial_tial" || ql.id === "ious_eous" ||
            ql.id === "ment_end" || ql.id === "ness_end" || ql.id === "ate_adj_noun" ||
            ql.id === "ac_prefix" || ql.id === "consonant_le" || ql.id === "ise_ize" || ql.id === "fy_end") {
            return null;
        }

        // Ưu tiên khớp theo ID quy tắc
        if (ql.id === "soft_g") return "/audio/ipa/dzh.mp3";
        if (ql.id === "soft_c") return "/audio/ipa/s.mp3";
        if (ql.id === "ch_sound") return "/audio/ipa/tsh.mp3";
        if (ql.id === "sh_sound") return "/audio/ipa/sh.mp3";
        if (ql.id === "ph_sound") return "/audio/ipa/f.mp3";
        if (ql.id === "w_or" || ql.id === "er_ir_ur") return "/audio/ipa/er_long.mp3";
        if (ql.id === "ar") return "/audio/ipa/ah_long.mp3";
        if (ql.id === "or_normal") return "/audio/ipa/aw_long.mp3";
        if (ql.id === "ea_ee" || ql.id === "ee" || ql.id === "ea") return "/audio/ipa/i_long.mp3";
        if (ql.id === "oo_long") return "/audio/ipa/u_long.mp3";
        if (ql.id === "oo_short") return "/audio/ipa/u_short.mp3";
        if (ql.id === "igh" || ql.id === "igh_sound") return "/audio/ipa/ai.mp3";
        if (ql.id === "ou_sound") return "/audio/ipa/au.mp3";
        if (ql.id === "oy_oi" || ql.id === "oi_oy") return "/audio/ipa/oi.mp3";
        if (ql.id === "ai_ay") return "/audio/ipa/ei.mp3";
        if (ql.id === "th_unvoiced") return "/audio/ipa/th_v.mp3";
        if (ql.id === "th_voiced") return "/audio/ipa/th_d.mp3";

        // Khớp theo ký hiệu docLaIpa
        if (ql.docLaIpa) {
            const clean = ql.docLaIpa.replace(/[/ˈˌ\[\]\s]/g, "");
            if (BANG_AM_THANH_IPA[clean]) return BANG_AM_THANH_IPA[clean];
            for (const [key, url] of Object.entries(BANG_AM_THANH_IPA)) {
                if (clean === key) return url;
            }
        }
        return null;
    }

    window.clickPhatAmNodeTrungTam = function () {
        if (!quyLuatHienTai) return;
        const ipaUrl = timAudioIpaChoQuyLuat(quyLuatHienTai);
        if (ipaUrl) {
            phatAmThanh(null, ipaUrl);
            return;
        }
        const textToRead = quyLuatHienTai.amDoc || quyLuatHienTai.cumChu;
        phatAmThanh(textToRead, null);
    };

    function hoverPhatAmTu(tu, audioUrl, cardEl) {
        if (!kiemTraCoChoPhepAutoRead() || dangAutoPlay) return;
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(function () {
            clickPhatAmTu(tu, audioUrl, cardEl);
        }, 150);
    }

    function clickPhatAmTu(tu, audioUrl, cardEl) {
        if (cardEl) {
            document.querySelectorAll(".sd-word-card.playing, .sd-book-word-card.playing").forEach(function (c) { c.classList.remove("playing"); });
            cardEl.classList.add("playing");
        }
        phatAmThanh(tu, audioUrl, function () {
            if (cardEl) cardEl.classList.remove("playing");
        });
    }

    // Mở modal hướng dẫn đọc chi tiết cho từng từ
    window.moHuongDanTu = function (tu, phienAm, nghia, btnEl) {
        dungAudio();
        if (typeof window.moHuongDanDoc === "function") {
            window.moHuongDanDoc(btnEl, tu, phienAm, nghia);
        } else {
            alert(`Từ: ${tu}\nPhiên âm: ${phienAm}\nNghĩa: ${nghia}`);
        }
    };

    // =========================================================
    // 9. ĐỌC TOÀN BỘ CÁC TỪ VÍ DỤ (AUTOPLAY ALL WORDS)
    // =========================================================
    window.docToanBoCacTu = function () {
        window.docToanBoSoDo();
    };

    window.docToanBoSoDo = function () {
        if (!quyLuatHienTai) return;

        if (dangAutoPlay) {
            dungAudio();
            dangAutoPlay = false;
            capNhatNutAutoPlay(false);
            return;
        }

        dangAutoPlay = true;
        capNhatNutAutoPlay(true);

        const cards = Array.from(document.querySelectorAll("#bookExamplesGrid .sd-book-word-card, .sd-satellites-wrapper .sd-word-card"));
        let step = -1; // -1: Đọc âm quy tắc trước, sau đó 0..n: đọc các từ ví dụ

        function chayBuocTiepTheo() {
            if (!dangAutoPlay) return;

            step++;
            if (step > cards.length) {
                dangAutoPlay = false;
                capNhatNutAutoPlay(false);
                cards.forEach(function (c) { c.classList.remove("playing"); });
                return;
            }

            if (step === 0) {
                // Đọc âm quy tắc trước
                const text = quyLuatHienTai.amDoc || quyLuatHienTai.cumChu;
                phatAmThanh(text, null, function () {
                    autoPlayTimer = setTimeout(chayBuocTiepTheo, 500);
                });
                return;
            }

            // Đọc từ ví dụ
            const card = cards[step - 1];
            if (!card) {
                dangAutoPlay = false;
                capNhatNutAutoPlay(false);
                return;
            }

            const tu = card.getAttribute("data-tu");
            if (!tu) {
                chayBuocTiepTheo();
                return;
            }

            cards.forEach(function (c) { c.classList.remove("playing"); });
            card.classList.add("playing");

            phatAmThanh(tu, null, function () {
                card.classList.remove("playing");
                autoPlayTimer = setTimeout(chayBuocTiepTheo, 600);
            });
        }

        chayBuocTiepTheo();
    };

    function capNhatNutAutoPlay(isPlaying) {
        const btn = document.getElementById("btnAutoPlayAll");
        if (!btn) return;
        if (isPlaying) {
            btn.innerHTML = "⏹️ Dừng đọc";
            btn.classList.add("btn-danger");
            btn.classList.remove("btn-sd-autoplay");
        } else {
            btn.innerHTML = "▶️ Đọc tất cả từ ví dụ";
            btn.classList.add("btn-sd-autoplay");
            btn.classList.remove("btn-danger");
        }
    }

    // =========================================================
    // 10. MODAL HƯỚNG DẪN ÂM TRUNG TÂM
    // =========================================================
    window.moHuongDanAmTrungTam = function () {
        if (!quyLuatHienTai) return;
        dungAudio();

        const modal = document.getElementById("modalAmTrungTam");
        const title = document.getElementById("lblModalCenterTitle");
        const bigSymbol = document.getElementById("lblModalBigSymbol");
        const ruleDetail = document.getElementById("lblModalRuleDetail");
        const mouthDetail = document.getElementById("lblModalMouthDetail");
        const wordsList = document.getElementById("lblModalSampleWords");

        if (title) title.textContent = `Quy tắc "${quyLuatHienTai.cumChu}" đọc là ${quyLuatHienTai.docLaIpa}`;
        if (bigSymbol) bigSymbol.textContent = quyLuatHienTai.docLaIpa;
        if (ruleDetail) ruleDetail.textContent = quyLuatHienTai.moTaQuyTac || "";
        if (mouthDetail) mouthDetail.textContent = quyLuatHienTai.huongDanPhatAm || "Mở khẩu hình tự nhiên, phát âm rõ ràng từ cuống họng.";

        if (wordsList) {
            wordsList.innerHTML = "";
            (quyLuatHienTai.danhSachTu || []).forEach(function (w) {
                const span = document.createElement("span");
                span.className = "sd-modal-chip-word";
                span.innerHTML = `<strong>${w.tu}</strong> <small class="text-muted">${w.phienAm}</small> - ${w.nghia}`;
                span.onclick = function () {
                    phatAmThanh(w.tu, w.audioUrl);
                };
                wordsList.appendChild(span);
            });
        }

        if (modal) modal.style.display = "flex";
    };

    window.dongModalAmTrungTam = function () {
        dungAudio();
        const modal = document.getElementById("modalAmTrungTam");
        if (modal) modal.style.display = "none";
    };

    // =========================================================
    // 11. BỘ LỌC THEO NHÓM & CHUYỂN VIEW
    // =========================================================
    window.locTheoNhom = function (cat) {
        chonNhomTuBangNgoai(cat);
    };

    window.chuyenDoiCheDoHienThi = function () {
        cheDoViewGrid = !cheDoViewGrid;
        const board = document.getElementById("sdMindmapContainer");
        if (!board) return;

        if (cheDoViewGrid) {
            board.classList.add("view-grid");
        } else {
            board.classList.remove("view-grid");
            sapXepVeTinhToaTron();
            veCacDuongMuiTenSvg();
        }
    };

    // =========================================================
    // 12. TÌM KIẾM THÔNG MINH & GỌI AI VẼ SƠ ĐỒ MỚI
    // =========================================================
    window.xuLyTimKiem = function (val) {
        const drop = document.getElementById("searchSuggestions");
        if (!drop) return;

        if (!val || val.trim().length === 0) {
            drop.style.display = "none";
            return;
        }

        const q = val.trim().toLowerCase();
        const ketQua = [];

        dsQuyLuat.forEach(function (ql) {
            let match = false;
            let tuMatch = "";

            if (ql.cumChu.toLowerCase().includes(q) || ql.tieuDeQuyTac.toLowerCase().includes(q)) {
                match = true;
            } else {
                for (let t of ql.danhSachTu) {
                    if (t.tu.toLowerCase().includes(q) || t.nghia.toLowerCase().includes(q)) {
                        match = true;
                        tuMatch = t.tu;
                        break;
                    }
                }
            }

            if (match) {
                ketQua.push({ ql: ql, tuMatch: tuMatch });
            }
        });

        if (ketQua.length === 0) {
            drop.innerHTML = `<div class="p-3 text-center text-muted">
                Không có sẵn trong kho. <br>Bấm <b>"🤖 AI vẽ sơ đồ"</b> để Gemini tạo sơ đồ cho "${val}"!
            </div>`;
            drop.style.display = "block";
            return;
        }

        let html = "";
        ketQua.slice(0, 6).forEach(function (item) {
            html += `
                <div class="sd-search-item" onclick="chonGoiYTimKiem('${item.ql.id}')">
                    <div>
                        <strong>${item.ql.icon || '⚡'} ${item.ql.cumChu}</strong>
                        <small class="text-danger fw-bold">(${item.ql.docLaIpa})</small>
                        <div class="small text-muted">${item.ql.tieuDeQuyTac}</div>
                    </div>
                    ${item.tuMatch ? `<span class="badge bg-light text-dark border">${item.tuMatch}</span>` : ''}
                </div>
            `;
        });

        drop.innerHTML = html;
        drop.style.display = "block";
    };

    window.chonGoiYTimKiem = function (id) {
        const drop = document.getElementById("searchSuggestions");
        if (drop) drop.style.display = "none";
        moSoDoTuDanhSach(id);
    };

    window.timKiemVaVeSoDo = function () {
        const txt = document.getElementById("txtSearchRule");
        const val = txt ? txt.value.trim() : "";
        if (!val) return;

        const drop = document.getElementById("searchSuggestions");
        if (drop) drop.style.display = "none";

        // Thử tìm trong kho có sẵn
        const q = val.toLowerCase();
        const found = dsQuyLuat.find(function (ql) {
            if (ql.cumChu.toLowerCase() === q || ql.id.toLowerCase() === q) return true;
            return ql.danhSachTu.some(function (t) { return t.tu.toLowerCase() === q; });
        });

        if (found) {
            moSoDoTuDanhSach(found.id);
        } else {
            goiAiVeSoDo();
        }
    };

    window.goiAiVeSoDo = function () {
        const txt = document.getElementById("txtSearchRule");
        const val = txt ? txt.value.trim() : "";
        if (!val) {
            alert("Vui lòng nhập từ hoặc âm cần vẽ sơ đồ tư duy!");
            if (txt) txt.focus();
            return;
        }

        chuyenManHinh("MINDMAP");
        hienThiLoading(true, `🤖 AI Gemini đang phân tích quy luật đánh vần cho "${val}" và vẽ sơ đồ tư duy...`);

        fetch("/api/so-do-danh-van/ai-generate?q=" + encodeURIComponent(val))
            .then(function (r) {
                if (!r.ok) throw new Error("Không thể tạo sơ đồ với AI");
                return r.json();
            })
            .then(function (data) {
                hienThiLoading(false);
                quyLuatHienTai = data;

                // Thêm vào danh sách nếu chưa có
                if (!dsQuyLuat.some(function (x) { return x.id === data.id; })) {
                    dsQuyLuat.unshift(data);
                    renderCategoryHub();
                }

                renderSoDoMindmap(data);
            })
            .catch(function (err) {
                hienThiLoading(false);
                alert("Lỗi khi gọi AI tạo sơ đồ: " + err.message);
            });
    };

    function hienThiLoading(isLoading, text) {
        const loadBox = document.getElementById("sdLoadingBox");
        const board = document.getElementById("sdMindmapContainer");
        const lbl = document.getElementById("lblLoadingText");

        if (lbl && text) lbl.textContent = text;
        if (loadBox) loadBox.style.display = isLoading ? "block" : "none";
        if (board) board.style.display = isLoading ? "none" : "flex";
    }

})();
