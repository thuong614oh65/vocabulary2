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
export function renderIndex(taiKhoan = null) {
    let html = TEMPLATES["index"];
    if (taiKhoan) {
        const tenHienThi = (taiKhoan.hoTen && String(taiKhoan.hoTen).trim())
            ? String(taiKhoan.hoTen).trim()
            : String(taiKhoan.tenDangNhap || "Học viên");
        html = html.replace(
            /<(strong|span)\s+th:text="\$\{session\.taiKhoan\.hoTen[^"]*\}">[\s\S]*?<\/\1>/g,
            `<$1>${esc(tenHienThi)}</$1>`
        );
    }

    const cardLuyenNho = `
            <!-- Luyện nhớ đoạn văn -->
            <a href="/luyen-nho-doan-van" class="nut nut-luyen-nho" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff;">
                <span class="nut-icon">📝</span>
                <span>Luyện nhớ đoạn văn</span>
            </a>
    `;
    if (!html.includes('/luyen-nho-doan-van')) {
        html = html.replace(/(href="\/hoc"[\s\S]*?<\/a>)/, `$1\n${cardLuyenNho}`);
    }

    return html;
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
    html = html.replace('/css/hoc.css?v=7', '/css/hoc.css?v=10');
    html = html.replace('/js/hoc.js?v=8', '/js/hoc.js?v=10');

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

    // Inject search bar right above the bangTatCa table (replace the first table tag after bangTatCa)
    const searchBarHtml = `<div class="mb-3">
            <div class="input-group">
                <span class="input-group-text bg-white border-end-0">🔍</span>
                <input type="text" id="timKiemTu" class="form-control border-start-0 ps-0"
                       placeholder="Tìm kiếm từ tiếng Anh, nghĩa, tên bộ..."
                       oninput="locBangTuVung(this.value)"
                       onkeydown="if(event.key==='Enter'){event.preventDefault();return false;}"
                       autocomplete="off">
                <button type="button" class="btn btn-outline-secondary" onclick="xoaTimKiem()" title="Xóa tìm kiếm">✕</button>
            </div>
            <div id="ketQuaTimKiem" class="text-muted small mt-1" style="display:none;"></div>
        </div>
        `;
    // Find the position of bangTatCa, then inject before its <table
    const bangTatCaStart = html.indexOf('id="bangTatCa"');
    if (bangTatCaStart >= 0) {
        const tableStart = html.indexOf('<table', bangTatCaStart);
        if (tableStart >= 0) {
            html = html.slice(0, tableStart) + searchBarHtml + html.slice(tableStart);
        }
    }

    // Inject "Kể chuyện ghi nhớ (AI Story)" & "Luyện nhớ đoạn văn" buttons into btn-action-group
    const btnAiStoryMain = `<button type="button"
                    id="btnKecChuyenAi"
                    onclick="moModalHocCotTruyen()"
                    class="btn btn-ai-story px-4 py-2 fw-bold text-white shadow-sm"
                    title="Phương pháp siêu trí nhớ: Bức tranh tâm trí sinh động &amp; Cốt truyện móc xích">
                🎬 Kể chuyện ghi nhớ (AI Story)
            </button>
            <a href="/luyen-nho-doan-van"
               class="btn btn-primary px-4 py-2 fw-bold shadow-sm"
               title="Luyện nhớ đoạn văn: Tự nhập hoặc AI sinh đoạn văn, học thuộc và gõ lại chấm từng từ tức thì">
                📝 Luyện nhớ đoạn văn
            </a>`;
    const actionGroupIdx = html.indexOf('btn-action-group');
    if (actionGroupIdx !== -1) {
        const phanXaIdx = html.indexOf('value="phan-xa"', actionGroupIdx);
        if (phanXaIdx !== -1) {
            const endPhanXa = html.indexOf('</button>', phanXaIdx);
            if (endPhanXa !== -1) {
                const insertPos = endPhanXa + '</button>'.length;
                html = html.slice(0, insertPos) + '\n\n            ' + btnAiStoryMain + html.slice(insertPos);
            }
        }
    }

    // Inject "Kể chuyện ghi nhớ (AI Story)" button into khungBangChuDe
    const btnAiStoryChuDe = `<button type="button"
                                class="btn btn-ai-story px-3 py-1 fw-bold text-white shadow-sm"
                                onclick="moModalHocCotTruyen('chu-de')"
                                title="Kể chuyện ghi nhớ 10 từ mới thuộc chủ đề này">
                            🎬 Kể chuyện ghi nhớ (AI Story)
                        </button>`;
    const doiTuKhacIdx = html.indexOf('deXuatTuMoiTheoChuDe(true)');
    if (doiTuKhacIdx !== -1) {
        const endBtn = html.indexOf('</button>', doiTuKhacIdx);
        if (endBtn !== -1) {
            const insertPos = endBtn + '</button>'.length;
            html = html.slice(0, insertPos) + '\n                        ' + btnAiStoryChuDe + html.slice(insertPos);
        }
    }

    // Modal Kể chuyện ghi nhớ (AI Story Mnemonic)
    const modalStoryHtml = `
<!-- =========================================================
     MODAL KỂ CHUYỆN GHI NHỚ (AI STORY MNEMONIC)
     Phương pháp: Visual Imagery + Story Chaining + Sound Mnemonic + Active Recall
     ========================================================= -->
<div class="modal fade" id="modalCotTruyen" tabindex="-1" aria-labelledby="modalCotTruyenLabel" aria-hidden="true" style="display:none;">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content story-modal-custom border-0 shadow-lg">
            
            <div class="modal-header story-modal-header text-white">
                <div class="d-flex align-items-center gap-2">
                    <span class="fs-3">🎬</span>
                    <div>
                        <h5 class="modal-title fw-bold mb-0" id="modalCotTruyenLabel">
                            Kể chuyện ghi nhớ liên tưởng (AI Story Mnemonic)
                        </h5>
                        <small class="opacity-75">Phương pháp siêu trí nhớ: Hình ảnh hóa + Cốt truyện móc xích + Active Recall</small>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white" onclick="dongModalCotTruyen()" aria-label="Close"></button>
            </div>

            <div class="modal-body p-4 story-modal-body" id="modalCotTruyenBody">
                
                <!-- 1. LOADING STATE -->
                <div id="storyLoading" class="text-center py-5" style="display:none;">
                    <div class="spinner-grow text-primary mb-3" style="width: 3.5rem; height: 3.5rem;" role="status"></div>
                    <h5 class="fw-bold text-primary mt-2" id="storyLoadingText">
                        🤖 AI Gemini đang sáng tác câu chuyện liên tưởng và thiết kế bức tranh tâm trí...
                    </h5>
                    <p class="text-muted small mt-1 mb-0">
                        Đang kết hợp phương pháp móc xích cốt truyện &amp; âm thanh tương tự để bạn nhớ sâu không bao giờ quên!
                    </p>
                </div>

                <!-- 2. CONTENT STATE -->
                <div id="storyMainContent" style="display:none;">
                    
                    <!-- Top Info bar -->
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pb-2 border-bottom">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-purple-subtle text-purple border border-purple px-3 py-2 fs-6 rounded-pill" id="storyWordCountBadge">
                                📚 6 từ vựng
                            </span>
                            <h5 class="fw-bold text-dark m-0" id="storyTitle">Tiêu đề câu chuyện</h5>
                        </div>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" id="btnModeStory" class="btn btn-outline-primary active fw-semibold" onclick="chuyenCheDoStory('story')">
                                📖 Xem câu chuyện
                            </button>
                            <button type="button" id="btnModeCloze" class="btn btn-outline-primary fw-semibold" onclick="chuyenCheDoStory('cloze')">
                                🧠 Thử thách đục lỗ
                            </button>
                        </div>
                    </div>

                    <!-- BƯỚC 1: BỨC TRANH TÂM TRÍ (MENTAL SCENE) -->
                    <div class="card mb-3 story-card-visual border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="fs-4">👁️</span>
                                <h6 class="fw-bold text-purple mb-0">Bước 1: Bức tranh tâm trí (Visual Mental Scene)</h6>
                            </div>
                            <div class="story-visual-desc mb-2" id="storyVisualScene">
                                <!-- Mo ta hinh anh -->
                            </div>
                            <div class="story-visual-guide alert alert-info py-2 px-3 mb-0 small" id="storyVisualGuide">
                                💡 <em>Gợi ý: Nhắm mắt lại 5 giây và tưởng tượng rõ nét màu sắc, âm thanh của khung cảnh trên!</em>
                            </div>
                        </div>
                    </div>

                    <!-- BƯỚC 2: CỐT TRUYỆN MÓC XÍCH HOẶC ĐỤC LỖ -->
                    <div class="card mb-3 story-card-narrative border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="fs-4" id="storyNarrativeIcon">📖</span>
                                    <h6 class="fw-bold text-dark mb-0" id="storyNarrativeTitle">Bước 2: Cốt truyện móc xích liên tưởng</h6>
                                </div>
                                <div id="clozeToolbar" style="display:none;" class="d-flex gap-2">
                                    <button type="button" class="btn btn-sm btn-outline-success" onclick="latTatCaTuDucLo(true)">
                                        👁️ Mở tất cả từ
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="latTatCaTuDucLo(false)">
                                        🔒 Ẩn tất cả từ
                                    </button>
                                </div>
                            </div>

                            <!-- Narrative text (Full story with audio chips) -->
                            <div id="storyNarrativeBox" class="story-text-container p-3 rounded mb-2">
                                <!-- Rendered with clickable audio chips -->
                            </div>

                            <!-- Cloze text (Active recall challenge) -->
                            <div id="storyClozeBox" class="story-text-container p-3 rounded mb-2" style="display:none;">
                                <!-- Rendered with interactive blank inputs / reveal pills -->
                            </div>

                            <div class="small text-muted fst-italic">
                                🔊 Bấm trực tiếp vào bất kỳ từ vựng nào trong câu chuyện để nghe phát âm giọng bản xứ chuẩn!
                            </div>
                        </div>
                    </div>

                    <!-- BƯỚC 3: BẢNG CHI TIẾT TỪ VỰNG & MẸO ÂM THANH TƯƠNG TỰ -->
                    <div class="card border-0 shadow-sm story-card-words">
                        <div class="card-body">
                            <div class="d-flex align-items-center gap-2 mb-3">
                                <span class="fs-4">💡</span>
                                <h6 class="fw-bold text-dark mb-0">Bước 3: Mẹo liên tưởng âm thanh (Sound Mnemonics) &amp; Chi tiết từ</h6>
                            </div>
                            <div id="storyWordsList" class="row g-2">
                                <!-- List of word cards -->
                            </div>
                        </div>
                    </div>

                </div>

                <!-- 3. ERROR STATE -->
                <div id="storyError" class="alert alert-danger my-3" style="display:none;"></div>

            </div>

            <div class="modal-footer story-modal-footer bg-light d-flex justify-content-between align-items-center">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-primary" id="btnStoryRegen" onclick="moModalHocCotTruyen(true)">
                        🔄 Đổi câu chuyện khác
                    </button>
                    <button type="button" class="btn btn-outline-success" id="btnStoryDocToanBo" onclick="docToanBoTuStory()">
                        🔊 Nghe đọc lần lượt
                    </button>
                </div>
                <button type="button" class="btn btn-secondary px-4" onclick="dongModalCotTruyen()">
                    Đóng
                </button>
            </div>

        </div>
    </div>
</div>
`;

    if (html.includes("</body>")) {
        html = html.replace("</body>", `${modalStoryHtml}\n<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>\n</body>`);
    } else {
        html += modalStoryHtml;
    }

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
export function renderThemTu({ noiDung = "", ketQua = null, dsBo = [], tenBoGoiY = "Bộ mới", thongBao = null, laQuetDoanVan = false }) {
    const alertHtml = thongBao ? `<div class="alert alert-success alert-toast">${esc(thongBao)}</div>` : "";
    const boSelectHtml = dsBo.length > 0 ? `<div class="col-md-6">
        <label class="form-label fw-bold text-primary mb-1">📁 Hoặc lưu vào bộ đã có sẵn:</label>
        <select class="form-select shadow-sm" id="selectBoLuu" name="boId" onchange="xuLyChonBo(this.value)">
            <option value="">-- Lưu thành bộ mới (theo tên ở trên) --</option>
            ${dsBo.map(bo => `<option value="${bo.id}">${esc(bo.tenBo)} (${bo.soLuongTu} từ)</option>`).join("")}
        </select>
    </div>` : "";

    const thongBaoQuet = laQuetDoanVan ? `
        <div class="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2 shadow-sm rounded-3">
            <span class="fs-4">✨</span>
            <div>
                <strong>Chế độ quét từ mới từ đoạn văn:</strong> Đã tự động lọc bỏ các tên riêng và những từ vựng đã có trong các bộ từ của bạn!
            </div>
        </div>
    ` : "";

    const ketQuaHtml = Array.isArray(ketQua) ? `<div class="main-card mt-4">
        ${thongBaoQuet}
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h4 class="m-0 text-success fw-bold">KẾT QUẢ TỪ MỚI (<span>${ketQua.length}</span> từ)</h4>
            <div class="small text-muted">Bỏ tích những từ bạn không muốn lưu</div>
        </div>
        <div class="row g-3 mb-3 p-3 bg-light rounded-3 border align-items-center">
            <div class="col-md-6">
                <label class="form-label fw-bold text-success mb-1">🏷️ Tên bộ từ vựng:</label>
                <input type="text" class="form-control shadow-sm" name="tenBo" id="inputTenBo" placeholder="${esc(tenBoGoiY)}">
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
                    ${ketQua.map((tu, idx) => `<tr>
                        <td class="text-center text-muted fw-bold">${idx + 1}</td>
                        <td><input type="hidden" name="tiengAnh" value="${esc(tu.tiengAnh)}" class="val-tieng-anh"><strong>${esc(tu.tiengAnh)}</strong></td>
                        <td><input class="form-control form-control-sm" name="tiengViet" value="${esc(tu.tiengViet)}"></td>
                        <td><input class="form-control form-control-sm" name="phienAm" value="${esc(tu.phienAm)}"></td>
                        <td><input class="form-control form-control-sm" name="viDu" value="${esc(tu.viDu)}"></td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-success" onclick="docTu('${escJs(tu.tiengAnh)}')">🔊</button>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input chk-luu-item" checked onchange="capNhatDongLuu(this)">
                        </td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <span class="text-muted small">Đã chọn: <strong id="lblSoTuDuocChon" class="text-success">${ketQua.length}</strong> / ${ketQua.length} từ</span>
            <button type="submit" class="btn btn-success px-4 py-2 fw-bold shadow-sm" id="btnXacNhanLuu">💾 Lưu các từ đã chọn vào CSDL</button>
        </div>
    </div>` : "";

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thêm từ vựng</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/tra-hang-loat.css?v=4">
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
        <form id="formTraTu" onsubmit="event.preventDefault(); thucHienTraTuMoi();">
            <div class="mb-2">
                <label class="form-label fw-bold text-dark mb-0 fs-6">📝 Nội dung văn bản hoặc danh sách từ tiếng Anh:</label>
                <div class="text-muted small mt-1">Hệ thống sẽ tự động nhận diện thông minh, lọc bỏ tên riêng và các từ vựng đã có trong tài khoản của bạn.</div>
            </div>
            <textarea id="noiDung" name="noiDung" class="form-control" rows="10" placeholder="Dán hoặc viết đoạn văn hoặc danh sách từ tiếng Anh vào đây (ví dụ: một bài báo, đoạn hội thoại, hay danh sách từ 1 từ/dòng)...">${esc(noiDung)}</textarea>
            
            <div id="inlineLoadingBox" class="p-3 my-3 bg-white rounded-3 border shadow-sm text-center" style="display: none;">
                <div class="spinner-border text-primary me-2" role="status" style="width: 1.8rem; height: 1.8rem;"></div>
                <span class="fw-semibold text-secondary" id="inlineLoadingText">Đang phân tích kỹ lưỡng và tra từ mới từ văn bản...</span>
            </div>

            <div class="mt-4 d-flex gap-2 flex-wrap align-items-center">
                <button type="button" id="btnTraTuMoi" class="btn btn-primary px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2" onclick="thucHienTraTuMoi()">
                    <span>🔍 Tra từ mới</span>
                </button>
                <a href="/" class="btn btn-secondary px-3 py-2">🏠 Trang chủ</a>
                <a href="/tra-tu" class="btn btn-outline-primary px-3 py-2">🔍 Tra từ &amp; Dịch</a>
                <a href="/quan-ly-tu" class="btn btn-outline-success px-3 py-2">📋 Quản lí từ</a>
            </div>
        </form>
    </div>
    <div id="khuVucKetQua">${ketQuaHtml ? `<form action="/luu-bo" method="post" id="formLuuBo">${ketQuaHtml}</form>` : ""}</div>
</div>
<script src="/js/global-audio.js?v=5"></script>
<script src="/js/them-tu.js?v=5"></script>
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




// =========================================================
// 19. Render luyen-nho-doan-van.html
// =========================================================
export function renderLuyenNhoDoanVan({ taiKhoan = null, dsBo = [], dsDoanVanDaLuu = [] }) {
    const dsBoOpts = dsBo.map(b => `<option value="${b.id}">${esc(b.tenBo)} (${b.soLuongTu} từ)</option>`).join("");
    const initialSavedJson = JSON.stringify(dsDoanVanDaLuu || []);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Luyện nhớ đoạn văn - Học thuộc &amp; Viết lại tức thì</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/luyen-nho-doan-van.css?v=4">
</head>
<body class="bg-light">

<!-- NAVBAR -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary-gradient shadow-sm sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="/luyen-nho-doan-van">
            <span class="fs-4">📝</span>
            <span>Luyện Nhớ Đoạn Văn</span>
        </a>
        <div class="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" class="btn btn-warning text-dark fw-bold btn-sm shadow-sm" onclick="moModalKhoBai()">
                📚 Kho bài đã lưu (<span id="badgeSoLuongBai">${dsDoanVanDaLuu.length}</span>)
            </button>
            <a href="/hoc" class="btn btn-outline-light btn-sm">📖 Học từ vựng</a>
            <a href="/" class="btn btn-light btn-sm fw-semibold">🏠 Trang chủ</a>
        </div>
    </div>
</nav>

<div class="container py-4" style="max-width: 980px;">

    <!-- =========================================================
         BƯỚC 1: KHUNG THIẾT LẬP / TẠO ĐOẠN VĂN (#cardSetup)
         ========================================================= -->
    <div class="card border-0 shadow-sm rounded-4 mb-4" id="cardSetup">
        <div class="card-body p-4">
            <div class="text-center mb-4">
                <h3 class="fw-bold text-dark">Phương Pháp Luyện Nhớ &amp; Gõ Lại Đoạn Văn</h3>
                <p class="text-muted mb-0">Học thuộc từng câu ➔ Thử thách trí nhớ bằng cách viết lại ➔ Chấm điểm từng từ thời gian thực!</p>
            </div>

            <!-- Tabs chọn phương thức -->
            <ul class="nav nav-pills nav-justified mb-4 p-1 bg-light rounded-pill border" id="pills-tab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active rounded-pill fw-bold" id="tab-ai-tab" data-bs-toggle="pill" data-bs-target="#tab-ai" type="button" role="tab">
                        🤖 AI sinh đoạn văn thông minh
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link rounded-pill fw-bold" id="tab-nhap-tab" data-bs-toggle="pill" data-bs-target="#tab-nhap" type="button" role="tab">
                        ✍️ Tự nhập / Dán đoạn văn của bạn
                    </button>
                </li>
            </ul>

            <div class="tab-content" id="pills-tabContent">
                
                <!-- TAB 1: AI SINH ĐOẠN VĂN -->
                <div class="tab-pane fade show active" id="tab-ai" role="tabpanel">
                    <div class="row g-3">
                        <div class="col-md-7">
                            <label class="form-label fw-bold">🏷️ Chủ đề đoạn văn:</label>
                            <input type="text" class="form-control" id="aiChuDe" value="Đời sống hàng ngày" placeholder="Ví dụ: Du lịch, Công nghệ, Khách sạn, Sở thích...">
                            <div class="d-flex flex-wrap gap-1 mt-2">
                                <span class="badge bg-light text-dark border chip-goiy" onclick="chonChuDe('Đời sống hàng ngày')">☕ Đời sống</span>
                                <span class="badge bg-light text-dark border chip-goiy" onclick="chonChuDe('Du lịch & Khám phá')">✈️ Du lịch</span>
                                <span class="badge bg-light text-dark border chip-goiy" onclick="chonChuDe('Công việc & Công sở')">💼 Công sở</span>
                                <span class="badge bg-light text-dark border chip-goiy" onclick="chonChuDe('Công nghệ & Tương lai')">🤖 Công nghệ</span>
                                <span class="badge bg-light text-dark border chip-goiy" onclick="chonChuDe('Sức khỏe & Lối sống')">🏃 Sức khỏe</span>
                            </div>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label fw-bold">📏 Độ dài đoạn văn:</label>
                            <select class="form-select" id="aiDoDai">
                                <option value="ngan">Ngắn gọn (30 - 50 từ, ~3 câu)</option>
                                <option value="vua" selected>Vừa phải (60 - 90 từ, ~5 câu) ⭐ Khuyên dùng</option>
                                <option value="dai">Dài thử thách (100 - 140 từ, ~7 câu)</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">📚 Lồng ghép từ vựng từ bộ của bạn (Tùy chọn):</label>
                            <select class="form-select" id="aiBoId">
                                <option value="">-- Sử dụng từ vựng đa dạng tự nhiên do AI đề xuất --</option>
                                <option value="ALL">⭐ Ưu tiên từ trong TẤT CẢ các bộ của tôi</option>
                                ${dsBoOpts}
                            </select>
                        </div>
                        <div class="col-12">
                            <div class="form-check form-switch mt-2">
                                <input class="form-check-input" type="checkbox" id="aiChkLuu" checked>
                                <label class="form-check-label fw-semibold" for="aiChkLuu">
                                    💾 Tự động lưu bài này vào kho bài học đã lưu để luyện lại sau này
                                </label>
                            </div>
                        </div>
                        <div class="col-12 mt-3 text-center">
                            <button type="button" class="btn btn-primary-gradient px-5 py-3 fw-bold text-white rounded-pill shadow" id="btnTaoDoanVanAi" onclick="taoDoanVanAi()">
                                ✨ AI Tạo Đoạn Văn &amp; Bắt Đầu Học Thuộc
                            </button>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: TỰ NHẬP ĐOẠN VĂN -->
                <div class="tab-pane fade" id="tab-nhap" role="tabpanel">
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label fw-bold">🏷️ Tiêu đề bài học (Tùy chọn):</label>
                            <input type="text" class="form-control" id="nhapTieuDe" placeholder="Ví dụ: My Favorite Hobby, An Inspiring Story...">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">📝 Nội dung đoạn văn tiếng Anh:</label>
                            <textarea class="form-control" id="nhapNoiDungEn" rows="6" placeholder="Dán hoặc gõ đoạn văn tiếng Anh bạn muốn học thuộc vào đây..."></textarea>
                        </div>
                        <div class="col-12">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="nhapChkLuu" checked>
                                <label class="form-check-label fw-semibold" for="nhapChkLuu">
                                    💾 Lưu bài này vào kho bài học đã lưu
                                </label>
                            </div>
                        </div>
                        <div class="col-12 mt-3 text-center">
                            <button type="button" class="btn btn-success px-5 py-3 fw-bold rounded-pill shadow" id="btnBatDauTuNhap" onclick="batDauTuNhap()">
                                🚀 Bắt Đầu Học Thuộc Đoạn Văn Này
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Gợi ý bài đã lưu -->
            <div id="quickSavedContainer" class="mt-4 pt-3 border-top" style="${dsDoanVanDaLuu.length > 0 ? '' : 'display:none;'}">
                <span class="text-muted small fw-semibold me-2">Hoặc chọn nhanh bài đã lưu:</span>
                <div class="d-inline-flex flex-wrap gap-2 align-items-center mt-2" id="quickSavedChips">
                    ${dsDoanVanDaLuu.slice(0, 5).map(b => `
                        <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" onclick="taiBaiDaLuu(${b.id})">
                            📄 ${esc(b.tieuDe)} <small class="text-muted">(${b.soTu} từ)</small>
                        </button>
                    `).join("")}
                </div>
            </div>

        </div>
    </div>

    <!-- SPINNER LOADING STATE -->
    <div id="aiLoadingBox" class="card border-0 shadow-sm rounded-4 text-center py-5 mb-4" style="display:none;">
        <div class="spinner-grow text-primary mb-3" style="width: 3.5rem; height: 3.5rem;" role="status"></div>
        <h5 class="fw-bold text-primary" id="aiLoadingTitle">🤖 AI đang sáng tác đoạn văn và tạo bản dịch...</h5>
        <p class="text-muted small mb-0">Đang chuẩn bị câu từ chuẩn ngữ pháp và lồng ghép từ vựng thông minh!</p>
    </div>

    <!-- =========================================================
         BƯỚC 2: GIAI ĐOẠN 1 - ĐỌC HIỂU SONG NGỮ SÁT TỪNG TỪ (#cardHocThuoc)
         ========================================================= -->
    <div class="card border-0 shadow-sm rounded-4 mb-4" id="cardHocThuoc" style="display:none;">
        <div class="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
                <span class="badge bg-primary text-white px-3 py-1 rounded-pill me-2">
                    BƯỚC 1: ĐỌC HIỂU SONG NGỮ SÁT TỪNG TỪ
                </span>
                <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 rounded-pill" id="badgeSoTuHocThuoc">
                    0 từ
                </span>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="quayLaiThietLap()">
                ← Đổi / Chọn bài khác
            </button>
        </div>
        <div class="card-body p-4">
            <h4 class="fw-bold text-dark text-center mb-1" id="tieuDeHocThuoc">Tiêu đề đoạn văn</h4>
            <p class="text-muted text-center small mb-3">1 dòng tiếng Anh &amp; 1 dòng tiếng Việt dịch sát nghĩa từng từ để nhận diện từ vựng ngay lập tức!</p>

            <!-- Audio controls -->
            <div class="audio-control-bar p-3 rounded-3 bg-light d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 border">
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-success fw-bold d-flex align-items-center gap-2 shadow-sm" id="btnPhatToanBai" onclick="phatToanBai()">
                        <span class="fs-5">🔊</span> <span>Nghe đọc toàn bài</span>
                    </button>
                    <button type="button" class="btn btn-outline-danger fw-bold" id="btnDungPhat" onclick="dungPhatAm()" style="display:none;">
                        ⏹️ Dừng
                    </button>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="text-muted small fw-semibold m-0">Tốc độ đọc:</label>
                    <select class="form-select form-select-sm" id="selectTocDoDoc" style="width: 105px;">
                        <option value="1.0">1.0x (Chuẩn)</option>
                        <option value="0.85" selected>0.85x (Vừa)</option>
                        <option value="0.75">0.75x (Chậm)</option>
                    </select>
                </div>
            </div>

            <!-- Interlinear Bilingual Sentences: 1 dòng Anh + 1 dòng Việt sát từng từ -->
            <div class="mb-4" id="boxVanBanHocThuoc">
                <!-- Rendered by JS: Each sentence has English on top and Literal Vietnamese underneath -->
            </div>

            <!-- Key vocabulary -->
            <div id="boxKeyVocab" class="mb-4" style="display:none;">
                <h6 class="fw-bold text-primary mb-2">💡 Từ vựng tiêu biểu trong bài:</h6>
                <div id="listKeyVocab" class="row g-2"></div>
            </div>

            <!-- Quick Batch Vocabulary Scanner -->
            <div class="p-3 rounded-3 bg-light border d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                <div>
                    <div class="fw-bold text-dark">🔍 Bạn muốn học các từ mới có trong bài này?</div>
                    <small class="text-muted">Tự động loại bỏ từ đã có trong tài khoản và tên riêng, hiển thị phiên âm &amp; nghĩa để lưu nhanh.</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-success fw-bold px-3 py-2 rounded-pill shadow-sm" onclick="moModalQuetTuMoi()">
                    ✨ Quét &amp; Tra từ mới trong bài
                </button>
            </div>

            <!-- CTA Transition to Step 2 -->
            <div class="text-center pt-3 border-top">
                <p class="text-muted mb-3">Đọc đối chiếu dòng tiếng Anh và dòng dịch sát 1-2 lần để hiểu cấu trúc câu!</p>
                <button type="button" class="btn btn-primary-gradient px-5 py-3 fw-bold text-white rounded-pill shadow-lg fs-5" onclick="batDauBuoc2DichTungCau(0)">
                    🚀 BẮT ĐẦU BƯỚC 2: DỊCH TỪNG CÂU SANG TIẾNG ANH (CÓ CHẤM ĐIỂM) →
                </button>
            </div>
        </div>
    </div>

    <!-- =========================================================
         BƯỚC 2: DỊCH TỪNG CÂU SANG TIẾNG ANH (#cardDichTungCau)
         ========================================================= -->
    <div class="card border-0 shadow-sm rounded-4 mb-4" id="cardDichTungCau" style="display:none;">
        <div class="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
                <span class="badge bg-primary text-white px-3 py-1 rounded-pill me-2">
                    BƯỚC 2: DỊCH TỪNG CÂU (CHẤM TỨC THỜI)
                </span>
                <span class="fw-bold text-dark" id="tieuDeDichCau">Tiêu đề bài</span>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="hienThiGiaiDoanHocThuoc()">
                    📖 Xem lại bài học
                </button>
                <button type="button" class="btn btn-sm btn-outline-success fw-bold" onclick="batDauBuoc3NhapToanBai()">
                    🚀 Nhảy tới Bước 3: Gõ toàn bài →
                </button>
            </div>
        </div>

        <div class="card-body p-4">
            
            <!-- Sentence Navigator Bar -->
            <div class="sentence-nav-bar d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 shadow-sm">
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-sm btn-outline-primary fw-bold" id="btnPrevDichCau" onclick="chuyenCauDichRelative(-1)" title="Câu trước">
                        ◀ Câu trước
                    </button>
                    <span id="lblChiSoCau" class="fw-bold text-dark px-2">Câu 1 / 1</span>
                    <button type="button" class="btn btn-sm btn-outline-primary fw-bold" id="btnNextDichCau" onclick="chuyenCauDichRelative(1)" title="Câu sau">
                        Câu sau ▶
                    </button>
                </div>
                
                <div id="dichSentencePillsContainer" class="d-flex gap-1 flex-wrap">
                    <!-- 1, 2, 3... pills rendered by JS -->
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-sm btn-outline-success" onclick="phatAmCauHienTai()" title="Nghe phát âm chuẩn của câu tiếng Anh này">
                        🔊 Nghe câu
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="liecCauHienTai()" title="Xem nhanh đáp án câu tiếng Anh trong 3 giây">
                        👁️ Đáp án (3s)
                    </button>
                </div>
            </div>

            <!-- Vietnamese Literal Prompt Card -->
            <div class="vietnamese-prompt-card p-4 mb-3 shadow-sm">
                <div class="small text-muted fw-bold mb-2 d-flex align-items-center gap-1">
                    <span>🇻🇳 DỊCH CÂU NÀY SANG TIẾNG ANH:</span>
                </div>
                <div class="fs-4 fw-bold text-primary" id="promptCauTiengViet">
                    <!-- Vietnamese literal sentence rendered by JS -->
                </div>
            </div>

            <!-- Typing Input Textarea -->
            <div class="mb-3 position-relative">
                <textarea id="inputDichCau"
                          class="form-control form-control-lg fw-bold"
                          rows="3"
                          placeholder="Gõ câu tiếng Anh tương ứng vào đây... (Bấm Enter để chấm điểm)"
                          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chamDiemCauHienTai();}"></textarea>
                
                <div id="smartSuggestionBadge" class="smart-suggestion-pill mt-2" style="display:none;"></div>
            </div>

            <!-- Action Buttons Row -->
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-outline-info fw-bold btn-sm rounded-pill shadow-sm" onclick="goiYTuTiepTheoChoCau()" title="Tự động phát hiện vị trí bạn đã gõ và gợi ý từ tiếp theo">
                        💡 Gợi ý từ tiếp theo
                    </button>
                    <button type="button" class="btn btn-outline-success btn-sm rounded-pill" onclick="phatAmCauHienTai()">
                        🔊 Nghe câu chuẩn
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill" onclick="liecCauHienTai()">
                        👁️ Xem đáp án (3s)
                    </button>
                </div>

                <button type="button" class="btn btn-success px-4 py-2 fw-bold rounded-pill shadow-sm fs-6" onclick="chamDiemCauHienTai()">
                    ✔️ CHẤM ĐIỂM CÂU NÀY
                </button>
            </div>

            <!-- Quick Peek Overlay Box -->
            <div id="boxPeekOverlayCau" class="alert alert-warning py-3 px-4 shadow-sm rounded-3 mt-2 mb-3" style="display:none;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="text-dark">👁️ Câu tiếng Anh chuẩn (Tự ẩn sau <span id="peekCountdownCau">3</span>s):</strong>
                </div>
                <div id="peekContentCau" class="text-dark fst-italic fs-5"></div>
            </div>

            <!-- Diff Result & Feedback Box -->
            <div id="boxDiffResult" class="diff-result-box mb-4 shadow-sm" style="display:none;">
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom flex-wrap gap-2">
                    <span class="fw-bold text-dark">📊 Kết quả chấm điểm:</span>
                    <span id="diffScoreBadge" class="badge bg-success fs-6">100%</span>
                </div>
                
                <div class="small text-muted mb-2">
                    <span class="badge bg-success-subtle text-success me-1">Xanh lá: Đúng</span>
                    <span class="badge bg-danger-subtle text-danger me-1">Đỏ: Sai</span>
                    <span class="badge bg-warning-subtle text-warning me-1">Vàng: Thiếu</span>
                </div>

                <div id="diffTokensContainer" class="my-3">
                    <!-- Rendered by diff algorithm -->
                </div>

                <div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="chuyenDenCauDich(currentSentenceIdx)">
                        🔄 Làm lại câu này
                    </button>
                    <button type="button" class="btn btn-sm btn-primary fw-bold px-3" id="btnTiepTucCau" onclick="chuyenCauDichRelative(1)">
                        Tiếp tục sang câu tiếp theo ▶
                    </button>
                </div>
            </div>

            <!-- Step 3 CTA Button -->
            <div class="text-center pt-3 border-top mt-4">
                <button type="button" class="btn btn-primary-gradient px-5 py-3 fw-bold text-white rounded-pill shadow fs-5" onclick="batDauBuoc3NhapToanBai()">
                    🚀 ĐÃ XONG CÁC CÂU - BƯỚC 3: NHẬP TOÀN BÀI &amp; NỘP CHẤM →
                </button>
            </div>

        </div>
    </div>

    <!-- =========================================================
         BƯỚC 3: NHẬP TOÀN BÀI & NỘP CHẤM (#cardNhapToanBai)
         ========================================================= -->
    <div class="card border-0 shadow-sm rounded-4 mb-4" id="cardNhapToanBai" style="display:none;">
        <div class="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
                <span class="badge bg-success text-white px-3 py-1 rounded-pill me-2">
                    BƯỚC 3: NHẬP TOÀN BÀI &amp; NỘP CHẤM
                </span>
                <span class="fw-bold text-dark" id="tieuDeToanBai">Tiêu đề bài</span>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="hienThiGiaiDoanHocThuoc()">
                    📖 Xem bài học
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="batDauBuoc2DichTungCau(0)">
                    ✍️ Quay lại dịch từng câu
                </button>
            </div>
        </div>

        <div class="card-body p-4">
            
            <!-- Reference Box: Sườn các câu tiếng Việt -->
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold text-dark small">🇻🇳 Dựa vào sườn các câu tiếng Việt dưới đây để nhập lại toàn bài tiếng Anh:</span>
                    <span class="small text-muted">Tổng cộng: <strong id="lblTongSoTuToanBai">0</strong> từ</span>
                </div>
                <div class="passage-reference-box p-3 bg-light" id="boxThamKhaoToanBai">
                    <!-- Sentences rendered by JS -->
                </div>
            </div>

            <!-- Full Passage Textarea -->
            <div class="mb-3 position-relative">
                <textarea id="inputToanBai"
                          class="form-control passage-input-textarea"
                          rows="8"
                          placeholder="Nhập toàn bộ đoạn văn tiếng Anh vào đây... Bạn có thể bấm 'Gợi ý từ tiếp theo' nếu bị tắc!"></textarea>
            </div>

            <!-- Toolbar & Submit -->
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <button type="button" class="btn btn-outline-info fw-bold rounded-pill shadow-sm" onclick="goiYTuTiepTheoToanBai()" title="Gợi ý từ tiếp theo của toàn bài">
                        💡 Gợi ý từ tiếp theo
                    </button>
                    <div id="toanBaiSuggestionBadge" class="smart-suggestion-pill" style="display:none;"></div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="p-2 bg-light rounded-3 border">
                        <small class="text-muted">⏱️ Thời gian:</small>
                        <span id="toanBaiTimer" class="fw-bold text-dark font-monospace fs-6">00:00</span>
                    </div>

                    <button type="button" class="btn btn-primary-gradient px-5 py-3 fw-bold text-white rounded-pill shadow-lg fs-5" onclick="nopBaiToanBo()">
                        📝 NỘP BÀI &amp; CHẤM ĐIỂM TOÀN BÀI
                    </button>
                </div>
            </div>

        </div>
    </div>

</div>

<!-- =========================================================
     MODAL QUÉT & TRÍCH XUẤT TỪ MỚI TRONG BÀI (#modalQuetTuMoi)
     ========================================================= -->
<div class="modal fade" id="modalQuetTuMoi" tabindex="-1" aria-labelledby="modalQuetTuMoiLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title fw-bold" id="modalQuetTuMoiLabel">🔍 Quét &amp; Tra Từ Mới Trong Đoạn Văn</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <div id="quetLoadingBox" class="text-center py-4">
                    <div class="spinner-border text-success mb-2" role="status"></div>
                    <div class="fw-bold text-dark">🤖 AI đang phân tích bài học, loại trừ từ đã có và tên riêng...</div>
                </div>

                <div id="quetEmptyBox" class="text-center py-4 text-muted" style="display:none;">
                    🎉 Tất cả từ vựng trong bài này đều đã có trong các bộ học của bạn hoặc là từ thông dụng cơ bản!
                </div>

                <div id="quetResultBox" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <span class="fw-bold text-dark">
                            Tìm thấy: <span class="badge bg-success" id="quetCountBadge">0 từ</span>
                        </span>
                        <div class="d-flex align-items-center gap-2">
                            <label class="small text-muted fw-bold">Lưu vào bộ:</label>
                            <select id="selectBoDeLuuTu" class="form-select form-select-sm" style="max-width: 250px;">
                                <option value="">-- Tự động tạo bộ mới theo bài này --</option>
                                ${dsBoOpts}
                            </select>
                        </div>
                    </div>

                    <div class="table-responsive border rounded-3 mb-3" style="max-height: 380px;">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 40px;" class="text-center">
                                        <input type="checkbox" class="form-check-input" checked onclick="chonTatCaTuMoi(this)">
                                    </th>
                                    <th>Từ tiếng Anh</th>
                                    <th>Phiên âm</th>
                                    <th>Nghĩa tiếng Việt</th>
                                    <th style="width: 50px;">Phát âm</th>
                                </tr>
                            </thead>
                            <tbody id="quetTableBody">
                                <!-- Rendered by JS -->
                            </tbody>
                        </table>
                    </div>

                    <div class="text-end">
                        <button type="button" class="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm" id="btnLuuTuMoiVaoBo" onclick="luuTatCaTuMoiDaChon()">
                            💾 Lưu các từ đã chọn vào Bộ học
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
        </div>
    </div>
</div>

<!-- =========================================================
     MODAL KHO BÀI ĐÃ LƯU (#modalKhoBai)
     ========================================================= -->
<div class="modal fade" id="modalKhoBai" tabindex="-1" aria-labelledby="modalKhoBaiLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold" id="modalKhoBaiLabel">📚 Kho Đoạn Văn Đã Lưu</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <input type="text" class="form-control" id="searchKhoBai" placeholder="🔍 Tìm kiếm bài đã lưu theo tiêu đề hoặc nội dung..." oninput="locKhoBai(this.value)">
                </div>
                <div id="listKhoBaiContainer">
                    <!-- Rendered by JS -->
                </div>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
        </div>
    </div>
</div>

<!-- =========================================================
     MODAL HOÀN THÀNH BÀI VIẾT (#modalHoanThanh)
     ========================================================= -->
<div class="modal fade" id="modalHoanThanh" tabindex="-1" aria-labelledby="modalHoanThanhLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg rounded-4 text-center p-4">
            <div class="modal-body">
                <div class="fs-1 mb-2">🎉🏆✨</div>
                <h3 class="fw-bold text-success mb-2">KẾT QUẢ BÀI VIẾT!</h3>
                <p class="text-muted">Đánh giá độ chính xác và chi tiết từng từ của bạn:</p>
                
                <div class="row g-2 my-3 text-center">
                    <div class="col-3">
                        <div class="p-2 bg-light rounded-3 border">
                            <div class="text-muted small">⏱️ Thời gian</div>
                            <div class="fw-bold text-dark fs-5 font-monospace" id="modalResultTime">00:00</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-2 bg-light rounded-3 border">
                            <div class="text-muted small">⚡ Tốc độ</div>
                            <div class="fw-bold text-primary fs-5 font-monospace" id="modalResultWpm">0 WPM</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-2 bg-light rounded-3 border">
                            <div class="text-muted small">🎯 Chính xác</div>
                            <div class="fw-bold text-success fs-5 font-monospace" id="modalResultAccuracy">100%</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="p-2 bg-light rounded-3 border">
                            <div class="text-muted small">📚 Từ đúng</div>
                            <div class="fw-bold text-dark fs-5 font-monospace" id="modalResultWords">0</div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Diff of Full Passage -->
                <div class="text-start mb-3">
                    <h6 class="fw-bold text-dark mb-2">🔍 Chi tiết từng từ:</h6>
                    <div id="modalDiffContainer" class="p-3 bg-light rounded-3 border diff-result-box" style="max-height: 250px; overflow-y: auto;">
                        <!-- Diff words rendered by JS -->
                    </div>
                </div>

                <div class="d-flex justify-content-center gap-2 mt-4 flex-wrap">
                    <button type="button" class="btn btn-primary px-4 fw-bold" onclick="batDauBuoc3NhapToanBai()" data-bs-dismiss="modal">
                        🔁 Nhập lại bài này
                    </button>
                    <button type="button" class="btn btn-outline-success fw-bold px-3" onclick="moModalQuetTuMoi()" data-bs-dismiss="modal">
                        🔍 Quét &amp; Lưu từ mới
                    </button>
                    <button type="button" class="btn btn-success px-4 fw-bold" id="btnModalLuuBai" onclick="luuBaiHienTaiTuModal()" style="display:none;">
                        💾 Lưu vào kho bài học
                    </button>
                    <button type="button" class="btn btn-outline-secondary px-3" onclick="quayLaiThietLap()" data-bs-dismiss="modal">
                        📝 Chọn bài khác
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    window.__INITIAL_SAVED_PARAGRAPHS = ${initialSavedJson};
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/global-audio.js?v=4"></script>
<script src="/js/luyen-nho-doan-van.js?v=4"></script>
</body>
</html>`;
}
