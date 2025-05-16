# JWT

- Server tạo ra danh sách đen (Token blacklist) -> Tác dụng là chứa các token mà đã được logout -> Khi 1 user logout ở 1 thiết bị nào đó -> Hệ thống sẽ add token vào trong blacklist
  -> Nguyên tắc Token blacklist sẽ được lưu trữ trong Redis vì tốc độ Redis nhanh -> Nhưng lưu token vào đây là chết chắc rồi vì nguyên tắc của hệ thống là ko lưu bất kỳ 1 token của 1 user nào trong hệ thống mặc dù đưa vào đã được mã hóa

Vậy làm sao? Có cách nào hay ko?

Cách 1:
Có thể thêm tiền tố đằng sau VD: `TOKEN_BLACK_LIST_userId_alias` bỏ thêm alias vào. Nếu user sử dụng iPhone, iPad thì có AppID, nếu sử dụng trên browser thì có dấu vân tay của browser rất dễ dàng với thư viện FingerprintJS
=> Vẫn đảm bảo nguyên tắc ko lưu token vào DB nhưng có nhược điểm là `Phụ thuộc quá nhiều vào bên thứ 3 và thêm phần phức tạp cho khâu lập trình viên`

Cách 2:
Sử dụng Jit -> Just in time -> Tiêu chuẩn của JWT đại diện cho 1 định danh duy nhất được cấp phát cho mỗi token
