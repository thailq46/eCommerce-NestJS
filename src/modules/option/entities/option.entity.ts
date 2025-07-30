import { OptionValue } from 'src/modules/option-value/entities/option-value.entity';
import {
   Column,
   CreateDateColumn,
   DeleteDateColumn,
   Entity,
   OneToMany,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'option' })
export class Option {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'name', type: 'nvarchar', length: 255, unique: true })
   name: string;

   @CreateDateColumn({ type: 'datetime', update: false })
   created_at: Date;

   @UpdateDateColumn({ type: 'datetime' })
   updated_at: Date;

   @DeleteDateColumn({ type: 'datetime', nullable: true })
   deleted_at: Date | null;

   @Column({ type: 'boolean', default: false })
   is_deleted: boolean;

   @OneToMany(() => OptionValue, (optionValue) => optionValue.option)
   option_values?: OptionValue[];
}
