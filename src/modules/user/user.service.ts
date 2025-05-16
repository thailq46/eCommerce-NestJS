import {BadRequestException, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {LoggingService} from 'src/base/logging';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {UpdateUserDto} from 'src/modules/user/dto/update-user.dto';
import {UserRepository} from 'src/modules/user/repositories';
import {CreateUserDto} from './dto/create-user.dto';

@Injectable()
export class UserService {
   constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository,
      private readonly loggingService: LoggingService,
   ) {}

   async create(createUserDto: CreateUserDto) {
      const {email, password, username, ...data} = createUserDto;
      const [isExistEmail, isExistUsername] = await Promise.all([
         this.userRepository.findByEmail(email),
         this.userRepository.findByUsername(username || null),
      ]);
      if (isExistEmail || isExistUsername) {
         throw new BadRequestException(`${isExistEmail ? 'Email' : 'Username'} đã tồn tại!`);
      }
      const hashPassword = this.userRepository.hashPassword(password);
      const user = this.userRepository.create({
         usr_email: email,
         usr_password: hashPassword,
         usr_username: username,
         ...data,
      });
      await this.userRepository.save(user).catch((err) => {
         this.loggingService.logger.default.error('Lỗi khi tạo tài khoản', err);
         throw new BadRequestException('Tạo tài khoản thất bại');
      });
      return {
         message: 'Tạo tài khoản thành công',
         data: user,
      };
   }

   async findAll(query: QuerySpecificationDto) {
      const {page = 1, limit = 10, search, filter, sort} = query;
      const offset = (page - 1) * limit;

      const whereConditions = ['is_deleted = 0'];
      const queryParams: any[] = [];

      if (search && search.trim() !== '') {
         const cleanSearch = search.trim();
         whereConditions.push(`MATCH(usr_username, usr_email) AGAINST(? IN BOOLEAN MODE)`);
         queryParams.push(cleanSearch);
      }

      if (filter && Object.keys(filter).length > 0) {
         if (filter.status !== undefined) {
            whereConditions.push('status = ?');
            const status = filter.status === 1 ? 'Active' : filter.status === 2 ? 'Pending' : null;
            queryParams.push(status);
         }
         if (filter.gender !== undefined) {
            whereConditions.push('usr_gender = ?');
            queryParams.push(filter.gender);
         }
      }

      const whereClause = whereConditions.join(' AND ');

      try {
         const [usersData, totalCount] = await Promise.all([
            this.userRepository.query(
               `
               SELECT pre.usr_id, usr_username, usr_email, usr_gender,
                  usr_phone, usr_avatar, usr_date_of_birth, status
               FROM (
               SELECT usr_id FROM user
               WHERE ${whereClause}
               ORDER BY usr_id ASC
               LIMIT ?, ?
               ) AS temp
               INNER JOIN user AS pre
               ON temp.usr_id = pre.usr_id
               ORDER BY usr_id ASC
            `,
               [...queryParams, offset, limit],
            ),
            this.userRepository.query(`SELECT COUNT(usr_id) AS total FROM user WHERE ${whereClause}`, queryParams),
         ]);
         const total = totalCount[0].total ? Number(totalCount[0].total) : 0;
         return {
            message: 'Lấy danh sách tài khoản thành công',
            data: {
               data: usersData,
               meta: {
                  total,
                  page: Number(page),
                  limit: Number(limit),
                  totalPages: Math.ceil(total / Number(limit)),
               },
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error('Lỗi khi lấy danh sách tài khoản', error);
         throw new BadRequestException('Không thể lấy danh sách tài khoản: ' + error.message);
      }
   }

   async findOne(id: number) {
      const user = await this.userRepository.findUserById(id);
      return {
         message: 'Lấy thông tin tài khoản thành công',
         data: user,
      };
   }

   async update(id: number, updateUserDto: UpdateUserDto) {
      const user = await this.userRepository.findUserById(id);
      if (!user) {
         throw new BadRequestException('Tài khoản không tồn tại');
      }
      await this.userRepository.update(id, updateUserDto).catch((err) => {
         this.loggingService.logger.default.error('Lỗi khi cập nhật tài khoản', err);
         throw new BadRequestException('Cập nhật tài khoản thất bại');
      });
      return {
         message: 'Cập nhật tài khoản thành công',
         data: await this.userRepository.findUserById(id),
      };
   }

   async remove(id: number) {
      const user = await this.userRepository.findUserById(id);
      if (!user) {
         throw new BadRequestException('Tài khoản không tồn tại');
      }
      await this.userRepository
         .update(id, {
            is_deleted: true,
            deleted_at: new Date(),
         })
         .catch((err) => {
            this.loggingService.logger.default.error('Lỗi khi xóa tài khoản', err);
            throw new BadRequestException('Xóa tài khoản thất bại');
         });
      return {
         message: 'Xóa tài khoản thành công',
         data: id,
      };
   }
}
