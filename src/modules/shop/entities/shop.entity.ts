import {BaseEntityCRUD} from 'src/base/model/model.entity';
import {BeforeInsert, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

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

   @BeforeInsert()
   setDefaultValue() {
      this.created_at = new Date();
      this.updated_at = new Date();
      this.deleted_at = null;
      this.is_deleted = false;
      this.shop_avatar = null;
      this.shop_banner = null;
   }
}
