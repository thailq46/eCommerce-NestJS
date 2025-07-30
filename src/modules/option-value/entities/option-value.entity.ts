import { Option } from 'src/modules/option/entities/option.entity';
import {
   Column,
   CreateDateColumn,
   DeleteDateColumn,
   Entity,
   JoinColumn,
   ManyToOne,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'option_value' })
export class OptionValue {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'option_id', type: 'int' })
   option_id: number;

   @Column({ name: 'value', type: 'nvarchar', length: 255 })
   value: string;

   @CreateDateColumn({ type: 'datetime', update: false })
   created_at: Date;

   @UpdateDateColumn({ type: 'datetime' })
   updated_at: Date;

   @DeleteDateColumn({ type: 'datetime', nullable: true })
   deleted_at: Date | null;

   @Column({ type: 'boolean', default: false })
   is_deleted: boolean;

   @ManyToOne(() => Option, (option) => option.option_values)
   @JoinColumn({ name: 'option_id', referencedColumnName: 'id' })
   option?: Option;
}
