import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'product_variant_option_value' })
export class ProductVariantOptionValue {
   @PrimaryColumn({ name: 'product_variant_id', type: 'int' })
   product_variant_id: number;

   @PrimaryColumn({ name: 'option_value_id', type: 'int' })
   option_value_id: number;
}
