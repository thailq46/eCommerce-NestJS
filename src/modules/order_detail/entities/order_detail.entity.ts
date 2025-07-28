import { BaseEntityCRUD } from 'src/base/model/model.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'order_detail' })
export class OrderDetail extends BaseEntityCRUD {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'order_id', comment: 'Reference to the order' })
   order_id: number;

   @Column({ name: 'product_id', comment: 'Reference to the product' })
   product_id: number;

   @Column({ name: 'sku_id', comment: 'Reference to the product SKU/variant' })
   sku_id: number;

   @Column({ name: 'quantity', comment: 'Quantity of the product ordered' })
   quantity: number;

   @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2, comment: 'Unit price at the time of order' })
   price: number;

   @Column({
      name: 'sub_total',
      type: 'decimal',
      precision: 12,
      scale: 2,
      comment: 'Calculated field: quantity * price',
   })
   sub_total: number;

   @ManyToOne(() => Order, (order) => order.order_details)
   @JoinColumn({ name: 'order_id' })
   order: Order;
}
