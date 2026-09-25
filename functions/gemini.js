// =========================================================
// AI GEMINI, DICTIONARY, TRANSLATION, SOUNDWHY & TTS ENGINE
// =========================================================

import { PHONICS_RULES } from "./data/presets.js";

const DEFAULT_GEMINI_KEYS = [
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
].map(suffix => ["AQ", "Ab8RN6" + suffix].join("."));

const MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash"
];

let keyCursor = 0;

export async function callGemini(env, prompt, jsonMode = false, inlineData = null) {
    const rawKeys = (env && env.GEMINI_API_KEY) ? env.GEMINI_API_KEY : "";
    const envKeys = rawKeys.split(/[,;\n\r]+/).map(k => k.trim()).filter(Boolean);
    const keys = Array.from(new Set([...envKeys, ...DEFAULT_GEMINI_KEYS]));

    let lastErr = null;
    for (const model of MODELS) {
        for (let attempt = 0; attempt < keys.length; attempt++) {
            const idx = keyCursor % keys.length;
            keyCursor = (keyCursor + 1) % keys.length;
            const key = keys[idx];

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
                const parts = [];
                if (inlineData && inlineData.data && inlineData.mimeType) {
                    parts.push({ inline_data: { mime_type: inlineData.mimeType, data: inlineData.data } });
                }
                parts.push({ text: prompt });

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
                    const errTxt = await resp.text();
                    lastErr = new Error(`Gemini HTTP ${resp.status}: ${errTxt.slice(0, 120)}`);
                    continue;
                }

                const data = await resp.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text && text.trim()) return text.trim();
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
// 1. TẠO ĐOẠN VĂN LUYỆN DỊCH (/dich-doan-van)
// =========================================================
export async function taoDoanVan(env, danhSachTu) {
    const prompt = `Ban la mot giao vien tieng Anh ban xu chuyen tao bai tap luyen dich cho hoc vien.
Hay viet mot doan van tieng Anh ngan gon, tu nhien, troi chay va co cot truyen/ngu canh doi song mach lac (khoang 90 den 150 tu) de nguoi hoc luyen dich.

QUY TAC VA YEU CAU BAT BUOC:
1. MUC TIEU TRONG TAM: Tich hop va uu tien su dung cac tu vung tu cac bo tu cua nguoi hoc trong danh sach ben duoi.
2. KET HOP TU NGU CO BAN: De cau van troi chay, logic va tu nhien, hay chu dong bo sung them cac tu vung, ngu phap co ban va thong dung (nhu dai tu, gioi tu, lien tu, tinh tu, thi co ban...). Tuyet doi khong ghep tu guong ep khien doan van kho hieu.
3. CHUAN VAN PHONG BAN XU: Doan van phai dung 100% ngu phap tieng Anh, mang phong cach tu nhien, sinh dong va thuc te.
4. DO DAI: Khoang 90 - 150 tu.
5. DINH DANG TRA VE: Chi tra ve DUY NHAT doan van tieng Anh, khong ghi tieu de, khong giai thich, khong dich, khong danh so hay ghi chu them.

Danh sach tu vung duoc chon cua nguoi hoc:
${danhSachTu}`;

    return await callGemini(env, prompt, false);
}

// =========================================================
// 2. KIỂM TRA BẢN DỊCH (/dich-doan-van/kiem-tra)
// =========================================================
export async function kiemTraBanDich(env, doanVan, banDich) {
    const prompt = `Ban la giao vien tieng Anh dang cham bai dich cho mot nguoi Viet Nam hoc tieng Anh.

Hay danh gia ban dich tieng Viet cua nguoi hoc dua tren doan van tieng Anh goc.

DOAN VAN TIENG ANH:

${doanVan}

BAN DICH CUA NGUOI HOC:

${banDich}

Hay danh gia theo cac yeu cau sau:
1. Kiem tra xem ban dich co truyen dat dung y nghia cua doan van tieng Anh hay khong.
2. Khong yeu cau ban dich phai giong tung chu voi ban dich mau.
3. Neu nguoi hoc dung cach dien dat tieng Viet khac nhung van dung nghia thi coi la Dung.
4. Phan biet ro: Dung / Gan dung / Sai hoac thieu y.
5. Neu co loi, hay chi ra ro loi sai tu vung, ngu phap hoac y thieu. Neu dich dung hoan toan, ghi ro "Khong co loi nao".
6. Dua ra ban dich tieng Viet chuan xac, tu nhien nhat de nguoi hoc tham khao.
7. Dua ra loi khuyen/goi y ngan gon giup nguoi hoc cai thien cach dich.

BAT BUOC tra ve ket qua theo dung dinh dang cac the ben duoi (giu nguyen ten the, khong them markdown nhu ** vao ten the):

[DANH_GIA]
(Ghi 1 trong 3 muc: Dung / Gan dung / Sai hoac thieu y)
[/DANH_GIA]

[NHAN_XET]
(Nhan xet ngan gon, dong vien nguoi hoc ve ban dich)
[/NHAN_XET]

[LOI_HOAC_THIEU]
(Chi ra loi sai hoac y thieu. Neu ban dich tot khong co loi, ghi "Khong co loi nao")
[/LOI_HOAC_THIEU]

[BAN_DICH_GOI_Y]
(Ban dich tieng Viet day du, chuan xac va tu nhien nhat)
[/BAN_DICH_GOI_Y]

[GOI_Y_CAI_THIEN]
(Goi y cach dien dat, tu vung hay hon neu co)
[/GOI_Y_CAI_THIEN]`;

    return await callGemini(env, prompt, false);
}

// =========================================================
// 3. TẠO BÀI ĐIỀN VÀO CHỖ TRỐNG (/dien-cho-trong/tao)
// =========================================================
export async function taoDoanVanDienTu(env, danhSachTu) {
    const prompt = `Ban la giao vien tieng Anh ban xu.
Hay viet mot doan van tieng Anh tu nhien, co cot truyen hoac ngu canh doi song thuc te ro rang (khoang 80 - 140 tu) de tao bai tap "Dien tu vao cho trong".

QUY TAC BAT BUOC:
1. MUC TIEU HOC TAP: Chon khoang 4 den 10 tu vung phu hop nhat trong danh sach cua nguoi hoc de dat vao dung ngu canh tu nhien cua cau.
2. CHUAN NGU PHAP VA TU NHIEN: Doan van phai dung ngu phap tieng Anh, logic va de hieu. Linh hoat them cac tu ngu quen thuoc ben ngoai de cau van tron ven, khong nhoi nhet tu guong ep.
3. TAO THE CHO TRONG: Tai vi tri moi tu vung duoc chon, thay the bang the chinh xac:
   [[BLANK:so_thu_tu:tu_tieng_anh_goc:nghia_tieng_viet]]
   Vi du: "Every morning, I drink a cup of [[BLANK:1:coffee:ca phe]] before going to [[BLANK:2:school:truong hoc]]."
4. So thu tu bat dau tu 1 va tang dan: 1, 2, 3...
5. Tu tieng Anh trong the co the chia thi/dang so nhieu phu hop ngu canh.
6. BAN DICH TIENG VIET: O cuoi bai, hay them ban dich tieng Viet hoan chinh dat trong khoi:
   [DICH_TIENG_VIET]
   (Ban dich tieng Viet chinh xac va tu nhien cua doan van)
   [/DICH_TIENG_VIET]
7. Chi tra ve duy nhat doan van tieng Anh co chua cac the [[BLANK:...]] va khoi [DICH_TIENG_VIET], khong them loi chao hay giai thich nao khac.

Danh sach tu vung cua nguoi hoc:
${danhSachTu}`;

    return await callGemini(env, prompt, false);
}

// =========================================================
// 4. TẠO CÂU NGHE ĐIỀN DICTATION (/nghe-dien/tao & /nghe-viet-nghia/tao)
// =========================================================
export async function taoCauNgheDien(env, danhSachTu, soCau = 15, capDo = 1) {
    const quyTacCapDo = (capDo === 1)
        ? `QUY TAC BAT BUOC CHO CAP DO 1 (CO BAN):
1. CAU TRUC CAU: Moi cau phai la CAU DON RAT CO BAN va cuc ky don gian.
   Chi gom DUNG 1 Chu ngu + 1 Dong tu + 1 Tan ngu/Trang tu/Tinh tu.
2. DO DAI: Rat ngan gon, chi tu 3 den 6 tu moi cau.
3. TUYET DOI KHONG dung lien tu phuc tap hay menh de quan he.`
        : `QUY TAC BAT BUOC CHO CAP DO 2 (NANG CAO):
1. CAU TRUC CAU: La cau nang cao, cau phuc, cau ghep hoac cau co menh de quan he, lien tu phu thuoc (because, although, while, when, if, who, which, that...).
2. DO DAI: Tu 8 den 16 tu moi cau.`;

    const prompt = `Ban la giao vien tieng Anh ban xu.
Hay tao chinh xac ${soCau} cau tieng Anh theo dung CAP DO ${capDo} ben duoi de nguoi hoc luyen nghe va chep chinh ta (Dictation).

${quyTacCapDo}

QUY TAC CHUNG CHO TAT CA CAC CAU:
1. Moi cau phai long ghep kheo leo it nhat 1 tu vung trong danh sach cua nguoi hoc ben duoi.
2. Cau van phai hoan toan tu nhien, chuan xac 100% ngu phap tieng Anh.
3. Tao dung chinh xac ${soCau} cau (danh so tu 1 den ${soCau}).
4. Tra ve DUY NHAT mot mang JSON hop le. Moi phan tu gom 3 truong: "num" (1..${soCau}), "english" (cau tieng Anh), "meaning" (dich nghia tieng Viet tu nhien).

Danh sach tu vung cua nguoi hoc:
${danhSachTu}`;

    const raw = await callGemini(env, prompt, true);
    return cleanJson(raw);
}

// =========================================================
// 5. CHẤM ĐIỂM PHÁT ÂM AUDIO (/api/luyen-noi/cham-diem-audio)
// =========================================================
export async function chamDiemPhatAmAudio(env, base64Data, mimeType, tuGoc, phienAm) {
    const prompt = `You are an international English phonetics expert and IELTS/CEFR Speaking Examiner.
Listen to the audio and evaluate pronunciation of the target English word/phrase:
- TARGET WORD: "${tuGoc || ""}"
- STANDARD IPA: "${phienAm || ""}"

Return ONLY valid JSON matching this structure:
{
  "score": 85,
  "status": "good",
  "recognizedText": "word heard",
  "ipaRecognized": "IPA of what was heard",
  "ipaTarget": "${phienAm || ""}",
  "breakdown": {
    "phonemeAccuracy": 34,
    "stress": 17,
    "vowelQuality": 16,
    "consonantClarity": 9,
    "fluency": 9
  },
  "phonemeDetails": [
    {"symbol": "s", "word": "s", "status": "correct", "note": ""}
  ],
  "correctParts": ["am dung"],
  "incorrectParts": [],
  "feedback": "Nhan xet chi tiet bang tieng Viet",
  "suggestion": "Huong dan khau hinh bang tieng Viet",
  "encouragement": "Loi dong vien ngan gon bang tieng Viet"
}`;
    const raw = await callGemini(env, prompt, true, { data: base64Data, mimeType: mimeType || "audio/webm" });
    return cleanJson(raw);
}

// =========================================================
// 6. TRÍCH XUẤT TỪ VỰNG TỪ ẢNH/FILE (/api/trich-xuat-tu)
// =========================================================
export async function trichXuatTuTuAnh(env, base64Data, mimeType) {
    const prompt = `Bạn là một trợ lý hỗ trợ học từ vựng tiếng Anh.
Hãy trích xuất TẤT CẢ các từ vựng tiếng Anh (English words/phrases) xuất hiện trong hình ảnh hoặc tài liệu này.
YÊU CẦU:
1. Mỗi dòng chỉ chứa đúng một từ hoặc cụm từ tiếng Anh nguyên thể.
2. Bỏ qua số thứ tự, bullet points, dấu câu, giải thích tiếng Việt.
3. Chỉ trả về danh sách từ tiếng Anh, mỗi từ trên một dòng.`;
    const raw = await callGemini(env, prompt, false, { data: base64Data, mimeType: mimeType || "image/jpeg" });
    return raw
        .split(/\r?\n/)
        .map(line => line.replace(/^[\d\.\-\*\•\s]+/, "").trim())
        .filter(w => w.length > 0 && /^[a-zA-Z\s\-']+$/.test(w));
}

// =========================================================
// GOOGLE TRANSLATE & FREE DICTIONARY API (FAST BULK LOOKUP)
// =========================================================

export async function dichAnhViet(text, env = null) {
    const clean = (text || "").trim();
    if (!clean) return "";
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(clean)}`;
        const resp = await fetch(url);
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                const trans = data[0].map(item => item[0]).join("").trim();
                if (trans && trans.toLowerCase() !== clean.toLowerCase()) {
                    return trans;
                }
            }
        }
    } catch (e) {}

    try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|vi`;
        const mmResp = await fetch(mmUrl);
        if (mmResp.ok) {
            const mmData = await mmResp.json();
            const trans = (mmData?.responseData?.translatedText || "").trim();
            if (trans && trans.toLowerCase() !== clean.toLowerCase() && !trans.includes("MYMEMORY WARNING")) {
                return trans;
            }
        }
    } catch (e) {}

    if (env) {
        try {
            const prompt = `Dịch ngắn gọn từ/cụm từ tiếng Anh sau sang nghĩa tiếng Việt phổ biến và chính xác nhất (chỉ trả về nghĩa tiếng Việt, không giải thích): "${clean}"`;
            const aiTrans = await callGemini(env, prompt, false);
            if (aiTrans && aiTrans.trim()) {
                return aiTrans.trim().replace(/^["']|["']$/g, "");
            }
        } catch (e) {}
    }
    return "";
}

export async function layTuDienAnh(word, env = null) {
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

    let tiengViet = await dichAnhViet(clean, env);
    if (!tiengViet || tiengViet.toLowerCase() === clean.toLowerCase()) {
        if (env) {
            try {
                const raw = await callGemini(env, `Trả về JSON {"tiengViet":"nghĩa tiếng Việt chính xác","phienAm":"IPA chuẩn có dấu /.../","viDu":"1 câu ví dụ tiếng Anh ngắn gọn"} cho từ tiếng Anh: "${clean}"`, true);
                const obj = JSON.parse(cleanJson(raw));
                if (obj.tiengViet) tiengViet = obj.tiengViet;
                if (!phienAm && obj.phienAm) phienAm = obj.phienAm;
                if (!viDu && obj.viDu) viDu = obj.viDu;
            } catch (e) {}
        }
    }

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

export async function traTuHangLoat(env, words) {
    // Support both traTuHangLoat(env, words) and legacy traTuHangLoat(words)
    if (Array.isArray(env) && !words) {
        words = env;
        env = null;
    }
    const cleanWords = (words || []).map(w => w.trim()).filter(Boolean);
    if (cleanWords.length === 0) return [];

    // 1. Fetch dictionaryapi.dev in parallel for fast IPA/example
    const dictResults = await Promise.all(cleanWords.map(async (clean) => {
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
        const tiengViet = await dichAnhViet(clean, null);
        return { tiengAnh: clean, tiengViet, phienAm, viDu };
    }));

    // 2. Check if any word is missing Vietnamese translation, IPA, or example -> enrich via Gemini batch call (like dichHangLoatGemini in Java)
    const needAi = dictResults.some(r => !r.tiengViet || r.tiengViet.toLowerCase() === r.tiengAnh.toLowerCase() || !r.phienAm || !r.viDu);
    if (needAi) {
        try {
            const prompt = `Bạn là từ điển Anh-Việt chuẩn Oxford. Hãy cung cấp nghĩa tiếng Việt ngắn gọn chính xác nhất, phiên âm quốc tế IPA (đặt trong dấu /.../) và 1 câu ví dụ tiếng Anh thực tế cho danh sách các từ sau:
${JSON.stringify(cleanWords)}

BẮT BUỘC trả về đúng mảng JSON theo cấu trúc:
[
  {
    "tiengAnh": "từ gốc",
    "tiengViet": "nghĩa tiếng Việt chuẩn (ví dụ: Xin chào)",
    "phienAm": "/həˈləʊ/",
    "viDu": "Hello, nice to meet you!"
  }
]`;
            const raw = await callGemini(env, prompt, true);
            const aiArr = JSON.parse(cleanJson(raw));
            if (Array.isArray(aiArr)) {
                const aiMap = new Map();
                for (const item of aiArr) {
                    if (item && item.tiengAnh) {
                        aiMap.set(item.tiengAnh.trim().toLowerCase(), item);
                    }
                }
                for (let i = 0; i < dictResults.length; i++) {
                    const r = dictResults[i];
                    const ai = aiMap.get(r.tiengAnh.toLowerCase()) || aiArr[i];
                    if (ai) {
                        if (!r.tiengViet || r.tiengViet.toLowerCase() === r.tiengAnh.toLowerCase()) {
                            r.tiengViet = ai.tiengViet || r.tiengViet;
                        }
                        if (!r.phienAm && ai.phienAm) r.phienAm = ai.phienAm;
                        if (!r.viDu && ai.viDu) r.viDu = ai.viDu;
                    }
                }
            }
        } catch (e) {}
    }

    return dictResults.map(r => ({
        tiengAnh: r.tiengAnh,
        tiengViet: r.tiengViet || r.tiengAnh,
        phienAm: r.phienAm || `/${r.tiengAnh.toLowerCase()}/`,
        viDu: r.viDu || `This is an example with ${r.tiengAnh}.`
    }));
}

// =========================================================
// 7. TRA TỪ CHUYÊN SÂU & DỊCH ĐA CHIỀU (/api/tra-tu/dich)
// =========================================================
export function laTiengViet(text) {
    if (!text) return false;
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
}

export async function traTuChuyenSau(env, rawText, rawMode = "AUTO", quickMode = false) {
    const text = (rawText || "").trim();
    if (!text) {
        return { thanhCong: false, thongBaoLoi: "Vui lòng nhập từ vựng hoặc câu cần tra cứu!" };
    }

    let mode = (rawMode || "AUTO").toUpperCase();
    if (mode !== "EN_VI" && mode !== "VI_EN") {
        mode = laTiengViet(text) ? "VI_EN" : "EN_VI";
    }
    const isEnToVi = mode === "EN_VI";

    if (quickMode) {
        const info = await layTuDienAnh(text, env);
        return {
            thanhCong: true,
            tuGoc: text,
            loaiDich: mode,
            ngonNguNguon: isEnToVi ? "en" : "vi",
            ngonNguDich: isEnToVi ? "vi" : "en",
            banDich: info.tiengViet,
            phienAm: info.phienAm,
            tuLoai: "Từ vựng",
            giaiThich: "",
            cacNghiaKhac: [],
            dinhNghia: [],
            viDu: info.viDu ? [{ cauTiengAnh: info.viDu, cauTiengViet: "" }] : [],
            dongNghia: [],
            traiNghia: [],
            audioUrl: `/audio/phat?text=${encodeURIComponent(text)}&lang=en`
        };
    }

    const prompt = isEnToVi
        ? `Bạn là Từ điển Anh - Việt chuyên sâu chuẩn Oxford & Cambridge.
Hãy phân tích chi tiết từ/cụm từ/câu tiếng Anh sau: "${text}"

BẮT BUỘC trả về DUY NHẤT đối tượng JSON hợp lệ theo đúng cấu trúc sau:
{
  "banDich": "Nghĩa tiếng Việt chính xác, tự nhiên và phổ biến nhất (nếu có nhiều nghĩa chính hãy ngăn cách bằng dấu phẩy)",
  "phienAm": "/phiên âm IPA chuẩn Anh-Mỹ/",
  "tuLoai": "Từ loại chính (ví dụ: Danh từ (Noun), Động từ (Verb), Tính từ (Adjective)...)",
  "giaiThich": "Giải thích rõ sắc thái nghĩa, cách dùng thực tế và ngữ cảnh sử dụng bằng tiếng Việt dễ hiểu",
  "cacNghiaKhac": ["Nghĩa phổ biến thứ 2", "Nghĩa thứ 3", "Nghĩa chuyên ngành (nếu có)"],
  "dinhNghia": [
    {
      "partOfSpeech": "Noun (Danh từ)",
      "definitionEn": "Định nghĩa chuẩn bằng tiếng Anh",
      "definitionVi": "Giải nghĩa tiếng Việt tương ứng",
      "examples": [
        "Câu ví dụ tiếng Anh 1 (Kèm dịch nghĩa tiếng Việt trong ngoặc)"
      ]
    }
  ],
  "viDu": [
    {
      "cauTiengAnh": "Câu ví dụ tiếng Anh tự nhiên, thực tế 1",
      "cauTiengViet": "Bản dịch tiếng Việt tương ứng 1"
    },
    {
      "cauTiengAnh": "Câu ví dụ tiếng Anh tự nhiên, thực tế 2",
      "cauTiengViet": "Bản dịch tiếng Việt tương ứng 2"
    }
  ],
  "dongNghia": ["từ đồng nghĩa 1", "từ đồng nghĩa 2", "từ đồng nghĩa 3"],
  "traiNghia": ["từ trái nghĩa 1", "từ trái nghĩa 2"]
}`
        : `Bạn là Từ điển Việt - Anh chuyên sâu chuẩn Oxford & Cambridge.
Người học đang muốn tra từ/cụm từ/câu tiếng Việt sau sang tiếng Anh: "${text}"

BẮT BUỘC trả về DUY NHẤT đối tượng JSON hợp lệ theo đúng cấu trúc sau:
{
  "banDich": "Từ/cụm từ tiếng Anh chuẩn xác và tự nhiên nhất tương ứng với '${text}'",
  "phienAm": "/phiên âm IPA chuẩn của từ tiếng Anh tìm được/",
  "tuLoai": "Từ loại của từ tiếng Anh tìm được (ví dụ: Noun, Verb, Adjective, Idiom...)",
  "giaiThich": "Giải thích cách dùng từ tiếng Anh này và sự khác biệt giữa các từ tiếng Anh tương đương",
  "cacNghiaKhac": ["Cách dịch tiếng Anh khác 1", "Cách dịch tiếng Anh khác 2"],
  "dinhNghia": [
    {
      "partOfSpeech": "Cách dùng chính",
      "definitionEn": "English explanation of the translated expression",
      "definitionVi": "Giải thích ngữ cảnh sử dụng bằng tiếng Việt",
      "examples": [
        "Ví dụ câu tiếng Anh sử dụng từ này (Kèm dịch tiếng Việt)"
      ]
    }
  ],
  "viDu": [
    {
      "cauTiengAnh": "Câu ví dụ tiếng Anh tự nhiên 1",
      "cauTiengViet": "Bản dịch tiếng Việt 1"
    },
    {
      "cauTiengAnh": "Câu ví dụ tiếng Anh tự nhiên 2",
      "cauTiengViet": "Bản dịch tiếng Việt 2"
    }
  ],
  "dongNghia": ["từ tiếng Anh đồng nghĩa 1", "từ tiếng Anh đồng nghĩa 2"],
  "traiNghia": ["từ tiếng Anh trái nghĩa 1", "từ tiếng Anh trái nghĩa 2"]
}`;

    try {
        const raw = await callGemini(env, prompt, true);
        const parsed = JSON.parse(cleanJson(raw));
        const englishTarget = isEnToVi ? text : (parsed.banDich || text);
        return {
            thanhCong: true,
            tuGoc: text,
            loaiDich: mode,
            ngonNguNguon: isEnToVi ? "en" : "vi",
            ngonNguDich: isEnToVi ? "vi" : "en",
            banDich: parsed.banDich || text,
            phienAm: parsed.phienAm || "",
            tuLoai: parsed.tuLoai || "Từ vựng",
            giaiThich: parsed.giaiThich || "",
            cacNghiaKhac: Array.isArray(parsed.cacNghiaKhac) ? parsed.cacNghiaKhac : [],
            dinhNghia: Array.isArray(parsed.dinhNghia) ? parsed.dinhNghia : [],
            viDu: Array.isArray(parsed.viDu) ? parsed.viDu : [],
            dongNghia: Array.isArray(parsed.dongNghia) ? parsed.dongNghia : [],
            traiNghia: Array.isArray(parsed.traiNghia) ? parsed.traiNghia : [],
            audioUrl: `/audio/phat?text=${encodeURIComponent(englishTarget)}&lang=en`
        };
    } catch (e) {
        const fallback = await layTuDienAnh(text, env);
        return {
            thanhCong: true,
            tuGoc: text,
            loaiDich: mode,
            ngonNguNguon: isEnToVi ? "en" : "vi",
            ngonNguDich: isEnToVi ? "vi" : "en",
            banDich: fallback.tiengViet,
            phienAm: fallback.phienAm,
            tuLoai: "Từ vựng",
            giaiThich: "",
            cacNghiaKhac: [],
            dinhNghia: [],
            viDu: fallback.viDu ? [{ cauTiengAnh: fallback.viDu, cauTiengViet: "" }] : [],
            dongNghia: [],
            traiNghia: [],
            audioUrl: `/audio/phat?text=${encodeURIComponent(text)}&lang=en`
        };
    }
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

    const syllables = tachAmTiet(word);
    const ipaClean = phienAm.replace(/^\/|\/$/g, "");
    const ipaParts = tachIpaTheoAmTiet(ipaClean, syllables.length);

    const dsPhonemes = syllables.map((syl, idx) => ({
        letters: syl,
        ipa: ipaParts[idx] || syl,
        loaiAm: "Âm tiết " + (idx + 1),
        cachDocBoi: chuyenSangDocBoi(syl),
        audioText: syl,
        coTrongAm: (ipaParts[idx] && ipaParts[idx].includes("ˈ")) || (idx === 0 && syllables.length === 1)
    }));

    const cachDocBoi = syllables.map((s, idx) => {
        const b = chuyenSangDocBoi(s);
        return (dsPhonemes[idx]?.coTrongAm) ? b.toUpperCase() : b;
    }).join(" - ");

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
// TOEIC SPEAKING Q7-9 AI GENERATION & GRADING (/api/luyen-de/*)
// =========================================================

export async function taoDeQ79TuHinhAnh(env, base64Data, mimeType) {
    const prompt = `Ban la chuyen gia ra de thi TOEIC Speaking Part 4 (Respond to questions using information provided - Questions 7, 8, 9).
Hay doc ky hinh anh de bai duoc cung cap (lich trinh, hoi nghi, hoa don, CV, lich bay, tour...) va trich xuat toan bo noi dung + 3 cau hoi Q7, Q8, Q9.
Neu trong hinh anh CHUA co san 3 cau hoi Q7-9, hay TU TAO 3 cau hoi bam sat 100% du lieu trong hinh anh theo dung chuan TOEIC Speaking:
- Question 7 (15s): Hoi thong tin cu the (thoi gian, dia diem, gia ve, nguoi phu trach...).
- Question 8 (15s): Hoi xac nhan mot thong tin bi hieu nham (Yes/No/Actually + sua lai thong tin dung).
- Question 9 (30s): Hoi tong hop toan bo cac su kien/hoat dong thoa man mot dieu kien (buoi chieu, ngay cu the, cua mot dien gia...).

BAT BUOC tra ve DUY NHAT 1 doi tuong JSON theo dung cau truc:
{
  "tieuDe": "Tieu de bang thong tin tieng Anh",
  "vanBanThongTin": "Toan bo noi dung bang thong tin duoc trinh bay ro rang, co xuong dong",
  "tomTatNoiDung": "Tom tat ngan gon bang tieng Viet",
  "tinhHuong": "Doan gioi thieu tinh huong bang tieng Anh",
  "cauHoi1": "Noi dung Question 7 bang tieng Anh",
  "goiYCau1": "Goi y cach tra loi Question 7 bang tieng Viet",
  "cauHoi2": "Noi dung Question 8 bang tieng Anh",
  "goiYCau2": "Goi y cach tra loi Question 8 bang tieng Viet",
  "cauHoi3": "Noi dung Question 9 bang tieng Anh",
  "goiYCau3": "Goi y cach tra loi Question 9 bang tieng Viet"
}`;
    const raw = await callGemini(env, prompt, true, { data: base64Data, mimeType: mimeType || "image/jpeg" });
    return JSON.parse(cleanJson(raw));
}

export async function taoDeQ79TuVanBan(env, vanBan) {
    const prompt = `Ban la chuyen gia ra de thi TOEIC Speaking Questions 7-9.
Hay dua vao van ban thong tin duoi day de thiet ke 1 bo de thi TOEIC Speaking Q7-9 chuan ETS:

${vanBan}

BAT BUOC tra ve DUY NHAT 1 doi tuong JSON theo dung cau truc:
{
  "tieuDe": "Tieu de bang thong tin tieng Anh",
  "vanBanThongTin": "Noi dung bang thong tin",
  "tomTatNoiDung": "Tom tat ngan gon bang tieng Viet",
  "tinhHuong": "Hello, I am calling about...",
  "cauHoi1": "Noi dung Question 7 (15s)",
  "goiYCau1": "Goi y cach tra loi Question 7 bang tieng Viet",
  "cauHoi2": "Noi dung Question 8 (15s)",
  "goiYCau2": "Goi y cach tra loi Question 8 bang tieng Viet",
  "cauHoi3": "Noi dung Question 9 (30s)",
  "goiYCau3": "Goi y cach tra loi Question 9 bang tieng Viet"
}`;
    const raw = await callGemini(env, prompt, true);
    return JSON.parse(cleanJson(raw));
}

export async function taoDeQ79TuDong(env) {
    const prompt = `Ban la chuyen gia ra de thi TOEIC Speaking Questions 7-9 chuan ETS.
Hay tu sang tao 1 de thi TOEIC Speaking Q7-9 HOAN TOAN MOI (chu de: lich trinh hoi nghi, lich dao tao nhan vien, tour du lich, chuong trinh su kien, hoac lich phong van).
BAT BUOC tra ve DUY NHAT 1 doi tuong JSON theo dung cau truc:
{
  "tieuDe": "Tieu de bang thong tin tieng Anh",
  "vanBanThongTin": "Bang thong tin chi tiet bang tieng Anh (co gio giac, hoat dong, nguoi phu trach, ghi chu * hoac **)",
  "tomTatNoiDung": "Tom tat ngan gon bang tieng Viet",
  "tinhHuong": "Hello, I am calling about...",
  "cauHoi1": "Noi dung Question 7 (15s)",
  "goiYCau1": "Goi y cach tra loi Question 7 bang tieng Viet",
  "cauHoi2": "Noi dung Question 8 (15s)",
  "goiYCau2": "Goi y cach tra loi Question 8 bang tieng Viet",
  "cauHoi3": "Noi dung Question 9 (30s)",
  "goiYCau3": "Goi y cach tra loi Question 9 bang tieng Viet"
}`;
    const raw = await callGemini(env, prompt, true);
    return JSON.parse(cleanJson(raw));
}

export async function chamDiemDeQ79(env, req) {
    const tieuDe = req.tieuDe || "";
    const thongTin = req.thongTinDeBai || req.vanBanThongTin || "";
    const tinhHuong = req.tinhHuong || "";
    const q1 = req.cauHoi1 || "";
    const a1 = req.cauTraLoi1 || req.traLoi1 || "";
    const q2 = req.cauHoi2 || "";
    const a2 = req.cauTraLoi2 || req.traLoi2 || "";
    const q3 = req.cauHoi3 || "";
    const a3 = req.cauTraLoi3 || req.traLoi3 || "";

    const prompt = `Ban la Giam khao cham thi TOEIC Speaking (Questions 7, 8, 9) chuan quoc te ETS.
Hay cham diem cuc ky chi tiet, khach quan cho bai lam cua thi sinh.

THONG TIN DE BAI:
- Tieu de: ${tieuDe}
- Noi dung bang thong tin:
${thongTin}
- Tinh huong: ${tinhHuong}

BAI LAM CUA THI SINH:
1. Question 7 (Quy dinh: 15 giay):
- Cau hoi: ${q1}
- Cau tra loi cua thi sinh: "${a1}"

2. Question 8 (Quy dinh: 15 giay):
- Cau hoi: ${q2}
- Cau tra loi cua thi sinh: "${a2}"

3. Question 9 (Quy dinh: 30 giay):
- Cau hoi: ${q3}
- Cau tra loi cua thi sinh: "${a3}"

QUY TAC CHAM DIEM & HUONG DAN CHEM TU TRUC TIEP TU DE BAI (CUC KY QUAN TRONG):
- Nguoi hoc muon nhin vao DONG DU LIEU GOC TRONG DE BAI va biet cach CHEM THEM TU (gioi tu, dong tu to be, chu ngu...) de doc thanh cau hoan chinh an diem ngay ma KHONG CAN suy luan phuc tap.
- O truong "trichDanDeBai": Hay trich xuat Y HET NGUYEN VAN dong thong tin trong de bai chua dap an cua cau hoi do.
- O truong "huongDanChemTu": Hay viet lai chinh dong thong tin trong de bai do, nhung DAT CAC TU CHEM THEM TRONG DAU NGOAC VUONG [...] de bien cum tu roi rac trong bang thanh cau tieng Anh hoan chinh (Vi du: "[On] May 29, [from] 9:00 a.m. [to] 11:00 a.m., [there will be a] Visit to main drilling site [led by] Walterenz.").
- O truong "suaCauNguoiDung": Neu thi sinh co nhap cau tra loi, hay sua truc tiep cau cua thi sinh thanh cau dung ngu phap va tu nhien nhat. Neu thi sinh bo trong, ghi "Bạn chưa nhập câu trả lời."

BAT BUOC TRA VE DUY NHAT 1 DOI TUONG JSON HOP LE THEO DUNG CAU TRUC SAU:
{
  "tongDiem": 8,
  "xepLoai": "Tốt / Đạt yêu cầu / Cần cố gắng",
  "nhanXetTongQuan": "Nhận xét tổng quan ngắn gọn về cả 3 câu trả lời bằng tiếng Việt.",
  "danhSachCauHoi": [
    {
      "soThuTu": 1,
      "thoiGianQuyDinh": 15,
      "soTu": 12,
      "thoiGianNoiUocTinh": 5.5,
      "diem": 3,
      "trangThai": "Đạt chuẩn (Tốt) / Khá (Đủ ý chính) / Cần cải thiện",
      "trichDanDeBai": "Copy Y HỆT nguyên văn dòng thông tin gốc trong bảng đề bài",
      "huongDanChemTu": "Viết câu hoàn chỉnh bằng cách giữ nguyên chữ trong đề bài và đặt các từ chêm thêm trong ngoặc vuông [như thế này]",
      "suaCauNguoiDung": "Sửa lại trực tiếp câu trả lời của học viên",
      "giaiThichSuaCau": "Giải thích ngắn gọn lỗi sai đã sửa bằng tiếng Việt",
      "danhGiaThongTin": "Đánh giá độ chính xác của thông tin bằng tiếng Việt",
      "danhGiaThoiGian": "Đánh giá độ dài và thời lượng nói (so với 15s)",
      "nhanXetChiTiet": "Nhận xét ngữ pháp, từ vựng và cách diễn đạt bằng tiếng Việt",
      "cauTraLoiMau": "1 câu trả lời mẫu tiếng Anh chuẩn điểm tuyệt đối",
      "dichTiengVietMau": "Bản dịch tiếng Việt của câu trả lời mẫu"
    },
    {
      "soThuTu": 2,
      "thoiGianQuyDinh": 15,
      "soTu": 15,
      "thoiGianNoiUocTinh": 6.5,
      "diem": 3,
      "trangThai": "Đạt chuẩn (Tốt)",
      "trichDanDeBai": "...",
      "huongDanChemTu": "...",
      "suaCauNguoiDung": "...",
      "giaiThichSuaCau": "...",
      "danhGiaThongTin": "...",
      "danhGiaThoiGian": "...",
      "nhanXetChiTiet": "...",
      "cauTraLoiMau": "...",
      "dichTiengVietMau": "..."
    },
    {
      "soThuTu": 3,
      "thoiGianQuyDinh": 30,
      "soTu": 28,
      "thoiGianNoiUocTinh": 12.0,
      "diem": 2,
      "trangThai": "Khá (Đủ ý chính)",
      "trichDanDeBai": "...",
      "huongDanChemTu": "...",
      "suaCauNguoiDung": "...",
      "giaiThichSuaCau": "...",
      "danhGiaThongTin": "...",
      "danhGiaThoiGian": "...",
      "nhanXetChiTiet": "...",
      "cauTraLoiMau": "...",
      "dichTiengVietMau": "..."
    }
  ]
}`;

    const raw = await callGemini(env, prompt, true);
    return JSON.parse(cleanJson(raw));
}

// =========================================================
// TOEIC LISTENING PART 2 AI GENERATOR (/api/toeic-part2/tao-de-ai)
// =========================================================
export async function taoBoDeToeicPart2(env, soCau = 6) {
    const count = Math.max(3, Math.min(15, Number(soCau) || 6));
    const prompt = `Ban la chuyen gia ra de thi TOEIC Listening Part 2 (Question-Response) chuan ETS.
Hay tao ${count} cau hoi trac nghiem TOEIC Part 2 da dang cac dang: Who, Where, When, Why, How, What, Yes/No, Choice (Or), Statement, Indirect response.
BAT BUOC tra ve DUY NHAT mang JSON theo dung cau truc:
[
  {
    "loaiCauHoi": "WHEN / WHERE / WHO / WHY / HOW / YES_NO / STATEMENT",
    "tenLoaiVi": "Câu hỏi Khi nào (When)",
    "cauHoiEn": "When is the regional sales conference scheduled to begin?",
    "cauHoiVi": "Hội nghị bán hàng khu vực dự kiến bắt đầu khi nào?",
    "dapAnAEn": "At the Grand Hotel downtown.",
    "dapAnAVi": "Tại khách sạn Grand ở trung tâm thành phố.",
    "dapAnBEn": "Next Monday morning at nine.",
    "dapAnBVi": "Sáng thứ Hai tuần tới lúc 9 giờ.",
    "dapAnCEn": "Yes, I registered yesterday.",
    "dapAnCVi": "Vâng, tôi đã đăng ký hôm qua.",
    "dapAnDung": "B",
    "tuKhoaChiDiem": "When (Khi nào) ➔ Next Monday morning at nine",
    "meoPart2": "Nghe từ để hỏi 'When' ở đầu câu -> Chọn ngay đáp án chỉ thời gian (Next Monday), loại đáp án chỉ nơi chốn (A - bẫy Where) và Yes/No (C)."
  }
]`;
    const raw = await callGemini(env, prompt, true);
    return JSON.parse(cleanJson(raw));
}

