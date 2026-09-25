/**
 * ====================================================================
 * GLOBAL AUDIO CONTROLLER - HỆ THỐNG PHÁT ÂM CHUẨN TOÀN HỆ THỐNG
 * ====================================================================
 * 1. 100% Phát MP3 chuẩn chất lượng cao từ Server (Microsoft Edge Neural TTS / Google Native).
 * 2. TUYỆT ĐỐI KHÔNG DÙNG giọng máy (SpeechSynthesis) của điện thoại/máy tính.
 * 3. Bộ đệm đa tầng (Client Cache + Server Cache): Nghe lại với ĐỘ TRỄ 0ms!
 * 4. Quản lý 1 luồng âm thanh duy nhất: Bật âm mới lập tức dừng âm cũ.
 * 5. Global Hook: Tự động chuyển hướng mọi lệnh speechSynthesis.speak sang MP3 chuẩn.
 * ====================================================================
 */

(function () {
    "use strict";

    // -------------------------------------------------------------
    // CLIENT-SIDE AUDIO CACHE (0ms LATENCY KHI NGHE LẠI)
    // Key: text.trim().toLowerCase() + "_" + rate
    // Value: { audio: AudioElement }
    // -------------------------------------------------------------
    const clientAudioCache = new Map();
    const MAX_CLIENT_CACHE_SIZE = 120;

    let audioHienTai = null;
    let cancelCallbackHienTai = null;

    const origNativeCancel = (window.speechSynthesis && typeof window.speechSynthesis.cancel === "function")
        ? window.speechSynthesis.cancel.bind(window.speechSynthesis)
        : null;

    let isCanceling = false;

    function dungAudioNoiBo() {
        if (audioHienTai) {
            try {
                audioHienTai.pause();
                audioHienTai.currentTime = 0;
            } catch (e) {}
            audioHienTai = null;
        }

        if (typeof cancelCallbackHienTai === "function") {
            try { cancelCallbackHienTai(); } catch (e) {}
            cancelCallbackHienTai = null;
        }
    }

    // =============================================================
    // DỪNG TẤT CẢ ÂM THANH ĐANG PHÁT TRÊN TOÀN TRANG
    // =============================================================
    window.dungTatCaAmThanh = function () {
        if (isCanceling) return;
        isCanceling = true;
        try {
            dungAudioNoiBo();

            if (origNativeCancel) {
                try { origNativeCancel(); } catch (e) {}
            }

            if (typeof window.dungAudioHuongDan === "function") {
                try { window.dungAudioHuongDan(); } catch (e) {}
            }

            // Tắt class active-playing / playing trên các nút loa giao diện
            document.querySelectorAll(".playing, .audio-playing, .active-playing, .hd-audio-playing").forEach(function (el) {
                el.classList.remove("playing", "audio-playing", "active-playing", "hd-audio-playing");
            });
        } finally {
            isCanceling = false;
        }
    };

    // =============================================================
    // HÀM PHÁT ÂM THANH CHÍNH TOÀN HỆ THỐNG
    // window.phatAmThanh(text, options)
    // options: { rate: "+0%", onStart: fn, onEnd: fn, onError: fn }
    // =============================================================
    window.phatAmThanh = function (text, options) {
        if (!text || typeof text !== "string" || text.trim() === "") {
            return Promise.resolve();
        }

        const opt = options || {};
        const cleanText = text.trim();
        const rate = opt.rate || "+0%";
        const cacheKey = cleanText.toLowerCase() + "|||" + rate;

        // Dừng âm thanh trước đó
        window.dungTatCaAmThanh();

        return new Promise(function (resolve, reject) {
            let finished = false;
            let audioObj = null;

            function isAbortError(err) {
                return !!(err && (err.name === "AbortError" || err.code === 20 || (typeof err.message === "string" && err.message.includes("interrupted"))));
            }

            function handleFinish() {
                if (finished) return;
                finished = true;
                if (audioHienTai === audioObj) {
                    audioHienTai = null;
                }
                if (typeof opt.onEnd === "function") {
                    try { opt.onEnd(); } catch (e) {}
                }
                resolve();
            }

            function handleError(err) {
                if (finished) return;
                finished = true;
                if (audioHienTai === audioObj) {
                    audioHienTai = null;
                }
                if (isAbortError(err)) {
                    resolve();
                    return;
                }
                console.warn("[GlobalAudio] Lỗi phát âm thanh:", cleanText, err);
                if (typeof opt.onError === "function") {
                    try { opt.onError(err); } catch (e) {}
                }
                resolve();
            }

            // 1. KIỂM TRA CLIENT CACHE (PHÁT NGAY LẬP TỨC 0ms)
            if (clientAudioCache.has(cacheKey)) {
                const cached = clientAudioCache.get(cacheKey);
                audioObj = cached.audio;
                audioHienTai = audioObj;

                audioObj.currentTime = 0;
                if (typeof opt.playbackRate === "number") {
                    audioObj.playbackRate = opt.playbackRate;
                } else {
                    audioObj.playbackRate = 1.0;
                }
                audioObj.onended = handleFinish;
                audioObj.onerror = handleError;

                if (typeof opt.onStart === "function") {
                    try { opt.onStart(); } catch (e) {}
                }

                const playPromise = audioObj.play();
                if (playPromise !== undefined) {
                    playPromise.catch(function (e) {
                        if (isAbortError(e)) return;
                        console.warn("[GlobalAudio] Play cache error:", e);
                        handleError(e);
                    });
                }
                return;
            }

            // 2. NẾU CHƯA CÓ CLIENT CACHE: TẢI MP3 TỪ SERVER (/audio/phat)
            // Server đã có sẵn L1 RAM Cache (<1ms) và Disk Cache
            const url = "/audio/phat?text=" + encodeURIComponent(cleanText) + "&rate=" + encodeURIComponent(rate);
            audioObj = new Audio(url);
            audioHienTai = audioObj;
            if (typeof opt.playbackRate === "number") {
                audioObj.playbackRate = opt.playbackRate;
            } else {
                audioObj.playbackRate = 1.0;
            }

            audioObj.onended = handleFinish;
            audioObj.onerror = function () {
                // Thử fallback sang /audio/tts nếu có lỗi
                const fallbackUrl = "/audio/tts?text=" + encodeURIComponent(cleanText) + "&rate=" + encodeURIComponent(rate);
                const fbAudio = new Audio(fallbackUrl);
                audioObj = fbAudio;
                audioHienTai = fbAudio;
                fbAudio.onended = handleFinish;
                fbAudio.onerror = handleError;
                fbAudio.play().catch(function (e) {
                    if (isAbortError(e)) return;
                    handleError(e);
                });
            };

            if (typeof opt.onStart === "function") {
                try { opt.onStart(); } catch (e) {}
            }

            // Lưu vào client cache sau khi tải được
            if (clientAudioCache.size >= MAX_CLIENT_CACHE_SIZE) {
                const firstKey = clientAudioCache.keys().next().value;
                clientAudioCache.delete(firstKey);
            }
            clientAudioCache.set(cacheKey, { audio: audioObj });

            const playPromise = audioObj.play();
            if (playPromise !== undefined) {
                playPromise.catch(function (e) {
                    if (isAbortError(e)) return;
                    console.warn("[GlobalAudio] Play network error:", e);
                    handleError(e);
                });
            }
        });
    };

    // =============================================================
    // HOOK TOÀN DIỆN WINDOW.SPEECHSYNTHESIS.SPEAK
    // Đảm bảo TUYỆT ĐỐI KHÔNG CÒN BẤT KỲ ÂM THANH ROBOTIC NÀO CỦA MÁY
    // Dù ở iPhone hay Android hay máy tính, đều phát MP3 chuẩn từ server!
    // =============================================================
    if (window.speechSynthesis) {
        window.speechSynthesis.speak = function (utterance) {
            if (!utterance || !utterance.text) return;

            console.log("[GlobalAudio] Đã chuyển hướng speechSynthesis -> MP3 chuẩn Server:", utterance.text);

            let speechRate = "+0%";
            if (utterance.rate) {
                if (utterance.rate <= 0.75) speechRate = "-20%";
                else if (utterance.rate >= 1.25) speechRate = "+20%";
            }

            window.phatAmThanh(utterance.text, {
                rate: speechRate,
                onStart: utterance.onstart,
                onEnd: utterance.onend,
                onError: utterance.onerror
            });
        };

        window.speechSynthesis.cancel = function () {
            if (isCanceling) return;
            isCanceling = true;
            try {
                if (origNativeCancel) {
                    try { origNativeCancel(); } catch (e) {}
                }
                dungAudioNoiBo();
            } finally {
                isCanceling = false;
            }
        };
    }

    console.log("[GlobalAudio] ✅ Hệ thống âm thanh chuẩn toàn diện đã sẵn sàng (0ms latency, 100% Server MP3).");
})();
