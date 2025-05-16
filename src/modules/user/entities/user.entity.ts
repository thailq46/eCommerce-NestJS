import {Exclude} from 'class-transformer';
import {Request} from 'express';
import {EUserGender, EUserStatus} from 'src/base/shared/enum/common.enum';
import {
   Column,
   CreateDateColumn,
   DeleteDateColumn,
   Entity,
   Index,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity('user')
@Index('ft_index_username_email', ['usr_username', 'usr_email'], {fulltext: true})
export class User {
   @PrimaryGeneratedColumn()
   usr_id: number;

   @Column({unique: true, length: 30})
   usr_username: string;

   @Column({unique: true, length: 30})
   usr_email: string;

   @Column()
   @Exclude({toPlainOnly: true}) // Loại bỏ password khi serialize
   usr_password: string;

   @Column({type: 'int', default: EUserGender.Male})
   usr_gender: number;

   @Column({nullable: true, length: 15})
   usr_phone: string;

   @Column({nullable: true})
   usr_avatar: string;

   @Column({type: 'datetime', nullable: true})
   usr_date_of_birth: Date;

   @Column({type: 'int', nullable: true})
   usr_last_login_at: number;

   @Column({type: 'varchar', length: 12, nullable: true})
   usr_last_login_ip_at: string;

   @Column({type: 'int', nullable: true})
   usr_login_times: number;

   @Column({type: 'enum', enum: EUserStatus, default: EUserStatus.Pending})
   status: EUserStatus;

   @CreateDateColumn({type: 'datetime'})
   created_at: Date;

   @UpdateDateColumn({type: 'datetime'})
   updated_at: Date;

   @DeleteDateColumn({type: 'datetime', nullable: true})
   deleted_at: Date;

   @Index('idx_user_is_deleted')
   @DeleteDateColumn({type: 'boolean', default: false})
   is_deleted: boolean;
}

export type RequestUser = Request & {user: User};
