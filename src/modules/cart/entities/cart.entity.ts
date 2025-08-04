import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cart')
export class Cart {
   @PrimaryGeneratedColumn({ name: 'cart_id', type: 'int' })
   cart_id: number;

   @Column({ name: 'user_id', type: 'int' })
   user_id: number;

   @Column({ name: 'product_id', type: 'int' })
   product_id: number;

   @Column({ name: 'product_variant_id', type: 'int' })
   product_variant_id: number;

   @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, default: 0 })
   price: number;

   @Column({ name: 'quantity', type: 'int', default: 0 })
   quantity: number;

   @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
   created_at: Date;

   @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
   updated_at: Date;
}
