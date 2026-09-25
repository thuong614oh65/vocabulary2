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
        previewName.textContent = file.name || "Ảnh dán từ clipboard";
        previewSize.textContent = (file.size / 1024).toFixed(1) + " KB";

        if (file.type.startsWith("image/")) {
            let reader = new FileReader();
            reader.onload = function (e) {
                previewThumb.src = e.target.result;
                previewThumb.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            previewThumb.src = "";
            previewThumb.style.display = "none";
        }

        previewContainer.style.display = "flex";
        if (btnTrichXuat) {
            btnTrichXuat.disabled = false;
        }

        // Tự động kích hoạt trích xuất luôn để tiết kiệm thao tác
        thucHienTrichXuat();
    }

    // Xóa file đã chọn
    if (btnXoaFile) {
        btnXoaFile.addEventListener("click", function (e) {
            e.stopPropagation();
            tepHienTai = null;
            if (fileInput) fileInput.value = "";
            previewContainer.style.display = "none";
            if (btnTrichXuat) btnTrichXuat.disabled = true;
        });
    }

    // =========================================================
    // GỌI API TRÍCH XUẤT TỪ VỰNG
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
            loadingText.textContent = tepHienTai.type.startsWith("image/")
                ? "🤖 Đang nhận diện từ vựng từ ảnh bằng AI..."
                : "📄 Đang đọc và trích xuất từ vựng từ file...";
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

                    // Cuộn nhẹ xuống vùng textarea
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
    // XỬ LÝ SUBMIT TRA HÀNG LOẠT SIÊU TỐC
    // =========================================================
    const formTraHangLoat = document.querySelector('form[action$="/tra-hang-loat"]');
    if (formTraHangLoat) {
        formTraHangLoat.addEventListener("submit", function (e) {
            const textarea = document.getElementById("noiDung");
            if (!textarea || !textarea.value.trim()) {
                e.preventDefault();
                hienThongBao("Vui lòng nhập ít nhất một từ vựng trước khi tra!", "danger");
                if (textarea) textarea.focus();
                return false;
            }
            const btn = document.getElementById("btnTraHangLoat") || formTraHangLoat.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> ⚡ Đang tra cứu siêu tốc...';
            }
        });
    }

});