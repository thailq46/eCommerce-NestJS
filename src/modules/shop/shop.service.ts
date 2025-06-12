import {BadRequestException, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {LoggingService} from 'src/base/logging';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {EUserStatus} from 'src/base/shared/enum/common.enum';
import {Shop} from 'src/modules/shop/entities/shop.entity';
import {IUser} from 'src/modules/user/types';
import {Repository} from 'typeorm';
import {CreateShopDto} from './dto/create-shop.dto';
import {UpdateShopDto} from './dto/update-shop.dto';

@Injectable()
export class ShopService {
   constructor(
      @InjectRepository(Shop)
      private readonly shopRepo: Repository<Shop>,
      private readonly loggingService: LoggingService,
   ) {}

   async create({data, user}: {data: CreateShopDto; user: IUser}) {
      if (user.status === EUserStatus.Pending) {
         throw new BadRequestException('Tài khoản của bạn chưa được duyệt');
      }
      if (user.status === EUserStatus.Block) {
         throw new BadRequestException('Tài khoản của bạn đã bị khóa');
      }
      const hasShop = await this.shopRepo
         .createQueryBuilder('shop')
         .where('shop.owner_id = :owner_id', {owner_id: user.usr_id})
         .andWhere('shop.is_deleted = 0')
         .getRawOne();

      if (hasShop) {
         throw new BadRequestException('Tài khoản của bạn đã có shop');
      }

      const shop = this.shopRepo.create({
         ...data,
         owner_id: user.usr_id,
      });

      const savedShop = await this.shopRepo.save(shop).catch((err) => {
         this.loggingService.logger.default.error('Lỗi khi tạo shop', err);
         throw new BadRequestException('Tạo shop không thành công');
      });

      return {
         message: 'Tạo shop thành công',
         data: savedShop,
      };
   }

   async update(id: number, updateShopDto: UpdateShopDto) {
      const shop = await this.findShopById(id);
      if (!shop) {
         throw new BadRequestException('Không tìm thấy shop');
      }

      await this.shopRepo
         .update(id, {
            ...updateShopDto,
            updated_at: new Date(),
         })
         .catch((err) => {
            this.loggingService.logger.default.error('Lỗi khi cập nhật shop', err);
            throw new BadRequestException('Cập nhật shop không thành công');
         });

      return {
         message: 'Cập nhật shop thành công',
         data: await this.findShopById(id),
      };
   }

   async remove(id: number) {
      const shop = await this.findShopById(id);
      if (!shop) {
         throw new BadRequestException('Không tìm thấy shop');
      }
      await this.shopRepo
         .update(id, {
            is_deleted: true,
            deleted_at: new Date(),
         })
         .catch((err) => {
            this.loggingService.logger.default.error('Lỗi khi xóa shop', err);
            throw new BadRequestException('Xóa shop không thành công');
         });
      return {
         message: 'Xóa shop thành công',
         data: id,
      };
   }

   async findAll(query: QuerySpecificationDto) {
      const {page = 1, limit = 10, search, filter, sort = []} = query;
      const offset = (page - 1) * limit;

      const queryBuilder = this.shopRepo
         .createQueryBuilder('s')
         .leftJoin('user', 'u', 's.owner_id = u.usr_id')
         .where('s.is_deleted = 0')
         .andWhere('u.is_deleted = 0')
         .andWhere('u.status = :status', {status: EUserStatus.Active});

      if (sort && sort.length > 0) {
         sort.forEach((sortOption) => {
            const direction = sortOption.startsWith('-') ? 'DESC' : 'ASC';
            const field = sortOption.startsWith('-') ? sortOption.substring(1) : sortOption;
            const fieldMap: Record<string, string> = {
               id: 's.shop_id',
               name: 's.shop_name',
               createdAt: 's.created_at',
               updatedAt: 's.updated_at',
            };
            const dbField = fieldMap[field] || `s.${field}`;
            queryBuilder.addOrderBy(dbField, direction);
         });
      } else {
         queryBuilder.orderBy('s.shop_id', 'ASC');
      }

      queryBuilder.select([
         's.shop_id AS shop_id',
         's.shop_name AS shop_name',
         's.shop_desc AS shop_desc',
         's.shop_address AS shop_address',
         's.shop_avatar AS shop_avatar',
         's.shop_banner AS shop_banner',
         's.owner_id AS owner_id',
         'u.usr_id AS usr_id',
         'u.usr_username AS usr_username',
         'u.usr_email AS usr_email',
         'u.usr_phone AS usr_phone',
         'u.usr_avatar AS usr_avatar',
         'u.usr_date_of_birth AS usr_date_of_birth',
         'u.status AS status',
         'u.usr_gender AS gender',
      ]);

      const [totalCount, shops] = await Promise.all([queryBuilder.getCount(), queryBuilder.getRawMany()]);
      queryBuilder.offset(offset).limit(limit);

      const formattedShops = shops.map((shop) => {
         const {
            usr_id,
            usr_username,
            usr_email,
            usr_phone,
            usr_avatar,
            usr_date_of_birth,
            status,
            gender,
            ...shopData
         } = shop;

         return {
            ...shopData,
            owner: {
               usr_id,
               usr_username,
               usr_email,
               usr_phone,
               usr_avatar,
               usr_date_of_birth,
               status,
               gender,
            },
         };
      });

      return {
         message: 'Lấy danh sách shop thành công',
         data: {
            data: formattedShops,
            meta: {
               total: totalCount,
               page: Number(page),
               limit: Number(limit),
               totalPages: Math.ceil(totalCount / Number(limit)),
            },
         },
      };
   }

   async findOne(id: number) {
      const shop = await this.shopRepo
         .createQueryBuilder('s')
         .leftJoin('user', 'u', 's.owner_id = u.usr_id')
         .where('s.shop_id = :id', {id})
         .andWhere('s.is_deleted = 0')
         .andWhere('u.status = :status', {status: EUserStatus.Active})
         .andWhere('u.is_deleted = 0')
         .select([
            's.shop_id AS shop_id',
            's.shop_name AS shop_name',
            's.shop_desc AS shop_desc',
            's.shop_address AS shop_address',
            's.shop_avatar AS shop_avatar',
            's.shop_banner AS shop_banner',
            's.owner_id AS owner_id',
            'u.usr_id AS usr_id',
            'u.usr_username AS usr_username',
            'u.usr_email AS usr_email',
            'u.usr_phone AS usr_phone',
            'u.usr_avatar AS usr_avatar',
            'u.usr_date_of_birth AS usr_date_of_birth',
            'u.status AS status',
            'u.usr_gender AS gender',
         ])
         .getRawOne();
      if (!shop) {
         return {
            message: 'Không tìm thấy shop',
            data: null,
         };
      }
      const {usr_id, usr_username, usr_email, usr_phone, usr_avatar, usr_date_of_birth, status, gender, ...data} = shop;
      return {
         message: 'Lấy thông tin shop thành công',
         data: {
            ...data,
            owner: {
               usr_id,
               usr_username,
               usr_email,
               usr_phone,
               usr_avatar,
               usr_date_of_birth,
               status,
            },
         },
      };
   }

   // REPOSITORY
   async findShopById(id: number): Promise<Shop | null> {
      const shop = await this.shopRepo
         .createQueryBuilder('s')
         .where('s.shop_id = :id', {id})
         .andWhere('s.is_deleted = 0')
         .select(['shop_id', 'shop_name', 'shop_desc', 'shop_address', 'shop_avatar', 'shop_banner', 'owner_id'])
         .getRawOne();
      if (!shop) {
         return null;
      }
      return shop;
   }

   async findShopByOwnerId(id: number): Promise<Shop | null> {
      const shop = await this.shopRepo
         .createQueryBuilder('s')
         .where('s.owner_id = :id', {id})
         .andWhere('s.is_deleted = 0')
         .select(['shop_id', 'shop_name', 'shop_desc', 'shop_address', 'shop_avatar', 'shop_banner', 'owner_id'])
         .getRawOne();
      if (!shop) {
         return null;
      }
      return shop;
   }
}
