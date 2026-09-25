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