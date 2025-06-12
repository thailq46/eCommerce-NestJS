import {BaseEntityCRUD} from 'src/base/model/model.entity';
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('sku')
export class Sku extends BaseEntityCRUD {
   @PrimaryGeneratedColumn()
   sku_id: number;

   @Column({type: 'json', default: null, nullable: true})
   sku_tier_idx: string;

   @Column({type: 'tinyint', default: 0})
   sku_default: number;

   @Column({type: 'int', nullable: true, default: null})
   sku_sort: number | null;

   @Column({type: 'decimal', precision: 10, scale: 2, default: 0})
   sku_price: number;

   @Column({type: 'int', default: 0})
   sku_stock: number;

   @Column({type: 'int'})
   product_id: number;
}
