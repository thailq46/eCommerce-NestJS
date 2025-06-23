/**
 * Đơn vị thời gian hỗ trợ cho lock operations
 */
export type TimeUnit = 'seconds' | 'milliseconds';

/**
 * Tùy chọn cho retry khi thao tác với distributed lock
 */
export interface RedisDistributedLockOptions {
   /**
    * Thời gian tối đa chờ đợi để lấy lock (milliseconds)
    * @default 5000 (5 giây)
    */
   timeout?: number;

   /**
    * Số lần thử lại tối đa
    * @default 5
    */
   maxRetries?: number;

   /**
    * Thời gian ban đầu giữa các lần thử (milliseconds)
    * @default 100
    */
   retryDelay?: number;

   /**
    * Có ghi log chi tiết quá trình lấy lock hay không
    * @default false
    */
   verbose?: boolean;
}

/**
 * Base interface cho thao tác lock, chứa các thuộc tính dùng chung
 */
export interface BaseLockParams {
   /**
    * Key sử dụng cho lock
    */
   keyLock: string;

   /**
    * Giá trị lưu trong lock (thường là identifier của client)
    */
   value: string;

   /**
    * Thời gian giữ lock
    */
   leaseTime: number;

   /**
    * Đơn vị thời gian (seconds hoặc milliseconds)
    */
   unit: TimeUnit;
}

export interface TryLockParams extends BaseLockParams {
   /**
    * Thời gian tối đa chờ để lấy lock
    */
   waitTime: number;
}

export interface LockParams extends BaseLockParams {
   /**
    * Tùy chọn về retry và timeout
    */
   options?: RedisDistributedLockOptions;
}
