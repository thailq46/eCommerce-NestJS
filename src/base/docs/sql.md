# 9 NGUYÊN TẮC KHÔNG THIẾU với Table MYSQL trước khi khởi tạo

## Rule 1: Luôn phải có column mặc định (Ai là người tạo, tạo khi nào, ai là người sửa đổi cuối cùng, thời gian sửa đổi khi nào)

```sql
-- BAD
CREATE TABLE feeds (
   id INT AUTO_INCREMENT PRIMARY_KEY,
   title VARCHAR(255) NOT NULL,
   content TEXT
)
-- GOOD
CREATE TABLE feeds (
   id INT AUTO_INCREMENT PRIMARY_KEY,
   title VARCHAR(255) NOT NULL,
   content TEXT,
   version INT UNSIGNED NOT NULL DEFAULT 1, -- Từ khi tạo table có bao nhiêu lần chỉnh sửa table
   creator_id INT UNSIGNED, -- Người tạo (Ko cần cũng đc)
   modifier_id INT UNSIGNED, -- Người sửa cuối cùng
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Rule 2: Phải luôn thêm comment để có ý nghĩa của các column

```sql
CREATE TABLE feeds (
   id INT AUTO_INCREMENT PRIMARY_KEY COMMENT 'Article ID',
   title VARCHAR(255) NOT NULL COMMENT 'Article Title',
   content TEXT COMMENT 'Article Content',
   status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Feed status: 1 = active, 2 = banned, 3 = pending approval',
   version INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Optimistic Key Version',
   creator_id INT UNSIGNED COMMENT 'Creator ID (users table reference)',
   modifier_id INT UNSIGNED COMMENT 'Last Modifier ID (users table reference)',
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last Updated Time',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Talbe of trackable feeds';
```

## Rule 3: Xóa dữ liệu phải xóa mềm không được xóa cứng dữ liệu

```sql
CREATE TABLE feeds (
   id INT AUTO_INCREMENT PRIMARY_KEY COMMENT 'Article ID',
   title VARCHAR(255) NOT NULL COMMENT 'Article Title',
   content TEXT COMMENT 'Article Content',
   status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Feed status: 1 = active, 2 = banned, 3 = pending approval',
   version INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Optimistic Key Version',
   creator_id INT UNSIGNED COMMENT 'Creator ID (users table reference)',
   modifier_id INT UNSIGNED COMMENT 'Last Modifier ID (users table reference)',
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last Updated Time',
   is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = Not deleted, 1 = deleted',
   deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Time of deletion',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Talbe of trackable feeds';
```

- Thay vì dùng 2 field là is_deleted và deleted_at thì có thể dùng 1 field là deleted_at (Record nào chưa xóa thì mặc định nó là NULL, nếu xóa rồi nó sẽ biến thành thời gian xóa).`Nhược điểm: Khi dữ liệu lớn rất nhanh thì NULL nhiều ảnh hưởng đến hiệu suất của index. Còn dữ liệu nhỏ thì ko có sự khác biệt`
- Câu lệnh `DELETE FROM feeds WHERE id = 1 AND deleted_at IS NULL` khác nhau hoàn toàn với `DELETE FROM feeds WHERE id = 1 AND deleted_at = 0`

## Rule 4: Lên đặt tiền tố prefix cho table

## Rule 5: 1 Column không lên có quá nhiều column (>20 thì lên tách bảng ra)

```sql
CREATE TABLE feeds (
   feed_id INT AUTO_INCREMENT PRIMARY_KEY COMMENT 'Article ID',
   feed_title VARCHAR(255) NOT NULL COMMENT 'Article Title',
   feed_status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Feed status: 1 = active, 2 = banned, 3 = pending approval',
   feed_version INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Optimistic Key Version',
   feed_creator_id INT UNSIGNED COMMENT 'Creator ID (users table reference)',
   feed_modifier_id INT UNSIGNED COMMENT 'Last Modifier ID (users table reference)',
   feed_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
   feed_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last Updated Time',
   feed_is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = Not deleted, 1 = deleted',
   feed_deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Time of deletion',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Talbe of trackable feeds';

CREATE TABLE feeds_details (
   feed_detail_id INT AUTO_INCREMENT PRIMARY_KEY COMMENT 'Detail record ID',
   feed_id INT UNSIGNED NOT NULL COMMENT 'Reference to feeds',
   feed_content TEXT COMMENT 'Full content of the feed',
   feed_thumbnail_url VARCHAR(500) DEFAULT NULL COMMENT 'Optional thumbnal image URL',
   feed_description TEXT DEFAULT NULL COMMENT 'Optional feed short description',
   feed_tags JSON DEFAULT NULL COMMENT 'Tags in JSON array format',
   feed_extra_metadata JSON DEFAULT NULL COMMENT 'Optional additional data (structured)',

   detail_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
   detail_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last Updated Time',

   FOREIGN KEY (feed_id) REFERENCES feeds(feed_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Feed details table (les frequently accessed, heavy fields)';

-- JOIN (Do quan hệ 1-1 chứ ko phải 1-n lên hiệu suất rất cao ko lo khi JOIN)
SELECT
   f.feed_id,
   f.feed_title,
   d.feed_content,
   d.feed_tags
FROM feeds AS f
JOIN feed_details AS d ON f.feed_id = d.feed_id
WHERE f.feed_id = 123;
```

## Rule 6: Chọn kiểu dữ liệu thích hợp để tiết kiệm memmory, tối ưu tốc độ query

## Rule 7: Không được để NULL bừa bãi (Nó sẽ gây ra lỗi index khi so sánh = Null nó sẽ không hoạt động index)

- Null ko phải là số, ko phải là string, không phải là boolean -> Nó là 1 vùng không xác định => Những field nào bắt buộc phải thêm `NOT NULL` vào và khi không có giá trị thì phải bỏ `DEFAULT` vì `DEFAULT luôn luôn đi với NOT NULL`

## Rule 8: Cốt lỗi của việc đánh index là cho dữ liệu ít trùng lặp

```sql
CREATE TABLE feeds (
   feed_id INT AUTO_INCREMENT PRIMARY_KEY COMMENT 'Article ID',
   feed_title VARCHAR(255) NOT NULL COMMENT 'Article Title',
   feed_status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Feed status: 1 = active, 2 = banned, 3 = pending approval',
   feed_version INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Optimistic Key Version',
   feed_creator_id INT UNSIGNED COMMENT 'Creator ID (users table reference)',
   feed_modifier_id INT UNSIGNED COMMENT 'Last Modifier ID (users table reference)',
   feed_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
   feed_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last Updated Time',
   feed_is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = Not deleted, 1 = deleted',
   feed_deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Time of deletion',

   -- PRIMARY
   PRIMARY KEY (feed_id),

   -- INDEXES
   KEY idx_creator_created_at (feed_creator_id, feed_created_at),
   KEY idx_status_created_at (feed_status, feed_created_at),
   KEY idx_deleted_at (feed_deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Talbe of trackable feeds';
```

VD: feed_status có 1.000.000 record -> Có 999.800 là status = 1 -> Khi đánh index theo status thì query where theo status = 1 còn chậm hơn không đánh index vì 90% là 1 lên nó sẽ quét hết toàn bộ table và bỏ qua index

[?] Vậy bắt buộc phải select thằng status thì làm sao?
VD cổ điển: `SELECT * FROM feeds WHERE feed_status = 1` -> Rất chậm;
-> C1: 1 trong các cách khắc phục là thêm phạm vi
VD: `SELECT * FROM feeds WHERE feed_status = 1 AND feed_created_at >= "2025-07-20"`
-> C2: Hoặc các table chia ra Partition (Ko thể thay thế cho index -> Chỉ lên dùng khi thực sự cần thiết và hiểu rõ việc đi kèm với sự mất mát khi triển khai)
-> C3: Tạo View trong Procedure

## Rule 9: Nguyên tắc 3NF


### Sơ đồ ERP

+-----------------+                +---------------------+
|     product     |                |   product_variant   |
|-----------------|                |---------------------|
| id (PK)         |                | id (PK)             |
| name            |                | sku (unique)        |
| description     |                | price               |
| slug (unique)   | <----------->  | stock_quantity      |
| thumnail        |                | product_id (FK)     |
| category_id     |                +---------------------+
| shop_id         |                          ^
| rating_avg      |                          |
+-----------------+                          |
                                             |
                                             |
                                             |
                                             |
                              +----------------+----------------+
                              |                                 |
                              v                                 v
                  +-------------------+           +------------------------------+
                  |    option_value   |<--------->| product_variant_option_value |
                  |-------------------|           |                              |
                  | id (PK)           |           |------------------------------|
                  | value             |           | product_variant_id (PK, FK)  |
                  | option_id (FK)    |           | option_value_id (PK, FK)     |
                  +-------------------+           +------------------------------+
                              ^
                              |
                              |
                  +-------------------+
                  |      option       |
                  |-------------------|
                  | id (PK)           |
                  | name (unique)     |
                  +-------------------+
Product: {id: 1, name: "iPhone 17 Pro Max"}
Option -> {id: 1, name: "Color"},{id: 2, name: "Storage"}
Option_Value -> {id: 1, option_id: 1, name: "Black"}
                {id: 2, option_id: 1, name: "White"}
                {id: 3, option_id: 2, name: "256GB"}