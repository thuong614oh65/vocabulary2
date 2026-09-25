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
