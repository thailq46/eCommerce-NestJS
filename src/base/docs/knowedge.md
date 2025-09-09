# JWT

- Server tạo ra danh sách đen (Token blacklist) -> Tác dụng là chứa các token mà đã được logout -> Khi 1 user logout ở 1 thiết bị nào đó -> Hệ thống sẽ add token vào trong blacklist
  -> Nguyên tắc Token blacklist sẽ được lưu trữ trong Redis vì tốc độ Redis nhanh -> Nhưng lưu token vào đây là chết chắc rồi vì nguyên tắc của hệ thống là ko lưu bất kỳ 1 token của 1 user nào trong hệ thống mặc dù đưa vào đã được mã hóa

Vậy làm sao? Có cách nào hay ko?

Cách 1:
Có thể thêm tiền tố đằng sau VD: `TOKEN_BLACK_LIST_userId_alias` bỏ thêm alias vào. Nếu user sử dụng iPhone, iPad thì có AppID, nếu sử dụng trên browser thì có dấu vân tay của browser rất dễ dàng với thư viện FingerprintJS
=> Vẫn đảm bảo nguyên tắc ko lưu token vào DB nhưng có nhược điểm là `Phụ thuộc quá nhiều vào bên thứ 3 và thêm phần phức tạp cho khâu lập trình viên`

Cách 2:
Sử dụng Jit -> Just in time -> Tiêu chuẩn của JWT đại diện cho 1 định danh duy nhất được cấp phát cho mỗi token

# Prometheus và Graphana

- Prometheus công cụ cảnh báo và giám sát hệ thống -> Đầu tiên nó thu thập dữ liệu sau đó nó lưu trữ và truy vấn chuỗi dữ liệu đó thông qua 1 thời gian cụ thể rất nhanh thông qua req của http
- Graphana dùng để trực quan hóa và phân tích dữ liệu, nó kết nối đến nhiều nguồn dữ liệu khác nhau chứ ko phải riêng thằng Prometheus

# Hệ thống đồng thời cao

1. Luôn phải sử dụng cache (Local vs Distributed)
2. Cho dù update data cho local cache hay distributed cache thì phải sử dụng cơ chế lock thread
3. Nếu data ko tồn tại trong DB nhưng bắt buộc nó phải tồn tại trong local cache
   ![alt text](/my-app/public/Local%20cache%202.png)

# Kafka Xử lý MSG còn tồn động nhiều
Khi Consumer xử lý hết các tin nhắn tồn động thì LAG sẽ về 0 => Điều này cho thấy Consumer hoạt động rất bình thường và theo kịp Producer và LAG dao động nhẹ từ 0-100 nếu dữ liệu lớn.
[?]Vậy cách xử lý thế nào nếu LAG > 200
[+] Tăng vài Consumer để xử lý -> ĐÚNG
[+] Tăng vài Partition để hiệu suất cao -> ĐÚNG
[+] Thêm thông lượng trong Broker Kafka, băng thông Network -> ĐÚNG
NHƯNG muốn giải quyết các tin nhắn tồn động thì cần rà soát lại từng chi tiết một
B1. Xem lại code (Tại sao nó lại xử lý mất nhiều time -> Tối ưu logic code trước tiên)
B2: So sánh tỉ lệ sinh ra message của Producer và Consumer (Tăng số lượng Consumer là cách đơn giản và hiệu quả nhất)
  Khi số lượng Consumer ko đủ thì tin nhắn chắc chắn nó sẽ chậm lại
B3: Nếu LAG vẫn lên cao -> Cần phải hạn chế tốc độ gửi message của Producer
   Có 2 phương pháp cần xem xét
   1. Producer sản xuất ra tin nhắn này nó có quan trọng hay ko
   -> Nếu như ko thể giảm đc thì phải `Thêm tài nguyên (Resource) cho thằng Broker`
   -> Nếu Broker ko đủ `Thêm tài nguyên cho máy chủ (máy chủ vật lý)`
   2. Điều chỉnh `Partition` cho phù hợp
   3. Nếu như message nó ko quan trọng thì giảm đi: VD 1p 100msg giảm còn 1p 50msg


# REDIS LUA
Lua trong Redis không phải là transaction theo nghĩa truyền thống (như trong SQL có rollback). Nếu một phần trong script bị lỗi, các lệnh đã chạy trước đó sẽ không được hoàn tác. Tuy nhiên, Redis vẫn đảm bảo tính atomic cho script — tức là toàn bộ script được thực thi như một lệnh duy nhất, không có lệnh từ client khác xen ngang trong lúc script đang chạy (dù là trên master hay cluster, miễn là các key nằm trong cùng một slot)

Trong Redis 1 transaction bao gồm 3 giai đoạn:
1. Mở transaction sử dụng `MULTI`
2. Các lệnh trong transaction ko đc thực hiện ngay lập tức mà đc đưa vào `queue`
3. Khi bỏ tất cả các lệnh vào `queue` và bên MySQL Commit thì nó sẽ apple vào hệ thống và Redis nó sẽ sử dụng lệnh `Exec` thì tất cả các câu lệnh trong `queue` được thực thi. Giao dịch bị hủy Mysql sử dụng `Rollback` còn Redis dùng `Discard`

`[?] Vậy khi 1 transaction của Redis đc xảy ra thì có 1 luồng khác Update lại KEY thì có được hay không? => CÓ`
                     Client A                                  |                    Client B
127.0.0.1:6379> MULTI   (1)                                    |  127.0.0.1:6379> HSET myteam name2 m10 (4)
OK                                                             |  (integer) 1
127.0.0.1:6379(TX)> HSET myteam name cr7 (2)                   |
QUEUED                                                         |
127.0.0.1:6379(TX)> HGET myteam name2    (3)                   |
QUEUED                                                         |
127.0.0.1:6379(TX)> EXEC          (5)                          |
1) (integer) 1                                                 |
2) "m10"                                                       |

=> Client A đang mở 1 transaction và thực hiện SET name cr7 và GET name2 nhưng lúc này name2 lại chưa có trong Redis. Client B nó vào SET name2 m10 => Lúc này Transaction của A đang bị 1 luồng khác Update

`[?] Vậy giải quyết thế nào? (Nếu như không muốn luồng khác can thiệp vào dữ liệu khi chưa COMMIT thì phải sử dụng WATCH)`
                     Client A                                  |                    Client B
127.0.0.1:6379> WATCH myteam2 (1)                              | 127.0.0.1:6379> HSET myteam name2 m10 (5)
OK                                                             | (integer) 1
127.0.0.1:6379> MULTI   (2)                                    |
OK                                                             |
127.0.0.1:6379(TX)> HSET myteam name cr7 (3)                   |
QUEUED                                                         |
127.0.0.1:6379(TX)> HGET myteam name2    (4)                   |
QUEUED                                                         |
127.0.0.1:6379(TX)> EXEC          (5)                          |
(nil)       <-- transaction bị hủy                             |


# LUA redis.call vs redis.pcall
```bash
127.0.0.1:6379> EVAL "return {ARGV[1],ARGV[2]}" 0 cr7 m10
1) "cr7"
2) "m10"
127.0.0.1:6379> EVAL "redis.call('SET', KEYS[1], ARGV[1])" 1 pro:1 10000
(nil)
127.0.0.1:6379> GET pro:1
"10000"
127.0.0.1:6379> EVAL "if redis.call('EXISTS', KEYS[1]) == 0 then return redis.call('SET', KEYS[1], ARGV[1]) else return -1 end" 1 pro:1 10000
(integer) -1
127.0.0.1:6379> EVAL "if redis.call('EXISTS', KEYS[1]) == 0 then return redis.call('SET', KEYS[1], ARGV[1]) else return -1 end" 1 pro:2 50000
OK
127.0.0.1:6379> GET pro:2
"50000"
```
```bash
# Redis.call() -> Nếu lệnh lỗi thì script sẽ dừng ngay lập tức và throw ra lỗi (KHÔNG CÓ SỰ KIỆN ROLLBACK) và các lệnh đằng sau sẽ ko đc thực thi (Nhưng những lệnh đằng trước đó sẽ vẫn được thực thi)
127.0.0.1:6379> EVAL "redis.call('SET','k1','v1'); redis.call('INCRBY', 'k2', 1/0); redis.call('SET', 'k3', 'v3')" 0
(error) ERR value is not an integer or out of range script: 14bbb8524305aec28bc69fdab6a62f327059ecf9, on @user_script:1.
127.0.0.1:6379> keys *
1) "k1"
# Lệnh redis.call('SET','k1','v1') vẫn sẽ đc thực thi đến lệnh redis.call('INCRBY', 'k2', 1/0) bị lỗi thì nó sẽ throw ra lỗi và lệnh sau đó redis.call('SET', 'k3', 'v3') sẽ không được thực thi

# Redis.pcall() -> Khi dùng lệnh này trong quá trình thực thi mà có lỗi thì sẽ không bị block và lỗi sẽ được ghi lại quá trình bên trong và các lệnh sau đó vẫn chạy bình thường
127.0.0.1:6379> EVAL "redis.pcall('SET','k4','v4'); redis.pcall('INCRBY', 'k5', 1/0); redis.pcall('SET', 'k6', 'v6')" 0
(nil)
127.0.0.1:6379> keys *
1) "k1"
2) "k4"
3) "k6"
```

