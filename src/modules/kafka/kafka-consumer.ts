import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, MessagePattern, Payload } from '@nestjs/microservices';
import { LoggingService } from 'src/base/logging';

@Controller()
export class KafkaConsumerController {
   constructor(private log: LoggingService) {}

   @EventPattern('topic-howtosend')
   orderBreadFireAndForgot(@Payload() data: any, @Ctx() context: KafkaContext) {
      const message = context.getMessage();
      const partition = context.getPartition();
      const topic = context.getTopic();
      const { offset, timestamp } = message;
      this.log
         .getLogger('orderBreadFireAndForgot')
         .log(
            `[Received]: ${JSON.stringify(data)} from ${topic}, partition ${partition}, offset: ${offset}, timestamp: ${timestamp}, `,
         );
      return { result: 'OK', data };
   }

   @MessagePattern('topic-howtosend')
   async orderBreadRequestReply(@Payload() data: any, @Ctx() context: KafkaContext) {
      const message = context.getMessage();
      const partition = context.getPartition();
      const topic = context.getTopic();
      const { offset, timestamp } = message;
      this.log
         .getLogger('orderBreadRequestReply')
         .log(
            `[Received]: ${JSON.stringify(data)} from ${topic}, partition ${partition}, offset: ${offset}, timestamp: ${timestamp}, `,
         );
      return { result: 'OK', data };
   }

   @MessagePattern('topic-howtosend-ddd')
   async processBreadOrder(@Payload() data: any, @Ctx() context: KafkaContext) {
      const message = context.getMessage();
      const partition = context.getPartition();
      const { offset } = message;
      this.log
         .getLogger('processBreadOrder')
         .log(`Người bán (partition ${partition}): Nhận được order: ${data.message}`);
      const startTime = Date.now();
      // Giả sử người bán mất 2s để làm bánh mì
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      this.log
         .getLogger('processBreadOrder')
         .log(
            `Người bán đã làm xong: ${data.message} - Thời gian: ${processingTime}ms (partition ${partition}, offset ${offset})`,
         );
      return { result: 'OK', data };
   }
}
