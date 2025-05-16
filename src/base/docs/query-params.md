# Tài liệu người dùng: Hệ thống Lọc Dữ liệu trong API NestJS

## Giới thiệu

File `list.service.ts` triển khai các chức năng truy vấn dữ liệu với khả năng lọc, tìm kiếm và phân trang linh hoạt. Tài liệu này giúp bạn hiểu cách sử dụng hệ thống lọc dữ liệu trong API của ứng dụng.

## 1. Cấu trúc Query

```typescript
interface QueryOptions {
  // Tìm kiếm
  search?: string; // Từ khóa tìm kiếm
  searchFields?: string[]; // Các trường để tìm kiếm

  // Lọc
  filter?: Record<string, any>; // Các điều kiện lọc

  // Phân trang
  pageNumber?: number; // Trang hiện tại
  pageSize?: number; // Số mục trên một trang
  disablePagination?: boolean; // Tắt phân trang

  // Sắp xếp
  sort?: string[]; // Các trường sắp xếp, thêm '-' phía trước để sắp xếp giảm dần

  // Khác
  fields?: string[]; // Chỉ lấy các trường này
  omitFields?: string[]; // Bỏ qua các trường này
  include?: string[]; // Bao gồm các quan hệ
}
```

## 2. Các loại Điều kiện Lọc

Bạn có thể sử dụng một hoặc nhiều điều kiện lọc trong cùng một truy vấn.

### 2.1. Lọc bằng (`=`)

```ts
// Ví dụ: Tìm người dùng có trạng thái "active"
filter: {
  status: 'active';
}
// SQL: WHERE user.status = :param
```

### 2.2. Lọc theo tập hợp giá trị (IN)

```ts
// Ví dụ: Tìm sản phẩm thuộc các danh mục 1, 2, 3
filter: {
  category_id_IN: [1, 2, 3];
}
// SQL: WHERE product.category_id IN (:...param)
```

### 2.3. Lọc theo khoảng (RANGE)

```ts
// Ví dụ: Tìm sản phẩm có giá từ 100.000 đến 500.000
filter: {
  price_RANGE: [100000, 500000];
}
// SQL: WHERE product.price BETWEEN :param1 AND :param2
```

### 2.4. Lọc lớn hơn hoặc bằng (GTE)

```ts
// Ví dụ: Tìm người dùng từ 18 tuổi trở lên
filter: {
  age_GTE: 18;
}
// SQL: WHERE user.age >= :param
```

### 2.5. Lọc nhỏ hơn hoặc bằng (LTE)

```ts
// Ví dụ: Tìm sản phẩm có giá dưới 1 triệu
filter: {
  price_LTE: 1000000;
}
// SQL: WHERE product.price <= :param
```

### 2.6. Lọc lớn hơn (GT)

```ts
// Ví dụ: Tìm đơn hàng có giá trị lớn hơn 5 triệu
filter: {
  total_GT: 5000000;
}
// SQL: WHERE order.total > :param
```

### 2.7. Lọc nhỏ hơn (LT)

```ts
// Ví dụ: Tìm sản phẩm có số lượng dưới 10
filter: {
  quantity_LT: 10;
}
// SQL: WHERE product.quantity < :param
```

### 2.8. Lọc theo ngày (DAY)

```ts
// Ví dụ: Tìm đơn hàng tạo vào ngày 15 của bất kỳ tháng nào
filter: {
  created_at_DAY: 15;
}
// SQL: WHERE date_part('day', order.created_at) = :param
```

### 2.9. Lọc theo tháng (MONTH)

```ts
// Ví dụ: Tìm đơn hàng tạo trong tháng 3
filter: {
  created_at_MONTH: 3;
}
// SQL: WHERE date_part('month', order.created_at) = :param
```

### 2.10. Lọc theo năm (YEAR)

```ts
// Ví dụ: Tìm đơn hàng tạo trong năm 2023
filter: {
  created_at_YEAR: 2023;
}
// SQL: WHERE date_part('year', order.created_at) = :param
```

### 2.11. Lọc chứa chuỗi (CONTAINS)

```ts
// Ví dụ: Tìm sản phẩm có tên chứa từ "điện thoại"
filter: {
  name_CONTAINS: 'điện thoại';
}
// SQL: WHERE product.name LIKE :param (với param = '%điện thoại%')
```

### 2.12. Lọc quan hệ (trường có dấu chấm)

```ts
// Ví dụ: Tìm user có profile đã xác thực
filter: { 'profile.is_verified': true }
// SQL: WHERE profile.is_verified = :param
```

## 3. Ví dụ Thực tế

```ts
GET /products?
    search=iphone&
    searchFields=["name","description"]&
    filter[category_id]=1&
    filter[price_RANGE]=[5000000,15000000]&
    filter[in_stock]=true&
    page=1&
    limit=20&
    sort=-created_at
```
