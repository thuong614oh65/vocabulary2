// =========================================================
// QUẢN LÝ ÂM THANH
// =========================================================
let audioHienTai = null;
let soLanDoc = 0;

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

function docTu(tu) {
    if (!tu) return;
    dungTatCaAmThanh();

    if (window.phatAmThanh) {
        window.phatAmThanh(tu, { rate: "+0%" });
        return;
    }

    let duongDan = "/audio/phat?text=" + encodeURIComponent(tu) + "&rate=+0%";
    audioHienTai = new Audio(duongDan);
    audioHienTai.play().catch(function (e) {
        console.warn("Lỗi phát audio:", e);
    });
}
window.docTu = docTu;

// =========================================================
// HÀM TÍNH TOÁN SO SÁNH KÝ TỰ ĐÚNG / SAI (CHARACTER DIFF)
// =========================================================
function buildCharDiff(userInput, targetAnswer) {
    if (!userInput || !userInput.trim()) {
        return {
            userHtml: '<span class="char-diff char-wrong">(chưa nhập)</span>',
            isMatch: false
        };
    }

    const rawUser = userInput.trim();
    const s1 = rawUser.toLowerCase();
    const s2 = targetAnswer.trim().toLowerCase();

    if (s1 === s2) {
        let userHtml = '';
        for (let i = 0; i < rawUser.length; i++) {
            const ch = rawUser[i];
            userHtml += `<span class="char-diff char-correct">${ch === ' ' ? '&nbsp;' : ch}</span>`;
        }
        return { userHtml, isMatch: true };
    }

    // Dynamic Programming LCS (Longest Common Subsequence)
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to identify exact matched indices in s1 (userInput)
    const userMatched = Array(m).fill(false);
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (s1[i - 1] === s2[j - 1]) {
            userMatched[i - 1] = true;
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    let userHtml = '';
    for (let k = 0; k < rawUser.length; k++) {
        const ch = rawUser[k];
        const displayChar = ch === ' ' ? '&nbsp;' : ch;
        if (userMatched[k]) {
            userHtml += `<span class="char-diff char-correct">${displayChar}</span>`;
        } else {
            userHtml += `<span class="char-diff char-wrong">${displayChar}</span>`;
        }
    }

    return { userHtml, isMatch: false };
}

function getLcsLength(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

// =========================================================
// HÀM CUỘN VÀO CHÍNH GIỮA MÀN HÌNH
// =========================================================
function cuonVaoGiuaManHinh(element) {
    if (!element) return;
    const row = element.closest("tr") || element;

    document.querySelectorAll("tr.hang-dang-hoc").forEach(function (r) {
        r.classList.remove("hang-dang-hoc");
    });

    if (row.tagName === "TR") {
        row.classList.add("hang-dang-hoc");
    }

    row.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    });
}

// =========================================================
// KHỞI TẠO EVENT LISTENERS
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
    const allInputs = document.querySelectorAll(".cau-tra-loi");

    allInputs.forEach(function (input) {
        // Khi focus vào ô nhập
        input.addEventListener("focus", function () {
            cuonVaoGiuaManHinh(this);
        });

        // Nhấn ENTER để chấm
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                chamDiem(this);
            }
        });
    });

    // Tự động focus và cuộn hàng đầu tiên vào giữa màn hình khi mới vào trang
    if (allInputs.length > 0) {
        setTimeout(function () {
            allInputs[0].focus();
            cuonVaoGiuaManHinh(allInputs[0]);
        }, 300);
    }
});

// =========================================================
// NÚT ✓ TRÊN ĐIỆN THOẠI
// =========================================================
function chamDiemTuNut(button) {
    let row = button.closest("tr");
    if (!row) return;
    let input = row.querySelector(".cau-tra-loi");
    if (input) {
        chamDiem(input);
    }
}

// =========================================================
// CHẤM ĐIỂM
// =========================================================
function chamDiem(input) {
    if (input.disabled) return;

    let dapAnRaw = input.dataset.dapAn || "";
    if (!dapAnRaw) return;

    let danhSach = dapAnRaw.split(";").map(s => s.trim()).filter(s => s.length > 0);
    let nhap = input.value.trim();

    let dung = false;
    let bestDa = danhSach[0] || dapAnRaw.trim();
    let bestScore = -1;

    for (let da of danhSach) {
        if (nhap.toLowerCase() === da.toLowerCase()) {
            dung = true;
            bestDa = da;
            break;
        }
        let score = getLcsLength(nhap.toLowerCase(), da.toLowerCase());
        if (score > bestScore) {
            bestScore = score;
            bestDa = da;
        }
    }

    const diff = buildCharDiff(nhap, bestDa);
    const containerKetQua = input.parentElement.querySelector(".ket-qua");

    if (dung) {
        input.classList.add("input-dung");
        input.classList.remove("input-sai");

        if (containerKetQua) {
            containerKetQua.innerHTML = `
                <div class="ket-qua-box kq-dung">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-1">
                        <div>
                            <span class="char-diff-container">${diff.userHtml}</span>
                            <span class="ms-2 fw-bold text-success">✅ Chính xác!</span>
                        </div>
                        <button type="button" class="btn-mini-audio" onclick="docTu('${bestDa.replace(/'/g, "\\'")}')" title="Nghe phát âm">🔊</button>
                    </div>
                </div>
            `;
        }

        fetch("/hoc/dung/" + input.dataset.id, { method: "POST" });
    } else {
        input.classList.add("input-sai");
        input.classList.remove("input-dung");

        if (containerKetQua) {
            containerKetQua.innerHTML = `
                <div class="ket-qua-box kq-sai">
                    <div class="mb-1">
                        <small class="text-muted">Bạn nhập:</small>
                        <span class="char-diff-container ms-1">${diff.userHtml}</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-1">
                        <div>
                            <small class="text-muted">Đáp án đúng:</small>
                            <span class="dap-an-chuan-badge">${bestDa}</span>
                        </div>
                        <button type="button" class="btn-mini-audio" onclick="docTu('${bestDa.replace(/'/g, "\\'")}')" title="Nghe phát âm">🔊</button>
                    </div>
                </div>
            `;
        }

        fetch("/hoc/sai/" + input.dataset.id, { method: "POST" });
    }

    // Tự động phát âm từ tiếng Anh chuẩn
    docTu(bestDa);

    input.disabled = true;

    // Chuyển sang ô tiếp theo
    setTimeout(function () {
        let inputs = document.querySelectorAll(".cau-tra-loi");
        let viTri = Array.from(inputs).indexOf(input);
        if (inputs[viTri + 1]) {
            inputs[viTri + 1].focus();
            cuonVaoGiuaManHinh(inputs[viTri + 1]);
        }
    }, 800);
}

// =========================================================
// TIẾP LƯỢT & DỪNG HỌC
// =========================================================
function tiepLuot() {
    dungTatCaAmThanh();
    window.location = "/hoc/tiep";
}

function dungHoc() {
    dungTatCaAmThanh();
    window.location = "/hoc/dung";
}

// =========================================================
// LUYỆN PHẢN XẠ VỚI TỪ ĐANG HỌC
// =========================================================

function luyenPhanXaDangHoc() {
    dungTatCaAmThanh();
    window.location = "/luyen-phan-xa?kieuHoc=DANG_HOC";
}


// =========================================================
// TIẾP TỤC HỌC LẠI VỚI TỪ ĐANG HỌC (XÁO TRỘN VÀ LẶP)
// =========================================================

function tiepTucHocVoiTuDangHoc() {
    dungTatCaAmThanh();
    window.location = "/hoc/tiep";
}