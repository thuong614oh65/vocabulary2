document.addEventListener("DOMContentLoaded", function () {

    const fileInput = document.getElementById("fileInput");
    const dropZone = document.getElementById("dropZone");
    const previewContainer = document.getElementById("previewContainer");
    const previewThumb = document.getElementById("previewThumb");
    const previewName = document.getElementById("previewName");
    const previewSize = document.getElementById("previewSize");
    const btnXoaFile = document.getElementById("btnXoaFile");
    const btnTrichXuat = document.getElementById("btnTrichXuat");
    const loadingBox = document.getElementById("loadingBox");
    const loadingText = document.getElementById("loadingText");
    const noiDungTextarea = document.getElementById("noiDung");

    let tepHienTai = null;

    // =========================================================
    // XỬ LÝ CHỌN FILE
    // =========================================================
    if (dropZone && fileInput) {
        dropZone.addEventListener("click", function () {
            fileInput.click();
        });

        fileInput.addEventListener("change", function (e) {
            if (e.target.files && e.target.files.length > 0) {
                xuLyChonTep(e.target.files[0]);
            }
        });

        // Kéo thả file
        dropZone.addEventListener("dragover", function (e) {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", function (e) {
            e.preventDefault();
            dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", function (e) {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                xuLyChonTep(e.dataTransfer.files[0]);
            }
        });
    }

    // =========================================================
    // DÁN ẢNH TỪ CLIPBOARD (Ctrl + V)
    // =========================================================
    document.addEventListener("paste", function (e) {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                let item = e.clipboardData.items[i];
                if (item.type.indexOf("image") !== -1) {
                    let file = item.getAsFile();
                    if (file) {
                        xuLyChonTep(file);
                        break;
                    }
                }
            }
        }
    });

    function xuLyChonTep(file) {
        if (!file) return;

        tepHienTai = file;
        if (previewName) previewName.textContent = file.name || "Ảnh dán từ clipboard";
        if (previewSize) previewSize.textContent = (file.size / 1024).toFixed(1) + " KB";

        if (file.type.startsWith("image/")) {
            let reader = new FileReader();
            reader.onload = function (e) {
                if (previewThumb) {
                    previewThumb.src = e.target.result;
                    previewThumb.style.display = "block";
                }
            };
            reader.readAsDataURL(file);
        } else {
            if (previewThumb) {
                previewThumb.src = "";
                previewThumb.style.display = "none";
            }
        }

        if (previewContainer) previewContainer.style.display = "flex";
        if (btnTrichXuat) {
            btnTrichXuat.disabled = false;
        }

        thucHienTrichXuat();
    }

    // Xóa file đã chọn
    if (btnXoaFile) {
        btnXoaFile.addEventListener("click", function (e) {
            e.stopPropagation();
            tepHienTai = null;
            if (fileInput) fileInput.value = "";
            if (previewContainer) previewContainer.style.display = "none";
            if (btnTrichXuat) btnTrichXuat.disabled = true;
        });
    }

    // =========================================================
    // GỌI API TRÍCH XUẤT TỪ VỰNG TỪ ẢNH / TỆP
    // =========================================================
    if (btnTrichXuat) {
        btnTrichXuat.addEventListener("click", function () {
            thucHienTrichXuat();
        });
    }

    function thucHienTrichXuat() {
        if (!tepHienTai) {
            hienThongBao("Vui lòng chọn một ảnh hoặc file tài liệu trước!", "danger");
            return;
        }

        let formData = new FormData();
        formData.append("file", tepHienTai);

        if (loadingBox) {
            loadingBox.style.display = "block";
            if (loadingText) {
                loadingText.textContent = tepHienTai.type.startsWith("image/")
                    ? "🤖 Đang nhận diện từ vựng từ ảnh bằng AI..."
                    : "📄 Đang đọc và trích xuất từ vựng từ file...";
            }
        }

        if (btnTrichXuat) btnTrichXuat.disabled = true;

        fetch("/api/trich-xuat-tu", {
            method: "POST",
            body: formData
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (loadingBox) loadingBox.style.display = "none";
                if (btnTrichXuat) btnTrichXuat.disabled = false;

                if (data.thanhCong && data.noiDung) {
                    let noiDungCu = noiDungTextarea.value.trim();
                    if (noiDungCu.length > 0) {
                        noiDungTextarea.value = noiDungCu + "\n" + data.noiDung;
                    } else {
                        noiDungTextarea.value = data.noiDung;
                    }

                    hienThongBao(data.thongBao || "Đã trích xuất xong từ vựng!", "success");
                    noiDungTextarea.focus();
                    noiDungTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    hienThongBao(data.thongBao || "Không trích xuất được từ vựng từ tệp này!", "danger");
                }
            })
            .catch(function (error) {
                if (loadingBox) loadingBox.style.display = "none";
                if (btnTrichXuat) btnTrichXuat.disabled = false;
                console.error("Lỗi trích xuất:", error);
                hienThongBao("Lỗi trong quá trình trích xuất từ vựng: " + error.message, "danger");
            });
    }

    // =========================================================
    // HIỂN THỊ THÔNG BÁO DẠNG TOAST
    // =========================================================
    function hienThongBao(noiDung, loai) {
        let cu = document.getElementById("thongBaoToast");
        if (cu) cu.remove();

        let div = document.createElement("div");
        div.id = "thongBaoToast";
        div.className = "alert alert-" + (loai || "success") + " alert-toast alert-dismissible fade show";
        div.role = "alert";
        div.innerHTML = '<strong>' + (loai === 'danger' ? '⚠️ ' : '✅ ') + '</strong>' +
            '<span>' + noiDung + '</span>' +
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

        document.body.appendChild(div);

        setTimeout(function () {
            div.style.opacity = "0";
            div.style.transition = "opacity 0.5s ease";
            setTimeout(function () {
                div.remove();
            }, 500);
        }, 4000);
    }

    // Tự động ẩn thông báo Flash có sẵn
    const alerts = document.querySelectorAll(".alert-success:not(.alert-toast)");
    alerts.forEach(function (alert) {
        setTimeout(function () {
            alert.style.opacity = "0";
            alert.style.transition = "opacity 0.5s ease";
            setTimeout(function () {
                alert.remove();
            }, 500);
        }, 3000);
    });

    // =========================================================
    // SUBMIT TRA HÀNG LOẠT & QUÉT ĐOẠN VĂN
    // =========================================================
    const formTraHangLoat = document.getElementById("formTraTu") || document.querySelector('form[action$="/tra-hang-loat"]');
    if (formTraHangLoat) {
        formTraHangLoat.addEventListener("submit", function (e) {
            const textarea = document.getElementById("noiDung");
            if (!textarea || !textarea.value.trim()) {
                e.preventDefault();
                hienThongBao("Vui lòng nhập ít nhất một từ vựng hoặc đoạn văn trước khi tra!", "danger");
                if (textarea) textarea.focus();
                return false;
            }
            const btn = document.getElementById("btnTraHangLoat");
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> ⚡ Đang tra cứu...';
            }
        });
    }

});

// =========================================================
// CHUYỂN CHẾ ĐỘ NHẬP: DANH SÁCH TỪ vs ĐOẠN VĂN
// =========================================================
function chuyenCheDoThemTu(cheDo) {
    const inputCheDo = document.getElementById("cheDoQuet");
    const textarea = document.getElementById("noiDung");
    const btnTabTu = document.getElementById("btnTabTu");
    const btnTabDoanVan = document.getElementById("btnTabDoanVan");

    if (cheDo === "doan-van") {
        if (inputCheDo) inputCheDo.value = "doan-van";
        if (btnTabTu) { btnTabTu.className = "btn btn-outline-primary fw-semibold"; }
        if (btnTabDoanVan) { btnTabDoanVan.className = "btn btn-primary fw-semibold"; }
        if (textarea) {
            textarea.placeholder = "Dán hoặc viết đoạn văn tiếng Anh vào đây. Hệ thống sẽ tự động lọc bỏ các tên riêng và những từ vựng đã có trong tài khoản của bạn...";
            textarea.focus();
        }
    } else {
        if (inputCheDo) inputCheDo.value = "tu";
        if (btnTabTu) { btnTabTu.className = "btn btn-primary fw-semibold"; }
        if (btnTabDoanVan) { btnTabDoanVan.className = "btn btn-outline-primary fw-semibold"; }
        if (textarea) {
            textarea.placeholder = "hello\napple\ncomputer\n(Hoặc thêm ảnh/file ở trên để hệ thống tự điền)";
            textarea.focus();
        }
    }
}
window.chuyenCheDoThemTu = chuyenCheDoThemTu;

function thucHienQuetDoanVan() {
    const textarea = document.getElementById("noiDung");
    if (!textarea || !textarea.value.trim()) {
        alert("Vui lòng dán hoặc viết đoạn văn tiếng Anh cần quét từ mới!");
        if (textarea) textarea.focus();
        return;
    }
    const inputCheDo = document.getElementById("cheDoQuet");
    if (inputCheDo) inputCheDo.value = "doan-van";

    const btn = document.getElementById("btnQuetDoanVan");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> 🤖 Đang quét từ mới & lọc tên riêng...';
    }

    const form = document.getElementById("formTraTu") || textarea.closest("form");
    if (form) form.submit();
}
window.thucHienQuetDoanVan = thucHienQuetDoanVan;

// =========================================================
// CHỌN / BỎ CHỌN TỪ TRONG KẾT QUẢ ĐỂ LƯU
// =========================================================
function toggleChonTatCaLuu(isCheck) {
    const checkboxes = document.querySelectorAll(".chk-luu-item");
    checkboxes.forEach(chk => {
        chk.checked = !!isCheck;
        capNhatDongLuu(chk);
    });
    capNhatDemTuDuocChon();
}
window.toggleChonTatCaLuu = toggleChonTatCaLuu;

function capNhatDongLuu(chk) {
    const tr = chk.closest("tr");
    if (!tr) return;
    const isChecked = chk.checked;
    const inputs = tr.querySelectorAll("input:not(.chk-luu-item)");
    inputs.forEach(inp => {
        inp.disabled = !isChecked;
    });
    if (isChecked) {
        tr.classList.remove("table-secondary", "opacity-50");
    } else {
        tr.classList.add("table-secondary", "opacity-50");
    }
    capNhatDemTuDuocChon();
}
window.capNhatDongLuu = capNhatDongLuu;

function capNhatDemTuDuocChon() {
    const checked = document.querySelectorAll(".chk-luu-item:checked").length;
    const lbl = document.getElementById("lblSoTuDuocChon");
    if (lbl) lbl.textContent = checked;

    const btnLuu = document.getElementById("btnXacNhanLuu");
    if (btnLuu) {
        btnLuu.disabled = (checked === 0);
    }
}
window.capNhatDemTuDuocChon = capNhatDemTuDuocChon;

function xuLyChonBo(val) {
    const inputTenBo = document.getElementById("inputTenBo");
    if (!inputTenBo) return;
    if (val && val.trim() !== "") {
        inputTenBo.disabled = true;
        inputTenBo.classList.add("bg-secondary-subtle");
    } else {
        inputTenBo.disabled = false;
        inputTenBo.classList.remove("bg-secondary-subtle");
    }
}
window.xuLyChonBo = xuLyChonBo;

function docTu(tu) {
    if (!tu) return;
    if (window.phatAmThanh) {
        window.phatAmThanh(tu);
        return;
    }
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(tu);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
}
window.docTu = docTu;
