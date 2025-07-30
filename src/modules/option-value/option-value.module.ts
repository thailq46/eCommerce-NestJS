import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionValue } from 'src/modules/option-value/entities/option-value.entity';
import { OptionValueController } from './option-value.controller';
import { OptionValueService } from './option-value.service';

@Module({
   imports: [TypeOrmModule.forFeature([OptionValue])],
   controllers: [OptionValueController],
   providers: [OptionValueService],
})
export class OptionValueModule {}
