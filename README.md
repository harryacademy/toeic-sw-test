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
3. Mở địa chỉ Pages, bấm **Kiểm tra kết nối**. Thành công khi thấy tên bảng tính và một dòng mới trong tab `Log`.

## Thêm đề thi mới
*(Hoàn thiện ở Giai đoạn 1.)*

## Tạo mã truy cập
*(Hoàn thiện ở Giai đoạn 3.)*

## Xử lý sự cố
| Thông báo | Nguyên nhân thường gặp |
|---|---|
| Chưa cấu hình địa chỉ máy chủ | Chưa dán `API_URL` vào `docs/js/config.js` |
| Máy chủ trả về dữ liệu không hợp lệ | Deployment chưa đặt quyền truy cập *Anyone*, hoặc chưa cấp quyền ở bước 3 |
| Missing tab "..." | Chưa chạy **Khởi tạo các trang tính** |
