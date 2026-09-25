// =========================================================
// NEON SERVERLESS POSTGRESQL CLIENT FOR CLOUDFLARE PAGES
// Connects to the exact same Neon DB as the Java Spring Boot app
// =========================================================

const DEFAULT_DB_URL = "postgresql://neondb_owner:npg_1tQqN2VkGMsH@ep-little-thunder-azqmb031.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const DEFAULT_HTTP_ENDPOINT = "https://ep-little-thunder-azqmb031.c-3.ap-southeast-1.aws.neon.tech/sql";

const memorySessions = new Map();
let sessionTableInitialized = false;

export async function sqlQuery(env, query, params = []) {
    const connStr = (env && env.DATABASE_URL) ? env.DATABASE_URL : DEFAULT_DB_URL;
    let endpoint = DEFAULT_HTTP_ENDPOINT;
    try {
        const match = connStr.match(/@([^\/:\?]+)/);
        if (match && match[1]) {
            endpoint = `https://${match[1]}/sql`;
        }
    } catch (e) {}

    const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Neon-Connection-String": connStr,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, params })
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Neon SQL error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return data.rows || [];
}

export function getCookie(request, name) {
    const cookieHeader = request.headers.get("Cookie") || "";
    const pairs = cookieHeader.split(";");
    for (const p of pairs) {
        const idx = p.indexOf("=");
        if (idx > 0) {
            const k = p.substring(0, idx).trim();
            const v = p.substring(idx + 1).trim();
            if (k === name) return decodeURIComponent(v);
        }
    }
    return null;
}

export async function getSession(request, env) {
    let sid = getCookie(request, "vocab_sid");
    let isNew = false;
    if (!sid) {
        sid = crypto.randomUUID().replace(/-/g, "");
        isNew = true;
        const emptyData = {};
        memorySessions.set(sid, emptyData);
        return { sid, data: emptyData, isNew };
    }

    if (memorySessions.has(sid)) {
        return { sid, data: memorySessions.get(sid), isNew };
    }

    try {
        if (!sessionTableInitialized) {
            await sqlQuery(env, `CREATE TABLE IF NOT EXISTS app_sessions (
                sid VARCHAR(128) PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            sessionTableInitialized = true;
        }
        const rows = await sqlQuery(env, "SELECT data FROM app_sessions WHERE sid = $1", [sid]);
        if (rows.length > 0 && rows[0].data) {
            const parsed = JSON.parse(rows[0].data);
            memorySessions.set(sid, parsed);
            return { sid, data: parsed, isNew: false };
        }
    } catch (e) {
        console.warn("Session DB load fallback:", e.message);
    }

    const empty = {};
    memorySessions.set(sid, empty);
    return { sid, data: empty, isNew };
}

export async function saveSession(env, sid, data) {
    memorySessions.set(sid, data);
    try {
        if (!sessionTableInitialized) {
            await sqlQuery(env, `CREATE TABLE IF NOT EXISTS app_sessions (
                sid VARCHAR(128) PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            sessionTableInitialized = true;
        }
        const jsonStr = JSON.stringify(data || {});
        await sqlQuery(
            env,
            `INSERT INTO app_sessions (sid, data, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (sid) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
            [sid, jsonStr]
        );
    } catch (e) {
        console.warn("Session DB save fallback:", e.message);
    }
}

export async function clearSession(env, sid) {
    memorySessions.delete(sid);
    try {
        await sqlQuery(env, "DELETE FROM app_sessions WHERE sid = $1", [sid]);
    } catch (e) {}
}

// =========================================================
// REPOSITORY HELPERS (MATCHING EXACT JAVA ENTITIES)
// =========================================================

export async function getBoTuVungByUser(env, taiKhoanId) {
    const rows = await sqlQuery(
        env,
        `SELECT b.id, b.ten_bo, b.ngay_tao, b.tai_khoan_id,
                COUNT(t.id)::int AS so_luong_tu
         FROM bo_tu_vung b
         LEFT JOIN tu_vung t ON t.bo_id = b.id
         WHERE b.tai_khoan_id = $1
         GROUP BY b.id, b.ten_bo, b.ngay_tao, b.tai_khoan_id
         ORDER BY b.id DESC`,
        [taiKhoanId]
    );
    return rows.map(r => ({
        id: Number(r.id),
        tenBo: r.ten_bo || "",
        ngayTao: r.ngay_tao,
        soLuongTu: Number(r.so_luong_tu || 0),
        taiKhoanId: Number(r.tai_khoan_id)
    }));
}

export async function getTatCaTuByUser(env, taiKhoanId) {
    const boList = await getBoTuVungByUser(env, taiKhoanId);
    const boMap = new Map(boList.map(b => [b.id, b]));

    const rows = await sqlQuery(
        env,
        `SELECT t.id, t.tieng_anh, t.tieng_viet, t.phien_am, t.vi_du, t.so_lan_sai, t.bo_id,
                b.ten_bo
         FROM tu_vung t
         INNER JOIN bo_tu_vung b ON t.bo_id = b.id
         WHERE b.tai_khoan_id = $1
         ORDER BY b.id DESC, t.id ASC`,
        [taiKhoanId]
    );

    return rows.map(r => {
        const boId = Number(r.bo_id);
        const bo = boMap.get(boId) || { id: boId, tenBo: r.ten_bo || "", soLuongTu: 1 };
        return {
            id: Number(r.id),
            tiengAnh: r.tieng_anh || "",
            tiengViet: r.tieng_viet || "",
            phienAm: r.phien_am || "",
            viDu: r.vi_du || "",
            soLanSai: Number(r.so_lan_sai || 0),
            boId,
            boTuVung: bo
        };
    });
}

export async function getTuTheoBo(env, boId, taiKhoanId) {
    const all = await getTatCaTuByUser(env, taiKhoanId);
    return all.filter(t => t.boId === Number(boId));
}

export async function getTuSaiByUser(env, taiKhoanId) {
    const all = await getTatCaTuByUser(env, taiKhoanId);
    return all
        .filter(t => (t.soLanSai || 0) > 0)
        .sort((a, b) => (b.soLanSai || 0) - (a.soLanSai || 0));
}
