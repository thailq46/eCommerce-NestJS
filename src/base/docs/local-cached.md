# Tiêu chí chọn Local Cache

1. Phải set được số lượng chỉ mục được lưu trong 1 cache (giới hạn số lượng phần tử (entry) được lưu trong cache tại một thời điểm.)
   VD: maximumSize(1000) => 🔥 tối đa 1000 entry

2. Phải quản lý được số KB, MB, ...
   VD: maximumWeight(100MB) -> Vì local cache lưu trên RAM lên phải tiết kiệm lên phải control đc

3. Khả năng kiểm soát TTL (Time-to-live) và Eviction Policy

   - TTL (tự động hết hạn)
   - LRU / LFU / FIFO (tự động loại bỏ dữ liệu khi đầy bộ nhớ)

4. Quyền truy cập đã hết hạn (ExpireAfterAccess)

   - Xác định xem đã hết hạn hay chưa dựa vào thời gian truy cập lần cuối cùng và nó chỉ hết hạn khi không được truy cập trong thời gian mà ta set
     VD: 11h truy cập vào key A (có timeout là 10p) -> 11h05 truy cập vào key A => key A set lại timeout là 10p -> Từ 11h05 đến 11h20 -> truy cập lại key A sẽ `not exist`

5. Công cụ đó phải hỗ trợ các func như kiểu getItemCache, getItemDatabase, setItemCache, ...
