# Harry Academy — Thi thử TOEIC Speaking & Writing

Công cụ thi thử và xếp lớp. Điểm hiển thị là **điểm ước tính**, không phải điểm chính thức của ETS.

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `docs/` | Trang web cho học viên (GitHub Pages phục vụ thư mục này) |
| `apps-script/` | Mã máy chủ Google Apps Script (quản lý bằng `clasp`) |
| `CLAUDE.md` | Bối cảnh dự án cho Claude |

## Triển khai lần đầu

### 1. Chuẩn bị (chỉ làm một lần)
1. Cài Node.js và `clasp`: `npm i -g @google/clasp`
2. Bật Apps Script API: vào https://script.google.com/home/usersettings và bật **Google Apps Script API**.
3. Đăng nhập: `clasp login` (trình duyệt sẽ mở để chọn tài khoản Google của trung tâm).

### 2. Tạo Google Sheet và mã máy chủ
Chạy tại thư mục gốc dự án:
```
clasp create --type sheets --title "HA TOEIC SW Results" --rootDir apps-script
git checkout -- apps-script/appsscript.json
clasp push -f
```
Lệnh đầu tạo Google Sheet mới kèm dự án Apps Script. Lệnh thứ hai khôi phục file cấu hình của dự án (clasp có thể ghi đè).

### 3. Khởi tạo các trang tính và cấp quyền
1. `clasp open-container` để mở Sheet.
2. Tải lại trang, chọn menu **HA TOEIC → Khởi tạo các trang tính**. Google sẽ hỏi cấp quyền, chọn **Cho phép**.
3. Kiểm tra đã có các tab: `Results`, `Sessions`, `Codes`, `Log`.

### 4. Cài khóa Gemini
Trong trình soạn thảo Apps Script: **Project Settings → Script Properties → Add property**
- Tên: `GEMINI_API_KEY`
- Giá trị: khóa lấy từ https://aistudio.google.com (dùng dự án **đã bật thanh toán** để dữ liệu học viên không bị dùng cho việc huấn luyện).

Không bao giờ dán khóa vào mã nguồn hoặc vào thư mục `docs/`.

### 5. Triển khai web app
```
clasp deploy -d "v1"
```
Ghi lại **Deployment ID**. Địa chỉ web app có dạng `https://script.google.com/macros/s/<Deployment ID>/exec`.
Dán địa chỉ này vào `docs/js/config.js` (mục `API_URL`).

Khi sửa mã máy chủ về sau, cập nhật **cùng** deployment để giữ nguyên địa chỉ:
```
clasp push -f
clasp redeploy <Deployment ID> -d "mô tả thay đổi"
```

### 6. Đưa trang web lên GitHub Pages
1. Đẩy mã lên GitHub.
2. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `master`, thư mục = `/docs`.
3. Mở `<địa chỉ Pages>/check.html`, bấm **Kiểm tra kết nối**. Thành công khi thấy tên bảng tính và một dòng mới trong tab `Log`.

### 7. Mã truy cập tạm thời (Giai đoạn 1)
Cho đến khi có mã dùng một lần (Giai đoạn 3), mọi học viên dùng chung một mã.
Trong **Project Settings → Script Properties**, thêm:
- Tên: `TEMP_ACCESS_CODE`
- Giá trị: mã tùy chọn, ví dụ `HA2026` (không phân biệt hoa thường).

Đổi mã bất cứ lúc nào bằng cách sửa giá trị này; không cần triển khai lại.

## Cập nhật lên phiên bản mới
Mỗi khi mã máy chủ có thay đổi:
```
clasp push -f
clasp redeploy <Deployment ID> -d "mô tả thay đổi"
```
Nếu phiên bản mới thêm cột hoặc tab, mở Sheet và chọn lại **HA TOEIC → Khởi tạo các trang tính** (an toàn, không xóa dữ liệu).

## Kiểm tra chấm điểm
Trong trình soạn thảo Apps Script, chọn hàm rồi bấm **Run**, xem kết quả ở **Execution log**:
- `testRequiredWords`: kiểm tra bộ nhận diện hai từ bắt buộc (câu 1–5). Không tốn lượt Gemini.
- `testGradeSample` (file `TempTest.gs`): chấm thử một bài e-mail mẫu 3 lần cùng lúc để xem AI chấm có ổn định không. Tốn 3 lượt Gemini. Đổi số lần ở dòng `SAMPLE_RUNS`.

## Nội dung riêng tư: đề thi thật và bài anchor
Repo GitHub là **công khai**. Vì vậy:
- Đề thi thật và bài anchor nằm trong các file tên bắt đầu bằng `Private` trong thư mục `apps-script/`, ví dụ `PrivateFormW02.gs`, `PrivateAnchors.gs`.
- Git **bỏ qua** các file này (khai báo trong `.gitignore`), nên chúng không bao giờ lên GitHub. `clasp push` vẫn đưa chúng lên Apps Script bình thường.
- Vì không có trên GitHub, **anh tự sao lưu** các file `Private*.gs`, ví dụ chép vào một thư mục Google Drive riêng mỗi khi sửa.
- `FormWritingSample01.gs` là đề mẫu tự soạn, được để công khai làm khuôn.
- Không đưa nội dung đề thi hay bài mẫu của ETS vào bất kỳ file nào.

## Thêm đề thi mới
1. Sao chép `apps-script/FormWritingSample01.gs` thành `apps-script/PrivateForm<Tên>.gs`, ví dụ `PrivateFormW02.gs`.
2. Đổi mã đề ở cả hai chỗ: `FORMS['MÃ-ĐỀ']` và `id: 'MÃ-ĐỀ'`.
3. Sửa nội dung từng câu. Mỗi *step* là một màn hình có giờ riêng (`time_sec`, tính bằng giây).
   - Câu 1–5 (`picture_sentence`): `image` (đường dẫn ảnh), `words` (hai từ bắt buộc), `grading.image_description` (mô tả ảnh cho AI, học viên không thấy).
   - Câu 6–7 (`email`): `email` (from, to, subject, sent, body), `task` (yêu cầu cho học viên), `grading.tasks` (danh sách việc AI cần kiểm tra).
   - Câu 8 (`essay`): `prompt`.
4. Ảnh đặt trong `docs/m/q7r2k9xw/` (hoặc một thư mục có tên khó đoán khác). Dùng ảnh `.jpg`, `.png` hoặc `.webp` để AI được xem ảnh thật; với `.svg` AI chỉ đọc phần mô tả. Lưu ý: ảnh trong `docs/` vẫn công khai trên GitHub.
5. Đặt đề đang dùng trong `apps-script/Config.gs`: `ACTIVE_FORM: 'MÃ-ĐỀ'`.
6. `clasp push -f`, `clasp redeploy ...`, rồi `git push` (để cập nhật `Config.gs` và ảnh).

Mọi nội dung trong mục `grading` chỉ nằm trên máy chủ, không gửi về trình duyệt.

## Bài mẫu chấm chuẩn (anchor) và thử nghiệm nhiệt độ
- `apps-script/Rubrics.gs`: thang điểm cho từng dạng câu (diễn đạt lại theo thang điểm TOEIC Writing, không chép nguyên văn). Có thể chỉnh câu chữ.
- `apps-script/PrivateAnchors.gs`: bài làm thật của học viên (đã ẩn danh) kèm điểm và ghi chú của giáo viên. AI dùng các bài này để chấm theo chuẩn của trung tâm. Lần đầu, sao chép `PrivateAnchors.example.txt` thành `PrivateAnchors.gs` rồi sửa theo hướng dẫn trong file. Nhớ **xóa các ví dụ mẫu** trong file trước khi `clasp push`.

Sau khi có anchor, chọn **HA TOEIC → Chạy thử nghiệm nhiệt độ** trong Sheet. Mỗi anchor được chấm nhiều lần ở nhiệt độ 1.0 và 0.2 (anchor đang chấm được loại khỏi phần ví dụ). Kết quả chi tiết ở tab `TempTest`, tóm tắt (tỉ lệ trùng điểm, sai số trung bình) ở tab `Log`.

## Đọc kết quả
- Trang kết quả và cột `writing_raw` trong tab `Sessions` hiện điểm **theo nhóm câu**, ví dụ `Q1-5 TB 2.4/3 | Q6-7 3, 2 /4 | Q8 3/5`. Không cộng thành một tổng, vì ETS tính trọng số: câu 8 nặng nhất, câu 1–5 nhẹ nhất.
- Khoảng điểm ước tính 0–200 sẽ có ở Giai đoạn 3.
- Cột `review_flag` trong tab `Results` khác trống nghĩa là câu đó cần giáo viên xem lại.

## Tạo mã truy cập
*(Hoàn thiện ở Giai đoạn 3.)*

## Xử lý sự cố
| Thông báo | Nguyên nhân thường gặp |
|---|---|
| Chưa cấu hình địa chỉ máy chủ | Chưa dán `API_URL` vào `docs/js/config.js` |
| Máy chủ trả về dữ liệu không hợp lệ | Deployment chưa đặt quyền truy cập *Anyone*, hoặc chưa cấp quyền ở bước 3 |
| Missing tab "..." | Chưa chạy **Khởi tạo các trang tính** |
| Máy chủ chưa cài mã truy cập | Chưa thêm `TEMP_ACCESS_CODE` vào Script Properties |
| Chưa chấm được ... câu (Gemini HTTP 400/403) | Khóa Gemini sai hoặc hết hạn; xem tab `Results`, cột `review_flag` |
| Hệ thống đã đạt giới hạn chấm bài trong ngày | Đã dùng hết `DAILY_GEMINI_CAP` lượt Gemini trong ngày (sửa trong `Config.gs`) |
