import { OrderDetail } from 'src/modules/order_detail/entities/order_detail.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityCRUD } from '../../../base/model/model.entity';
import { OrderStatus } from '../../../modules/order/types';

@Entity({ name: 'order' })
export class Order extends BaseEntityCRUD {
   @PrimaryGeneratedColumn({ name: 'order_id', comment: 'Unique identifier for the order' })
   order_id: number;

   @Column({ name: 'user_id', comment: 'ID of the user who placed the order' })
   user_id: number;

   @Column({
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'total_amount',
      comment: 'Final total amount of the order (including taxes/shipping if applicable)',
   })
   total_amount: number;

   @Column({ name: 'fullname', length: 100, comment: 'Full name of the customer' })
   fullname: string;

   @Column({ name: 'phone_number', length: 20, comment: 'Contact phone number' })
   phone_number: string;

   @Column({ name: 'email', length: 100, comment: 'Contact email address' })
   email: string;

   @Column({ name: 'note', type: 'text', nullable: true, comment: 'Additional notes from the customer' })
   note?: string;

   @Column({ name: 'shipping_address', length: 200, comment: 'shipping address' })
   shipping_address: string;

   @Column({ type: 'enum', enum: OrderStatus, default: 'PENDING', comment: 'Order status' })
   status: OrderStatus;

   @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order)
   order_details: OrderDetail[];
}
