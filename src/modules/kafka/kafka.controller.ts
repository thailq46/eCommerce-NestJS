import { Body, Controller, Post } from '@nestjs/common';
import { KafkaService } from 'src/base/db/kafka/kafka.service';
import { Public } from 'src/base/decorators/customize.decorator';

@Public()
@Controller('kafka')
export class KafkaController {
   constructor(private readonly kafkaProducer: KafkaService) {}

   /**
    1. Làm thế nào để phát hiện Kafka tồn động tin nhắn nhiều trong hệ thống?
    2. Nếu phát hiện nhiều tin nhắn đang chưa kịp xử lý hoặc đang tồn đọng thì phải giải quyết thế nào?
    3. Cơ chế load balancing trong Kafka hoạt động ra sao?
    4. Làm thế nào để tạo ra nhiều partition trong Kafka? (docker exec -it kafka1 kafka-topics.sh --alter --topic test-topic --bootstrap-server localhost:9092 --partitions 3)
    5. 1 Message đc chia tải ra nhiều partition thì làm như nào?
    6. Muốn sắp xếp tin nhắn theo thứ tự thì làm thế nào?
    7. Làm thế nào để biết 1 tin nhắn của message được tiêu thụ hoặc đc xử lý rồi
    8. Producer có bao nhiêu cách gửi msg và cách nào tốt nhất?
    9. Làm thế nào để tăng tốc lượng đồng thời trong Producer?
    */
   @Post('order')
   placeOrder(@Body() { message }: { message: string }) {
      this.kafkaProducer.fireAndForget('topic-howtosend', { message });
      return { message: 'Message sent to Kafka topic successfully' };
   }

   @Post('order/sync')
   async orderBreadSync(@Body() { message }: { message: string }) {
      const rs = await this.kafkaProducer.orderBreadSync('topic-howtosend', { message });
      return {
         message: 'Message sent to Kafka topic successfully',
         data: rs,
      };
   }

   @Post('order/async')
   orderBreadAsync(@Body() { message }: { message: string }) {
      this.kafkaProducer.orderBreadAsync('topic-howtosend', { message });
      return {
         message: 'Message sent to Kafka topic successfully',
      };
   }

   // PARTITION
   @Post('order/ddd')
   async orderBreadDDD(@Body() { message }: { message: string }) {
      const startTime = Date.now();
      await this.kafkaProducer.orderBreadOnePartition('topic-howtosend-ddd', { message });
      console.log(`[orderBreadDDD]: Làm 3 cái bánh mì mất: ${Date.now() - startTime}ms`);
      return { message: 'Message sent to Kafka topic successfully' };
   }
}
