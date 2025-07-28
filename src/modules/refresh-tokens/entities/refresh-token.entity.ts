import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RefreshToken extends BaseEntity {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ type: 'int' })
   user_id: number;

   @Column({ type: 'nvarchar', length: 500, unique: true, nullable: true })
   token: string;

   @Column()
   iat: number;

   @Column()
   exp: number;

   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
   created_at: Date;

   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
   updated_at: Date;
}
