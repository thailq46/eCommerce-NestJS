import {CreateDateColumn, DeleteDateColumn, UpdateDateColumn} from 'typeorm';
import {BaseEntity as OrmBaseEntity} from 'typeorm/repository/BaseEntity';

export class BaseEntity extends OrmBaseEntity {
   constructor(partial: Record<string, any>) {
      super();
      Object.assign(this, partial);
      return this;
   }
}

export class BaseEntityCRUD extends BaseEntity {
   @CreateDateColumn({type: 'datetime'})
   created_at: Date;

   @UpdateDateColumn({type: 'datetime'})
   updated_at: Date;

   @DeleteDateColumn({type: 'datetime', nullable: true})
   deleted_at: Date;

   @DeleteDateColumn({type: 'boolean', default: false})
   is_deleted: boolean;
}
