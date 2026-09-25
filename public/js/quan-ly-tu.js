let audioHienTai = null;
let soLanDoc = 0;

// =========================================================
// DỪNG TẤT CẢ ÂM THANH
// =========================================================
function dungTatCaAmThanh() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    if (audioHienTai) {
        audioHienTai.pause();
        audioHienTai.currentTime = 0;
        audioHienTai = null;
    }
}

// =========================================================
// BẮT ĐẦU ĐỌC TỪ BẰNG MP3 (GIỐNG PHẦN HỌC)
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
        window.phatAmThanh(tu, { rate: "+0%" });
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

    soLanDoc++;
    let maDoc = soLanDoc;

    batDauDocTu(tu, maDoc);
}

// =========================================================
// MỞ MODAL SỬA TỪ VỰNG
// =========================================================
function moModalSua(id, tiengAnh, tiengViet, phienAm, viDu, boId) {
    document.getElementById("modalTuId").value = id;
    document.getElementById("modalTiengAnh").value = tiengAnh || "";
    document.getElementById("modalTiengViet").value = tiengViet || "";
    document.getElementById("modalPhienAm").value = phienAm || "";
    document.getElementById("modalViDu").value = viDu || "";

    let boSelect = document.getElementById("modalBoId");
    if (boSelect && boId) {
        boSelect.value = boId;
    }

    let editModal = new bootstrap.Modal(document.getElementById("modalSuaTu"));
    editModal.show();
}

// =========================================================
// XÁC NHẬN VÀ XÓA TỪ VỰNG
// =========================================================
function xacNhanXoa(id, tiengAnh) {
    if (confirm("Bạn có chắc chắn muốn xóa từ \"" + tiengAnh + "\" không?")) {
        let formXoa = document.getElementById("formXoaTu");
        if (formXoa) {
            let boIdLoc = document.getElementById("boIdLocHienTai") ? document.getElementById("boIdLocHienTai").value : "";
            formXoa.action = "/quan-ly-tu/xoa/" + id + (boIdLoc ? "?boIdLoc=" + boIdLoc : "");
            formXoa.submit();
        }
    }
}

// =========================================================
// XÁC NHẬN VÀ XÓA TOÀN BỘ BỘ TỪ
// =========================================================
function xacNhanXoaBo(boId, tenBo, soLuongTu) {
    let thongBao = "⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA BỘ TỪ: \"" + tenBo + "\" KHÔNG?\n\n"
        + "• Tất cả " + (soLuongTu || 0) + " từ vựng bên trong bộ từ này cũng sẽ bị xóa vĩnh viễn!\n"
        + "• Hành động này không thể hoàn tác!";

    if (confirm(thongBao)) {
        let formXoaBo = document.getElementById("formXoaBo");
        if (formXoaBo) {
            formXoaBo.action = "/quan-ly-tu/xoa-bo/" + boId;
            formXoaBo.submit();
        }
    }
}


// =========================================================
// =========================================================
// TÌM KIẾM TỪ KHÓA TRÊN BẢNG
// =========================================================
function timKiemTu() {
    let input = document.getElementById("inputTimKiem");
    let filter = input.value.toLowerCase().trim();
    let rows = document.querySelectorAll("#bangTuVung tbody tr.hang-tu");
    let dem = 0;

    rows.forEach(function (row) {
        let tiengAnh = row.getAttribute("data-tieng-anh") || "";
        let tiengViet = row.getAttribute("data-tieng-viet") || "";
        let tenBo = row.getAttribute("data-ten-bo") || "";

        if (filter === "" || tiengAnh.includes(filter) || tiengViet.includes(filter) || tenBo.includes(filter)) {
            row.style.display = "";
            dem++;
        } else {
            row.style.display = "none";
        }
    });

    let emptyMessage = document.getElementById("khongCoKetQua");
    if (emptyMessage) {
        emptyMessage.style.display = (dem === 0 && rows.length > 0) ? "block" : "none";
    }

    let demSpan = document.getElementById("soTuHienThi");
    if (demSpan) {
        demSpan.textContent = dem;
    }
}

// =========================================================
// CHỌN BỘ ĐỂ LỌC
// =========================================================
function doiBoLoc() {
    let boSelect = document.getElementById("selectBoLoc");
    if (boSelect) {
        let boId = boSelect.value;
        if (boId) {
            window.location.href = "/quan-ly-tu?boId=" + boId;
        } else {
            window.location.href = "/quan-ly-tu";
        }
    }
}

// =========================================================
// MỞ MODAL ĐỔI TÊN BỘ TỪ NHANH (NÚT Ở HEADER)
// =========================================================
function moModalDoiTenBoNhanh() {
    let select = document.getElementById("selectBoCanSua");
    let input = document.getElementById("inputTenBoMoiQuanLy");
    if (select && select.options.length > 0) {
        let currentSelected = select.options[select.selectedIndex];
        if (currentSelected && input) {
            input.value = currentSelected.getAttribute("data-ten") || "";
        }
    }
    let editBoModal = new bootstrap.Modal(document.getElementById("modalSuaTenBo"));
    editBoModal.show();
    if (input) {
        setTimeout(() => input.focus(), 400);
    }
}

// =========================================================
// KHI CHỌN BỘ KHÁC TRONG MODAL ĐỔI TÊN
// =========================================================
function chonBoDoiTen(selectEl) {
    let input = document.getElementById("inputTenBoMoiQuanLy");
    if (selectEl && selectEl.selectedIndex >= 0 && input) {
        let selectedOption = selectEl.options[selectEl.selectedIndex];
        input.value = selectedOption.getAttribute("data-ten") || "";
        input.focus();
    }
}

// =========================================================
// MỞ MODAL SỬA TÊN BỘ TỪ (KHI BẤM NÚT Ở TỪNG BỘ)
// =========================================================
function moModalSuaBo(boId, tenBo) {
    let select = document.getElementById("selectBoCanSua");
    let input = document.getElementById("inputTenBoMoiQuanLy");
    if (select && boId) {
        select.value = boId;
    }
    if (input) {
        input.value = tenBo || "";
    }

    // Đóng modal quản lý bộ nếu đang mở
    let qlBoModalEl = document.getElementById("modalQuanLyBo");
    if (qlBoModalEl) {
        let qlBoModalInstance = bootstrap.Modal.getInstance(qlBoModalEl);
        if (qlBoModalInstance) {
            qlBoModalInstance.hide();
        }
    }

    let editBoModal = new bootstrap.Modal(document.getElementById("modalSuaTenBo"));
    editBoModal.show();
    if (input) {
        setTimeout(() => input.focus(), 400);
    }
}

window.docTu = docTu;
window.moModalSua = moModalSua;
window.moModalSuaBo = moModalSuaBo;
window.moModalDoiTenBoNhanh = moModalDoiTenBoNhanh;
window.chonBoDoiTen = chonBoDoiTen;
window.xacNhanXoa = xacNhanXoa;
window.xacNhanXoaBo = xacNhanXoaBo;
window.timKiemTu = timKiemTu;
window.doiBoLoc = doiBoLoc;


