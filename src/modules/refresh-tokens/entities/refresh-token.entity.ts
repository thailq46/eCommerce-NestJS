import {BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class RefreshToken extends BaseEntity {
   @PrimaryGeneratedColumn()
   id: number;

   @Column()
   user_id: number;

   @Column({unique: true})
   token: string;

   @Column()
   iat: number;

   @Column()
   exp: number;

   @CreateDateColumn({type: 'timestamp'})
   created_at: Date;

   @UpdateDateColumn({type: 'timestamp'})
   updated_at: Date;
}
