import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_variant' })
export class ProductVariant {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'product_id', type: 'int' })
   product_id: number;

   @Column({ name: 'sku', type: 'nvarchar', length: 150, unique: true })
   sku: string;

   @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, default: 0 })
   price: number;

   @Column({ name: 'stock', type: 'int', default: 0 })
   stock_quantity: number;

   @CreateDateColumn({ type: 'datetime', update: false })
   created_at: Date;

   @UpdateDateColumn({ type: 'datetime' })
   updated_at: Date;

   @DeleteDateColumn({ type: 'datetime', nullable: true })
   deleted_at: Date | null;

   @Column({ type: 'boolean', default: false })
   is_deleted: boolean;
}
