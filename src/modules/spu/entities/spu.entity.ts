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
   product_thumb: string;

   @Column({type: 'int'})
   product_category: string;

   @Column({type: 'decimal', precision: 8, scale: 2})
   product_price: number;

   @Column({type: 'int'})
   product_shop: number;

   @Column({type: 'int', default: 0, nullable: true})
   product_rating_avg: number;

   @Column({type: 'json'})
   product_variations: string;
}
