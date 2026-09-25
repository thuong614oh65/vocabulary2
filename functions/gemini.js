// =========================================================
// AI GEMINI, DICTIONARY, TRANSLATION, SOUNDWHY & TTS ENGINE
// =========================================================

import { PHONICS_RULES } from "./data/presets.js";

const MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash"
];

export async function callGemini(env, prompt, jsonMode = false, inlineData = null) {
    const rawKeys = (env && env.GEMINI_API_KEY) ? env.GEMINI_API_KEY : "";
    const keys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
        throw new Error("Chưa cấu hình GEMINI_API_KEY trong Environment Variables của Cloudflare Pages.");
    }

    let lastErr = null;
    for (const model of MODELS) {
        for (const key of keys) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const parts = [{ text: prompt }];
                if (inlineData && inlineData.data && inlineData.mimeType) {
                    parts.push({ inline_data: { mime_type: inlineData.mimeType, data: inlineData.data } });
                }

                const body = {
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.25
                    }
                };
                if (jsonMode) {
                    body.generationConfig.responseMimeType = "application/json";
                }

                const resp = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                if (!resp.ok) {
                    lastErr = new Error(`Gemini HTTP ${resp.status}`);
                    continue;
                }

                const data = await resp.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) return text.trim();
            } catch (e) {
                lastErr = e;
            }
        }
    }
    throw lastErr || new Error("Không thể kết nối Gemini AI");
}

export function cleanJson(raw) {
    if (!raw) return "{}";
    let s = raw.trim();
    if (s.startsWith("```json")) s = s.substring(7);
    else if (s.startsWith("```")) s = s.substring(3);
    if (s.endsWith("```")) s = s.substring(0, s.length - 3);
    return s.trim();
}

// =========================================================
// GOOGLE TRANSLATE & FREE DICTIONARY API (FAST BULK LOOKUP)
// =========================================================

export async function dichAnhViet(text) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(text)}`;
        const resp = await fetch(url);
        if (!resp.ok) return "";
        const data = await resp.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
            return data[0].map(item => item[0]).join("").trim();
        }
    } catch (e) {}
    return "";
}

export async function layTuDienAnh(word) {
    const clean = (word || "").trim();
    let phienAm = "";
    let viDu = "";
    try {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean.toLowerCase())}`);
        if (resp.ok) {
            const arr = await resp.json();
            if (Array.isArray(arr) && arr.length > 0) {
                const entry = arr[0];
                phienAm = entry.phonetic || "";
                if (!phienAm && Array.isArray(entry.phonetics)) {
                    for (const p of entry.phonetics) {
                        if (p.text) { phienAm = p.text; break; }
                    }
                }
                if (Array.isArray(entry.meanings)) {
                    for (const m of entry.meanings) {
                        if (Array.isArray(m.definitions)) {
                            for (const d of m.definitions) {
                                if (d.example) { viDu = d.example; break; }
                            }
                        }
                        if (viDu) break;
                    }
                }
            }
        }
    } catch (e) {}

    const tiengViet = await dichAnhViet(clean);
    if (!phienAm) {
        phienAm = "/" + clean.toLowerCase() + "/";
    }
    return {
        tiengAnh: clean,
        tiengViet: tiengViet || clean,
        phienAm,
        viDu: viDu || `This is an example with ${clean}.`
    };
}

export async function traTuHangLoat(words) {
    const cleanWords = words.map(w => w.trim()).filter(Boolean);
    const results = await Promise.all(cleanWords.map(w => layTuDienAnh(w)));
    return results;
}

// =========================================================
// SOUNDWHY PRONUNCIATION GUIDE (/api/huong-dan-doc)
// =========================================================

export async function layHuongDanDoc(tu, phienAmParam, nghiaParam) {
    const word = (tu || "").trim();
    let phienAm = (phienAmParam || "").trim();
    let nghia = (nghiaParam || "").trim();

    if (!phienAm || !nghia) {
        const info = await layTuDienAnh(word);
        if (!phienAm) phienAm = info.phienAm;
        if (!nghia) nghia = info.tiengViet;
    }

    // Tạo thẻ SoundWhy Phonics tách âm tiết tự động
    const syllables = tachAmTiet(word);
    const ipaClean = phienAm.replace(/^\/|\/$/g, "");
    const ipaParts = tachIpaTheoAmTiet(ipaClean, syllables.length);

    const dsPhonemes = syllables.map((syl, idx) => ({
        letters: syl,
        ipa: ipaParts[idx] || syl,
        loaiAm: idx === 0 ? "Âm tiết " + (idx + 1) : "Âm tiết " + (idx + 1),
        cachDocBoi: chuyenSangDocBoi(syl),
        audioText: syl,
        coTrongAm: (ipaParts[idx] && ipaParts[idx].includes("ˈ")) || (idx === 0 && syllables.length === 1)
    }));

    const cachDocBoi = syllables.map((s, idx) => {
        const b = chuyenSangDocBoi(s);
        return (dsPhonemes[idx]?.coTrongAm) ? b.toUpperCase() : b;
    }).join(" - ");

    // Tìm quy tắc sơ đồ đánh vần liên quan
    const dsMindmap = [];
    const lowerWord = word.toLowerCase();
    for (const rule of (PHONICS_RULES || [])) {
        if (rule.cumChuCai) {
            const pattern = rule.cumChuCai.toLowerCase().replace(/[^a-z]/g, "");
            if (pattern && pattern.length >= 2 && lowerWord.includes(pattern)) {
                dsMindmap.push({
                    id: rule.id,
                    tieuDe: `${rule.cumChuCai} ➔ ${rule.amIpa}`,
                    moTaNgan: rule.meoGhiNho || ""
                });
                if (dsMindmap.length >= 3) break;
            }
        }
    }

    const lastChar = lowerWord.slice(-1);
    let amDuoi = "Bật nhẹ âm cuối để từ nghe tự nhiên chuẩn bản xứ.";
    if (lastChar === "s" || lastChar === "z") amDuoi = "Có âm gió /s/ hoặc /z/ ở cuối từ — nhớ xì nhẹ hơi qua kẽ răng sau khi đọc xong từ.";
    else if (lastChar === "t" || lastChar === "d") amDuoi = "Âm đuôi /t/ hoặc /d/ — chạm nhẹ đầu lưỡi lên chân răng hàm trên ở cuối từ.";
    else if (lastChar === "k" || lastChar === "g" || lowerWord.endsWith("ce") || lowerWord.endsWith("ge")) amDuoi = "Chú ý bật rõ phụ âm cuối của từ, không nuốt âm đuôi.";

    return {
        tu,
        phienAm,
        nghia,
        cachDocBoi,
        dsAmTiet: syllables,
        dsPhonemes,
        khauHinh: `Nhấn trọng âm rõ vào phần chữ IN HOA (${cachDocBoi}). Các âm không nhấn trọng âm đọc nhẹ và lướt nhanh.`,
        amDuoi,
        loiThuongGap: `Người Việt thường đọc ngang bằng cả ${syllables.length} âm tiết hoặc quên âm cuối của từ "${word}". Hãy đọc rõ "${cachDocBoi}".`,
        dsMindmap
    };
}

function tachAmTiet(word) {
    const w = word.trim();
    if (w.length <= 3) return [w];
    const parts = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
    return (parts && parts.length > 0) ? parts : [w];
}

function tachIpaTheoAmTiet(ipa, count) {
    if (count <= 1) return [ipa];
    if (ipa.includes(".")) {
        const p = ipa.split(".");
        if (p.length === count) return p;
    }
    const step = Math.max(1, Math.ceil(ipa.length / count));
    const res = [];
    for (let i = 0; i < count; i++) {
        res.push(ipa.slice(i * step, (i === count - 1) ? ipa.length : (i + 1) * step));
    }
    return res;
}

function chuyenSangDocBoi(syl) {
    let s = syl.toLowerCase();
    s = s.replace(/tion$/g, "sần").replace(/sion$/g, "giần").replace(/ture$/g, "chờ")
         .replace(/sh/g, "s").replace(/ch/g, "ch").replace(/th/g, "th")
         .replace(/ph/g, "ph").replace(/ee/g, "i").replace(/oo/g, "u")
         .replace(/ea/g, "i").replace(/ai/g, "ây").replace(/ay/g, "ây")
         .replace(/ou/g, "ao").replace(/ow/g, "ao");
    return s;
}

// =========================================================
// TOEIC SPEAKING Q7-9 AI GRADING (/api/luyen-de/cham-diem)
// =========================================================

export async function chamDiemDeQ79(env, req) {
    const prompt = `Bạn là Giám khảo chấm thi TOEIC Speaking Parts Q7-9 chuẩn ETS.
Hãy chấm điểm cực nhanh và chính xác cho bài làm dưới đây.

TIÊU ĐỀ BẢNG THÔNG TIN: ${req.tieuDe || ""}
NỘI DUNG BẢNG THÔNG TIN ĐỀ BÀI:
${req.thongTinDeBai || ""}

TÌNH HUỐNG: ${req.tinhHuong || ""}

CÂU HỎI 7 (15s): ${req.cauHoi1 || ""}
TRẢ LỜI CỦA HỌC VIÊN CÂU 7: ${req.cauTraLoi1 || "(Bỏ trống)"}

CÂU HỎI 8 (15s): ${req.cauHoi2 || ""}
TRẢ LỜI CỦA HỌC VIÊN CÂU 8: ${req.cauTraLoi2 || "(Bỏ trống)"}

CÂU HỎI 9 (30s): ${req.cauHoi3 || ""}
TRẢ LỜI CỦA HỌC VIÊN CÂU 9: ${req.cauTraLoi3 || "(Bỏ trống)"}

YÊU CẦU QUAN TRỌNG VỀ "trichDanDeBai" VÀ "huongDanChemTu":
1. "trichDanDeBai": Copy Y HỆT nguyên văn dòng dữ liệu trong bảng đề bài cần dùng để trả lời câu hỏi này (Ví dụ: "May 29 | 9:00 a.m. - 11:00 a.m. | Visit to main drilling site | Walterenz"). KHÔNG giải thích dài dòng.
2. "huongDanChemTu": Viết lại chính dòng đề bài đó và đặt các từ chêm thêm vào trong ngoặc vuông [...] để tạo thành câu hoàn chỉnh đọc lên là ăn điểm ngay mà KHÔNG CẦN suy luận lý thuyết (Ví dụ: "[On] May 29 [from] 9:00 a.m. [to] 11:00 a.m., [there will be a] visit to [the] main drilling site [led by] Walterenz.").
3. "suaCauNguoiDung": Sửa trực tiếp câu trả lời của học viên thành câu hoàn chỉnh, đúng ngữ pháp.

Trả về đúng định dạng JSON sau:
{
  "tongDiem": 160,
  "mucDiem": "Level 7 (Good - 160/200)",
  "nhanXetChung": "Nhận xét tổng quan ngắn gọn",
  "cau1": {
    "soCau": 7,
    "cauHoi": "${(req.cauHoi1 || "").replace(/"/g, '\\"')}",
    "cauTraLoiNguoiDung": "${(req.cauTraLoi1 || "").replace(/"/g, '\\"')}",
    "diemSo": 3,
    "diemToiDa": 3,
    "danhGia": "Đúng / Khá tốt / Cần cải thiện",
    "trichDanDeBai": "Dòng dữ liệu gốc y hệt trong đề",
    "huongDanChemTu": "Câu ghép trực tiếp từ dòng đề bằng cách đặt từ chêm trong ngoặc vuông [như thế này]",
    "suaCauNguoiDung": "Câu của học viên đã được sửa lại chuẩn ngữ pháp",
    "giaiThichSuaCau": "Giải thích ngắn gọn lỗi sai đã sửa",
    "nhanXetChiTiet": "Nhận xét ngắn gọn",
    "dapAnMau": "Câu trả lời mẫu chuẩn TOEIC Speaking",
    "dichNghiaDapAnMau": "Dịch nghĩa câu trả lời mẫu sang tiếng Việt"
  },
  "cau2": {
    "soCau": 8,
    "cauHoi": "${(req.cauHoi2 || "").replace(/"/g, '\\"')}",
    "cauTraLoiNguoiDung": "${(req.cauTraLoi2 || "").replace(/"/g, '\\"')}",
    "diemSo": 3,
    "diemToiDa": 3,
    "danhGia": "Đúng / Khá tốt / Cần cải thiện",
    "trichDanDeBai": "...",
    "huongDanChemTu": "...",
    "suaCauNguoiDung": "...",
    "giaiThichSuaCau": "...",
    "nhanXetChiTiet": "...",
    "dapAnMau": "...",
    "dichNghiaDapAnMau": "..."
  },
  "cau3": {
    "soCau": 9,
    "cauHoi": "${(req.cauHoi3 || "").replace(/"/g, '\\"')}",
    "cauTraLoiNguoiDung": "${(req.cauTraLoi3 || "").replace(/"/g, '\\"')}",
    "diemSo": 3,
    "diemToiDa": 3,
    "danhGia": "Đúng / Khá tốt / Cần cải thiện",
    "trichDanDeBai": "...",
    "huongDanChemTu": "...",
    "suaCauNguoiDung": "...",
    "giaiThichSuaCau": "...",
    "nhanXetChiTiet": "...",
    "dapAnMau": "...",
    "dichNghiaDapAnMau": "..."
  }
}`;

    const raw = await callGemini(env, prompt, true);
    return JSON.parse(cleanJson(raw));
}
