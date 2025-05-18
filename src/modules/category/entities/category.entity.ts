import {BaseEntityCRUD} from 'src/base/model/model.entity';
import {BeforeInsert, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('category')
export class Category extends BaseEntityCRUD {
   @PrimaryGeneratedColumn()
   cate_id: number;

   @Column({type: 'nvarchar', length: 255})
   cate_name: string;

   @Column({type: 'nvarchar', length: 500})
   cate_desc: string;

   @Column({type: 'nvarchar', length: 255})
   cate_slug: string;

   @Column({type: 'int', default: null, nullable: true})
   parent_id: number | null;

   @BeforeInsert()
   setDefaultValue() {
      this.created_at = new Date();
      this.updated_at = new Date();
      this.deleted_at = null;
      this.is_deleted = false;
      this.parent_id = null;
   }
}
