import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from 'src/base/db/kafka/kafka.service';
import { KafkaConsumerController } from 'src/modules/kafka/kafka-consumer';
import { KafkaController } from 'src/modules/kafka/kafka.controller';

@Global()
@Module({
   imports: [
      ClientsModule.register([
         {
            name: 'KAFKA_SERVICE',
            transport: Transport.KAFKA,
            options: {
               client: {
                  brokers: ['localhost:9193'],
                  clientId: 'nest-kafka-app',
               },
               producer: {
                  allowAutoTopicCreation: true, // Cho phép tự động tạo topic nếu chưa tồn tại
                  retry: {
                     retries: 5, // Thử lại 5 lần nếu gửi thất bại
                     initialRetryTime: 1000, // Thời gian chờ ban đầu
                     maxRetryTime: 3000, // Thời gian chờ tối đa 3s
                  },
               },
            },
         },
      ]),
   ],
   controllers: [KafkaController, KafkaConsumerController],
   providers: [KafkaService],
   exports: [KafkaService],
})
export class KafkaModule {}
