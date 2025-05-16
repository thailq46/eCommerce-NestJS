import {Transform} from 'class-transformer';
import {IsArray, IsBoolean, IsOptional, IsPositive, IsString, Max} from 'class-validator';

export class QuerySpecificationDto {
   // PaginationSpecificationDto
   @IsOptional()
   @Transform(({value}) => value && parseInt(String(value)))
   @IsPositive()
   @Max(10)
   limit?: number;

   @IsOptional()
   @Transform(({value}) => value && parseInt(String(value)))
   @IsPositive()
   page?: number;

   @IsOptional()
   @Transform(({value}) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
         const lowerValue = value.toLowerCase();
         if (lowerValue === 'true') return true;
         if (lowerValue === 'false') return false;
         if (lowerValue === '0') return false;
         if (lowerValue === '1') return true;
      }
      return false;
   })
   @IsBoolean()
   disablePagination?: boolean;

   // SortSpecificationDto

   @IsOptional()
   @IsArray()
   @IsString({each: true})
   sort?: string[];

   // SearchSpecificationDto

   @IsOptional()
   @IsString()
   search?: string;

   @IsOptional()
   @IsArray()
   @IsString({each: true})
   @Transform(({value}) => {
      // Nếu không có giá trị, trả về mảng rỗng
      if (!value) return [];
      // Nếu đã là mảng rồi thì giữ nguyên
      if (Array.isArray(value)) return value;
      // Nếu là chuỗi JSON thì parse
      if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
         try {
            return JSON.parse(value);
         } catch (e) {
            console.error('Error parsing searchFields JSON string:', e);
         }
      }
      // Nếu là chuỗi thường thì split bằng dấu phẩy
      if (typeof value === 'string') {
         return value.split(',').map((item) => item.trim());
      }
      // Trường hợp khác trả về mảng rỗng
      return [];
   })
   searchFields?: string[];

   @IsOptional()
   @Transform(({value}) => {
      // Nếu đã là object thì trả về
      if (value && typeof value === 'object') return value;
      // Nếu là string JSON thì parse
      if (typeof value === 'string') {
         try {
            return JSON.parse(value);
         } catch (e) {
            // Không phải JSON hợp lệ, kiểm tra xem có phải định dạng đặc biệt không
            // Kiểm tra định dạng '{key = value, key2 = value2}'
            if (value.includes('=')) {
               const result = {};
               // Loại bỏ dấu { } nếu có
               let filterStr = value;
               if (filterStr.startsWith('{') && filterStr.endsWith('}')) {
                  filterStr = filterStr.substring(1, filterStr.length - 1);
               }
               // Split theo dấu phẩy để lấy các cặp key=value
               const pairs = filterStr.split(',');
               for (const pair of pairs) {
                  // Split theo dấu = để lấy key và value
                  const [key, val] = pair.split('=').map((s) => s.trim());
                  if (key && val !== undefined) {
                     // Chuyển đổi value
                     if (!isNaN(Number(val))) {
                        result[key] = Number(val);
                     } else if (val.toLowerCase() === 'true') {
                        result[key] = true;
                     } else if (val.toLowerCase() === 'false') {
                        result[key] = false;
                     } else {
                        result[key] = val;
                     }
                  }
               }
               return Object.keys(result).length > 0 ? result : value;
            }
         }
      }
   })
   filter?: Record<string, any>;
}
