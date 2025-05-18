import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {LoggingService} from 'src/base/logging';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {Category} from 'src/modules/category/entities/category.entity';
import {DataSource, Repository} from 'typeorm';
import {CreateCategoryDto} from './dto/create-category.dto';
import {UpdateCategoryDto} from './dto/update-category.dto';

@Injectable()
export class CategoryService {
   constructor(
      @InjectRepository(Category)
      private readonly categoryRepo: Repository<Category>,
      private readonly loggingService: LoggingService,
      private readonly dataSource: DataSource,
   ) {}

   async create(payload: CreateCategoryDto) {
      const existingSlug = await this.categoryRepo.findOne({
         where: {cate_slug: payload.cate_slug, is_deleted: false},
      });
      if (existingSlug) {
         throw new BadRequestException('Slug đã tồn tại');
      }
      if (payload.parent_id) {
         const parentCate = await this.categoryRepo.findOne({
            where: {cate_id: payload.parent_id, is_deleted: false},
         });
         if (!parentCate) {
            throw new NotFoundException('Không tìm thấy danh mục cha');
         }
      }
      const newCategory = this.categoryRepo.create(payload);
      const savedCategory = await this.categoryRepo.save(newCategory).catch((err) => {
         this.loggingService.logger.default.error('Lỗi khi tạo danh mục', err);
         throw new BadRequestException('Tạo danh mục thất bại');
      });
      return {
         message: 'Tạo danh mục thành công',
         data: savedCategory,
      };
   }

   async update(id: number, payload: UpdateCategoryDto) {
      const existingCate = await this.categoryRepo.findOne({
         where: {cate_id: id, is_deleted: false},
      });

      if (!existingCate) {
         throw new NotFoundException('Không tìm thấy danh mục');
      }

      if (payload.cate_slug && payload.cate_slug !== existingCate.cate_slug) {
         const existingSlug = await this.categoryRepo.findOne({
            where: {cate_slug: payload.cate_slug, is_deleted: false},
         });
         if (existingSlug && existingSlug.cate_id !== id) {
            throw new BadRequestException('Slug đã tồn tại');
         }
      }

      if (payload.parent_id) {
         // Không cho phép đặt parent_id là chính nó
         if (payload.parent_id === id) {
            throw new BadRequestException('Danh mục không thể là danh mục cha của chính nó');
         }
         // Không cho phép đặt parent_id là một trong các danh mục con của nó (tránh tạo vòng lặp)
         if (payload.parent_id !== null) {
            const allChildren = await this.findAllChildrenIds(id);
            if (allChildren.includes(payload.parent_id)) {
               throw new BadRequestException('Không thể đặt danh mục con làm danh mục cha');
            }
            // Kiểm tra parent_id có tồn tại
            const parentExists = await this.categoryRepo.findOne({
               where: {cate_id: payload.parent_id, is_deleted: false},
            });
            if (!parentExists) {
               throw new BadRequestException('Danh mục cha không tồn tại');
            }
         }
      }

      await this.categoryRepo
         .update(id, {
            ...payload,
            updated_at: new Date(),
         })
         .catch((err) => {
            this.loggingService.logger.default.error('Lỗi khi cập nhật danh mục', err);
            throw new BadRequestException('Cập nhật danh mục thất bại');
         });

      return {
         message: 'Cập nhật danh mục thành công',
         data: await this.categoryRepo.findOne({
            where: {cate_id: id, is_deleted: false},
         }),
      };
   }

   async remove(id: number) {
      const existingCate = await this.categoryRepo.findOne({
         where: {cate_id: id, is_deleted: false},
      });

      if (!existingCate) {
         throw new NotFoundException('Không tìm thấy danh mục');
      }

      // Kiểm tra danh mục con
      const childCategories = await this.findChildCategories(id);
      if (childCategories.length > 0) {
         throw new BadRequestException('Không thể xóa danh mục. Vui lòng xóa các danh mục con trước.');
      }

      // Kiểm tra sản phẩm thuộc danh mục
      const hasProducts = await this.hasProducts(id);
      if (hasProducts) {
         throw new BadRequestException('Không thể xóa danh mục. Vui lòng xóa hoặc di chuyển các sản phẩm trước.');
      }

      await this.categoryRepo
         .update(id, {
            is_deleted: true,
            deleted_at: new Date(),
         })
         .catch((err) => {
            this.loggingService.logger.default.error('Lỗi khi xóa danh mục', err);
            throw new BadRequestException('Xóa danh mục thất bại');
         });

      return {
         message: 'Xóa danh mục thành công',
         data: id,
      };
   }

   async findAll(query: QuerySpecificationDto) {
      const {page = 1, limit = 10, search, filter, sort = []} = query;
      const offset = (page - 1) * limit;

      const queryBuilder = this.categoryRepo
         .createQueryBuilder('category')
         .where('category.is_deleted = :isDeleted', {isDeleted: false});

      if (search && search.trim() !== '') {
         queryBuilder.andWhere(
            '(category.cate_name LIKE :search OR category.cate_desc LIKE :search OR category.cate_slug LIKE :search)',
            {search: `%${search.trim()}%`},
         );
      }

      if (filter) {
         if (filter.parent_id !== undefined) {
            if (filter.parent_id === null || filter.parent_id === 'null') {
               queryBuilder.andWhere('category.parent_id IS NULL');
            } else {
               queryBuilder.andWhere('category.parent_id = :parentId', {parentId: filter.parent_id});
            }
         }
      }

      if (sort.length > 0) {
         sort.forEach((sortOption) => {
            const direction = sortOption.startsWith('-') ? 'DESC' : 'ASC';
            const field = sortOption.startsWith('-') ? sortOption.substring(1) : sortOption;

            // Map field names
            const fieldMap: Record<string, string> = {
               id: 'category.cate_id',
               name: 'category.cate_name',
               slug: 'category.cate_slug',
               createdAt: 'category.created_at',
               updatedAt: 'category.updated_at',
            };

            const dbField = fieldMap[field] || `category.${field}`;
            queryBuilder.addOrderBy(dbField, direction);
         });
      } else {
         // Mặc định sắp xếp theo ID tăng dần
         queryBuilder.orderBy('category.cate_id', 'ASC');
      }

      try {
         const [totalCount, categories] = await Promise.all([queryBuilder.getCount(), queryBuilder.getMany()]);

         queryBuilder.skip(offset).take(limit);

         // Thông tin cấp bậc và đếm số danh mục con
         const categoriesWithMeta = await Promise.all(
            categories.map(async (category) => {
               const childCount = await this.countChildCategories(category.cate_id);
               let level = 0;
               let parent: Category | null = null;

               if (category.parent_id) {
                  parent = await this.categoryRepo.findOne({
                     where: {cate_id: category.parent_id},
                     select: ['cate_id', 'cate_name', 'cate_slug'],
                  });
                  level = await this.getCategoryLevel(category.cate_id);
               }

               return {
                  ...category,
                  meta: {
                     childCount,
                     level,
                     parent,
                  },
               };
            }),
         );

         return {
            message: 'Lấy danh sách danh mục thành công',
            data: {
               data: categoriesWithMeta,
               meta: {
                  total: totalCount,
                  page: Number(page),
                  limit: Number(limit),
                  totalPages: Math.ceil(totalCount / Number(limit)),
               },
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error('Lỗi khi lấy danh sách danh mục', error);
         throw new BadRequestException('Không thể lấy danh sách danh mục');
      }
   }

   async findOne(id: number) {
      try {
         const category = await this.categoryRepo.findOne({
            where: {cate_id: id, is_deleted: false},
         });

         if (!category) {
            return {
               message: 'Không tìm thấy danh mục',
               data: null,
            };
         }

         let parent: Category | null = null;
         if (category.parent_id) {
            parent = await this.categoryRepo.findOne({
               where: {cate_id: category.parent_id},
               select: ['cate_id', 'cate_name', 'cate_slug'],
            });
         }

         const [childCount, level, children] = await Promise.all([
            this.countChildCategories(category.cate_id),
            // Xác định cấp bậc trong cây danh mục
            this.getCategoryLevel(category.cate_id),
            // Lấy danh sách con trực tiếp
            this.categoryRepo.find({
               where: {parent_id: category.cate_id, is_deleted: false},
               select: ['cate_id', 'cate_name', 'cate_slug'],
            }),
         ]);

         return {
            message: 'Lấy thông tin danh mục thành công',
            data: {
               ...category,
               meta: {
                  parent,
                  childCount,
                  level,
                  children,
               },
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Lỗi khi lấy thông tin danh mục ${id}`, error);
         throw new BadRequestException('Không thể lấy thông tin danh mục');
      }
   }

   // REPOSITORIES
   // Tìm tất cả ID của danh mục con (bao gồm cả con của con...)
   async findAllChildrenIds(categoryId: number): Promise<number[]> {
      const result: number[] = [];
      // Lấy danh sách con trực tiếp
      const directChildren = await this.categoryRepo.find({
         where: {parent_id: categoryId, is_deleted: false},
         select: ['cate_id'],
      });
      for (const child of directChildren) {
         result.push(child.cate_id);
         // Đệ quy để lấy con của con
         const grandchildren = await this.findAllChildrenIds(child.cate_id);
         result.push(...grandchildren);
      }
      return result;
   }

   // Tìm tất cả danh mục con trực tiếp
   async findChildCategories(parentId: number) {
      return this.categoryRepo.find({
         where: {parent_id: parentId, is_deleted: false},
      });
   }

   // Kiểm tra xem danh mục có sản phẩm không
   async hasProducts(categoryId: number): Promise<boolean> {
      try {
         const count = await this.dataSource.query(
            `SELECT COUNT(*) as count FROM spu
               WHERE product_category = ? AND is_deleted = 0`,
            [categoryId],
         );
         return count[0].count > 0;
      } catch (error) {
         return false;
      }
   }

   // Đếm số lượng danh mục con trực tiếp
   async countChildCategories(parentId: number) {
      return this.categoryRepo.count({
         where: {parent_id: parentId, is_deleted: false},
      });
   }

   // Xác định cấp bậc của danh mục trong cây
   async getCategoryLevel(categoryId: number): Promise<number> {
      let current = await this.categoryRepo.findOne({
         where: {cate_id: categoryId, is_deleted: false},
         select: ['cate_id', 'parent_id'],
      });
      if (!current) return 0;
      let level = 0;
      while (current && current.parent_id !== null) {
         level++;
         current = await this.categoryRepo.findOne({
            where: {cate_id: current.parent_id, is_deleted: false},
            select: ['cate_id', 'parent_id'],
         });
      }
      return level;
   }
}
