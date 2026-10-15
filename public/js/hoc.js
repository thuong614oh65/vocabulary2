const ngauNhien = document.getElementById("ngauNhien");
const tuSai = document.getElementById("tuSai");
const theoBo = document.getElementById("theoBo");
const chonTu = document.getElementById("chonTu");
const theoChuDe = document.getElementById("theoChuDe");

const boHoc = document.getElementById("boHoc");

const bangTheoBo = document.getElementById("bangTheoBo");
const bangTatCa = document.getElementById("bangTatCa");
const khungTheoChuDe = document.getElementById("khungTheoChuDe");
const tenChuDeInput = document.getElementById("tenChuDeInput");
const chuDeTuJson = document.getElementById("chuDeTuJson");

const tuyChonPhamViBo = document.getElementById("tuyChonPhamViBo");
const phamViTatCa = document.getElementById("phamViTatCa");
const phamViTuDen = document.getElementById("phamViTuDen");
const tuTu = document.getElementById("tuTu");
const denTu = document.getElementById("denTu");

function capNhatActiveBar() {
    document.querySelectorAll(".form-check").forEach(function (bar) {
        const radio = bar.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
            bar.classList.add("active-check");
        } else if (radio) {
            bar.classList.remove("active-check");
        }
    });
}

function capNhat() {
    if (!ngauNhien || !tuSai || !theoBo || !chonTu) {
        return;
    }

    if (boHoc) {
        boHoc.disabled = !theoBo.checked;
    }

    const coChonBo = theoBo.checked && boHoc && boHoc.value !== "";

    if (tuyChonPhamViBo) {
        tuyChonPhamViBo.style.display = coChonBo ? "block" : "none";
    }

    if (bangTheoBo) {
        bangTheoBo.style.display = coChonBo ? "block" : "none";
    }
    if (bangTatCa) {
        bangTatCa.style.display = chonTu.checked ? "block" : "none";
    }

    if (khungTheoChuDe) {
        const coChonChuDe = theoChuDe && theoChuDe.checked;
        khungTheoChuDe.style.display = coChonChuDe ? "block" : "none";
        if (coChonChuDe && tenChuDeInput && !tenChuDeInput.value) {
            setTimeout(function () { tenChuDeInput.focus(); }, 100);
        }
    }

    capNhatPhamViBo();
    capNhatActiveBar();
}

function capNhatPhamViBo() {
    if (!phamViTuDen || !tuTu || !denTu) return;
    const isTuDen = phamViTuDen.checked;
    tuTu.disabled = !isTuDen;
    denTu.disabled = !isTuDen;
    capNhatActiveBar();
}

// Hàm chọn radio theo thanh (dùng cho inline onclick và addEventListener)
function chonRadioTheoThanh(barEl, radioId, evt) {
    if (!radioId) return;
    if (evt && evt.target) {
        const tag = evt.target.tagName;
        if (tag === "BUTTON" || tag === "SELECT") return;
    }
    const radio = document.getElementById(radioId);
    if (!radio) return;

    if (!radio.checked) {
        radio.checked = true;
        try {
            radio.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {
            if (typeof radio.onchange === "function") radio.onchange();
        }
    }

    capNhatActiveBar();
    capNhat();
    capNhatPhamViBo();

    if (radioId === "phamViTuDen" && (!evt || !evt.target || evt.target.tagName !== "INPUT")) {
        const tuTuInput = document.getElementById("tuTu");
        if (tuTuInput) {
            setTimeout(function () { tuTuInput.focus(); }, 50);
        }
    }
}
window.chonRadioTheoThanh = chonRadioTheoThanh;

// Cho phép click vào bất kỳ vị trí nào trên thanh (.form-check) để tích chọn
document.querySelectorAll(".form-check").forEach(function (bar) {
    bar.addEventListener("click", function (e) {
        if (e.target.tagName === "INPUT" && e.target.type !== "radio") {
            return;
        }
        if (e.target.tagName === "BUTTON" || e.target.tagName === "SELECT") {
            return;
        }
        const radio = bar.querySelector('input[type="radio"]');
        if (radio) {
            if (!radio.checked) {
                radio.checked = true;
                radio.dispatchEvent(new Event("change", { bubbles: true }));
            }
            capNhatActiveBar();
            capNhat();
        }
    });
});

if (tuTu) {
    tuTu.addEventListener("focus", function () {
        if (phamViTuDen) {
            phamViTuDen.checked = true;
            capNhatPhamViBo();
        }
    });
    tuTu.addEventListener("click", function (e) {
        if (phamViTuDen && !phamViTuDen.checked) {
            phamViTuDen.checked = true;
            capNhatPhamViBo();
        }
    });
}

if (denTu) {
    denTu.addEventListener("focus", function () {
        if (phamViTuDen) {
            phamViTuDen.checked = true;
            capNhatPhamViBo();
        }
    });
    denTu.addEventListener("click", function (e) {
        if (phamViTuDen && !phamViTuDen.checked) {
            phamViTuDen.checked = true;
            capNhatPhamViBo();
        }
    });
}

if (ngauNhien) {
    ngauNhien.onchange = capNhat;
}

if (tuSai) {
    tuSai.onchange = capNhat;
}

if (theoBo) {
    theoBo.onchange = capNhat;
}

if (chonTu) {
    chonTu.onchange = capNhat;
}

if (theoChuDe) {
    theoChuDe.onchange = capNhat;
}

if (phamViTatCa) {
    phamViTatCa.onchange = capNhatPhamViBo;
}

if (phamViTuDen) {
    phamViTuDen.onchange = capNhatPhamViBo;
}

// Bắt sự kiện submit form để validate nếu chọn "Theo chủ đề"
const formHoc = document.querySelector("form");
if (formHoc) {
    formHoc.addEventListener("submit", function (e) {
        if (theoChuDe && theoChuDe.checked) {
            const jsonVal = chuDeTuJson ? chuDeTuJson.value.trim() : "";
            if (!jsonVal || jsonVal === "[]" || jsonVal === "") {
                e.preventDefault();
                alert("Bạn đang chọn học 'Theo chủ đề'. Vui lòng nhập chủ đề và bấm 'Đề xuất 10 từ mới' trước khi bấm Học!");
                if (tenChuDeInput) tenChuDeInput.focus();
                return false;
            }
        }
    });
}

// =========================================================
// CHỨC NĂNG HỌC THEO CHỦ ĐỀ VỚI 10 TỪ MỚI TOANH (CHƯA CÓ TRONG CSDL)
// =========================================================
let dsTuChuDeHienTai = [];

function chonGoiYChuDe(ten) {
    const input = document.getElementById("tenChuDeInput");
    if (input) {
        input.value = ten;
        deXuatTuMoiTheoChuDe(false);
    }
}
window.chonGoiYChuDe = chonGoiYChuDe;

async function deXuatTuMoiTheoChuDe(doiTuKhac) {
    const input = document.getElementById("tenChuDeInput");
    const spin = document.getElementById("spinChuDe");
    const spinText = document.getElementById("spinChuDeText");
    const thongBao = document.getElementById("thongBaoChuDe");
    const khungBang = document.getElementById("khungBangChuDe");
    const tbody = document.getElementById("tbodyTuChuDe");
    const chuDeJson = document.getElementById("chuDeTuJson");
    const btnDeXuat = document.getElementById("btnDeXuatChuDe");
    const lblTen = document.getElementById("lblTenChuDeHienTai");

    if (!input || !input.value.trim()) {
        if (thongBao) {
            thongBao.className = "alert alert-warning py-2 mb-3";
            thongBao.textContent = "⚠️ Vui lòng nhập tên chủ đề (ví dụ: Du lịch, Công nghệ, Khách sạn...)";
            thongBao.style.display = "block";
        } else {
            alert("Vui lòng nhập tên chủ đề!");
        }
        if (input) input.focus();
        return;
    }

    const chuDe = input.value.trim();
    if (thongBao) thongBao.style.display = "none";
    if (khungBang && !doiTuKhac) khungBang.style.display = "none";
    if (spin) {
        spin.style.display = "block";
        if (spinText) {
            spinText.textContent = doiTuKhac
                ? `🤖 Đang tìm 10 từ khác cho chủ đề "${chuDe}"...`
                : `🤖 AI Gemini đang quét và chọn lọc 10 từ mới chưa có trong CSDL cho chủ đề "${chuDe}"...`;
        }
    }
    if (btnDeXuat) btnDeXuat.disabled = true;

    try {
        let url = `/api/hoc/de-xuat-chu-de?chuDe=${encodeURIComponent(chuDe)}`;
        if (doiTuKhac && dsTuChuDeHienTai && dsTuChuDeHienTai.length > 0) {
            const danhSachTuLoaiTru = dsTuChuDeHienTai.map(t => t.tiengAnh).join(",");
            url += `&loaiTru=${encodeURIComponent(danhSachTuLoaiTru)}`;
        }

        const resp = await fetch(url);
        if (resp.status === 401) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            window.location.href = "/dangnhap";
            return;
        }

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(errText || "Lỗi khi tạo từ vựng theo chủ đề");
        }

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Không tìm thấy từ vựng mới phù hợp với chủ đề này. Vui lòng thử chủ đề khác!");
        }

        dsTuChuDeHienTai = data;
        if (chuDeJson) {
            chuDeJson.value = JSON.stringify(data);
        }

        if (lblTen) lblTen.textContent = chuDe;

        if (tbody) {
            tbody.innerHTML = "";
            data.forEach((tu, idx) => {
                const tr = document.createElement("tr");
                const tiengAnhClean = (tu.tiengAnh || "").trim();
                const phienAmClean = (tu.phienAm || "").trim();
                const tiengVietClean = (tu.tiengViet || "").trim();
                const viDuClean = (tu.viDu || "").trim();

                tr.innerHTML = `
                    <td class="text-center fw-bold text-secondary">${idx + 1}</td>
                    <td>
                        <div class="tu-don-wrap">
                            <span class="tu-don-text text-primary fw-bold">${escapeHtml(tiengAnhClean)}</span>
                            <button type="button"
                                    class="btn-hd-icon"
                                    onclick="moHuongDanDoc(this, '${escapeJs(tiengAnhClean)}', '${escapeJs(phienAmClean)}', '${escapeJs(tiengVietClean)}')"
                                    title="Xem hướng dẫn cách đọc chuẩn">
                                🗣️
                            </button>
                        </div>
                    </td>
                    <td class="text-muted fst-italic">${escapeHtml(phienAmClean)}</td>
                    <td class="fw-semibold text-dark">${escapeHtml(tiengVietClean)}</td>
                    <td class="small text-secondary">${escapeHtml(viDuClean)}</td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escapeJs(tiengAnhClean)}')">
                            🔊
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        if (khungBang) khungBang.style.display = "block";
    } catch (err) {
        console.error("Lỗi đề xuất từ chủ đề:", err);
        if (thongBao) {
            thongBao.className = "alert alert-danger py-2 mb-3";
            thongBao.textContent = "❌ " + (err.message || "Không thể đề xuất từ vựng. Vui lòng thử lại!");
            thongBao.style.display = "block";
        } else {
            alert(err.message || "Đã xảy ra lỗi khi đề xuất từ vựng.");
        }
    } finally {
        if (spin) spin.style.display = "none";
        if (btnDeXuat) btnDeXuat.disabled = false;
    }
}
window.deXuatTuMoiTheoChuDe = deXuatTuMoiTheoChuDe;

function batDauHocBoChuDe(actionType) {
    const jsonInput = document.getElementById("chuDeTuJson");
    if (!jsonInput || !jsonInput.value || jsonInput.value.trim() === "" || jsonInput.value.trim() === "[]") {
        alert("Vui lòng nhập chủ đề và bấm 'Đề xuất 10 từ mới' trước khi bắt đầu!");
        const input = document.getElementById("tenChuDeInput");
        if (input) input.focus();
        return;
    }

    if (theoChuDe) theoChuDe.checked = true;

    const form = document.querySelector("form");
    if (form) {
        let inputAction = form.querySelector('input[name="action"]');
        if (!inputAction) {
            inputAction = document.createElement("input");
            inputAction.type = "hidden";
            inputAction.name = "action";
            form.appendChild(inputAction);
        }
        inputAction.value = (actionType === 'phan-xa') ? 'phan-xa' : 'hoc';
        form.submit();
    }
}
window.batDauHocBoChuDe = batDauHocBoChuDe;

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (!str) return "";
    return str
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}

capNhat();

function doiBo() {
    if (boHoc && boHoc.value != "") {
        window.location = "/hoc/bo/" + boHoc.value;
    }
}

let audioHienTai = null;
let soLanDoc = 0;


// =========================================================
// DỪNG TẤT CẢ ÂM THANH
// =========================================================

const hocGlobalAudioDung = (typeof window.dungTatCaAmThanh === "function") ? window.dungTatCaAmThanh : null;

function dungTatCaAmThanh() {
    if (audioHienTai) {
        try {
            audioHienTai.pause();
            audioHienTai.currentTime = 0;
        } catch (e) {}
        audioHienTai = null;
    }

    if (typeof hocGlobalAudioDung === "function") {
        try {
            hocGlobalAudioDung();
        } catch (e) {}
    } else if (window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
    }
}


// =========================================================
// BẮT ĐẦU ĐỌC TỪ BẰNG MP3
// =========================================================

function batDauDocTu(tu, maDoc) {

    if (!tu) {
        return;
    }

    console.log(
        "ĐỌC TỪ:",
        tu
    );

    if (window.phatAmThanh) {
        window.phatAmThanh(tu, {
            rate: "+0%",
            onStart: function () {
                console.log("BẮT ĐẦU ĐỌC:", tu);
            },
            onEnd: function () {
                console.log("ĐỌC XONG:", tu);
            }
        });
        return;
    }

    let duongDan = "/audio/phat?text=" + encodeURIComponent(tu) + "&rate=+0%";
    dungTatCaAmThanh();
    audioHienTai = new Audio(duongDan);
    audioHienTai.play().catch(function (e) {
        console.warn("Lỗi phát audio:", e);
    });
}


// =========================================================
// HÀM docTu() CHO HTML GỌI
// =========================================================

function docTu(tu) {

    if (!tu) {

        return;

    }

    // Tạo lượt đọc mới

    soLanDoc++;

    let maDoc =
        soLanDoc;

    // Không cần dungTatCaAmThanh() ở đây
    // vì batDauDocTu() đã làm việc đó

    batDauDocTu(
        tu,
        maDoc
    );

}


// =========================================================
// CHỌN TẤT CẢ / BỎ CHỌN TẤT CẢ / CHỌN THEO BỘ TRONG BẢNG CHỌN TỪNG TỪ
// =========================================================

function capNhatDemTuDaChon() {
    const checkboxes = document.querySelectorAll('#bangTatCa input.chk-tu-item[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('#bangTatCa input.chk-tu-item[type="checkbox"]:checked');
    const badgeCount = document.getElementById("soLuongTuDaChon");
    const chkHeader = document.getElementById("chkChonTatCaHeader");

    if (badgeCount) {
        badgeCount.textContent = checkedBoxes.length;
    }

    if (chkHeader && checkboxes.length > 0) {
        chkHeader.checked = checkedBoxes.length === checkboxes.length;
        chkHeader.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
    }

    // Cập nhật trạng thái nút "Chọn cả bộ" của từng bộ
    document.querySelectorAll('#bangTatCa .btn-chon-ca-bo').forEach(function (btn) {
        const td = btn.closest('td');
        const tr = btn.closest('tr');
        const boId = tr ? tr.getAttribute('data-bo-id') : null;
        if (!boId) return;
        const boCheckboxes = document.querySelectorAll('#bangTatCa input.chk-tu-item[data-bo-id="' + boId + '"]');
        const boChecked = document.querySelectorAll('#bangTatCa input.chk-tu-item[data-bo-id="' + boId + '"]:checked');
        if (boCheckboxes.length > 0 && boChecked.length === boCheckboxes.length) {
            btn.innerHTML = '✅ Bỏ chọn bộ';
        } else {
            btn.innerHTML = '☑️ Chọn cả bộ';
        }
    });
}

function chonTatCaTu(isCheck) {
    const checkboxes = document.querySelectorAll('#bangTatCa input.chk-tu-item[type="checkbox"]');
    checkboxes.forEach(function (chk) {
        chk.checked = !!isCheck;
    });
    capNhatDemTuDaChon();
}

function chonTatCaTheoBo(boId, btnEl) {
    const boCheckboxes = document.querySelectorAll('#bangTatCa input.chk-tu-item[data-bo-id="' + boId + '"]');
    if (!boCheckboxes || boCheckboxes.length === 0) return;

    let allChecked = true;
    boCheckboxes.forEach(function (chk) {
        if (!chk.checked) allChecked = false;
    });

    const targetState = !allChecked;
    boCheckboxes.forEach(function (chk) {
        chk.checked = targetState;
    });

    capNhatDemTuDaChon();
}

window.capNhatDemTuDaChon = capNhatDemTuDaChon;
window.chonTatCaTu = chonTatCaTu;
window.chonTatCaTheoBo = chonTatCaTheoBo;

capNhatDemTuDaChon();

// =========================================================
// ĐƯA HÀM RA GLOBAL
// =========================================================

window.docTu =
    docTu;

// =========================================================
// TÌM KIẾM / LỌC BẢNG CHỌN TỪNG TỪ (#bangTatCa)
// =========================================================

function locBangTuVung(query) {
    const q = (query || "").trim().toLowerCase();
    const ketQua = document.getElementById("ketQuaTimKiem");
    const tbody = document.querySelector("#bangTatCa table tbody");
    if (!tbody) return;

    // Lấy tất cả rows (tr) của bảng
    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (rows.length === 0) return;

    // Xây dựng map: mỗi row biết bộ nào nó thuộc về (lấy từ data-bo-id)
    let totalVisible = 0;

    // Ẩn/hiện từng row, đồng thời track các td bộ (rowspan)
    rows.forEach(function(tr) {
        const tds = tr.querySelectorAll("td");
        // Lấy text tiếng Anh, nghĩa
        let tiengAnh = "";
        let nghia = "";
        let tenBo = "";
        // Cột bộ có thể ở td đầu tiên (rowspan) hoặc không có (khi rowspan > 1)
        // Cột tiếng Anh: tìm span.tu-don-text
        const spanTuDon = tr.querySelector(".tu-don-text");
        if (spanTuDon) tiengAnh = spanTuDon.textContent.toLowerCase();
        // Lấy tất cả td text
        tds.forEach(function(td, i) {
            const txt = td.textContent.trim().toLowerCase();
            if (!td.querySelector(".tu-don-text") && !td.querySelector("button") && !td.querySelector("input")) {
                if (!nghia && i > 0) nghia = txt;
            }
            // td bộ: td có class td-bo-gop hoặc rowspan
            if (td.classList.contains("td-bo-gop") || td.hasAttribute("rowspan")) {
                tenBo = txt.toLowerCase();
            }
        });

        if (!q) {
            tr.style.display = "";
            totalVisible++;
        } else {
            const matched = tiengAnh.includes(q) || nghia.includes(q) || tenBo.includes(q);
            tr.style.display = matched ? "" : "none";
            if (matched) totalVisible++;
        }
    });

    // Cập nhật thông báo kết quả
    if (!ketQua) return;
    if (!q) {
        ketQua.style.display = "none";
        ketQua.textContent = "";
    } else {
        ketQua.style.display = "block";
        ketQua.textContent = `🔍 Tìm thấy ${totalVisible} từ phù hợp với "${query}"`;
    }
}

function xoaTimKiem() {
    const inp = document.getElementById("timKiemTu");
    if (inp) {
        inp.value = "";
        inp.focus();
    }
    locBangTuVung("");
}

window.locBangTuVung = locBangTuVung;
window.xoaTimKiem = xoaTimKiem;

// =========================================================
// AI STORY MNEMONIC (KỂ CHUYỆN GHI NHỚ LIÊN TƯỞNG THỊ GIÁC)
// Phương pháp: Visual Imagery + Story Chaining + Sound Mnemonic + Active Recall
// =========================================================

let currentStoryData = null;
let currentStoryWords = [];
let storyReadingTimer = null;

function moModalCotTruyenUI() {
    const modalEl = document.getElementById("modalCotTruyen");
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
        let m = bootstrap.Modal.getInstance(modalEl);
        if (!m) m = new bootstrap.Modal(modalEl, { backdrop: 'static' });
        m.show();
    } else {
        modalEl.style.display = "block";
        modalEl.classList.add("show");
        document.body.classList.add("modal-open");
        let backdrop = document.getElementById("modalBackdropCustom");
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "modalBackdropCustom";
            backdrop.className = "modal-backdrop fade show";
            document.body.appendChild(backdrop);
        }
    }
}

function dongModalCotTruyen() {
    dungTatCaAmThanh();
    if (storyReadingTimer) {
        clearTimeout(storyReadingTimer);
        storyReadingTimer = null;
    }
    const modalEl = document.getElementById("modalCotTruyen");
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
        let m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
    }
    modalEl.style.display = "none";
    modalEl.classList.remove("show");
    document.body.classList.remove("modal-open");
    const backdrop = document.getElementById("modalBackdropCustom");
    if (backdrop) backdrop.remove();
}
window.dongModalCotTruyen = dongModalCotTruyen;

async function moModalHocCotTruyen(param) {
    dungTatCaAmThanh();

    let danhSachTu = [];

    // Nếu bấm "Đổi câu chuyện khác" và đã có danh sách từ trước đó
    if (param === true && currentStoryWords && currentStoryWords.length > 0) {
        danhSachTu = currentStoryWords;
    } else if (param === "chu-de") {
        // Lấy từ danh sách chủ đề vừa tạo
        if (!dsTuChuDeHienTai || dsTuChuDeHienTai.length === 0) {
            alert("Vui lòng nhập chủ đề và bấm 'Đề xuất 10 từ mới' trước khi kể chuyện!");
            if (tenChuDeInput) tenChuDeInput.focus();
            return;
        }
        danhSachTu = dsTuChuDeHienTai.slice(0, 8).map(t => ({
            tiengAnh: (t.tiengAnh || "").trim(),
            tiengViet: (t.tiengViet || "").trim(),
            phienAm: (t.phienAm || "").trim()
        }));
    } else {
        // Thu thập từ theo chế độ học hiện tại
        if (chonTu && chonTu.checked) {
            const checkedBoxes = Array.from(document.querySelectorAll('#bangTatCa input.chk-tu-item[type="checkbox"]:checked'));
            if (checkedBoxes.length < 2) {
                alert("Vui lòng tích chọn từ 2 đến 8 từ trong danh sách bảng dưới để AI sáng tác câu chuyện liên tưởng!");
                if (bangTatCa) bangTatCa.scrollIntoView({ behavior: 'smooth' });
                return;
            }
            danhSachTu = checkedBoxes.slice(0, 8).map(chk => {
                const tr = chk.closest("tr");
                const tdEng = tr ? tr.querySelector(".tu-don-text")?.closest("td") : null;
                const tdViet = tdEng ? tdEng.nextElementSibling : null;
                const tdIpa = tdViet ? tdViet.nextElementSibling : null;
                return {
                    tiengAnh: tr?.querySelector(".tu-don-text")?.textContent.trim() || "",
                    tiengViet: tdViet?.textContent.trim() || "",
                    phienAm: tdIpa?.textContent.trim() || ""
                };
            }).filter(t => t.tiengAnh);
        } else if (theoBo && theoBo.checked) {
            if (!boHoc || !boHoc.value) {
                alert("Vui lòng chọn một bộ từ vựng trước khi kể chuyện!");
                if (boHoc) boHoc.focus();
                return;
            }
            const rows = Array.from(document.querySelectorAll("#bangTheoBo tbody tr"));
            if (rows.length === 0) {
                alert("Bộ từ này hiện chưa có từ vựng nào!");
                return;
            }
            let startIndex = 0;
            let endIndex = rows.length;
            if (phamViTuDen && phamViTuDen.checked && tuTu && denTu) {
                startIndex = Math.max(0, (parseInt(tuTu.value, 10) || 1) - 1);
                endIndex = Math.min(rows.length, parseInt(denTu.value, 10) || rows.length);
            }
            const selectedRows = rows.slice(startIndex, endIndex).slice(0, 8);
            danhSachTu = selectedRows.map(tr => {
                const tdEng = tr.querySelector(".tu-don-text")?.closest("td");
                const tdViet = tdEng ? tdEng.nextElementSibling : null;
                const tdIpa = tdViet ? tdViet.nextElementSibling : null;
                return {
                    tiengAnh: tr.querySelector(".tu-don-text")?.textContent.trim() || "",
                    tiengViet: tdViet?.textContent.trim() || "",
                    phienAm: tdIpa?.textContent.trim() || ""
                };
            }).filter(t => t.tiengAnh);
        } else if (theoChuDe && theoChuDe.checked) {
            if (!dsTuChuDeHienTai || dsTuChuDeHienTai.length === 0) {
                alert("Vui lòng nhập chủ đề và bấm 'Đề xuất 10 từ mới' trước khi kể chuyện!");
                if (tenChuDeInput) tenChuDeInput.focus();
                return;
            }
            danhSachTu = dsTuChuDeHienTai.slice(0, 8).map(t => ({
                tiengAnh: (t.tiengAnh || "").trim(),
                tiengViet: (t.tiengViet || "").trim(),
                phienAm: (t.phienAm || "").trim()
            }));
        } else {
            // Chế độ Ngẫu nhiên hoặc Từ sai: lấy 6 từ đầu tiên trong bảng tất cả từ
            const allRows = Array.from(document.querySelectorAll("#bangTatCa tbody tr"));
            if (allRows.length > 0) {
                const shuffled = allRows.slice().sort(() => 0.5 - Math.random()).slice(0, 6);
                danhSachTu = shuffled.map(tr => {
                    const tdEng = tr.querySelector(".tu-don-text")?.closest("td");
                    const tdViet = tdEng ? tdEng.nextElementSibling : null;
                    const tdIpa = tdViet ? tdViet.nextElementSibling : null;
                    return {
                        tiengAnh: tr.querySelector(".tu-don-text")?.textContent.trim() || "",
                        tiengViet: tdViet?.textContent.trim() || "",
                        phienAm: tdIpa?.textContent.trim() || ""
                    };
                }).filter(t => t.tiengAnh);
            }
        }
    }

    if (!danhSachTu || danhSachTu.length === 0) {
        alert("Không tìm thấy từ vựng nào để sáng tác câu chuyện. Vui lòng chọn từ hoặc bộ từ!");
        return;
    }

    currentStoryWords = danhSachTu;

    // Mở modal và hiển thị Loading
    moModalCotTruyenUI();
    const loadingEl = document.getElementById("storyLoading");
    const contentEl = document.getElementById("storyMainContent");
    const errorEl = document.getElementById("storyError");
    const btnRegen = document.getElementById("btnStoryRegen");

    if (loadingEl) loadingEl.style.display = "block";
    if (contentEl) contentEl.style.display = "none";
    if (errorEl) errorEl.style.display = "none";
    if (btnRegen) btnRegen.disabled = true;

    try {
        const resp = await fetch("/api/hoc/tao-cot-truyen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ danhSachTu: currentStoryWords })
        });

        if (resp.status === 401) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            window.location.href = "/dangnhap";
            return;
        }

        if (!resp.ok) {
            const errTxt = await resp.text();
            throw new Error(errTxt || "Không thể kết nối dịch vụ sáng tác câu chuyện AI");
        }

        const data = await resp.json();
        if (!data || !data.story) {
            throw new Error(data?.error || "Dữ liệu câu chuyện không hợp lệ");
        }

        currentStoryData = data.story;
        hienThiStory(currentStoryData);

        if (loadingEl) loadingEl.style.display = "none";
        if (contentEl) contentEl.style.display = "block";
    } catch (err) {
        console.error("Lỗi tạo câu chuyện AI:", err);
        if (loadingEl) loadingEl.style.display = "none";
        if (errorEl) {
            errorEl.style.display = "block";
            errorEl.textContent = "❌ " + (err.message || "Đã xảy ra lỗi khi sáng tác câu chuyện.");
        }
    } finally {
        if (btnRegen) btnRegen.disabled = false;
    }
}
window.moModalHocCotTruyen = moModalHocCotTruyen;

function hienThiStory(story) {
    if (!story) return;

    // 1. Tiêu đề & huy hiệu
    const titleEl = document.getElementById("storyTitle");
    if (titleEl) titleEl.textContent = story.tieuDe || "Câu chuyện liên tưởng ghi nhớ";

    const badgeEl = document.getElementById("storyWordCountBadge");
    if (badgeEl) badgeEl.textContent = "📚 " + (currentStoryWords.length) + " từ vựng";

    // 2. Bức tranh tâm trí (Visual Scene)
    const visualEl = document.getElementById("storyVisualScene");
    if (visualEl) visualEl.innerHTML = story.moTaHinhAnh || "";

    const guideEl = document.getElementById("storyVisualGuide");
    if (guideEl) {
        guideEl.innerHTML = "💡 <em>" + escapeHtml(story.goiYTuongTuong || "Nhắm mắt lại 5 giây và tưởng tượng rõ nét màu sắc, âm thanh của khung cảnh trên!") + "</em>";
    }

    // 3. Cốt truyện móc xích (Narrative)
    const rawStory = story.cotTruyen || "";
    const parsedStoryHtml = rawStory.replace(/\[([^\|\]]+)\|([^\|\]]+)\|([^\|\]]+)\]/g, function(match, w, ipa, vi) {
        const cleanW = w.trim();
        const cleanIpa = ipa.trim();
        const cleanVi = vi.trim();
        return `<button type="button" class="story-chip-tu" onclick="docTu('${escapeJs(cleanW)}')" title="Bấm để nghe phát âm giọng bản xứ chuẩn">
            <b>${escapeHtml(cleanW)}</b>
            <small class="story-chip-ipa">${escapeHtml(cleanIpa)}</small>
            <span class="story-chip-meaning">(${escapeHtml(cleanVi)})</span>
            <span class="story-chip-speaker">🔊</span>
        </button>`;
    });

    const narrativeBox = document.getElementById("storyNarrativeBox");
    if (narrativeBox) narrativeBox.innerHTML = parsedStoryHtml;

    // 4. Thử thách đục lỗ (Active Recall Cloze)
    const parsedClozeHtml = rawStory.replace(/\[([^\|\]]+)\|([^\|\]]+)\|([^\|\]]+)\]/g, function(match, w, ipa, vi) {
        const cleanW = w.trim();
        const cleanIpa = ipa.trim();
        const cleanVi = vi.trim();
        return `<span class="story-cloze-card" onclick="latTuDucLo(this, '${escapeJs(cleanW)}')" data-revealed="false">
            <span class="story-cloze-blank">
                [ ___ <b>${escapeHtml(cleanVi)}</b> ___ <span class="badge bg-warning text-dark ms-1">👁️ Nhớ ra chưa?</span> ]
            </span>
            <span class="story-cloze-revealed" style="display: none;">
                <b>${escapeHtml(cleanW)}</b>
                <small class="text-muted">${escapeHtml(cleanIpa)}</small>
                <span>(${escapeHtml(cleanVi)})</span>
                <span>🔊</span>
            </span>
        </span>`;
    });

    const clozeBox = document.getElementById("storyClozeBox");
    if (clozeBox) clozeBox.innerHTML = parsedClozeHtml;

    // 5. Bảng chi tiết từ & Mẹo âm thanh tương tự
    const wordsListEl = document.getElementById("storyWordsList");
    if (wordsListEl) {
        wordsListEl.innerHTML = "";
        const tuArr = Array.isArray(story.cacTuKhoa) ? story.cacTuKhoa : currentStoryWords;
        tuArr.forEach(w => {
            const eng = (w.tiengAnh || "").trim();
            const vi = (w.tiengViet || "").trim();
            const ipa = (w.phienAm || "").trim();
            const lienTuong = (w.lienTuong || "").trim();
            const viDu = (w.viDuNgan || w.viDu || "").trim();

            const col = document.createElement("div");
            col.className = "col-md-6 col-12";
            col.innerHTML = `
                <div class="story-word-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold text-primary mb-1">
                                ${escapeHtml(eng)}
                                <small class="text-muted fst-italic ms-1 font-monospace">${escapeHtml(ipa)}</small>
                            </h6>
                            <div class="fw-semibold text-dark small">${escapeHtml(vi)}</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-success rounded-circle px-2 py-1" onclick="docTu('${escapeJs(eng)}')" title="Nghe phát âm chuẩn">
                            🔊
                        </button>
                    </div>
                    ${lienTuong ? `<div class="story-lien-tuong-box">💡 <b>Mẹo liên tưởng:</b> ${escapeHtml(lienTuong)}</div>` : ''}
                    ${viDu ? `<div class="small text-muted mt-2 fst-italic">💬 "${escapeHtml(viDu)}"</div>` : ''}
                </div>
            `;
            wordsListEl.appendChild(col);
        });
    }

    chuyenCheDoStory('story');
}

function chuyenCheDoStory(cheDo) {
    const btnStory = document.getElementById("btnModeStory");
    const btnCloze = document.getElementById("btnModeCloze");
    const narrativeBox = document.getElementById("storyNarrativeBox");
    const clozeBox = document.getElementById("storyClozeBox");
    const toolbar = document.getElementById("clozeToolbar");
    const icon = document.getElementById("storyNarrativeIcon");
    const title = document.getElementById("storyNarrativeTitle");

    if (cheDo === 'cloze') {
        if (btnStory) btnStory.classList.remove("active");
        if (btnCloze) btnCloze.classList.add("active");
        if (narrativeBox) narrativeBox.style.display = "none";
        if (clozeBox) clozeBox.style.display = "block";
        if (toolbar) toolbar.style.display = "flex";
        if (icon) icon.textContent = "🧠";
        if (title) title.textContent = "Bước 2: Thử thách đục lỗ (Active Recall)";
    } else {
        if (btnStory) btnStory.classList.add("active");
        if (btnCloze) btnCloze.classList.remove("active");
        if (narrativeBox) narrativeBox.style.display = "block";
        if (clozeBox) clozeBox.style.display = "none";
        if (toolbar) toolbar.style.display = "none";
        if (icon) icon.textContent = "📖";
        if (title) title.textContent = "Bước 2: Cốt truyện móc xích liên tưởng";
    }
}
window.chuyenCheDoStory = chuyenCheDoStory;

function latTuDucLo(el, word) {
    if (!el) return;
    const blank = el.querySelector(".story-cloze-blank");
    const rev = el.querySelector(".story-cloze-revealed");
    if (!blank || !rev) return;

    const isRevealed = el.getAttribute("data-revealed") === "true";
    if (!isRevealed) {
        blank.style.display = "none";
        rev.style.display = "inline-flex";
        el.setAttribute("data-revealed", "true");
        if (word) docTu(word);
    } else {
        blank.style.display = "inline-flex";
        rev.style.display = "none";
        el.setAttribute("data-revealed", "false");
    }
}
window.latTuDucLo = latTuDucLo;

function latTatCaTuDucLo(moTatCa) {
    const cards = document.querySelectorAll("#storyClozeBox .story-cloze-card");
    cards.forEach(card => {
        const blank = card.querySelector(".story-cloze-blank");
        const rev = card.querySelector(".story-cloze-revealed");
        if (!blank || !rev) return;
        if (moTatCa) {
            blank.style.display = "none";
            rev.style.display = "inline-flex";
            card.setAttribute("data-revealed", "true");
        } else {
            blank.style.display = "inline-flex";
            rev.style.display = "none";
            card.setAttribute("data-revealed", "false");
        }
    });
}
window.latTatCaTuDucLo = latTatCaTuDucLo;

function docToanBoTuStory() {
    if (!currentStoryWords || currentStoryWords.length === 0) return;
    dungTatCaAmThanh();
    let idx = 0;
    function docTiep() {
        if (idx >= currentStoryWords.length) return;
        const w = currentStoryWords[idx].tiengAnh;
        docTu(w);
        idx++;
        storyReadingTimer = setTimeout(docTiep, 1600);
    }
    docTiep();
}
window.docToanBoTuStory = docToanBoTuStory;
