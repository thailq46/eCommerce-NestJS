import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from 'src/base/logging';

interface KafkaSendResult {
   topicName: string;
   partition: number;
   errorCode: number;
   baseOffset: string;
   logAppendTime: string;
   logStartOffset: string;
}

@Injectable()
export class KafkaService implements OnModuleInit {
   constructor(
      @Inject('KAFKA_SERVICE') private kafkaClient: ClientKafka,
      private log: LoggingService,
   ) {}

   async onModuleInit() {
      // Subscribe response from server (for request-reply pattern)
      this.kafkaClient.subscribeToResponseOf('topic-howtosend');
      this.kafkaClient.subscribeToResponseOf('topic-howtosend-ddd');
      await this.kafkaClient.connect();
   }

   // ========================= 3 CÁCH GỬI MSG CỦA PRODUCER =========================
   /**
    * 1. Fire-and-forget: Producer gửi message và không cần quan tâm đến việc consumer có nhận được hay không nó chỉ biết là đã gửi xong.
    * => Cách này rất tiện lợi nhưng ko đảm bảo cho độ tin cậy của dữ liệu -> Phù hợp với tình huống ghi log
    * Emit không await -> đúng nghĩa fire-and-forget (chỉ biết broker nhận, không quan tâm consumer).
    * Emit có await -> vẫn là fire-and-forget (chỉ biết broker nhận, không chắc consumer xử lý.) nhưng sẽ chờ broker ack lại.
    * Send: chắc chắn consumer xử lý xong và trả về kết quả.
    */
   fireAndForget(topic: string, message: any) {
      this.log.getLogger('fireAndForget').log('Đã gửi yêu cầu: ' + JSON.stringify(message));
      const startTime = Date.now();
      this.kafkaClient.emit(topic, message);
      this.log.getLogger('fireAndForget').log(`Đi mua cái khác: Total Time: ${Date.now() - startTime}ms`);
   }

   /**
    * 2. Phải biết nó thành công rồi mới đi làm việc khác (Request-Reply)
    */
   async orderBreadSync(topic: string, message: any) {
      this.log.getLogger('orderBreadSync').log('Đã gửi yêu cầu: ' + JSON.stringify(message));
      const startTime = Date.now();
      const result = await firstValueFrom(this.kafkaClient.send(topic, message));
      this.log.getLogger('orderBreadSync').log('Đợi ở đây để nhận bánh: ' + JSON.stringify(result));
      this.log
         .getLogger('orderBreadSync')
         .log(`Ok có bánh rồi -> Đi mua cái khác: Total Time: ${Date.now() - startTime}ms`);
      return result;
   }

   /**
    * 3. Kết hợp của 1 + 2: Làm xong alo em, em đi mua cái khác
    */
   orderBreadAsync(topic: string, message: any) {
      this.log.getLogger('orderBreadAsync').log('[Người mua]: Đã gửi yêu cầu: ' + JSON.stringify(message));
      const startTime = Date.now();
      this.kafkaClient.emit(topic, message).subscribe({
         next: (rs: KafkaSendResult[]) => {
            this.log
               .getLogger('orderBreadAsync')
               .log(`[Người bán]: Đã làm xong bánh mì cho đơn hàng: ${JSON.stringify(message)}`);
            this.log
               .getLogger('orderBreadAsync')
               .log(
                  `[Người bán]: A lô, đã có bánh - Topic: ${rs[0].topicName} ---- partition: ${rs[0].partition} - offset: ${rs[0].baseOffset}`,
               );
         },
         error: (err) => {
            this.log
               .getLogger('orderBreadAsync')
               .error(`[Người bán]: Lỗi khi làm bánh mì cho đơn hàng: ${err.message || err}`);
         },
         complete: () => {
            this.log
               .getLogger('orderBreadAsync')
               .log('[Người mua]: Hoàn thành - totalTime:', Date.now() - startTime, 'ms');
         },
      });
      this.log.getLogger('orderBreadAsync').log('[Người mua]: Đi mua thứ khác (non-blocking)');
   }

   // PARTITION
   async orderBreadOnePartition(topic: string, payload: { message: string }) {
      // Gửi cả 3 order đến cùng 1 partition, Lần lượt gửi từng cái bánh mì
      this.log.getLogger('orderBreadOnePartition').log('Đã gửi yêu cầu: ' + JSON.stringify(payload));
      const startTime = Date.now();
      await Promise.all([
         firstValueFrom(this.kafkaClient.send(topic, { message: 'Mì trứng' })),
         firstValueFrom(this.kafkaClient.send(topic, { message: 'Mì thịt' })),
         firstValueFrom(this.kafkaClient.send(topic, { message: 'Mì thập cẩm' })),
      ]);
      this.log.getLogger('orderBreadOnePartition').log(`Nhận 3 ổ bánh mì mất: ${Date.now() - startTime}ms`);
   }
}
