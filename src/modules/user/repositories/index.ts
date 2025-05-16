import {Injectable} from '@nestjs/common';
import {createHash} from 'crypto';
import {User} from 'src/modules/user/entities/user.entity';
import {DataSource, Repository} from 'typeorm';

@Injectable()
export class UserRepository extends Repository<User> {
   constructor(private dataSource: DataSource) {
      super(User, dataSource.createEntityManager());
   }

   sha256(content: string): string {
      return createHash('sha256').update(content).digest('hex');
   }

   hashPassword(password: string): string {
      return this.sha256(password + 'secret_password');
   }

   async findByEmail(email: string): Promise<User | null> {
      const user = await this.createQueryBuilder('user')
         .where('user.usr_email = :email', {email})
         .andWhere('user.is_deleted = :is_deleted', {is_deleted: 0})
         .select([
            'usr_id',
            'usr_email',
            'usr_password',
            'usr_username',
            'usr_gender',
            'usr_phone',
            'usr_avatar',
            'usr_date_of_birth',
            'usr_last_login_at',
            'usr_last_login_ip_at',
            'usr_login_times',
            'status',
         ])
         .getRawOne();
      if (!user) {
         return null;
      }
      return user;
   }

   async findByUsername(username: string | null): Promise<User | null> {
      const user = await this.createQueryBuilder('user')
         .where('user.usr_username = :username', {username})
         .andWhere('user.is_deleted = :is_deleted', {is_deleted: 0})
         .select([
            'usr_id',
            'usr_email',
            'usr_password',
            'usr_username',
            'usr_gender',
            'usr_phone',
            'usr_avatar',
            'usr_date_of_birth',
            'usr_last_login_at',
            'usr_last_login_ip_at',
            'usr_login_times',
            'status',
         ])
         .getRawOne();
      if (!user) {
         return null;
      }
      return user;
   }

   async findPasswordById(user_id: number): Promise<string | null> {
      const user = await this.createQueryBuilder('user')
         .select('user.usr_password', 'password')
         .where('user.id = :user_id', {user_id})
         .andWhere('user.is_deleted = :is_deleted', {is_deleted: 0})
         .getRawOne();
      if (!user) {
         return null;
      }
      return user?.password;
   }

   async findUserById(user_id: number): Promise<User | null> {
      const user = await this.createQueryBuilder('user')
         .where('user.usr_id = :usr_id', {usr_id: user_id})
         .andWhere('user.is_deleted = :is_deleted', {is_deleted: 0})
         .select([
            'usr_id',
            'usr_email',
            'usr_password',
            'usr_username',
            'usr_gender',
            'usr_phone',
            'usr_avatar',
            'usr_date_of_birth',
            'usr_last_login_at',
            'usr_last_login_ip_at',
            'usr_login_times',
            'status',
         ])
         .getRawOne();
      if (!user) {
         return null;
      }
      return user;
   }
}
