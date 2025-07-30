import { PartialType } from '@nestjs/mapped-types';
import { CreateProductVariantOptionValueDto } from './create-product-variant-option-value.dto';

export class UpdateProductVariantOptionValueDto extends PartialType(CreateProductVariantOptionValueDto) {}
