import {BaseEntityCRUD} from 'src/base/model/model.entity';
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('spu')
export class Spu extends BaseEntityCRUD {
   @PrimaryGeneratedColumn()
   spu_id: number;

   @Column({type: 'nvarchar', length: 255})
   product_name: string;

   @Column({type: 'nvarchar', length: 500})
   product_desc: string;

   @Column({type: 'nvarchar', length: 255})
   product_slug: string;

   @Column({type: 'text', nullable: true, default: null})
   product_thumb: string | null;

   @Column({type: 'int'})
   product_category: number;

   @Column({type: 'int'})
   product_shop: number;

   @Column({type: 'decimal', precision: 10, scale: 2, default: 0})
   product_price: number;

   @Column({type: 'int'})
   product_quantity: number;

   @Column({type: 'decimal', precision: 3, scale: 1, default: 0})
   product_rating_avg: number;

   @Column({type: 'json'})
   product_variations: string;
}
