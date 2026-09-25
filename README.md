# Vocabulary TLA — Cloudflare Pages (`.pages.dev`) Edition

Dự án đã được chuyển đổi sang cấu trúc **Cloudflare Pages + Cloudflare Pages Functions (`functions/[[path]].js`)**, kết nối trực tiếp vào cơ sở dữ liệu **Neon PostgreSQL (`neon.tech`)** hiện có (giữ nguyên 100% tài khoản, các bộ từ vựng, từ vựng, 19 đề thi TOEIC Speaking Q7-9, Sơ đồ đánh vần và toàn bộ giao diện).

## Hướng dẫn triển khai lên Cloudflare Pages (`*.pages.dev`) trong 1 phút:
1. Truy cập **[https://dash.cloudflare.com](https://dash.cloudflare.com)** -> Chọn mục **Workers & Pages** (hoặc **Compute -> Workers & Pages**).
2. Bấm **Create** -> chọn tab **Pages** -> chọn **Connect to Git**.
3. Chọn kho lưu trữ **`thuong614oh65/vocabulary2`**.
4. Ở màn hình **Set up builds and deployments**:
   - **Framework preset:** `None`
   - **Build command:** *(Để trống)*
   - **Build output directory:** `public`
5. Mở mục **Environment variables (advanced)** -> bấm **Add variable**:
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** *(Dán mã Gemini API Key của bạn vào)*
6. Bấm **Save and Deploy**!
   - Chỉ sau **5 - 10 giây**, bạn sẽ có ngay đường link **`https://vocabulary2-xxx.pages.dev`** chạy siêu tốc 0.1 giây trên toàn cầu, không bao giờ ngủ đông và không bao giờ hết phút Build!
