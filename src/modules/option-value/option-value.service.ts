import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggingService } from 'src/base/logging';
import { OptionValue } from 'src/modules/option-value/entities/option-value.entity';
import { Option } from 'src/modules/option/entities/option.entity';
import { DataSource, Not, Repository } from 'typeorm';
import { CreateOptionValueDto } from './dto/create-option-value.dto';
import { UpdateOptionValueDto } from './dto/update-option-value.dto';

@Injectable()
export class OptionValueService {
   constructor(
      @InjectRepository(OptionValue)
      private readonly optionValueRepo: Repository<OptionValue>,
      private loggingService: LoggingService,
      private dataSource: DataSource,
   ) {}

   async create(payload: CreateOptionValueDto) {
      try {
         const { option_id } = payload;
         const value = payload.value.trim();
         const [option, optionValue] = await Promise.all([
            this.dataSource.manager.findOne(Option, {
               where: { id: option_id, is_deleted: false },
            }),
            this.optionValueRepo.findOne({
               where: { value, option_id, is_deleted: false },
            }),
         ]);
         if (!option) {
            throw new NotFoundException(`Option with ID ${option_id} not found`);
         }
         if (optionValue) {
            throw new NotFoundException(`Option value with value ${value} already exists for option ID ${option_id}`);
         }
         const newOptionValue = this.optionValueRepo.create(payload);
         await this.optionValueRepo.save(newOptionValue);
         return {
            message: 'Option value created successfully',
            data: newOptionValue,
         };
      } catch (error) {
         this.loggingService.getLogger(OptionValue.name).error('Error creating option value', error);
         throw new Error('Error creating option value: ' + error.message);
      }
   }

   async findOne(id: number) {
      try {
         const optionValue = await this.optionValueRepo.findOne({
            where: { id, is_deleted: false },
            relations: ['option'],
         });
         if (!optionValue) {
            throw new NotFoundException(`Option value with ID ${id} not found`);
         }
         return {
            message: 'Option value found successfully',
            data: optionValue,
         };
      } catch (error) {
         this.loggingService.getLogger(OptionValue.name).error('Error finding option value', error);
         throw new BadRequestException('Error finding option value: ' + error.message);
      }
   }

   async update({ id, payload }: { id: number; payload: UpdateOptionValueDto }) {
      try {
         const { option_id, value } = payload;
         const [option, optionValue] = await Promise.all([
            this.dataSource.manager.findOne(Option, {
               where: { id: option_id, is_deleted: false },
            }),
            this.optionValueRepo.findOne({
               where: { value: value?.trim(), option_id, is_deleted: false, id: Not(id) },
            }),
         ]);
         if (!option) {
            throw new NotFoundException(`Option with ID ${option_id} not found`);
         }
         if (optionValue) {
            throw new NotFoundException(`Option value with value ${value} already exists for option ID ${option_id}`);
         }
         await this.optionValueRepo.update(id, {
            ...payload,
            updated_at: new Date(),
         });
         const updatedOptionValue = await this.optionValueRepo.findOne({
            where: { id },
            relations: ['option'],
         });
         return {
            message: 'Option value updated successfully',
            data: updatedOptionValue,
         };
      } catch (error) {
         this.loggingService.getLogger(OptionValue.name).error('Error updating option value', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Error updating option value: ' + error.message);
      }
   }

   async remove(id: number) {
      try {
         const optionValue = await this.optionValueRepo.findOne({
            where: { id, is_deleted: false },
         });
         if (!optionValue) {
            throw new NotFoundException(`Option value with ID ${id} not found`);
         }
         await this.optionValueRepo.update(id, { is_deleted: true, deleted_at: new Date() });
         return {
            message: 'Option value deleted successfully',
            data: { id },
         };
      } catch (error) {
         this.loggingService.getLogger(OptionValue.name).error('Error deleting option value', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Error deleting option value: ' + error.message);
      }
   }
}
