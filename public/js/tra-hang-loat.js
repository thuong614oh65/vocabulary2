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
    // XỬ LÝ SUBMIT FORM BẰNG NÚT TRA TỪ MỚI (AJAX KHÔNG TẢI LẠI TRANG)
    // =========================================================
    const formTraTu = document.getElementById("formTraTu");
    if (formTraTu) {
        formTraTu.addEventListener("submit", function (e) {
            e.preventDefault();
            thucHienTraTuMoi();
        });
    }

});

// =========================================================
// HÀM TRA TỪ MỚI THÔNG MINH (1 NÚT DUY NHẤT: AJAX TẠI CHỖ, KHÔNG CHUYỂN TRANG)
// =========================================================
async function thucHienTraTuMoi() {
    const textarea = document.getElementById("noiDung");
    const noiDung = textarea ? textarea.value.trim() : "";
    if (!noiDung) {
        hienThongBao("Vui lòng nhập hoặc dán nội dung văn bản / danh sách từ trước khi tra!", "danger");
        if (textarea) textarea.focus();
        return;
    }

    const btn = document.getElementById("btnTraTuMoi");
    const inlineLoadingBox = document.getElementById("inlineLoadingBox");
    const khuVucKetQua = document.getElementById("khuVucKetQua");

    const originalBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> <span>Đang tra từ...</span>';
    }
    if (inlineLoadingBox) {
        inlineLoadingBox.style.display = "block";
    }

    try {
        const resp = await fetch("/api/tu-vung/tra-tu-moi", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ noiDung })
        });

        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error(data.error || "Không thể tra từ mới. Vui lòng thử lại!");
        }

        const ketQua = data.ketQua || [];
        if (ketQua.length === 0) {
            hienThongBao("Không tìm thấy từ mới nào chưa có trong tài khoản của bạn!", "info");
            if (khuVucKetQua) khuVucKetQua.innerHTML = "";
            return;
        }

        renderKetQuaTable(ketQua, data.dsBo || [], data.tenBoGoiY || "Bộ mới", data.isParagraph);
        hienThongBao(`Đã tìm thấy ${ketQua.length} từ vựng mới!`, "success");

        if (khuVucKetQua) {
            khuVucKetQua.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } catch (err) {
        console.error("Lỗi tra từ mới:", err);
        hienThongBao(err.message || "Đã xảy ra lỗi khi tra từ mới!", "danger");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
        }
        if (inlineLoadingBox) {
            inlineLoadingBox.style.display = "none";
        }
    }
}
window.thucHienTraTuMoi = thucHienTraTuMoi;

function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escJs(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function renderKetQuaTable(ketQua, dsBo, tenBoGoiY, isParagraph) {
    const khuVuc = document.getElementById("khuVucKetQua");
    if (!khuVuc) return;

    const boSelectHtml = (dsBo && dsBo.length > 0) ? `
        <div class="col-md-6">
            <label class="form-label fw-bold text-primary mb-1">📁 Hoặc lưu vào bộ đã có sẵn:</label>
            <select class="form-select shadow-sm" id="selectBoLuu" name="boId" onchange="xuLyChonBo(this.value)">
                <option value="">-- Lưu thành bộ mới (theo tên ở trên) --</option>
                ${dsBo.map(bo => `<option value="${bo.id}">${escHtml(bo.tenBo)} (${bo.soLuongTu} từ)</option>`).join("")}
            </select>
        </div>` : "";

    const thongBaoQuet = isParagraph ? `
        <div class="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2 shadow-sm rounded-3">
            <span class="fs-4">✨</span>
            <div>
                <strong>Chế độ quét từ mới từ đoạn văn:</strong> Đã tự động lọc bỏ các tên riêng và những từ vựng đã có trong các bộ từ của bạn!
            </div>
        </div>` : "";

    const rowsHtml = ketQua.map((tu, idx) => `<tr>
        <td class="text-center text-muted fw-bold">${idx + 1}</td>
        <td><input type="hidden" name="tiengAnh" value="${escAttr(tu.tiengAnh)}" class="val-tieng-anh"><strong>${escHtml(tu.tiengAnh)}</strong></td>
        <td><input class="form-control form-control-sm" name="tiengViet" value="${escAttr(tu.tiengViet || '')}"></td>
        <td><input class="form-control form-control-sm" name="phienAm" value="${escAttr(tu.phienAm || '')}"></td>
        <td><input class="form-control form-control-sm" name="viDu" value="${escAttr(tu.viDu || '')}"></td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button>
        </td>
        <td class="text-center">
            <input type="checkbox" class="form-check-input chk-luu-item" checked onchange="capNhatDongLuu(this)">
        </td>
    </tr>`).join("");

    khuVuc.innerHTML = `
    <form action="/luu-bo" method="post" id="formLuuBo">
        <div class="main-card mt-4">
            ${thongBaoQuet}
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="m-0 text-success fw-bold">KẾT QUẢ TỪ MỚI (<span>${ketQua.length}</span> từ)</h4>
                <div class="small text-muted">Bỏ tích những từ bạn không muốn lưu</div>
            </div>
            <div class="row g-3 mb-3 p-3 bg-light rounded-3 border align-items-center">
                <div class="col-md-6">
                    <label class="form-label fw-bold text-success mb-1">🏷️ Tên bộ từ vựng:</label>
                    <input type="text" class="form-control shadow-sm" name="tenBo" id="inputTenBo" placeholder="${escAttr(tenBoGoiY || 'Bộ mới')}">
                </div>
                ${boSelectHtml}
            </div>
            <div class="table-responsive shadow-sm rounded-3">
                <table class="table table-bordered align-middle table-hover">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 50px;" class="text-center">STT</th>
                            <th style="width: 180px;">English</th>
                            <th style="width: 220px;">Nghĩa</th>
                            <th style="width: 160px;">Phiên âm</th>
                            <th>Ví dụ</th>
                            <th style="width: 60px;" class="text-center">Đọc</th>
                            <th style="width: 70px;" class="text-center">
                                <label class="d-inline-flex align-items-center gap-1 m-0" style="cursor: pointer;" title="Chọn / Bỏ chọn tất cả">
                                    <span>Lưu</span>
                                    <input type="checkbox" id="chkLuuTatCa" checked onchange="toggleChonTatCaLuu(this.checked)">
                                </label>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <span class="text-muted small">Đã chọn: <strong id="lblSoTuDuocChon" class="text-success">${ketQua.length}</strong> / ${ketQua.length} từ</span>
                <button type="submit" class="btn btn-success px-4 py-2 fw-bold shadow-sm" id="btnXacNhanLuu">💾 Lưu các từ đã chọn vào CSDL</button>
            </div>
        </div>
    </form>`;

    capNhatDemTuDuocChon();
}

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
