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
    dichAnhViet,
    layTuDienAnh,
    traTuHangLoat,
    layHuongDanDoc,
    chamDiemDeQ79
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
    renderGenericTemplate
} from "./renderer.js";

function htmlResponse(html, sid = null, status = 200) {
    const headers = new Headers({
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
    });
    if (sid) {
        headers.append("Set-Cookie", `vocab_sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    return new Response(html, { status, headers });
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
        }
    }

    if (pathname === "/dangky") {
        if (method === "GET") {
            return htmlResponse(renderDangKy(null), sid);
        }
        if (method === "POST") {
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
        const dto = await layHuongDanDoc(tu, phienAm, nghia);
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
        const chuDe = url.searchParams.get("chuDe") || "Giao tiếp";
        const tatCa = await getTatCaTuByUser(env, taiKhoanId);
        const daCo = tatCa.map(t => t.tiengAnh.toLowerCase()).slice(0, 150).join(", ");
        const prompt = `Hãy đề xuất đúng 10 từ vựng tiếng Anh thông dụng thuộc chủ đề "${chuDe}" mà KHÔNG nằm trong danh sách sau: [${daCo}].
Trả về mảng JSON gồm 10 phần tử theo cấu trúc:
[{"tiengAnh": "...", "phienAm": "/.../", "tiengViet": "...", "viDu": "..."}]`;
        const raw = await callGemini(env, prompt, true);
        return jsonResponse(JSON.parse(cleanJson(raw)), 200, sid);
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
            traTuHangLoat(words)
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
            const prompt = `Tạo đề thi TOEIC Speaking Q7-9 từ văn bản sau:\n${vanBan}\nTrả về JSON gồm: tieuDe, tomTatNoiDung, tinhHuong, cauHoi1, goiYCau1, cauHoi2, goiYCau2, cauHoi3, goiYCau3.`;
            const raw = await callGemini(env, prompt, true);
            const dto = JSON.parse(cleanJson(raw));
            dto.loaiNoiDung = "TEXT";
            dto.vanBanThongTin = vanBan;
            dto.thoiGianCau1 = 15;
            dto.thoiGianCau2 = 15;
            dto.thoiGianCau3 = 30;
            return jsonResponse(dto, 200, sid);
        } catch (e) {
            return jsonResponse({ error: e.message }, 500, sid);
        }
    }

    if (pathname === "/api/luyen-de/tao-tu-dong" && method === "POST") {
        try {
            const prompt = `Hãy tự sinh ngẫu nhiên 1 đề thi TOEIC Speaking Q7-9 mới (lịch trình hội nghị/sự kiện/tour). Trả về JSON gồm: tieuDe, vanBanThongTin, tomTatNoiDung, tinhHuong, cauHoi1, goiYCau1, cauHoi2, goiYCau2, cauHoi3, goiYCau3.`;
            const raw = await callGemini(env, prompt, true);
            const dto = JSON.parse(cleanJson(raw));
            dto.loaiNoiDung = "TEXT";
            dto.thoiGianCau1 = 15;
            dto.thoiGianCau2 = 15;
            dto.thoiGianCau3 = 30;
            return jsonResponse(dto, 200, sid);
        } catch (e) {
            return jsonResponse({ error: e.message }, 500, sid);
        }
    }

    // =========================================================
    // LUYỆN PHẢN XẠ (/luyen-phan-xa, /api/luyen-phan-xa/*)
    // =========================================================
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
        const kieuHoc = url.searchParams.get("kieuHoc") || "THEO_BO";
        const tatCa = await getTatCaTuByUser(env, taiKhoanId);
        let dsTuGoc = [];
        if (kieuHoc === "DANG_HOC" && Array.isArray(session.tuDangHoc) && session.tuDangHoc.length > 0) {
            dsTuGoc = session.tuDangHoc;
        } else if (boId) {
            dsTuGoc = tatCa.filter(t => t.boId === boId);
        }
        if (dsTuGoc.length === 0) dsTuGoc = shuffleArray(tatCa).slice(0, 25);

        const allVi = tatCa.map(t => t.tiengViet).filter(Boolean);
        const questions = shuffleArray(dsTuGoc).map(tv => {
            const wrong = shuffleArray(allVi.filter(v => v !== tv.tiengViet)).slice(0, 3);
            while (wrong.length < 3) wrong.push("Đáp án khác " + (wrong.length + 1));
            return {
                id: tv.id,
                tiengAnh: tv.tiengAnh,
                tiengViet: tv.tiengViet,
                phienAm: tv.phienAm,
                audioUrl: `/audio/phat?text=${encodeURIComponent(tv.tiengAnh)}`,
                loaiCauHoi: "TU_SANG_NGHIA",
                capDo: "Nhìn từ ➔ 4 Nghĩa Việt",
                dapAnDung: tv.tiengViet,
                luaChon: shuffleArray([tv.tiengViet, ...wrong])
            };
        });
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
        const body = await request.json();
        const info = await layTuDienAnh(body.tuKhoa || "");
        return jsonResponse({
            thanhCong: true,
            tuKhoaGoc: info.tiengAnh,
            phienAm: info.phienAm,
            nghiaChinh: info.tiengViet,
            danhSachDinhNghia: [{ tuLoai: "Từ vựng", nghiaTiengViet: info.tiengViet, viDuTiengAnh: info.viDu }]
        }, 200, sid);
    }

    if (pathname === "/api/tra-tu/luu-nhanh" && method === "POST") {
        const body = await request.json();
        let boId = body.boId ? Number(body.boId) : null;
        if (!boId) {
            const dsBo = await getBoTuVungByUser(env, taiKhoanId);
            const tenBo = (body.tenBoMoi || "").trim() || `Bộ ${dsBo.length + 1}`;
            const res = await sqlQuery(env, "INSERT INTO bo_tu_vung (ten_bo, ngay_tao, tai_khoan_id) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id", [tenBo, taiKhoanId]);
            boId = Number(res[0].id);
        }
        await sqlQuery(
            env,
            "INSERT INTO tu_vung (tieng_anh, tieng_viet, phien_am, vi_du, so_lan_sai, bo_id) VALUES ($1, $2, $3, $4, 0, $5)",
            [(body.tiengAnh || "").trim(), body.tiengViet || "", body.phienAm || "", body.viDu || "", boId]
        );
        return jsonResponse({ success: true, message: "Đã lưu từ thành công!" }, 200, sid);
    }

    if (["/dich-doan-van", "/dien-cho-trong", "/nghe-dien", "/nghe-viet-nghia", "/luyen-noi"].includes(pathname)) {
        const tplName = pathname.substring(1);
        const [dsBo, tatCa] = await Promise.all([
            getBoTuVungByUser(env, taiKhoanId),
            getTatCaTuByUser(env, taiKhoanId)
        ]);
        return htmlResponse(renderGenericTemplate(tplName, dsBo, tatCa.length), sid);
    }

    // Default fallback to static asset or home
    try {
        const res = await env.ASSETS.fetch(request);
        if (res.status !== 404) return res;
    } catch (e) {}

    return redirectResponse("/", sid);
}
