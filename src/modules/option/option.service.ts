import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggingService } from 'src/base/logging';
import { Option } from 'src/modules/option/entities/option.entity';
import { Repository } from 'typeorm';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionService {
   constructor(
      @InjectRepository(Option)
      private readonly optionRepo: Repository<Option>,
      private loggingService: LoggingService,
   ) {}

   async create(payload: CreateOptionDto) {
      try {
         const { name } = payload;
         const option = await this.optionRepo.findOne({
            where: { name: name.trim(), is_deleted: false },
         });
         if (option) {
            throw new BadRequestException(`Option with name ${name} already exists`);
         }
         const newOption = this.optionRepo.create(payload);
         await this.optionRepo.save(newOption);
         return {
            message: 'Option created successfully',
            data: newOption,
         };
      } catch (error) {
         this.loggingService.getLogger(Option.name).error('Error creating option', error);
         throw new BadRequestException('Error creating option: ' + error.message);
      }
   }

   async findAll() {
      return await this.optionRepo
         .find({ where: { is_deleted: false }, relations: ['option_values'] })
         .then((options) => {
            return {
               message: 'Options retrieved successfully',
               data: options,
            };
         })
         .catch((error) => {
            this.loggingService.getLogger(Option.name).error('Error retrieving options', error);
            throw new BadRequestException('Error retrieving options: ' + error.message);
         });
   }

   async findOne(id: number) {
      try {
         const option = await this.optionRepo.findOne({ where: { id, is_deleted: false } });
         if (!option) {
            throw new BadRequestException(`Option with ID ${id} not found`);
         }
         return {
            message: 'Option found successfully',
            data: option,
         };
      } catch (error) {
         this.loggingService.getLogger(Option.name).error('Error finding option', error);
         throw new BadRequestException('Error finding option: ' + error.message);
      }
   }

   async update({ id, payload }: { id: number; payload: UpdateOptionDto }) {
      try {
         const option = await this.optionRepo.findOne({ where: { id, is_deleted: false } });
         if (!option) {
            throw new BadRequestException(`Option with ID ${id} not found`);
         }
         // Check if the name already exists
         if (payload.name) {
            const existingOption = await this.optionRepo.findOne({
               where: { name: payload.name, is_deleted: false },
            });
            if (existingOption && existingOption.id !== id) {
               throw new BadRequestException(`Option with name ${payload.name} already exists`);
            }
         }
         // Update the option
         Object.assign(option, payload);
         await this.optionRepo.save(option);
         return {
            message: 'Option updated successfully',
            data: option,
         };
      } catch (error) {
         this.loggingService.getLogger(Option.name).error('Error updating option', error);
         throw new BadRequestException('Error updating option: ' + error.message);
      }
   }

   async remove(id: number) {
      try {
         const option = await this.optionRepo.findOne({ where: { id, is_deleted: false } });
         if (!option) {
            throw new BadRequestException(`Option with ID ${id} not found`);
         }
         option.is_deleted = true;
         option.deleted_at = new Date();
         await this.optionRepo.save(option);
         return {
            message: 'Option deleted successfully',
            data: { id },
         };
      } catch (error) {
         this.loggingService.getLogger(Option.name).error('Error deleting option', error);
         throw new BadRequestException('Error deleting option: ' + error.message);
      }
   }
}
