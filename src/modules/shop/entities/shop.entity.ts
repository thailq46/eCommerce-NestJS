import {BaseEntityCRUD} from 'src/base/model/model.entity';
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('shop')
export class Shop extends BaseEntityCRUD {
   @PrimaryGeneratedColumn()
   shop_id: number;

   @Column({type: 'nvarchar', length: 150})
   shop_name: string;

   @Column({type: 'nvarchar', length: 500})
   shop_desc: string;

   @Column({type: 'nvarchar', length: 500})
   shop_address: string;

   @Column({type: 'int'})
   owner_id: number;

   @Column({type: 'text', nullable: true, default: null})
   shop_avatar: string | null;

   @Column({type: 'text', nullable: true, default: null})
   shop_banner: string | null;
}
