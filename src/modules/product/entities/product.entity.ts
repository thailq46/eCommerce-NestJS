import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product' })
export class Product {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'name', type: 'nvarchar', length: 255 })
   name: string;

   @Column({ name: 'description', type: 'text' })
   description: string;

   @Column({ name: 'slug', type: 'nvarchar', length: 255, unique: true })
   slug: string;

   @Column({ name: 'category_id', type: 'int' })
   category_id: number;

   @Column({ name: 'shop_id', type: 'int' })
   shop_id: number;

   @Column({ name: 'thumbnail', type: 'text', nullable: true })
   thumbnail: string;

   @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0 })
   rating_avg: number;

   @CreateDateColumn({ type: 'datetime', update: false })
   created_at: Date;

   @UpdateDateColumn({ type: 'datetime' })
   updated_at: Date;

   @DeleteDateColumn({ type: 'datetime', nullable: true })
   deleted_at: Date | null;

   @Column({ type: 'boolean', default: false })
   is_deleted: boolean;
}
