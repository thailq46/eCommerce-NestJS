import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'user_id', type: 'int' })
   user_id: number;

   @Column({ name: 'token', type: 'nvarchar', length: 500, unique: true })
   token: string;

   @Column({ name: 'iat', type: 'int', default: 0, comment: 'Thời gian tạo token' })
   iat: number;

   @Column({ name: 'exp', type: 'int', default: 0, comment: 'Thời gian hết hạn token' })
   exp: number;

   @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
   created_at: Date;

   @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
   updated_at: Date;
}
