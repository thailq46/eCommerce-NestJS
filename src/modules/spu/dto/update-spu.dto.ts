import { PartialType } from '@nestjs/mapped-types';
import { CreateSpuDto } from './create-spu.dto';

export class UpdateSpuDto extends PartialType(CreateSpuDto) {}
