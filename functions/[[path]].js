// =========================================================
// CLOUDFLARE PAGES MASTER ROUTER (functions/[[path]].js)
// Full 1:1 port of all 21 Java Spring Boot Controllers
// =========================================================

import {
    sqlQuery,
    getSession,
    saveSession,
    clearSession,
    getBoTuVungByUser,
    getTatCaTuByUser,
    getTuTheoBo,
    getTuSaiByUser
} from "./db.js";

import {
    callGemini,
    cleanJson,
    taoDoanVan,
    kiemTraBanDich,
    taoDoanVanDienTu,
    taoCauNgheDien,
    chamDiemPhatAmAudio,
    trichXuatTuTuAnh,
    dichAnhViet,
    layTuDienAnh,
    traTuHangLoat,
    traTuChuyenSau,
    layHuongDanDoc,
    taoDeQ79TuHinhAnh,
    taoDeQ79TuVanBan,
    taoDeQ79TuDong,
    chamDiemDeQ79,
    taoBoDeToeicPart2
} from "./gemini.js";

import {
    PRESET_EXAMS,
    PHONICS_RULES,
    TOEIC_PART2,
    TOEIC_PART5
} from "./data/presets.js";

import {
    renderDangNhap,
    renderDangKy,
    renderIndex,
    renderIpa,
    renderSoDem,
    renderHoc,
    renderHocBatDau,
    renderHocChon,
    renderHocLuot2,
    renderThemTu,
    renderQuanLyTu,
    renderLuyenDe,
    renderLuyenPhanXa,
    renderTraTu,
    renderDichDoanVan,
    renderDienChoTrong,
    renderNgheDien,
    renderLuyenNoi,
    renderGenericTemplate
} from "./renderer.js";

const BROWSER_GEMINI_BRIDGE = `<script>
(function(){
  const KEYS = [
    "IAfZk4YWYaFOAi6IiFpPXyu6pUvpDJJJ3Wtv3ySfWRIw",
    "KVa9yB28I-0fIyZnMnzl3XdejTYrqyWthvVQI5NQvFMw",
    "J-KUVD6DTF91y5dgga5hDPvn36fjPQ2_ocXNnTs44wbA",
    "JBQcq7qBvsc7DKt_Xjgf7z0J8EWuhZEhcg8y1kDY488A",
    "I5gQ2wmKuyK0WLTY6TV85CE-ITzdzwncqi8ZreYwQudg",
    "L9g1CZqpM6ANE_-8cgbMAgXXm-gKstL7mQRAmFYEpftw",
    "IHmwcUFHW2FRqBdpkqOppxl4KY0N237kZ3jNcSSFZz7w",
    "Lf-5gdwqThKHjJNDYzjL206TuNHFc9FcTK-n6zcSqGZg",
    "JOWePUPosExZQ6DIS3bPARamsDeLjkypGu9Tr7JwoPJQ",
    "JQR_dRb48Jq2ZGjQ_2wnt-SvxT3az7-SWXgIRdPJrmoQ"
  ].map(s => ["AQ", "Ab8RN6" + s].join("."));
  let kIdx = Math.floor(Math.random() * KEYS.length);
  const origFetch = window.fetch;
  window.__callGeminiFromBrowser = async function(prompt, jsonMode, inlineData) {
    for (let i = 0; i < KEYS.length; i++) {
      const key = KEYS[(kIdx++) % KEYS.length];
      try {
        const parts = [];
        if (inlineData && inlineData.data && inlineData.mimeType) {
          parts.push({ inline_data: { mime_type: inlineData.mimeType, data: inlineData.data } });
        }
        parts.push({ text: prompt });
        const body = { contents: [{ parts }], generationConfig: { temperature: 0.25 } };
        if (jsonMode) body.generationConfig.responseMimeType = "application/json";
        const r = await origFetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + encodeURIComponent(key), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!r.ok) continue;
        const d = await r.json();
        const rp = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
        const txt = rp.filter(p => !p.thought).map(p => p.text || "").join("").trim() || rp.map(p => p.text || "").join("").trim();
        if (txt) return txt;
      } catch (e) {}
    }
    throw new Error("Không thể kết nối Gemini từ trình duyệt");
  };
  window.fetch = async function(input, init) {
    const resp = await origFetch.call(this, input, init);
    try {
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const clone = resp.clone();
        const data = await clone.json();
        if (data && data.__needClientGemini) {
          const aiText = await window.__callGeminiFromBrowser(data.prompt, data.jsonMode, data.inlineData);
          const newHeaders = new Headers((init && init.headers) || {});
          newHeaders.set("X-Client-Ai-Result", encodeURIComponent(aiText));
          return await origFetch.call(this, input, Object.assign({}, init || {}, { headers: newHeaders }));
        }
      }
    } catch (e) {}
    return resp;
  };
})();
</script>`;

function htmlResponse(html, sid = null, status = 200) {
    const headers = new Headers({
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
    });
    if (sid) {
        headers.append("Set-Cookie", `vocab_sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    const injected = (typeof html === "string" && html.includes("</head>"))
        ? html.replace("</head>", `${BROWSER_GEMINI_BRIDGE}</head>`)
        : html;
    return new Response(injected, { status, headers });
}

function jsonResponse(obj, status = 200, sid = null) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store"
    });
    if (sid) {
        headers.append("Set-Cookie", `vocab_sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    return new Response(JSON.stringify(obj), { status, headers });
}

function redirectResponse(location, sid = null) {
    const headers = new Headers({ Location: location });
    if (sid) {
        headers.append("Set-Cookie", `vocab_sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    return new Response(null, { status: 302, headers });
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function onRequest(context) {
    const { request, env } = context;
    const clientAiHeader = request.headers.get("X-Client-Ai-Result");
    if (clientAiHeader && env) {
        try {
            env.__clientAiResult = decodeURIComponent(clientAiHeader);
        } catch (e) {}
    }
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // 1. Static Assets pass-through (/css/*, /js/*, /images/*, /favicon.ico)
    if (
        pathname.startsWith("/css/") ||
        pathname.startsWith("/js/") ||
        pathname.startsWith("/images/") ||
        pathname === "/favicon.ico"
    ) {
        return env.ASSETS.fetch(request);
    }

    // 2. Audio TTS Endpoints (/audio/phat, /audio/tts, /audio/tu-vung/*)
    if (pathname === "/audio/phat" || pathname === "/audio/tts" || pathname.startsWith("/audio/tu-vung/")) {
        let text = url.searchParams.get("text") || "";
        if (!text && pathname.startsWith("/audio/tu-vung/")) {
            // Try static asset first
            try {
                const assetRes = await env.ASSETS.fetch(request);
                if (assetRes && assetRes.ok) return assetRes;
            } catch (e) {}
            text = decodeURIComponent(pathname.replace("/audio/tu-vung/", "").replace(/\.mp3$/i, "")).replace(/-/g, " ");
        }
        if (!text && method === "POST") {
            try {
                const body = await request.json();
                text = body.text || "";
            } catch (e) {}
        }
        text = (text || "hello").trim().slice(0, 200);
        const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodeURIComponent(text)}`;
        const ttsResp = await fetch(ttsUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        return new Response(ttsResp.body, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400"
            }
        });
    }

    // 3. Load User Session
    const sessionObj = await getSession(request, env);
    const sid = sessionObj.sid;
    const session = sessionObj.data;
    const taiKhoan = session.taiKhoan || null;

    // =========================================================
    // AUTH ROUTES (/dangnhap, /dangky, /dangxuat)
    // =========================================================
    if (pathname === "/dangnhap") {
        if (method === "GET") {
            return htmlResponse(renderDangNhap(null), sid);
        }
        if (method === "POST") {
            try {
                const formData = await request.formData();
                const tenDangNhap = (formData.get("tenDangNhap") || "").trim();
                const matKhau = (formData.get("matKhau") || "").trim();

                const rows = await sqlQuery(
                    env,
                    "SELECT id, ten_dang_nhap, mat_khau, ho_ten, email FROM tai_khoan WHERE ten_dang_nhap = $1 AND mat_khau = $2 LIMIT 1",
                    [tenDangNhap, matKhau]
                );
                if (rows.length > 0) {
                    const r = rows[0];
                    session.taiKhoan = {
                        id: Number(r.id),
                        tenDangNhap: r.ten_dang_nhap,
                        hoTen: r.ho_ten,
                        email: r.email
                    };
                    await saveSession(env, sid, session);
                    return redirectResponse("/", sid);
                } else {
                    return htmlResponse(renderDangNhap("Tên đăng nhập hoặc mật khẩu không đúng"), sid);
                }
            } catch (err) {
                return htmlResponse(renderDangNhap("Lỗi kết nối dữ liệu: " + (err.message || "Vui lòng thử lại")), sid);
            }
        }
    }

    if (pathname === "/dangky") {
        if (method === "GET") {
            return htmlResponse(renderDangKy(null), sid);
        }
        if (method === "POST") {
            try {
                const formData = await request.formData();
                const tenDangNhap = (formData.get("tenDangNhap") || "").trim();
                const matKhau = (formData.get("matKhau") || "").trim();
                const hoTen = (formData.get("hoTen") || "").trim();
                const email = (formData.get("email") || "").trim() || null;

                const exists = await sqlQuery(env, "SELECT id FROM tai_khoan WHERE ten_dang_nhap = $1 LIMIT 1", [tenDangNhap]);
                if (exists.length > 0) {
                    return htmlResponse(renderDangKy("Tên đăng nhập đã tồn tại!"), sid);
                }
                await sqlQuery(
                    env,
                    "INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, ho_ten, email) VALUES ($1, $2, $3, $4)",
                    [tenDangNhap, matKhau, hoTen, email]
                );
                return redirectResponse("/dangnhap", sid);
            } catch (err) {
                return htmlResponse(renderDangKy("Lỗi đăng ký: " + (err.message || "Vui lòng thử lại")), sid);
            }
        }
    }

    if (pathname === "/dangxuat") {
        await clearSession(env, sid);
        return redirectResponse("/dangnhap", sid);
    }

    // =========================================================
    // PUBLIC / SEMI-PUBLIC API ROUTES (Phonics, SoundWhy, TOEIC)
    // =========================================================
    if (pathname === "/api/huong-dan-doc" && method === "GET") {
        const tu = url.searchParams.get("tu") || "";
        const phienAm = url.searchParams.get("phienAm") || "";
        const nghia = url.searchParams.get("nghia") || "";
        const dto = await layHuongDanDoc(tu, phienAm, nghia, env);
        return jsonResponse(dto, 200, sid);
    }

    if (pathname === "/api/so-do-danh-van/danh-sach") {
        return jsonResponse(PHONICS_RULES || [], 200, sid);
    }

    if (pathname === "/api/so-do-danh-van/chi-tiet") {
        const id = (url.searchParams.get("id") || "").toLowerCase();
        const found = (PHONICS_RULES || []).find(r => (r.id || "").toLowerCase() === id) || (PHONICS_RULES || [])[0];
        return jsonResponse(found || {}, 200, sid);
    }

    if (pathname === "/api/so-do-danh-van/tim-kiem") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const matches = (PHONICS_RULES || []).filter(r =>
            (r.cumChuCai || "").toLowerCase().includes(q) ||
            (r.tieuDe || "").toLowerCase().includes(q) ||
            (r.amIpa || "").toLowerCase().includes(q)
        );
        return jsonResponse(matches, 200, sid);
    }

    if (pathname === "/api/toeic-part2/de-goc") {
        return jsonResponse(TOEIC_PART2 || [], 200, sid);
    }

    if (pathname === "/api/toeic-part2/tao-de-ai" && method === "POST") {
        try {
            let soCau = 6;
            try {
                const body = await request.json();
                if (body && body.soCau) soCau = Number(body.soCau);
            } catch (e) {}
            const ds = await taoBoDeToeicPart2(env, soCau);
            return jsonResponse(ds, 200, sid);
        } catch (err) {
            return jsonResponse({ error: "Lỗi tạo đề AI: " + err.message }, 500, sid);
        }
    }

    if (pathname === "/api/toeic-part-5/questions") {
        return jsonResponse(TOEIC_PART5 || [], 200, sid);
    }

    const part5Match = pathname.match(/^\/api\/toeic-part-5\/question\/(\d+)$/);
    if (part5Match) {
        const qNum = Number(part5Match[1]);
        const q = (TOEIC_PART5 || []).find(x => Number(x.questionNumber) === qNum) || (TOEIC_PART5 || [])[0];
        return jsonResponse(q || {}, 200, sid);
    }

    if (pathname === "/api/toeic-part-5/check" && method === "POST") {
        const formData = await request.formData();
        const qNum = Number(formData.get("questionNumber"));
        const ans = (formData.get("answer") || "").trim().toUpperCase();
        const q = (TOEIC_PART5 || []).find(x => Number(x.questionNumber) === qNum);
        const isCorrect = q ? (String(q.correctAnswer).toUpperCase() === ans) : false;
        return jsonResponse({
            correct: isCorrect,
            correctAnswer: q ? q.correctAnswer : "A",
            explanation: q ? q.explanation : ""
        }, 200, sid);
    }

    // =========================================================
    // REQUIRE LOGIN FOR PROTECTED PAGES
    // =========================================================
    if (!taiKhoan) {
        if (pathname.startsWith("/api/")) {
            return jsonResponse({ error: "Chưa đăng nhập" }, 401, sid);
        }
        return redirectResponse("/dangnhap", sid);
    }

    const taiKhoanId = Number(taiKhoan.id);

    // =========================================================
    // HOME & STATIC FEATURE PAGES
    // =========================================================
    if (pathname === "/") {
        return htmlResponse(renderIndex(), sid);
    }
    if (pathname === "/ipa") {
        return htmlResponse(renderIpa(), sid);
    }
    if (pathname === "/so-dem" || pathname === "/numbers") {
        return htmlResponse(renderSoDem(), sid);
    }
    if (pathname === "/so-do-danh-van" || pathname === "/quy-luat-danh-van/so-do") {
        return htmlResponse(renderGenericTemplate("so-do-danh-van"), sid);
    }
    if (pathname === "/toeic-part2") {
        return htmlResponse(renderGenericTemplate("toeic-part2"), sid);
    }
    if (pathname === "/toeic-part-5") {
        return htmlResponse(renderGenericTemplate("toeic-part5"), sid);
    }

    // =========================================================
    // HỌC TỪ VỰNG (/hoc, /hoc/bo/{id}, /bat-dau-hoc, /hoc/tiep, /hoc/dung)
    // =========================================================
    if (pathname === "/hoc" && method === "GET") {
        const [dsBo, dsTatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        return htmlResponse(renderHoc({
            hocDTO: { kieuHoc: "NGAU_NHIEN", phamViBo: "TAT_CA" },
            dsBo,
            dsTatCa,
            dsTheoBo: []
        }), sid);
    }

    const hocBoMatch = pathname.match(/^\/hoc\/bo\/(\d+)$/);
    if (hocBoMatch && method === "GET") {
        const boId = Number(hocBoMatch[1]);
        const [dsBo, dsTatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTheoBo = dsTatCa.filter(t => t.boId === boId);
        return htmlResponse(renderHoc({
            hocDTO: { kieuHoc: "THEO_BO", boId, phamViBo: "TAT_CA", tuTu: 1, denTu: dsTheoBo.length || 10 },
            dsBo,
            dsTatCa,
            dsTheoBo
        }), sid);
    }

    if (pathname === "/hoc" && method === "POST") {
        const formData = await request.formData();
        const kieuHoc = formData.get("kieuHoc") || "NGAU_NHIEN";
        const boId = formData.get("boId") ? Number(formData.get("boId")) : null;
        const phamViBo = formData.get("phamViBo") || "TAT_CA";
        const tuTu = formData.get("tuTu") ? Number(formData.get("tuTu")) : 1;
        const denTu = formData.get("denTu") ? Number(formData.get("denTu")) : 9999;
        const action = formData.get("action") || "hoc";
        const tuIds = formData.getAll("tuIds").map(x => Number(x));
        const chuDeTuJson = formData.get("chuDeTuJson") || "";
        const tenChuDe = (formData.get("tenChuDe") || "").trim() || "Chủ đề mới";

        const tatCaTu = await getTatCaTuByUser(env, taiKhoanId);
        let dsHoc = [];

        if (kieuHoc === "NGAU_NHIEN") {
            dsHoc = shuffleArray(tatCaTu).slice(0, 25);
        } else if (kieuHoc === "THEO_BO" && boId) {
            dsHoc = tatCaTu.filter(t => t.boId === boId);
            if (phamViBo === "TU_DEN" && dsHoc.length > 0) {
                const from = Math.max(1, Math.min(tuTu, dsHoc.length));
                const to = Math.max(from, Math.min(denTu, dsHoc.length));
                dsHoc = dsHoc.slice(from - 1, to);
            }
        } else if (kieuHoc === "CHON_TUNG_TU") {
            const idSet = new Set(tuIds);
            dsHoc = tatCaTu.filter(t => idSet.has(t.id));
        } else if (kieuHoc === "TU_SAI") {
            dsHoc = tatCaTu.filter(t => (t.soLanSai || 0) > 0).sort((a, b) => b.soLanSai - a.soLanSai).slice(0, 25);
        } else if (kieuHoc === "THEO_CHU_DE" && chuDeTuJson) {
            try {
                const dsTuMoi = JSON.parse(chuDeTuJson);
                if (Array.isArray(dsTuMoi) && dsTuMoi.length > 0) {
                    const boRes = await sqlQuery(
                        env,
                        "INSERT INTO bo_tu_vung (ten_bo, ngay_tao, tai_khoan_id) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id",
                        [tenChuDe, taiKhoanId]
                    );
                    const newBoId = Number(boRes[0].id);
                    for (const item of dsTuMoi) {
                        if (item.tiengAnh) {
                            await sqlQuery(
                                env,
                                "INSERT INTO tu_vung (tieng_anh, tieng_viet, phien_am, vi_du, so_lan_sai, bo_id) VALUES ($1, $2, $3, $4, 0, $5)",
                                [item.tiengAnh.trim(), item.tiengViet || "", item.phienAm || "", item.viDu || "", newBoId]
                            );
                        }
                    }
                    dsHoc = await getTuTheoBo(env, newBoId, taiKhoanId);
                }
            } catch (e) {}
        }

        const cheDoHoc = (action === "phan-xa") ? "PHAN_XA" : "HOC";
        session.dsHoc = dsHoc;
        session.tuDangHoc = dsHoc;
        session.cheDoHoc = cheDoHoc;
        await saveSession(env, sid, session);

        return htmlResponse(renderHocBatDau({
            hocDTO: { kieuHoc, boId },
            dsHoc,
            cheDoHoc
        }), sid);
    }

    if (pathname === "/bat-dau-hoc" && method === "POST") {
        const dsHoc = shuffleArray(session.dsHoc || []);
        session.tuDangHoc = dsHoc;
        session.luotHoc = 1;
        await saveSession(env, sid, session);
        return htmlResponse(renderHocChon(dsHoc), sid);
    }

    if (pathname === "/hoc/tiep" && method === "GET") {
        let luot = Number(session.luotHoc || 1) + 1;
        const dsHoc = shuffleArray(session.tuDangHoc || session.dsHoc || []);
        session.luotHoc = luot;
        session.tuDangHoc = dsHoc;
        await saveSession(env, sid, session);
        if (luot % 2 === 1) {
            return htmlResponse(renderHocChon(dsHoc), sid);
        } else {
            return htmlResponse(renderHocLuot2(dsHoc), sid);
        }
    }

    if (pathname === "/hoc/dung" && method === "GET") {
        delete session.tuDangHoc;
        delete session.dsHoc;
        delete session.luotHoc;
        await saveSession(env, sid, session);
        return redirectResponse("/hoc", sid);
    }

    const saiMatch = pathname.match(/^\/hoc\/sai\/(\d+)$/);
    if (saiMatch && method === "POST") {
        const tuId = Number(saiMatch[1]);
        await sqlQuery(env, "UPDATE tu_vung SET so_lan_sai = COALESCE(so_lan_sai, 0) + 1 WHERE id = $1", [tuId]);
        return jsonResponse({ ok: true }, 200, sid);
    }

    const dungMatch = pathname.match(/^\/hoc\/dung\/(\d+)$/);
    if (dungMatch && method === "POST") {
        const tuId = Number(dungMatch[1]);
        await sqlQuery(env, "UPDATE tu_vung SET so_lan_sai = GREATEST(0, COALESCE(so_lan_sai, 0) - 1) WHERE id = $1", [tuId]);
        return jsonResponse({ ok: true }, 200, sid);
    }

    if (pathname === "/api/hoc/de-xuat-chu-de" && method === "GET") {
        try {
            const chuDe = (url.searchParams.get("chuDe") || "Giao tiếp").trim();
            const loaiTruParam = url.searchParams.get("loaiTru") || "";
            const tatCa = await getTatCaTuByUser(env, taiKhoanId);
            const setDaCo = new Set(tatCa.map(t => (t.tiengAnh || "").trim().toLowerCase()).filter(Boolean));
            for (const w of loaiTruParam.split(",")) {
                if (w && w.trim()) setDaCo.add(w.trim().toLowerCase());
            }
            const daCoStr = Array.from(setDaCo).slice(0, 200).join(", ");
            const prompt = `Hãy đề xuất đúng 12 từ vựng tiếng Anh thông dụng, thực tế thuộc chủ đề "${chuDe}" mà TUYỆT ĐỐI KHÔNG nằm trong danh sách các từ đã biết sau: [${daCoStr}].
Trả về DUY NHẤT mảng JSON hợp lệ gồm các phần tử theo cấu trúc:
[{"tiengAnh": "...", "phienAm": "/.../", "tiengViet": "...", "viDu": "..."}]`;
            const raw = await callGemini(env, prompt, true);
            const parsed = JSON.parse(cleanJson(raw));
            const arr = Array.isArray(parsed) ? parsed : [];
            const ketQuaChuan = [];
            for (const item of arr) {
                const w = (item.tiengAnh || "").trim();
                if (w && !setDaCo.has(w.toLowerCase())) {
                    setDaCo.add(w.toLowerCase());
                    ketQuaChuan.push({
                        tiengAnh: w,
                        phienAm: item.phienAm || `/${w.toLowerCase()}/`,
                        tiengViet: item.tiengViet || "",
                        viDu: item.viDu || ""
                    });
                }
                if (ketQuaChuan.length >= 10) break;
            }
            return jsonResponse(ketQuaChuan, 200, sid);
        } catch (err) {
            return new Response("Lỗi AI đề xuất chủ đề: " + (err.message || "Vui lòng thử lại"), {
                status: 500,
                headers: { "Content-Type": "text/plain; charset=UTF-8" }
            });
        }
    }

    // =========================================================
    // THÊM TỪ & LƯU BỘ (/them-tu, /tra-hang-loat, /luu-bo)
    // =========================================================
    if (pathname === "/them-tu" && method === "GET") {
        const dsBo = await getBoTuVungByUser(env, taiKhoanId);
        const thongBao = session.thongBao || null;
        delete session.thongBao;
        await saveSession(env, sid, session);
        return htmlResponse(renderThemTu({
            dsBo,
            tenBoGoiY: `Bộ ${dsBo.length + 1}`,
            thongBao
        }), sid);
    }

    if (pathname === "/tra-hang-loat" && method === "POST") {
        const formData = await request.formData();
        const noiDung = formData.get("noiDung") || "";
        const words = noiDung
            .split(/[\r\n,;]+/)
            .map(w => w.trim())
            .filter(Boolean);
        const [dsBo, ketQua] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            traTuHangLoat(env, words)
        ]);
        return htmlResponse(renderThemTu({
            noiDung,
            ketQua,
            dsBo,
            tenBoGoiY: `Bộ ${dsBo.length + 1}`
        }), sid);
    }

    if (pathname === "/luu-bo" && method === "POST") {
        const formData = await request.formData();
        const tiengAnhs = formData.getAll("tiengAnh");
        const tiengViets = formData.getAll("tiengViet");
        const phienAms = formData.getAll("phienAm");
        const viDus = formData.getAll("viDu");
        let boId = formData.get("boId") ? Number(formData.get("boId")) : null;
        let tenBo = (formData.get("tenBo") || "").trim();

        if (!boId) {
            const dsBo = await getBoTuVungByUser(env, taiKhoanId);
            if (!tenBo) tenBo = `Bộ ${dsBo.length + 1}`;
            const res = await sqlQuery(
                env,
                "INSERT INTO bo_tu_vung (ten_bo, ngay_tao, tai_khoan_id) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id",
                [tenBo, taiKhoanId]
            );
            boId = Number(res[0].id);
        }

        let count = 0;
        for (let i = 0; i < tiengAnhs.length; i++) {
            const ta = (tiengAnhs[i] || "").trim();
            if (!ta) continue;
            const tv = (tiengViets[i] || "").trim();
            const pa = (phienAms[i] || "").trim();
            const vd = (viDus[i] || "").trim();
            await sqlQuery(
                env,
                "INSERT INTO tu_vung (tieng_anh, tieng_viet, phien_am, vi_du, so_lan_sai, bo_id) VALUES ($1, $2, $3, $4, 0, $5)",
                [ta, tv, pa, vd, boId]
            );
            count++;
        }

        session.thongBao = `Đã lưu thành công ${count} từ vựng!`;
        await saveSession(env, sid, session);
        return redirectResponse("/them-tu", sid);
    }

    // =========================================================
    // QUẢN LÝ TỪ (/quan-ly-tu, /quan-ly-tu/*)
    // =========================================================
    if (pathname === "/quan-ly-tu" && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const [dsBo, tatCaTu] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTu = (boId && boId > 0) ? tatCaTu.filter(t => t.boId === boId) : tatCaTu;
        const thongBaoThanhCong = session.thongBaoThanhCong || null;
        const thongBaoLoi = session.thongBaoLoi || null;
        delete session.thongBaoThanhCong;
        delete session.thongBaoLoi;
        await saveSession(env, sid, session);

        return htmlResponse(renderQuanLyTu({
            dsTu,
            dsBo,
            boIdHienTai: boId,
            thongBaoThanhCong,
            thongBaoLoi
        }), sid);
    }

    if (pathname === "/quan-ly-tu/cap-nhat" && method === "POST") {
        const formData = await request.formData();
        const id = Number(formData.get("id"));
        const tiengAnh = (formData.get("tiengAnh") || "").trim();
        const tiengViet = (formData.get("tiengViet") || "").trim();
        const phienAm = (formData.get("phienAm") || "").trim();
        const viDu = (formData.get("viDu") || "").trim();
        const boId = Number(formData.get("boId"));
        const boIdLoc = formData.get("boIdLoc") || "";

        await sqlQuery(
            env,
            "UPDATE tu_vung SET tieng_anh = $1, tieng_viet = $2, phien_am = $3, vi_du = $4, bo_id = $5 WHERE id = $6",
            [tiengAnh, tiengViet, phienAm, viDu, boId, id]
        );
        session.thongBaoThanhCong = `Đã cập nhật từ vựng "${tiengAnh}" thành công!`;
        await saveSession(env, sid, session);
        return redirectResponse(boIdLoc ? `/quan-ly-tu?boId=${boIdLoc}` : "/quan-ly-tu", sid);
    }

    const xoaTuMatch = pathname.match(/^\/quan-ly-tu\/xoa\/(\d+)$/);
    if (xoaTuMatch && method === "POST") {
        const id = Number(xoaTuMatch[1]);
        await sqlQuery(env, "DELETE FROM tu_vung WHERE id = $1", [id]);
        session.thongBaoThanhCong = "Đã xóa từ vựng thành công!";
        await saveSession(env, sid, session);
        return redirectResponse("/quan-ly-tu", sid);
    }

    const xoaBoMatch = pathname.match(/^\/quan-ly-tu\/xoa-bo\/(\d+)$/);
    if (xoaBoMatch && method === "POST") {
        const boId = Number(xoaBoMatch[1]);
        await sqlQuery(env, "DELETE FROM tu_vung WHERE bo_id = $1", [boId]);
        await sqlQuery(env, "DELETE FROM bo_tu_vung WHERE id = $1 AND tai_khoan_id = $2", [boId, taiKhoanId]);
        session.thongBaoThanhCong = "Đã xóa bộ từ vựng thành công!";
        await saveSession(env, sid, session);
        return redirectResponse("/quan-ly-tu", sid);
    }

    if (pathname === "/quan-ly-tu/sua-bo" && method === "POST") {
        const formData = await request.formData();
        const boId = Number(formData.get("boId"));
        const tenBoMoi = (formData.get("tenBoMoi") || "").trim();
        if (tenBoMoi) {
            await sqlQuery(env, "UPDATE bo_tu_vung SET ten_bo = $1 WHERE id = $2 AND tai_khoan_id = $3", [tenBoMoi, boId, taiKhoanId]);
            session.thongBaoThanhCong = `Đã đổi tên bộ từ thành "${tenBoMoi}"!`;
            await saveSession(env, sid, session);
        }
        return redirectResponse("/quan-ly-tu", sid);
    }

    if (pathname === "/quan-ly-tu/tao-bo" && method === "POST") {
        const formData = await request.formData();
        const tenBo = (formData.get("tenBo") || "").trim();
        if (tenBo) {
            await sqlQuery(env, "INSERT INTO bo_tu_vung (ten_bo, ngay_tao, tai_khoan_id) VALUES ($1, CURRENT_TIMESTAMP, $2)", [tenBo, taiKhoanId]);
            session.thongBaoThanhCong = `Đã tạo bộ từ mới "${tenBo}" thành công!`;
            await saveSession(env, sid, session);
        }
        return redirectResponse("/quan-ly-tu", sid);
    }

    // =========================================================
    // LUYỆN ĐỀ TOEIC SPEAKING Q7-9 (/luyen-de, /api/luyen-de/*)
    // =========================================================
    if (pathname === "/luyen-de" && method === "GET") {
        return htmlResponse(renderLuyenDe(), sid);
    }

    const deMauMatch = pathname.match(/^\/api\/luyen-de\/de-mau\/(\d+)$/);
    if (deMauMatch && method === "GET") {
        const id = Number(deMauMatch[1]);
        const preset = PRESET_EXAMS[id] || PRESET_EXAMS[String(id)];
        if (preset) {
            return jsonResponse(preset, 200, sid);
        }
        return jsonResponse({ error: "Không tìm thấy đề mẫu #" + id }, 404, sid);
    }

    if (pathname === "/api/luyen-de/tao-tu-anh" && method === "POST") {
        try {
            const formData = await request.formData();
            const file = formData.get("file");
            if (!file) {
                return jsonResponse({ error: "Vui lòng chọn một file ảnh" }, 400, sid);
            }
            const contentType = file.type || "image/jpeg";
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = "";
            for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
            const base64 = btoa(bin);
            const dto = await taoDeQ79TuHinhAnh(env, base64, contentType);
            dto.loaiNoiDung = "IMAGE";
            dto.nguonGoc = "UPLOAD";
            dto.thoiGianCau1 = 15;
            dto.thoiGianCau2 = 15;
            dto.thoiGianCau3 = 30;
            dto.anhUrl = `data:${contentType};base64,${base64}`;
            return jsonResponse(dto, 200, sid);
        } catch (e) {
            return jsonResponse({ error: "Lỗi phân tích ảnh: " + e.message }, 500, sid);
        }
    }

    if (pathname === "/api/luyen-de/cham-diem" && method === "POST") {
        try {
            const reqBody = await request.json();
            const ketQua = await chamDiemDeQ79(env, reqBody);
            return jsonResponse(ketQua, 200, sid);
        } catch (e) {
            return jsonResponse({ error: "Lỗi chấm điểm AI: " + e.message }, 500, sid);
        }
    }

    if (pathname === "/api/luyen-de/tao-tu-van-ban" && method === "POST") {
        try {
            const { vanBan } = await request.json();
            if (!vanBan || !vanBan.trim()) {
                return jsonResponse({ error: "Vui lòng nhập nội dung bảng/văn bản" }, 400, sid);
            }
            const dto = await taoDeQ79TuVanBan(env, vanBan);
            dto.loaiNoiDung = "TEXT";
            dto.vanBanThongTin = vanBan;
            dto.nguonGoc = "VAN_BAN";
            dto.thoiGianCau1 = 15;
            dto.thoiGianCau2 = 15;
            dto.thoiGianCau3 = 30;
            return jsonResponse(dto, 200, sid);
        } catch (e) {
            return jsonResponse({ error: "Lỗi tạo đề từ văn bản: " + e.message }, 500, sid);
        }
    }

    if (pathname === "/api/luyen-de/tao-tu-dong" && method === "POST") {
        try {
            const dto = await taoDeQ79TuDong(env);
            dto.loaiNoiDung = "TEXT";
            dto.nguonGoc = "AI_TAO";
            dto.thoiGianCau1 = 15;
            dto.thoiGianCau2 = 15;
            dto.thoiGianCau3 = 30;
            return jsonResponse(dto, 200, sid);
        } catch (e) {
            return jsonResponse({ error: "Lỗi AI sinh đề tự động: " + e.message }, 500, sid);
        }
    }

    // =========================================================
    // LUYỆN PHẢN XẠ (/luyen-phan-xa, /api/luyen-phan-xa/*)
    // =========================================================
    const phanXaBoMatch = pathname.match(/^\/luyen-phan-xa\/bo\/(\d+)$/);
    if (phanXaBoMatch && method === "GET") {
        return redirectResponse(`/luyen-phan-xa?boId=${phanXaBoMatch[1]}&kieuHoc=THEO_BO`, sid);
    }

    if (pathname === "/luyen-phan-xa" && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const kieuHoc = url.searchParams.get("kieuHoc") || "THEO_BO";
        const dsBo = await getBoTuVungByUser(env, taiKhoanId);
        const dsDangHoc = session.tuDangHoc || session.dsHoc || [];
        const boChon = boId || (dsBo.length > 0 ? dsBo[0].id : null);
        const foundBo = dsBo.find(b => b.id === Number(boChon));
        return htmlResponse(renderLuyenPhanXa({
            dsBo,
            boIdChon: boChon,
            tenBoChon: foundBo ? foundBo.tenBo : "Luyện Phản Xạ",
            kieuHoc,
            soTuDangHoc: dsDangHoc.length
        }), sid);
    }

    if (pathname === "/api/luyen-phan-xa/du-lieu" && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const kieuHoc = (url.searchParams.get("kieuHoc") || "THEO_BO").toUpperCase();
        const cheDo = (url.searchParams.get("cheDo") || "TOAN_DIEN").toUpperCase();
        const tatCa = await getTatCaTuByUser(env, taiKhoanId);
        let dsTuGoc = [];
        if (kieuHoc === "DANG_HOC") {
            const dsDangHoc = session.tuDangHoc || session.dsHoc || [];
            if (Array.isArray(dsDangHoc) && dsDangHoc.length > 0) dsTuGoc = [...dsDangHoc];
        } else if (kieuHoc === "TU_SAI") {
            dsTuGoc = tatCa.filter(t => (t.soLanSai || 0) > 0).slice(0, 25);
        } else if (kieuHoc === "NGAU_NHIEN") {
            dsTuGoc = shuffleArray(tatCa).slice(0, 25);
        } else if (boId) {
            dsTuGoc = tatCa.filter(t => Number(t.boId) === Number(boId));
        }
        if (dsTuGoc.length === 0) dsTuGoc = shuffleArray(tatCa).slice(0, 25);
        if (dsTuGoc.length === 0) return jsonResponse([], 200, sid);

        const khoEnU = dsTuGoc.map(t => (t.tiengAnh || "").trim()).filter(Boolean);
        const khoViU = dsTuGoc.map(t => (t.tiengViet || "").trim()).filter(Boolean);
        const khoEnB = tatCa.map(t => (t.tiengAnh || "").trim()).filter(s => s && !khoEnU.includes(s));
        const khoViB = tatCa.map(t => (t.tiengViet || "").trim()).filter(s => s && !khoViU.includes(s));

        const laySai = (dung, kU, kB, isVi) => {
            const pool = shuffleArray([...kU, ...kB]);
            for (const s of pool) {
                if (s && s.toLowerCase() !== (dung || "").toLowerCase()) return s;
            }
            const fb = isVi
                ? ["Quyển sách", "Máy tính", "Học sinh", "Du lịch", "Công việc", "Sức khỏe"]
                : ["Book", "Computer", "Student", "Travel", "Work", "Health"];
            return fb.find(f => f.toLowerCase() !== (dung || "").toLowerCase()) || (isVi ? "Khác" : "Other");
        };

        const tao4LuaChon = (dapAnDung, kU, kB, isVi) => {
            const set = new Set([dapAnDung]);
            for (const s of shuffleArray(kU)) {
                if (s && s.toLowerCase() !== (dapAnDung || "").toLowerCase()) set.add(s);
                if (set.size === 4) break;
            }
            if (set.size < 4) {
                for (const s of shuffleArray(kB)) {
                    if (s && s.toLowerCase() !== (dapAnDung || "").toLowerCase()) set.add(s);
                    if (set.size === 4) break;
                }
            }
            const fb = isVi
                ? ["Quả táo", "Quyển sách", "Máy tính", "Học sinh", "Du lịch", "Công việc", "Âm nhạc", "Ngôi nhà"]
                : ["Apple", "Book", "Computer", "Student", "Travel", "Work", "Music", "Home"];
            let idx = 0;
            while (set.size < 4) {
                const dp = fb[(idx++) % fb.length];
                if (dp.toLowerCase() !== (dapAnDung || "").toLowerCase()) set.add(dp);
            }
            return shuffleArray(Array.from(set));
        };

        const makeBase = (tv) => ({
            id: tv.id,
            tiengAnh: tv.tiengAnh,
            tiengViet: tv.tiengViet,
            phienAm: tv.phienAm,
            audioUrl: `/audio/phat?text=${encodeURIComponent(tv.tiengAnh)}`
        });

        const makeTFEnVi = (tv) => {
            const laDung = Math.random() < 0.5;
            const sai = laySai(tv.tiengViet, khoViU, khoViB, true);
            return {
                ...makeBase(tv),
                loaiCauHoi: "DUNG_SAI_ANH_VIET",
                capDo: "Cấp 1: Đúng / Sai (Anh ➔ Việt)",
                tfHienThiTrai: tv.tiengAnh,
                tfHienThiPhai: laDung ? tv.tiengViet : sai,
                cauDungSaiLaDung: laDung,
                dapAnDung: laDung ? "DUNG" : "SAI",
                luaChon: [laDung ? tv.tiengViet : sai]
            };
        };

        const makeTFViEn = (tv) => {
            const laDung = Math.random() < 0.5;
            const sai = laySai(tv.tiengAnh, khoEnU, khoEnB, false);
            return {
                ...makeBase(tv),
                loaiCauHoi: "DUNG_SAI_VIET_ANH",
                capDo: "Cấp 2: Đúng / Sai (Việt ➔ Anh)",
                tfHienThiTrai: tv.tiengViet,
                tfHienThiPhai: laDung ? tv.tiengAnh : sai,
                cauDungSaiLaDung: laDung,
                dapAnDung: laDung ? "DUNG" : "SAI",
                luaChon: [laDung ? tv.tiengAnh : sai]
            };
        };

        const makeEnToVi = (tv) => ({
            ...makeBase(tv),
            loaiCauHoi: "TU_SANG_NGHIA",
            capDo: "Cấp 3: Nhìn từ ➔ 4 Nghĩa Việt",
            dapAnDung: tv.tiengViet,
            luaChon: tao4LuaChon(tv.tiengViet, khoViU, khoViB, true)
        });

        const makeViToEn = (tv) => ({
            ...makeBase(tv),
            loaiCauHoi: "NGHIA_SANG_TU",
            capDo: "Cấp 4: Nhìn nghĩa ➔ 4 Từ Anh",
            dapAnDung: tv.tiengAnh,
            luaChon: tao4LuaChon(tv.tiengAnh, khoEnU, khoEnB, false)
        });

        const makeNghe = (tv) => ({
            ...makeBase(tv),
            loaiCauHoi: "NGHE_SANG_NGHIA",
            capDo: "Cấp 5: Nghe âm thanh ➔ 4 Nghĩa Việt",
            dapAnDung: tv.tiengViet,
            luaChon: tao4LuaChon(tv.tiengViet, khoViU, khoViB, true)
        });

        const questions = [];
        if (cheDo === "TOAN_DIEN") {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeTFEnVi(tv));
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeTFViEn(tv));
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeEnToVi(tv));
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeViToEn(tv));
            if (dsTuGoc.length <= 10) {
                for (const tv of shuffleArray(dsTuGoc)) questions.push(makeNghe(tv));
            }
        } else if (cheDo === "DUNG_SAI_ANH_VIET" || cheDo === "DUNG_SAI") {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeTFEnVi(tv));
        } else if (cheDo === "DUNG_SAI_VIET_ANH") {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeTFViEn(tv));
        } else if (cheDo === "NGHIA_SANG_TU") {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeViToEn(tv));
        } else if (cheDo === "NGHE" || cheDo === "NGHE_CHON") {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeNghe(tv));
        } else {
            for (const tv of shuffleArray(dsTuGoc)) questions.push(makeEnToVi(tv));
        }

        return jsonResponse(questions, 200, sid);
    }

    if (pathname === "/api/luyen-phan-xa/ghi-nhan" && method === "POST") {
        const tuId = Number(url.searchParams.get("tuId"));
        const chinhXac = url.searchParams.get("chinhXac") === "true";
        if (tuId) {
            if (chinhXac) {
                await sqlQuery(env, "UPDATE tu_vung SET so_lan_sai = GREATEST(0, COALESCE(so_lan_sai, 0) - 1) WHERE id = $1", [tuId]);
            } else {
                await sqlQuery(env, "UPDATE tu_vung SET so_lan_sai = COALESCE(so_lan_sai, 0) + 1 WHERE id = $1", [tuId]);
            }
        }
        return jsonResponse({ success: true }, 200, sid);
    }

    // =========================================================
    // TRA TỪ & CÁC TRANG LUYỆN TẬP CÒN LẠI
    // =========================================================
    if (pathname === "/tra-tu" && method === "GET") {
        const dsBo = await getBoTuVungByUser(env, taiKhoanId);
        return htmlResponse(renderTraTu({
            dsBo,
            tuKhoaBanDau: url.searchParams.get("q") || "",
            cheDoBanDau: url.searchParams.get("mode") || "AUTO"
        }), sid);
    }

    if (pathname === "/api/tra-tu/dich" && method === "POST") {
        try {
            const body = await request.json();
            const text = (body.text || body.tuKhoa || "").trim();
            const mode = body.mode || "AUTO";
            const quickMode = Boolean(body.quickMode);
            const ketQua = await traTuChuyenSau(env, text, mode, quickMode);
            return jsonResponse(ketQua, 200, sid);
        } catch (err) {
            return jsonResponse({
                thanhCong: false,
                thongBaoLoi: "Lỗi tra từ: " + err.message
            }, 200, sid);
        }
    }

    if (pathname === "/api/tra-tu/luu-nhanh" && method === "POST") {
        try {
            const body = await request.json();
            const tiengAnh = (body.tiengAnh || "").trim();
            const tiengViet = (body.tiengViet || "").trim();
            const phienAm = (body.phienAm || "").trim();
            const viDu = (body.viDu || "").trim();
            if (!tiengAnh || !tiengViet) {
                return jsonResponse({ success: false, message: "Vui lòng có đủ từ tiếng Anh và nghĩa tiếng Việt!" }, 200, sid);
            }
            let boId = body.boId ? Number(body.boId) : null;
            let tenBo = (body.tenBoMoi || "").trim();
            if (!boId) {
                const dsBo = await getBoTuVungByUser(env, taiKhoanId);
                tenBo = tenBo || `Bộ ${dsBo.length + 1}`;
                const res = await sqlQuery(env, "INSERT INTO bo_tu_vung (ten_bo, ngay_tao, tai_khoan_id) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id", [tenBo, taiKhoanId]);
                boId = Number(res[0].id);
            } else {
                const found = await sqlQuery(env, "SELECT ten_bo FROM bo_tu_vung WHERE id = $1", [boId]);
                tenBo = found[0]?.ten_bo || "Bộ từ vựng";
            }
            await sqlQuery(
                env,
                "INSERT INTO tu_vung (tieng_anh, tieng_viet, phien_am, vi_du, so_lan_sai, bo_id) VALUES ($1, $2, $3, $4, 0, $5)",
                [tiengAnh, tiengViet, phienAm, viDu, boId]
            );
            return jsonResponse({
                success: true,
                message: `Đã lưu từ "${tiengAnh}" vào bộ "${tenBo}" thành công!`,
                boId,
                tenBo
            }, 200, sid);
        } catch (err) {
            return jsonResponse({ success: false, message: "Lỗi khi lưu từ: " + err.message }, 200, sid);
        }
    }

    // =========================================================
    // TRÍCH XUẤT TỪ VỰNG TỪ ẢNH / FILE (/api/trich-xuat-tu)
    // =========================================================
    if (pathname === "/api/trich-xuat-tu" && method === "POST") {
        try {
            const formData = await request.formData();
            const file = formData.get("file");
            if (!file) {
                return jsonResponse({ thanhCong: false, thongBao: "Không nhận được tệp!" }, 200, sid);
            }
            const mimeType = file.type || "image/jpeg";
            if (mimeType.startsWith("text/") || (file.name && file.name.endsWith(".txt"))) {
                const txt = await file.text();
                const dsTu = txt.split(/\r?\n/).map(w => w.trim()).filter(Boolean);
                return jsonResponse({
                    thanhCong: dsTu.length > 0,
                    soLuong: dsTu.length,
                    danhSachTu: dsTu,
                    noiDung: dsTu.join("\n"),
                    thongBao: dsTu.length > 0 ? `Đã trích xuất thành công ${dsTu.length} từ vựng!` : "Không tìm thấy từ vựng!"
                }, 200, sid);
            }
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = "";
            for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
            const base64 = btoa(bin);
            const dsTu = await trichXuatTuTuAnh(env, base64, mimeType);
            return jsonResponse({
                thanhCong: dsTu.length > 0,
                soLuong: dsTu.length,
                danhSachTu: dsTu,
                noiDung: dsTu.join("\n"),
                thongBao: dsTu.length > 0 ? `Đã trích xuất thành công ${dsTu.length} từ vựng!` : "Không tìm thấy từ vựng tiếng Anh nào trong tệp này!"
            }, 200, sid);
        } catch (err) {
            return jsonResponse({ thanhCong: false, thongBao: "Lỗi xử lý file: " + err.message }, 200, sid);
        }
    }

    // =========================================================
    // DỊCH ĐOẠN VĂN (/dich-doan-van, /dich-doan-van/kiem-tra, /dich-doan-van/nghia)
    // =========================================================
    if (pathname === "/dich-doan-van/nghia" && method === "GET") {
        const tu = (url.searchParams.get("tu") || "").trim();
        if (!tu) return jsonResponse({ nghia: "Không có từ để tra." }, 400, sid);
        const nghia = await dichAnhViet(tu, env);
        return jsonResponse({ nghia: nghia || "Không tìm thấy nghĩa." }, 200, sid);
    }

    if (pathname === "/dich-doan-van" && method === "GET") {
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const tuVungTuCSDL = tatCa.map(t => ({ tiengAnh: t.tiengAnh || "", tiengViet: t.tiengViet || "" }));
        return htmlResponse(renderDichDoanVan({
            dsBo,
            boIdsChon: [],
            chonTatCa: true,
            tuVungTuCSDL
        }), sid);
    }

    if (pathname === "/dich-doan-van" && method === "POST") {
        const formData = await request.formData();
        const boIds = formData.getAll("boIds").map(Number).filter(Boolean);
        let chonTatCa = formData.get("chonTatCa") === "true" || boIds.length === 0;
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const tuVungTuCSDL = tatCa.map(t => ({ tiengAnh: t.tiengAnh || "", tiengViet: t.tiengViet || "" }));
        const setBoIds = new Set(boIds);
        const dsTuVung = chonTatCa ? tatCa : tatCa.filter(t => setBoIds.has(Number(t.boId)));

        if (dsTuVung.length === 0) {
            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                loi: "Không tìm thấy từ vựng nào trong các bộ từ bạn đã chọn để tạo đoạn văn.",
                tuVungTuCSDL
            }), sid);
        }

        const tuDuocChon = shuffleArray(dsTuVung).slice(0, 35);
        const danhSachTu = tuDuocChon.map(t => `- ${t.tiengAnh}${t.tiengViet ? ` (nghĩa: ${t.tiengViet})` : ""}`).join("\n");

        try {
            const doanVan = await taoDoanVan(env, danhSachTu);
            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                doanVan,
                tuVungTuCSDL
            }), sid);
        } catch (err) {
            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                loi: "Lỗi AI tạo đoạn văn: " + (err.message || "Vui lòng thử lại"),
                tuVungTuCSDL
            }), sid);
        }
    }

    if (pathname === "/dich-doan-van/kiem-tra" && method === "POST") {
        const formData = await request.formData();
        const doanVan = (formData.get("doanVan") || "").trim();
        const banDich = (formData.get("banDich") || "").trim();
        const boIds = formData.getAll("boIds").map(Number).filter(Boolean);
        const chonTatCa = formData.get("chonTatCa") === "true" || boIds.length === 0;
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const tuVungTuCSDL = tatCa.map(t => ({ tiengAnh: t.tiengAnh || "", tiengViet: t.tiengViet || "" }));

        if (!doanVan || !banDich) {
            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                doanVan,
                banDich,
                loi: !doanVan ? "Không tìm thấy đoạn văn cần dịch." : "Bạn chưa nhập bản dịch.",
                tuVungTuCSDL
            }), sid);
        }

        try {
            const ketQua = await kiemTraBanDich(env, doanVan, banDich);
            const extractTag = (txt, tag) => {
                const m = txt.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i"));
                return m ? m[1].trim() : "";
            };
            let danhGia = extractTag(ketQua, "DANH_GIA") || "Đúng";
            let nhanXet = extractTag(ketQua, "NHAN_XET") || ketQua;
            let loiHoacThieu = extractTag(ketQua, "LOI_HOAC_THIEU") || "Không có lỗi sai nghiêm trọng.";
            let banDichGoiY = extractTag(ketQua, "BAN_DICH_GOI_Y") || "";
            let goiYCaiThien = extractTag(ketQua, "GOI_Y_CAI_THIEN") || "";

            let danhGiaLoai = "dung";
            const dgLow = danhGia.toLowerCase();
            if (dgLow.includes("gần đúng") || dgLow.includes("gan dung")) danhGiaLoai = "gan-dung";
            else if (dgLow.includes("sai") || dgLow.includes("thiếu") || dgLow.includes("thieu")) danhGiaLoai = "sai";

            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                doanVan,
                banDich,
                ketQua,
                danhGia,
                danhGiaLoai,
                nhanXet,
                loiHoacThieu,
                banDichGoiY,
                goiYCaiThien,
                tuVungTuCSDL
            }), sid);
        } catch (err) {
            return htmlResponse(renderDichDoanVan({
                dsBo,
                boIdsChon: boIds,
                chonTatCa,
                doanVan,
                banDich,
                loi: "Lỗi AI chấm bản dịch: " + (err.message || "Vui lòng thử lại"),
                tuVungTuCSDL
            }), sid);
        }
    }

    // =========================================================
    // ĐIỀN VÀO CHỖ TRỐNG (/dien-cho-trong, /dien-cho-trong/tao)
    // =========================================================
    if (pathname === "/dien-cho-trong" && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTu = (boId && boId > 0) ? tatCa.filter(t => t.boId === boId) : tatCa;
        return htmlResponse(renderDienChoTrong({ dsBo, boIdChon: boId, tongSoTu: dsTu.length }), sid);
    }

    if (pathname === "/dien-cho-trong/tao" && method === "POST") {
        const formData = await request.formData();
        const boId = formData.get("boId") ? Number(formData.get("boId")) : null;
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTu = (boId && boId > 0) ? tatCa.filter(t => t.boId === boId) : tatCa;
        if (dsTu.length === 0) {
            return htmlResponse(renderDienChoTrong({ dsBo, boIdChon: boId, tongSoTu: 0, loi: "Bạn chưa có từ vựng nào trong danh sách được chọn để tạo bài tập!" }), sid);
        }
        const tuDuocChon = shuffleArray(dsTu).slice(0, 25);
        const danhSachTu = tuDuocChon.map(t => `- ${t.tiengAnh}${t.tiengViet ? ` (nghĩa: ${t.tiengViet})` : ""}`).join("\n");
        try {
            const doanVanRaw = await taoDoanVanDienTu(env, danhSachTu);
            return htmlResponse(renderDienChoTrong({ dsBo, boIdChon: boId, tongSoTu: dsTu.length, doanVanRaw }), sid);
        } catch (err) {
            return htmlResponse(renderDienChoTrong({ dsBo, boIdChon: boId, tongSoTu: dsTu.length, loi: "Lỗi AI tạo bài tập: " + err.message }), sid);
        }
    }

    // =========================================================
    // NGHE ĐIỀN & NGHE VIẾT NGHĨA (/nghe-dien, /nghe-viet-nghia)
    // =========================================================
    if ((pathname === "/nghe-dien" || pathname === "/nghe-viet-nghia") && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const capDo = Number(url.searchParams.get("capDo") || 1);
        const hinhThuc = url.searchParams.get("hinhThuc") || "CAU";
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTu = (boId && boId > 0) ? tatCa.filter(t => t.boId === boId) : tatCa;
        return htmlResponse(renderNgheDien({
            tplName: pathname.substring(1),
            dsBo,
            boIdChon: boId,
            tongSoTu: dsTu.length,
            soCauChon: 15,
            capDoChon: capDo,
            hinhThucChon: hinhThuc
        }), sid);
    }

    if ((pathname === "/nghe-dien/tao" || pathname === "/nghe-viet-nghia/tao") && method === "POST") {
        const isVietNghia = pathname.startsWith("/nghe-viet-nghia");
        const tplName = isVietNghia ? "nghe-viet-nghia" : "nghe-dien";
        const formData = await request.formData();
        const boId = formData.get("boId") ? Number(formData.get("boId")) : null;
        const soCau = Number(formData.get("soCau") || 15);
        const capDo = Number(formData.get("capDo") || 1);
        const hinhThuc = (formData.get("hinhThuc") || "CAU").toUpperCase();
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        const dsTu = (boId && boId > 0) ? tatCa.filter(t => t.boId === boId) : tatCa;
        if (dsTu.length === 0) {
            return htmlResponse(renderNgheDien({
                tplName, dsBo, boIdChon: boId, tongSoTu: 0, soCauChon: soCau, capDoChon: capDo, hinhThucChon: hinhThuc,
                loi: "Bạn chưa có từ vựng nào trong danh sách được chọn để tạo bài luyện nghe!"
            }), sid);
        }
        if (isVietNghia && hinhThuc === "TU") {
            const tuDuocChon = shuffleArray(dsTu).slice(0, soCau);
            const rawJson = JSON.stringify(tuDuocChon.map((t, i) => ({
                num: i + 1,
                english: t.tiengAnh,
                meaning: t.tiengViet,
                ipa: t.phienAm || ""
            })));
            return htmlResponse(renderNgheDien({
                tplName, dsBo, boIdChon: boId, tongSoTu: dsTu.length, soCauChon: soCau, capDoChon: capDo, hinhThucChon: hinhThuc,
                rawCauNgheDien: rawJson
            }), sid);
        }
        const tuDuocChon = shuffleArray(dsTu).slice(0, 30);
        const danhSachTu = tuDuocChon.map(t => `- ${t.tiengAnh}${t.tiengViet ? ` (nghĩa: ${t.tiengViet})` : ""}`).join("\n");
        try {
            const rawCauNgheDien = await taoCauNgheDien(env, danhSachTu, soCau, capDo);
            return htmlResponse(renderNgheDien({
                tplName, dsBo, boIdChon: boId, tongSoTu: dsTu.length, soCauChon: soCau, capDoChon: capDo, hinhThucChon: hinhThuc,
                rawCauNgheDien
            }), sid);
        } catch (err) {
            return htmlResponse(renderNgheDien({
                tplName, dsBo, boIdChon: boId, tongSoTu: dsTu.length, soCauChon: soCau, capDoChon: capDo, hinhThucChon: hinhThuc,
                loi: "Lỗi AI tạo câu nghe: " + err.message
            }), sid);
        }
    }

    // =========================================================
    // LUYỆN NÓI (/luyen-noi, /luyen-noi/bat-dau, /api/luyen-noi/cham-diem-audio)
    // =========================================================
    if (pathname === "/luyen-noi" && method === "GET") {
        const boId = url.searchParams.get("boId") ? Number(url.searchParams.get("boId")) : null;
        const kieuHoc = url.searchParams.get("kieuHoc") || "NGAU_NHIEN";
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        return htmlResponse(renderLuyenNoi({ dsBo, boIdChon: boId, kieuHocChon: kieuHoc, tongSoTu: tatCa.length }), sid);
    }

    if (pathname === "/luyen-noi/bat-dau" && method === "POST") {
        const formData = await request.formData();
        const kieuHoc = formData.get("kieuHoc") || "NGAU_NHIEN";
        const boId = formData.get("boId") ? Number(formData.get("boId")) : null;
        const soTu = Number(formData.get("soTu") || 10);
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        let dsGoc = tatCa;
        if (kieuHoc === "THEO_BO" && boId) dsGoc = tatCa.filter(t => t.boId === boId);
        else if (kieuHoc === "TU_SAI") {
            const sai = tatCa.filter(t => (t.soLanSai || 0) > 0);
            if (sai.length > 0) dsGoc = sai;
        }
        if (dsGoc.length === 0) {
            return htmlResponse(renderLuyenNoi({ dsBo, boIdChon: boId, kieuHocChon: kieuHoc, tongSoTu: tatCa.length, loi: "Bạn chưa có từ vựng nào trong bộ đã chọn!" }), sid);
        }
        const dsLuyen = shuffleArray(dsGoc).slice(0, soTu).map(t => ({
            tiengAnh: t.tiengAnh,
            tiengViet: t.tiengViet,
            phienAm: t.phienAm || `/${(t.tiengAnh || "").toLowerCase()}/`,
            viDu: t.viDu || ""
        }));
        return htmlResponse(renderLuyenNoi({ dsBo, boIdChon: boId, kieuHocChon: kieuHoc, tongSoTu: tatCa.length, dsLuyen }), sid);
    }

    if (pathname === "/api/luyen-noi/cham-diem-audio" && method === "POST") {
        try {
            const formData = await request.formData();
            const file = formData.get("file");
            const tuGoc = formData.get("tuGoc") || "";
            const phienAm = formData.get("phienAm") || "";
            if (!file) return jsonResponse({ error: "Không nhận được file âm thanh" }, 400, sid);
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = "";
            for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
            const base64 = btoa(bin);
            const jsonStr = await chamDiemPhatAmAudio(env, base64, file.type || "audio/webm", tuGoc, phienAm);
            return new Response(jsonStr, { status: 200, headers: { "Content-Type": "application/json; charset=UTF-8" } });
        } catch (err) {
            if (err && err.isNeedClientGemini) {
                return jsonResponse({
                    __needClientGemini: true,
                    prompt: err.geminiPayload.prompt,
                    jsonMode: err.geminiPayload.jsonMode,
                    inlineData: err.geminiPayload.inlineData
                }, 200, sid);
            }
            return jsonResponse({ error: err.message }, 500, sid);
        }
    }

    // Default fallback to static asset or home
    try {
        const res = await env.ASSETS.fetch(request);
        if (res.status !== 404) return res;
    } catch (e) {}

    return redirectResponse("/", sid);
}
