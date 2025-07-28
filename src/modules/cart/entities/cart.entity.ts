import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cart')
export class Cart {
   @PrimaryGeneratedColumn()
   cart_id: number;

   @Column({ type: 'int', nullable: false })
   user_id: number;

   @Column({ type: 'int', nullable: false })
   product_id: number;

   @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
   price: number;

   @Column({ type: 'int', default: 0, nullable: false })
   quantity: number;

   @Column({ type: 'int', nullable: false })
   sku_id: number;

   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
   created_at: Date;

   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
   updated_at: Date;
}
