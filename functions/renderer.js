// =========================================================
// THYMELEAF-COMPATIBLE TEMPLATE RENDERER FOR CLOUDFLARE PAGES
// Renders the exact 22 HTML templates with 100% UI fidelity
// =========================================================

import { TEMPLATES } from "./data/templates.js";

export function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function escJs(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

// 1. Render dang-nhap.html
export function renderDangNhap(loi = null) {
    let html = TEMPLATES["dang-nhap"];
    if (loi) {
        html = html.replace(/<div\s+class="loi"[\s\S]*?<\/div>/i, `<div class="loi">${esc(loi)}</div>`);
    } else {
        html = html.replace(/<div\s+class="loi"[\s\S]*?<\/div>/i, "");
    }
    return html;
}

// 2. Render dang-ky.html
export function renderDangKy(loi = null) {
    let html = TEMPLATES["dang-ky"];
    if (loi) {
        html = html.replace(/<div\s+class="loi"[\s\S]*?<\/div>/i, `<div class="loi">${esc(loi)}</div>`);
    } else {
        html = html.replace(/<div\s+class="loi"[\s\S]*?<\/div>/i, "");
    }
    return html;
}

// 3. Render index.html
export function renderIndex() {
    return TEMPLATES["index"];
}

// 4. Render ipa.html & so-dem.html
export function renderIpa() {
    return TEMPLATES["ipa"];
}

export function renderSoDem() {
    return TEMPLATES["so-dem"];
}

// 5. Render hoc.html (with Select All, Select Set, Theo Bo, Chon Tung Tu, AI Chu De)
export function renderHoc({ hocDTO, dsBo = [], dsTatCa = [], dsTheoBo = [] }) {
    const kieuHoc = (hocDTO && hocDTO.kieuHoc) ? hocDTO.kieuHoc : "NGAU_NHIEN";
    const boIdChon = (hocDTO && hocDTO.boId) ? Number(hocDTO.boId) : null;
    const phamViBo = (hocDTO && hocDTO.phamViBo) ? hocDTO.phamViBo : "TAT_CA";
    const tuTu = (hocDTO && hocDTO.tuTu) ? hocDTO.tuTu : 1;
    const denTu = (hocDTO && hocDTO.denTu) ? hocDTO.denTu : (dsTheoBo.length > 0 ? dsTheoBo.length : 10);

    let html = TEMPLATES["hoc"];

    // Replace radio checked states for kieuHoc
    html = html.replace('id="ngauNhien"', `id="ngauNhien" name="kieuHoc" ${kieuHoc === "NGAU_NHIEN" ? "checked" : ""}`)
               .replace('id="tuSai"', `id="tuSai" name="kieuHoc" ${kieuHoc === "TU_SAI" ? "checked" : ""}`)
               .replace('id="theoBo"', `id="theoBo" name="kieuHoc" ${kieuHoc === "THEO_BO" ? "checked" : ""}`)
               .replace('id="chonTu"', `id="chonTu" name="kieuHoc" ${kieuHoc === "CHON_TUNG_TU" ? "checked" : ""}`)
               .replace('id="theoChuDe"', `id="theoChuDe" name="kieuHoc" ${kieuHoc === "THEO_CHU_DE" ? "checked" : ""}`)
               .replace(/th:field="\*\s*\{kieuHoc\}"/g, "");

    // Replace select #boHoc options
    const boOptionsHtml = `<option value="">Chọn bộ</option>` + dsBo.map(bo =>
        `<option value="${bo.id}" ${boIdChon === Number(bo.id) ? "selected" : ""}>${esc(bo.tenBo)}</option>`
    ).join("");
    html = html.replace(/<select id="boHoc"[\s\S]*?<\/select>/, `<select id="boHoc" name="boId" class="form-select mt-2" onchange="doiBo()">${boOptionsHtml}</select>`);

    // Replace phamViBo & tongSoTuBo
    html = html.replace(/<span id="tongSoTuBo"[^>]*>0<\/span>/, `<span id="tongSoTuBo">${dsTheoBo.length}</span>`);
    html = html.replace(/th:checked="\$\{hocDTO\.phamViBo == null or hocDTO\.phamViBo == 'TAT_CA'\}"/, phamViBo === "TAT_CA" ? "checked" : "");
    html = html.replace(/th:checked="\$\{hocDTO\.phamViBo == 'TU_DEN'\}"/, phamViBo === "TU_DEN" ? "checked" : "");
    html = html.replace(/th:value="\$\{hocDTO\.tuTu != null \? hocDTO\.tuTu : 1\}"/, `value="${tuTu}"`);
    html = html.replace(/th:value="\$\{hocDTO\.denTu != null[\s\S]*?\}"/, `value="${denTu}"`);
    html = html.replace(/th:field="\*\s*\{tenChuDe\}"/g, 'value=""');
    html = html.replace(/th:field="\*\s*\{chuDeTuJson\}"/g, 'value=""');

    // Render #bangTheoBo rows
    const rowsTheoBo = dsTheoBo.map((tu, idx) => {
        const isFirst = idx === 0 || (dsTheoBo[idx - 1].boId !== tu.boId);
        const rowspan = dsTheoBo.filter(x => x.boId === tu.boId).length;
        const boCell = isFirst ? `<td rowspan="${rowspan}" class="align-top td-bo-gop" style="vertical-align: top !important; padding-top: 12px !important;">${esc(tu.boTuVung?.tenBo || "")}</td>` : "";
        return `<tr>
            ${boCell}
            <td class="text-center fw-bold text-secondary">${idx + 1}</td>
            <td>
                <div class="tu-don-wrap">
                    <span class="tu-don-text">${esc(tu.tiengAnh)}</span>
                    <button type="button" class="btn-hd-icon" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
                </div>
            </td>
            <td>${esc(tu.tiengViet)}</td>
            <td>${esc(tu.phienAm)}</td>
            <td><button type="button" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button></td>
        </tr>`;
    }).join("");

    html = html.replace(/<div id="bangTheoBo"[\s\S]*?<\/tbody>/, `<div id="bangTheoBo" style="display:none;">
        <table class="table table-bordered table-hover">
            <thead>
                <tr><th>Bộ</th><th style="width: 60px;">STT</th><th>English</th><th>Nghĩa</th><th>Phiên âm</th><th>Đọc</th></tr>
            </thead>
            <tbody>${rowsTheoBo}</tbody>`);

    // Render #bangTatCa rows (with Select All, Deselect All, and Select Set buttons!)
    const rowsTatCa = dsTatCa.map((tu, idx) => {
        const isFirst = idx === 0 || (dsTatCa[idx - 1].boId !== tu.boId);
        const rowspan = dsTatCa.filter(x => x.boId === tu.boId).length;
        const boCell = isFirst ? `<td rowspan="${rowspan}" class="align-top td-bo-gop" style="vertical-align: top !important; padding-top: 12px !important;">
            <div class="d-flex flex-column align-items-start gap-2">
                <span>${esc(tu.boTuVung?.tenBo || "")}</span>
                <button type="button" class="btn-chon-ca-bo" onclick="chonTatCaTheoBo(${tu.boId}, this)" title="Chọn hoặc bỏ chọn tất cả các từ thuộc bộ này">☑️ Chọn cả bộ</button>
            </div>
        </td>` : "";
        return `<tr data-bo-id="${tu.boId}">
            ${boCell}
            <td>
                <div class="tu-don-wrap">
                    <span class="tu-don-text">${esc(tu.tiengAnh)}</span>
                    <button type="button" class="btn-hd-icon" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
                </div>
            </td>
            <td>${esc(tu.tiengViet)}</td>
            <td>${esc(tu.phienAm)}</td>
            <td><button type="button" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button></td>
            <td><input type="checkbox" name="tuIds" class="chk-tu-item" data-bo-id="${tu.boId}" onchange="capNhatDemTuDaChon()" value="${tu.id}"></td>
        </tr>`;
    }).join("");

    html = html.replace(/<span th:text="\$\{dsTatCa != null \? dsTatCa\.size\(\) : 0\}">0<\/span>/, `<span>${dsTatCa.length}</span>`);
    html = html.replace(/<tr th:each="tu,st : \$\{dsTatCa\}"[\s\S]*?<\/tr>/, rowsTatCa);

    return html;
}

// 6. Render hoc-bat-dau.html
export function renderHocBatDau({ hocDTO, dsHoc = [], cheDoHoc = "HOC" }) {
    const laPhanXa = cheDoHoc === "PHAN_XA";
    const rowsHtml = dsHoc.map(tu => `<tr>
        <td>
            <div class="tu-don-wrap">
                <span class="tu-don-text">${esc(tu.tiengAnh)}</span>
                <button type="button" class="btn-hd-icon" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
            </div>
        </td>
        <td>${esc(tu.tiengViet)}</td>
        <td>${esc(tu.phienAm)}</td>
        <td><button type="button" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button></td>
    </tr>`).join("");

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bắt đầu học</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/bat-dau-hoc.css?v=2">
    <link rel="stylesheet" href="/css/huong-dan-doc.css?v=12">
</head>
<body>
<div class="container mt-5">
    <h2 class="text-center">${laPhanXa ? "⚡ BẮT ĐẦU LUYỆN PHẢN XẠ" : "BẮT ĐẦU HỌC"}</h2>
    <div class="card mt-4">
        <div class="card-body">
            <h5>Kiểu học: <span>${esc(hocDTO?.kieuHoc || "NGAU_NHIEN")}</span></h5>
            ${hocDTO?.boId ? `<h5>Bộ: <span>${esc(hocDTO.boId)}</span></h5>` : ""}
            <h4 class="mt-4">
                <span>${laPhanXa ? "Các từ sẽ luyện phản xạ" : "Các từ sẽ học"}</span>
                <span class="text-muted fs-6 fw-normal">(${dsHoc.length} từ)</span>
            </h4>
            <table class="table table-bordered">
                <thead><tr><th>English</th><th>Nghĩa</th><th>Phiên âm</th><th>Đọc</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="d-flex flex-wrap gap-3 mt-4 align-items-center">
                ${!laPhanXa ? `<form action="/bat-dau-hoc" method="post" class="m-0">
                    <input type="hidden" name="kieuHoc" value="${esc(hocDTO?.kieuHoc || "")}">
                    <button type="submit" class="btn btn-success px-4 py-2 fw-bold shadow-sm">📖 Bắt đầu học</button>
                </form>` : `<a href="/luyen-phan-xa?kieuHoc=DANG_HOC" class="btn btn-warning px-4 py-2 fw-bold text-dark shadow-sm">⚡ Luyện phản xạ</a>`}
                <a href="/hoc" class="btn btn-outline-secondary px-3 py-2">← Chọn lại</a>
                <a href="/" class="btn btn-secondary px-3 py-2">🏠 Trang chủ</a>
            </div>
        </div>
    </div>
</div>
<script src="/js/global-audio.js?v=4"></script>
<script src="/js/hoc.js?v=8"></script>
<script src="/js/huong-dan-doc.js?v=18"></script>
</body>
</html>`;
}

// 7. Render hoc-chon.html (Lượt 1: English -> Vietnamese)
export function renderHocChon(tuDangHoc = []) {
    let html = TEMPLATES["hoc-chon"];
    const rowsHtml = tuDangHoc.map(tu => `<tr>
        <td>
            <div class="tu-hover">
                <div class="tu-don-wrap">
                    <span class="tu-don-text">${esc(tu.tiengAnh)}</span>
                    <button type="button" class="btn-hd-icon" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
                </div>
                <div class="thong-tin-tu">
                    <p>Phiên âm: <span>${esc(tu.phienAm)}</span></p>
                    <button type="button" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊 Đọc</button>
                    <button type="button" class="btn-hd-icon btn-hd-icon-prominent" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
                </div>
            </div>
        </td>
        <td>
            <input type="text" class="form-control cau-tra-loi" data-id="${tu.id}" data-tu="${esc(tu.tiengAnh)}" data-dap-an="${esc(tu.tiengViet)}">
            <div class="ket-qua mt-1"></div>
        </td>
        <td class="cot-cham">
            <button type="button" class="btn btn-success nut-cham" onclick="chamDiemTuNut(this)">✓</button>
        </td>
    </tr>`).join("");

    html = html.replace(/<tr th:each="tu : \$\{session\.tuDangHoc\}"[\s\S]*?<\/tr>/, rowsHtml);
    return html;
}

// 8. Render hoc-luot2.html (Lượt 2: Vietnamese -> English)
export function renderHocLuot2(dsHoc = []) {
    let html = TEMPLATES["hoc-luot2"];
    const rowsHtml = dsHoc.map(tu => `<tr>
        <td><span>${esc(tu.tiengViet)}</span></td>
        <td>
            <input type="text" class="form-control cau-tra-loi" data-id="${tu.id}" data-dap-an="${esc(tu.tiengAnh)}">
            <div class="ket-qua mt-1"></div>
        </td>
        <td class="cot-cham">
            <button type="button" class="btn btn-success nut-cham" onclick="chamDiemTuNut(this)">✓</button>
        </td>
    </tr>`).join("");

    html = html.replace(/<tr th:each="tu : \$\{dsHoc\}"[\s\S]*?<\/tr>/, rowsHtml);
    return html;
}

// 9. Render them-tu.html
export function renderThemTu({ noiDung = "", ketQua = null, dsBo = [], tenBoGoiY = "Bộ mới", thongBao = null }) {
    const alertHtml = thongBao ? `<div class="alert alert-success alert-toast">${esc(thongBao)}</div>` : "";
    const boSelectHtml = dsBo.length > 0 ? `<div class="col-md-6">
        <label class="form-label fw-bold text-primary mb-1">📁 Hoặc lưu vào bộ đã có sẵn:</label>
        <select class="form-select shadow-sm" id="selectBoLuu" name="boId" onchange="xuLyChonBo(this.value)">
            <option value="">-- Lưu thành bộ mới (theo tên ở trên) --</option>
            ${dsBo.map(bo => `<option value="${bo.id}">${esc(bo.tenBo)} (${bo.soLuongTu} từ)</option>`).join("")}
        </select>
    </div>` : "";

    const ketQuaHtml = Array.isArray(ketQua) ? `<div class="main-card mt-4">
        <h4 class="mb-3 text-success fw-bold">KẾT QUẢ TRA TỪ (<span>${ketQua.length}</span> từ)</h4>
        <div class="row g-3 mb-3 p-3 bg-light rounded-3 border align-items-center">
            <div class="col-md-6">
                <label class="form-label fw-bold text-success mb-1">🏷️ Tên bộ từ vựng:</label>
                <input type="text" class="form-control shadow-sm" name="tenBo" id="inputTenBo" placeholder="${esc(tenBoGoiY)}">
            </div>
            ${boSelectHtml}
        </div>
        <div class="table-responsive shadow-sm rounded-3">
            <table class="table table-bordered align-middle">
                <thead>
                    <tr><th style="width: 60px;">STT</th><th style="width: 200px;">English</th><th style="width: 250px;">Nghĩa</th><th style="width: 180px;">Phiên âm</th><th>Ví dụ</th></tr>
                </thead>
                <tbody>
                    ${ketQua.map((tu, idx) => `<tr>
                        <td class="text-center text-muted">${idx + 1}</td>
                        <td><input type="hidden" name="tiengAnh" value="${esc(tu.tiengAnh)}"><strong>${esc(tu.tiengAnh)}</strong></td>
                        <td><input class="form-control" name="tiengViet" value="${esc(tu.tiengViet)}"></td>
                        <td><input class="form-control" name="phienAm" value="${esc(tu.phienAm)}"></td>
                        <td><input class="form-control" name="viDu" value="${esc(tu.viDu)}"></td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>
        <button type="submit" class="btn btn-success mt-3 px-4 py-2 fw-bold">💾 Lưu vào CSDL</button>
    </div>` : "";

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thêm từ vựng</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/tra-hang-loat.css?v=3">
</head>
<body>
${alertHtml}
<div class="container mt-4 mb-5" style="max-width: 950px;">
    <div class="main-card">
        <h2 class="text-center mb-4">THÊM TỪ VỰNG</h2>
        <input type="file" id="fileInput" accept="image/*, .pdf, .txt, .csv" style="display: none;">
        <div class="upload-section" id="dropZone">
            <div class="upload-icon">📷 / 📄</div>
            <div class="upload-title">Thêm từ bằng Ảnh hoặc File</div>
            <p class="upload-desc">Bấm vào đây để chọn ảnh/file, hoặc kéo thả, hoặc dán trực tiếp (Ctrl + V) ảnh chụp màn hình</p>
        </div>
        <div id="previewContainer" class="file-badge-container" style="display: none;">
            <div class="file-info">
                <img id="previewThumb" class="file-thumb" src="" alt="Thumbnail" style="display: none;">
                <div><span class="file-name" id="previewName"></span><span class="text-muted small ms-2" id="previewSize"></span></div>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-success" id="btnTrichXuat">⚡ Trích xuất lại</button>
                <button type="button" class="btn btn-sm btn-outline-danger" id="btnXoaFile" title="Hủy chọn">✕</button>
            </div>
        </div>
        <div id="loadingBox" class="loading-box" style="display: none;">
            <div class="spinner-border spinner-border-sm text-success" role="status"></div>
            <span id="loadingText">Đang nhận diện từ vựng từ ảnh bằng AI...</span>
        </div>
        <form action="/tra-hang-loat" method="post">
            <label class="form-label fw-bold mb-2">Danh sách từ vựng (Mỗi dòng một từ):</label>
            <textarea id="noiDung" name="noiDung" class="form-control" rows="10" placeholder="hello&#10;apple&#10;computer&#10;(Hoặc thêm ảnh/file ở trên để hệ thống tự điền)">${esc(noiDung)}</textarea>
            <div class="mt-4 d-flex gap-2 flex-wrap">
                <button type="submit" id="btnTraHangLoat" class="btn btn-primary px-4 fw-bold">🔍 Tra hàng loạt</button>
                <a href="/" class="btn btn-secondary">🏠 Trang chủ</a>
                <a href="/tra-tu" class="btn btn-outline-primary">🔍 Tra từ &amp; Dịch</a>
                <a href="/quan-ly-tu" class="btn btn-outline-success">📋 Quản lí từ</a>
            </div>
        </form>
    </div>
    <form action="/luu-bo" method="post">${ketQuaHtml}</form>
</div>
<script src="/js/them-tu.js?v=2"></script>
</body>
</html>`;
}

// 10. Render quan-ly-tu.html
export function renderQuanLyTu({ dsTu = [], dsBo = [], boIdHienTai = null, thongBaoThanhCong = null, thongBaoLoi = null }) {
    const soLuongTuTheoBo = new Map();
    const boColorIndex = new Map();
    let colorIdx = 0;
    for (const tu of dsTu) {
        const idBo = tu.boTuVung ? tu.boTuVung.id : -1;
        soLuongTuTheoBo.set(idBo, (soLuongTuTheoBo.get(idBo) || 0) + 1);
        if (!boColorIndex.has(idBo)) boColorIndex.set(idBo, colorIdx++);
    }

    const rowsHtml = dsTu.map((tu, idx) => {
        const idBo = tu.boTuVung ? tu.boTuVung.id : -1;
        const isFirstOfBo = idx === 0 || ((dsTu[idx - 1].boTuVung ? dsTu[idx - 1].boTuVung.id : -1) !== idBo);
        const cIdx = boColorIndex.get(idBo) || 0;
        const rowClass = `hang-tu ${cIdx % 2 === 0 ? "bo-bg-pastel" : "bo-bg-white"}${isFirstOfBo && idx > 0 ? " border-top-bo" : ""}`;
        const rowspan = soLuongTuTheoBo.get(idBo) || 1;
        const tenBo = tu.boTuVung ? tu.boTuVung.tenBo : "Chưa phân bộ";

        const boCell = isFirstOfBo ? `<td rowspan="${rowspan}" class="td-bo-gop align-top" style="vertical-align: top !important; padding-top: 12px !important;" data-original-rowspan="${rowspan}">
            <div class="d-flex flex-column align-items-center gap-1">
                <span class="badge-bo-title">${esc(tenBo)}</span>
                ${tu.boTuVung ? `<span class="badge-bo-count">${tu.boTuVung.soLuongTu} từ</span>` : ""}
            </div>
        </td>` : "";

        return `<tr class="${rowClass}"
            data-tieng-anh="${esc((tu.tiengAnh || "").toLowerCase())}"
            data-tieng-viet="${esc((tu.tiengViet || "").toLowerCase())}"
            data-ten-bo="${esc(tenBo.toLowerCase())}"
            data-ten-bo-text="${esc(tenBo)}">
            <td class="text-center text-muted">${idx + 1}</td>
            ${boCell}
            <td>
                <div class="tu-don-wrap">
                    <span class="word-english">${esc(tu.tiengAnh)}</span>
                    <button type="button" class="btn-hd-icon" onclick="moHuongDanDoc(this, '${escJs(tu.tiengAnh)}', '${escJs(tu.phienAm)}', '${escJs(tu.tiengViet)}')" title="Xem hướng dẫn cách đọc chuẩn">🗣️</button>
                </div>
            </td>
            <td><span class="word-meaning">${esc(tu.tiengViet)}</span></td>
            <td><span class="word-phonetic">${esc(tu.phienAm || "-")}</span></td>
            <td class="text-center"><button type="button" class="btn-doc" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button></td>
            <td><div class="word-example">${esc(tu.viDu || "-")}</div></td>
            <td class="text-center"><span class="badge-sai ${(tu.soLanSai || 0) > 0 ? "badge-sai-nhieu" : "badge-sai-0"}">${tu.soLanSai || 0}</span></td>
            <td class="text-center">
                <div class="action-buttons justify-content-center">
                    <button type="button" class="btn btn-sm btn-outline-primary btn-action" onclick="moModalSua(${tu.id}, '${escJs(tu.tiengAnh)}', '${escJs(tu.tiengViet)}', '${escJs(tu.phienAm)}', '${escJs(tu.viDu)}', ${tu.boTuVung ? tu.boTuVung.id : "null"})">✏️ Sửa</button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-action" onclick="xacNhanXoa(${tu.id}, '${escJs(tu.tiengAnh)}')">🗑️ Xóa</button>
                </div>
            </td>
        </tr>`;
    }).join("");

    let html = TEMPLATES["quan-ly-tu"];
    // Replace flash alerts
    html = html.replace(/<div class="alert alert-success[\s\S]*?<\/div>/, thongBaoThanhCong ? `<div class="alert alert-success alert-dismissible fade show">${esc(thongBaoThanhCong)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>` : "");
    html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, thongBaoLoi ? `<div class="alert alert-danger alert-dismissible fade show">${esc(thongBaoLoi)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>` : "");

    // Replace selectBoLoc
    const boLocOpts = `<option value="" ${!boIdHienTai ? "selected" : ""}>Tất cả bộ từ</option>` + dsBo.map(bo =>
        `<option value="${bo.id}" ${Number(boIdHienTai) === Number(bo.id) ? "selected" : ""}>${esc(bo.tenBo)} (${bo.soLuongTu} từ)</option>`
    ).join("");
    html = html.replace(/<select id="selectBoLoc"[\s\S]*?<\/select>/, `<select id="selectBoLoc" class="form-select filter-select" onchange="doiBoLoc()">${boLocOpts}</select>`);
    html = html.replace(/<th:block th:if="\$\{boIdHienTai != null[\s\S]*?<\/th:block>\s*<\/th:block>/, "");
    html = html.replace(/<strong th:text="\$\{tongSoTu\}">0<\/strong>/, `<strong>${dsTu.length}</strong>`);
    html = html.replace(/th:value="\$\{boIdHienTai != null \? boIdHienTai : ''\}"/g, `value="${boIdHienTai || ""}"`);

    if (dsTu.length > 0) {
        html = html.replace(/<tr th:each="tu, stt : \$\{dsTu\}"[\s\S]*?<\/tr>/, rowsHtml);
        html = html.replace(/<div class="empty-state" th:if="\$\{dsTu == null \|\| dsTu\.isEmpty\(\)\}"[\s\S]*?<\/div>/, "");
    } else {
        html = html.replace(/<div class="table-responsive" th:if="\$\{dsTu != null && !dsTu\.isEmpty\(\)\}"[\s\S]*?<\/div>\s*(?=<!-- Thông báo không tìm thấy)/, "");
    }

    // Modal Bo options
    const modalBoOpts = dsBo.map(bo => `<option value="${bo.id}" data-ten="${esc(bo.tenBo)}">${esc(bo.tenBo)} (${bo.soLuongTu} từ)</option>`).join("");
    html = html.replace(/<select class="form-select" id="modalBoId"[\s\S]*?<\/select>/, `<select class="form-select" id="modalBoId" name="boId">${modalBoOpts}</select>`);
    html = html.replace(/<select class="form-select shadow-sm" id="selectBoCanSua"[\s\S]*?<\/select>/, `<select class="form-select shadow-sm" id="selectBoCanSua" name="boId" onchange="chonBoDoiTen(this)" required>${modalBoOpts}</select>`);

    const listBoItems = dsBo.map(bo => `<div class="list-group-item d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
        <div><h6 class="mb-0 fw-bold text-dark">${esc(bo.tenBo)}</h6><small class="text-muted">${bo.soLuongTu} từ vựng</small></div>
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="moModalSuaBo(${bo.id}, '${escJs(bo.tenBo)}')">✏️ Sửa tên</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="xacNhanXoaBo(${bo.id}, '${escJs(bo.tenBo)}', ${bo.soLuongTu})">🗑️ Xóa bộ</button>
        </div>
    </div>`).join("");
    html = html.replace(/<div class="list-group list-group-flush"[\s\S]*?<\/div>\s*<div class="p-4 text-center text-muted"[\s\S]*?<\/div>/, `<div class="list-group list-group-flush">${listBoItems}</div>`);

    return html;
}

// 11. Render luyen-de.html
export const DS_DE_MAU_LIST = [
    { id: 19, tenEn: "[Sample Exam] Danville City Tours", tenVi: "Tour Tham quan Danville (Đề mẫu chuẩn)", anhUrl: "/images/de-thi/image19.png" },
    { id: 16, tenEn: "[Text 1] Drilling Site Tour Schedule", tenVi: "Lịch trình Tham quan Khu công trường", anhUrl: "/images/de-thi/image16.png" },
    { id: 17, tenEn: "[Text 2] International Writers Conference", tenVi: "Hội nghị Nhà văn Quốc tế", anhUrl: "/images/de-thi/image17.png" },
    { id: 18, tenEn: "[Text 3] Southeast Delegation Tour Itinerary", tenVi: "Lịch trình Đoàn đại biểu Đông Nam", anhUrl: "/images/de-thi/image18.png" },
    { id: 15, tenEn: "Palm Island's New Employee Orientation", tenVi: "Định hướng Nhân viên Khu nghỉ dưỡng Palm Island", anhUrl: "/images/de-thi/image15.png" },
    { id: 13, tenEn: "High Elevation Rock Festival Tours", tenVi: "Tour Lễ hội Âm nhạc Rock High Elevation", anhUrl: "/images/de-thi/image13.png" },
    { id: 1, tenEn: "Annual Human Resources Conference", tenVi: "Hội nghị Nhân sự Thường niên", anhUrl: "/images/de-thi/image1.png" },
    { id: 2, tenEn: "Future of Education and Careers Seminar", tenVi: "Hội thảo Tương lai Giáo dục & Nghề nghiệp", anhUrl: "/images/de-thi/image2.png" },
    { id: 3, tenEn: "Resume: Murray O'Brien", tenVi: "Sơ yếu lý lịch: Kiến trúc sư Cảnh quan", anhUrl: "/images/de-thi/image3.png" },
    { id: 4, tenEn: "Anna Vales' Flower Shop Delivery", tenVi: "Đơn giao hàng Shop hoa Anna Vales", anhUrl: "/images/de-thi/image4.png" },
    { id: 5, tenEn: "Sunrise Pharmaceutical Quarterly Meeting", tenVi: "Họp Quản lý Quý - Dược phẩm Sunrise", anhUrl: "/images/de-thi/image5.png" },
    { id: 6, tenEn: "Seminars for You and Your Family", tenVi: "Chuỗi Hội thảo Gia đình - Union Bank", anhUrl: "/images/de-thi/image6.png" },
    { id: 7, tenEn: "Fall International Culture Events", tenVi: "Chuỗi Sự kiện Văn hóa Quốc tế Mùa Thu", anhUrl: "/images/de-thi/image7.png" },
    { id: 8, tenEn: "Henkel Film Festival", tenVi: "Lễ hội Điện ảnh Henkel", anhUrl: "/images/de-thi/image8.png" },
    { id: 9, tenEn: "Bristol Co. Annual Conference Meeting", tenVi: "Họp Thường niên Công ty Bristol", anhUrl: "/images/de-thi/image9.png" },
    { id: 10, tenEn: "New Employee Orientation", tenVi: "Buổi Định hướng Nhân viên Mới", anhUrl: "/images/de-thi/image10.png" },
    { id: 11, tenEn: "Resume: Bruce Geller", tenVi: "Sơ yếu lý lịch: Quản lý Nhân sự Bruce Geller", anhUrl: "/images/de-thi/image11.png" },
    { id: 12, tenEn: "Magnificent Moment Event Planner", tenVi: "Lịch trình Tổ chức Sự kiện Mandy Cooper", anhUrl: "/images/de-thi/image12.png" },
    { id: 14, tenEn: "Vista City Annual Festival", tenVi: "Lễ hội Thường niên Thành phố Vista", anhUrl: "/images/de-thi/image14.png" }
];

export function renderLuyenDe() {
    let html = TEMPLATES["luyen-de"];
    const cardsHtml = DS_DE_MAU_LIST.map(de => `<div class="sample-test-card" data-id="${de.id}">
                            <div class="thumb-wrapper">
                                <span class="badge-id">Đề #${de.id}</span>
                                <img src="${esc(de.anhUrl)}" alt="${esc(de.tenEn)}">
                            </div>
                            <div class="card-body-content">
                                <div>
                                    <div class="title-en">${esc(de.tenEn)}</div>
                                    <div class="title-vi">${esc(de.tenVi)}</div>
                                </div>
                                <button class="btn btn-outline-primary btn-sm w-100 rounded-pill fw-semibold btn-select-sample" data-id="${de.id}">
                                    Luyện đề này →
                                </button>
                            </div>
                        </div>`).join("\n");
    html = html.replace(/<div class="sample-tests-grid">[\s\S]*?<\/div>\s*<\/div>\s*<!-- TAB 2:/, `<div class="sample-tests-grid">\n${cardsHtml}\n                    </div>\n                </div>\n\n                <!-- TAB 2:`);
    return html;
}

// 12. Render luyen-phan-xa.html
export function renderLuyenPhanXa({ dsBo = [], boIdChon = null, tenBoChon = "Luyện Phản Xạ", kieuHoc = "THEO_BO", soTuDangHoc = 0 }) {
    let html = TEMPLATES["luyen-phan-xa"];
    const dangHocOpt = (soTuDangHoc && soTuDangHoc > 0)
        ? `<option value="DANG_HOC" ${kieuHoc === "DANG_HOC" ? "selected" : ""}>⚡ Các từ đang học (${soTuDangHoc} từ)</option>`
        : "";
    const boOpts = dsBo.map(b =>
        `<option value="${b.id}" ${(Number(boIdChon) === Number(b.id) && kieuHoc !== "DANG_HOC" && kieuHoc !== "TU_SAI" && kieuHoc !== "NGAU_NHIEN") ? "selected" : ""}>${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`
    ).join("");
    const selHtml = `<select id="selBoTu" class="form-select px-select" onchange="doiBoTuPhanXa()">
                    ${dangHocOpt}
                    ${boOpts}
                    <option value="TU_SAI" ${kieuHoc === "TU_SAI" ? "selected" : ""}>⚠️ Các từ hay làm sai (tối đa 25 từ)</option>
                    <option value="NGAU_NHIEN" ${kieuHoc === "NGAU_NHIEN" ? "selected" : ""}>🎲 Ngẫu nhiên 25 từ</option>
                </select>`;
    html = html.replace(/<select id="selBoTu"[\s\S]*?<\/select>/, selHtml);
    html = html.replace(/th:value="\$\{boIdChon\}"/g, `value="${boIdChon || ""}"`);
    html = html.replace(/th:value="\$\{kieuHoc\}"/g, `value="${esc(kieuHoc)}"`);
    html = html.replace(/th:text="\$\{tenBoChon\}"/g, `>${esc(tenBoChon)}<`);
    return html;
}

// 13. Render tra-tu.html
export function renderTraTu({ dsBo = [], tuKhoaBanDau = "", cheDoBanDau = "AUTO" }) {
    let html = TEMPLATES["tra-tu"];
    const opts = dsBo.length > 0
        ? dsBo.map(b => `<option value="${b.id}">${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("")
        : `<option value="">-- Chưa có bộ từ nào --</option>`;
    html = html.replace(/<option th:each="bo : \$\{dsBo\}"[\s\S]*?<\/option>/g, opts);
    html = html.replace(/<option value="" th:if="\$\{#lists\.isEmpty\(dsBo\)\}">[\s\S]*?<\/option>/g, "");
    html = html.replace(/th:value="\$\{tuKhoaBanDau\}"/g, `value="${esc(tuKhoaBanDau)}"`);
    html = html.replace(/th:value="\$\{cheDoBanDau\}"/g, `value="${esc(cheDoBanDau)}"`);
    return html;
}

// 14. Render dich-doan-van.html
export function renderDichDoanVan({
    dsBo = [],
    boIdsChon = [],
    chonTatCa = true,
    loi = null,
    doanVan = null,
    banDich = null,
    ketQua = null,
    danhGia = "",
    danhGiaLoai = "dung",
    nhanXet = "",
    loiHoacThieu = "",
    banDichGoiY = "",
    goiYCaiThien = "",
    tuVungTuCSDL = []
}) {
    const selectedSet = new Set((boIdsChon || []).map(Number));
    const boGridHtml = dsBo.length > 0
        ? `<div class="danh-sach-bo-grid mt-2">` + dsBo.map(bo => {
            const checked = chonTatCa || selectedSet.has(Number(bo.id));
            return `<div class="bo-check-item">
                <input class="form-check-input check-bo" type="checkbox" name="boIds" value="${bo.id}" id="bo_${bo.id}" ${checked ? "checked" : ""}>
                <label class="form-check-label fw-semibold ms-2" for="bo_${bo.id}">
                    <span class="ten-bo-text">${esc(bo.tenBo)}</span>
                    <span class="badge bg-secondary-subtle text-secondary ms-1" style="font-size: 11px;">${bo.soLuongTu} từ</span>
                </label>
            </div>`;
        }).join("") + `</div>`
        : `<div class="text-muted small mt-2"><em>Bạn chưa có bộ từ nào riêng. Hệ thống sẽ sử dụng toàn bộ từ vựng hiện có trong tài khoản của bạn.</em></div>`;

    const loiHtml = loi ? `<div class="loi">${esc(loi)}</div>` : "";

    const hiddenBoInputs = (boIdsChon || []).map(id => `<input type="hidden" name="boIds" value="${id}">`).join("");
    const khungChiaDoiHtml = doanVan ? `<div class="khung-chia-doi">
        <div class="doan-van">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h3 class="mb-0 text-success fw-bold">📖 Đoạn văn cần dịch</h3>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-primary btn-sm px-3 py-1" id="btnNgheDoanVan" title="Nghe toàn bộ đoạn văn">🔊 Nghe đoạn văn</button>
                    <button type="button" class="btn btn-outline-danger btn-sm px-3 py-1" id="btnDungNgheDoanVan" style="display: none;" title="Dừng đọc đoạn văn">⏹️ Dừng đọc</button>
                </div>
            </div>
            <div id="noiDungDoanVan" class="noi-dung-doan-van" data-doan-van="${esc(doanVan)}"></div>
        </div>
        <div class="phan-dich">
            <h3>✍️ Bản dịch của bạn</h3>
            <p class="mo-ta">Hãy tự dịch đoạn văn tiếng Anh sang tiếng Việt.</p>
            <form method="post" action="/dich-doan-van/kiem-tra" class="form-dich-submit">
                <input type="hidden" name="doanVan" value="${esc(doanVan)}">
                ${hiddenBoInputs}
                <input type="hidden" name="chonTatCa" value="${chonTatCa ? "true" : "false"}">
                <textarea name="banDich" class="o-nhap-ban-dich" placeholder="Nhập bản dịch tiếng Việt của bạn..." required>${esc(banDich || "")}</textarea>
                <button type="submit" class="btn-kiem-tra">✅ Kiểm tra bản dịch</button>
            </form>
        </div>
    </div>` : "";

    const ketQuaBanDichHtml = banDich ? `<div class="ket-qua-ban-dich">
        <h3>📝 Bản dịch của bạn</h3>
        <div class="noi-dung-ban-dich">${esc(banDich)}</div>
    </div>` : "";

    const ketQuaGeminiHtml = ketQua ? `<div class="ket-qua-gemini">
        <h3>🤖 Kết quả đánh giá</h3>
        <div class="phan-ket-qua phan-danh-gia">
            <h4>📊 Đánh giá tổng quan</h4>
            <div class="gia-tri-danh-gia ${esc(danhGiaLoai)}">${esc(danhGia)}</div>
        </div>
        ${nhanXet ? `<div class="phan-ket-qua"><h4>💬 Nhận xét</h4><div class="noi-dung-ket-qua">${esc(nhanXet)}</div></div>` : ""}
        ${loiHoacThieu ? `<div class="phan-ket-qua"><h4>❌ Lỗi hoặc ý thiếu</h4><div class="noi-dung-ket-qua">${esc(loiHoacThieu)}</div></div>` : ""}
        ${banDichGoiY ? `<div class="phan-ket-qua phan-ban-dich-mau"><h4>📖 Bản dịch gợi ý</h4><div class="noi-dung-ket-qua noi-dung-ban-dich-mau">${esc(banDichGoiY)}</div></div>` : ""}
        ${goiYCaiThien ? `<div class="phan-ket-qua"><h4>💡 Gợi ý cải thiện</h4><div class="noi-dung-ket-qua">${esc(goiYCaiThien)}</div></div>` : ""}
    </div>` : "";

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dịch đoạn văn</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/dich-doan-van.css">
    <link rel="stylesheet" href="/css/dich-doan-van-tu-vung.css">
</head>
<body>
<div class="dich-doan-van">
    <div class="khung">
        <div class="tieu-de">
            <div class="icon">📝</div>
            <h1>DỊCH ĐOẠN VĂN</h1>
            <p>Luyện dịch tiếng Anh bằng những từ vựng bạn đang học</p>
        </div>
        <div class="hanh-dong text-start">
            <form method="post" action="/dich-doan-van" id="formTaoDoanVan">
                <div class="card-chon-bo p-3 mb-3 border rounded-3 bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <label class="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                            <span>📚</span> <span>Chọn các bộ từ vựng để tạo đoạn văn:</span>
                        </label>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="chonTatCaBo(true)">✅ Chọn tất cả</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="chonTatCaBo(false)">❌ Bỏ chọn</button>
                        </div>
                    </div>
                    ${boGridHtml}
                </div>
                <button type="submit" class="btn-bat-dau" id="btnTaoDoanVan">✨ Tạo đoạn văn luyện dịch</button>
            </form>
        </div>
        ${loiHtml}
        ${khungChiaDoiHtml}
        ${ketQuaBanDichHtml}
        ${ketQuaGeminiHtml}
        <div class="quay-lai"><a href="/">← Quay lại trang chủ</a></div>
    </div>
</div>
<script>
    const tuVungTrongCSDL = ${JSON.stringify(tuVungTuCSDL || [])};
</script>
<script src="/js/global-audio.js?v=1"></script>
<script src="/js/dich-doan-van.js?v=2"></script>
</body>
</html>`;
}

// 15. Render dien-cho-trong.html
export function renderDienChoTrong({ dsBo = [], boIdChon = null, tongSoTu = 0, loi = null, doanVanRaw = null }) {
    let html = TEMPLATES["dien-cho-trong"];
    const opts = `<option value="" ${!boIdChon ? "selected" : ""}>-- Toàn bộ từ vựng của tôi (${tongSoTu} từ) --</option>` +
        dsBo.map(b => `<option value="${b.id}" ${Number(boIdChon) === Number(b.id) ? "selected" : ""}>${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("");
    html = html.replace(/<select name="boId" id="boId"[\s\S]*?<\/select>/, `<select name="boId" id="boId" class="form-select select-bo">${opts}</select>`);
    if (loi) {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, `<div class="alert alert-danger shadow-sm rounded-3">${esc(loi)}</div>`);
    } else {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, "");
    }
    if (doanVanRaw) {
        html = html.replace(/<div id="dataDoanVanRaw"[^>]*><\/div>/, `<div id="dataDoanVanRaw" style="display: none;">${esc(doanVanRaw)}</div>`);
    } else {
        html = html.replace(/<div class="card-box exercise-box" id="exerciseBox"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Bootstrap/, `</div></div><!-- Bootstrap`);
    }
    return html;
}

// 16. Render nghe-dien.html & nghe-viet-nghia.html
export function renderNgheDien({ tplName = "nghe-dien", dsBo = [], boIdChon = null, tongSoTu = 0, soCauChon = 15, capDoChon = 1, hinhThucChon = "CAU", loi = null, rawCauNgheDien = null }) {
    let html = TEMPLATES[tplName];
    const opts = `<option value="" ${!boIdChon ? "selected" : ""}>-- Toàn bộ từ vựng (${tongSoTu} từ) --</option>` +
        dsBo.map(b => `<option value="${b.id}" ${Number(boIdChon) === Number(b.id) ? "selected" : ""}>${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("");
    html = html.replace(/<select name="boId" id="boId"[\s\S]*?<\/select>/, `<select name="boId" id="boId" class="form-select select-bo">${opts}</select>`);
    if (loi) {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, `<div class="alert alert-danger shadow-sm rounded-3">${esc(loi)}</div>`);
    } else {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, "");
    }
    if (rawCauNgheDien) {
        html = html.replace(/<div id="dataRawCauNgheDien"[^>]*><\/div>/, `<div id="dataRawCauNgheDien" style="display: none;">${esc(rawCauNgheDien)}</div>`);
        html = html.replace(/<div id="dataHinhThucChon"[^>]*><\/div>/, `<div id="dataHinhThucChon" style="display: none;">${esc(hinhThucChon)}</div>`);
    } else {
        html = html.replace(/<div class="card-box exercise-box" id="exerciseBox"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Bootstrap/, `</div></div><!-- Bootstrap`);
    }
    return html;
}

// 17. Render luyen-noi.html
export function renderLuyenNoi({ dsBo = [], boIdChon = null, kieuHocChon = "NGAU_NHIEN", tongSoTu = 0, loi = null, dsLuyen = null }) {
    let html = TEMPLATES["luyen-noi"];
    const opts = dsBo.map(b => `<option value="${b.id}" ${Number(boIdChon) === Number(b.id) ? "selected" : ""}>${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("");
    html = html.replace(/<option th:each="bo : \$\{dsBo\}"[\s\S]*?<\/option>/g, opts);
    if (loi) {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, `<div class="alert alert-danger shadow-sm rounded-3 text-center">${esc(loi)}</div>`);
    } else {
        html = html.replace(/<div class="alert alert-danger[\s\S]*?<\/div>/, "");
    }
    if (dsLuyen && Array.isArray(dsLuyen) && dsLuyen.length > 0) {
        html = html.replace(/<div class="card-box mb-4" id="setupCard"[\s\S]*?<\/form>\s*<\/div>/, "");
        html = html.replace(/window\.danhSachTuLuyenNoi\s*=\s*[\s\S]*?;/, `window.danhSachTuLuyenNoi = ${JSON.stringify(dsLuyen)};`);
    } else {
        html = html.replace(/<div class="card-box practice-room" id="practiceRoom"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Bootstrap/, `</div></div><!-- Bootstrap`);
    }
    return html;
}

// 18. Render generic templates (so-do-danh-van, toeic-part2, toeic-part5, etc.)
export function renderGenericTemplate(name, dsBo = [], tongSoTu = 0, extra = {}) {
    let html = TEMPLATES[name] || "";
    if (dsBo && dsBo.length > 0) {
        const opts = dsBo.map(b => `<option value="${b.id}" ${Number(extra.boIdChon) === Number(b.id) ? "selected" : ""}>${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("");
        html = html.replace(/<option th:each="[a-zA-Z0-9_]+ : \$\{dsBo\}"[\s\S]*?<\/option>/g, opts);
    }
    html = html.replace(/<span[^>]*th:text="\$\{tongSoTu\}"[^>]*>0<\/span>/g, `<span>${tongSoTu}</span>`);
    html = html.replace(/<strong[^>]*th:text="\$\{tongSoTu\}"[^>]*>0<\/strong>/g, `<strong>${tongSoTu}</strong>`);
    return html;
}


