// import {castArray} from 'lodash';
// import {FetchUtils} from 'src/base/api/service/fetch.service';
// import {GenericService} from 'src/base/api/service/generic.service';
// import {BaseEntity} from 'src/base/model/model.entity';
// import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
// import {randomAlphabet} from 'src/base/utils/functions';
// import {Brackets, ObjectLiteral, SelectQueryBuilder} from 'typeorm';

// export class ListService<E extends BaseEntity> extends GenericService<E> {
//    /* List */
//    /**
//     * Lấy tổng số bản ghi trong bảng
//     * @returns Tổng số bản ghi
//     */
//    async getTotalRows(): Promise<number> {
//       const {rowsCount} = await this.repository
//          .createQueryBuilder(this.alias)
//          .select(`count(*)`, 'rowsCount')
//          .getRawOne();
//       return Number(rowsCount);
//    }

//    /**
//     * Lấy tất cả bản ghi theo điều kiện truy vấn (không phân trang)
//     * @param queryDto Tham số truy vấn
//     * @returns Danh sách các bản ghi thỏa mãn điều kiện
//     */
//    async list(queryDto: QuerySpecificationDto = new QuerySpecificationDto()): Promise<E[] | undefined> {
//       try {
//          const query = await this.prepareFindAllQuery(queryDto);
//          const disablePageQuery = this._processFetch(query, Object.assign(queryDto, {disablePagination: true}));
//          const entities = await disablePageQuery.getMany();
//          return await this.extendFindAllResults(entities);
//       } catch (e) {
//          this.handleDbError(e);
//       }
//    }

//    /**
//     * Lấy dữ liệu có phân trang theo điều kiện truy vấn
//     * @param queryDto Tham số truy vấn và phân trang
//     * @param customQuery Truy vấn tùy chỉnh (nếu cần)
//     * @returns Dữ liệu phân trang kèm metadata
//     */
//    async listWithPage(
//       queryDto: QuerySpecificationDto = new QuerySpecificationDto(),
//       customQuery?: SelectQueryBuilder<E>,
//    ) {
//       try {
//          const query = customQuery
//             ? await this.prepareFindAllQuery(queryDto, customQuery)
//             : await this.prepareFindAllQuery(queryDto);

//          const pageQuery = this._processFetch(query, queryDto);

//          const [entities, totalItems] = await pageQuery.getManyAndCount();
//          const extendFindAllResults = await this.extendFindAllResults(entities);
//          const totalPages = totalItems / Number(queryDto.page);

//          return {
//             data: extendFindAllResults,
//             meta: {
//                totalItems: totalItems,
//                totalPages: Math.ceil(totalPages),
//                currentPage: Number(queryDto.limit),
//             },
//          };
//       } catch (e) {
//          this.handleDbError(e);
//       }
//    }

//    /* Helper */
//    /**
//     * Chuẩn bị truy vấn cơ bản dựa trên các điều kiện lọc và tìm kiếm
//     * @param queryDto Tham số truy vấn
//     * @param customQuery Truy vấn tùy chỉnh (nếu cần)
//     * @returns SelectQueryBuilder đã được cấu hình
//     */
//    async prepareFindAllQuery(
//       queryDto: QuerySpecificationDto,
//       customQuery?: SelectQueryBuilder<E>,
//    ): Promise<SelectQueryBuilder<E>> {
//       const query = customQuery ?? this.repository.createQueryBuilder(this.alias);
//       const queryWithFilters = this.applyFilters(query, queryDto?.filter);
//       return this.applySearch(queryWithFilters, queryDto);
//    }

//    /**
//     * Mở rộng kết quả truy vấn (có thể ghi đè trong lớp con)
//     * @param entities Danh sách các entity truy vấn được
//     * @returns Danh sách entities đã được xử lý
//     */
//    async extendFindAllResults(entities: E[]): Promise<E[]> {
//       return entities;
//    }

//    /**
//     * Xử lý các tùy chọn fetch trong truy vấn (phân trang, sắp xếp, chọn trường)
//     * @param query Truy vấn cần xử lý
//     * @param queryDto Tham số truy vấn
//     * @returns SelectQueryBuilder đã được cấu hình
//     */
//    protected _processFetch(query: SelectQueryBuilder<E>, queryDto: QuerySpecificationDto = {}): SelectQueryBuilder<E> {
//       return FetchUtils.processFetchSpecification<E>(query, this.alias, queryDto);
//    }

//    /* Sort */

//    /* Search */

//    /**
//     * Áp dụng điều kiện tìm kiếm vào truy vấn
//     * @param query Truy vấn cần áp dụng điều kiện
//     * @param params Tham số tìm kiếm
//     * @returns SelectQueryBuilder đã được áp dụng điều kiện tìm kiếm
//     */
//    applySearch(query: SelectQueryBuilder<E>, {searchFields, search}: QuerySpecificationDto): SelectQueryBuilder<E> {
//       if (searchFields && search) {
//          // Brackets giúp tạo ra một nhóm các điều kiện trong câu query
//          query.andWhere(
//             new Brackets((qb) => {
//                searchFields.forEach((key) => {
//                   // Kiểm tra nếu key có chứa dấu chấm (.) ["user.name", "user.email"] hay ["name", "email"]
//                   if (RegExp(/\.(?=[A-Za-z])/).exec(key)) {
//                      qb.orWhere(`LOWER(${key}) LIKE LOWER(:search)`, {
//                         search: `%${search}%`,
//                      });
//                   } else {
//                      qb.orWhere(`LOWER(${this.alias}.${key}) LIKE LOWER(:search)`, {
//                         search: `%${search}%`,
//                      });
//                   }
//                   // MATCH ... AGAINST chỉ hoạt động nếu cột đã được INDEX kiểu FULLTEXT.
//                   // Nếu mà bắt tìm kiếm kiểu 'toanbn' mà muốn chỉ gõ oan cũng phải ra thì chả có cách nào ngoài LIKE cả
//                   // if (RegExp(/\.(?=[A-Za-z])/).exec(key)) {
//                   //   qb.orWhere(`MATCH(${key}) AGAINST (:search)`, {
//                   //     search: search,
//                   //   });
//                   // } else {
//                   //   qb.orWhere(`MATCH(${this.alias}.${key}) AGAINST (:search)`, {
//                   //     search: search,
//                   //   });
//                   // }
//                });
//             }),
//          );
//       }
//       return query;
//    }

//    /* Filter */
//    /**
//     * Áp dụng các điều kiện lọc vào truy vấn
//     * @param query Truy vấn cần áp dụng điều kiện
//     * @param filters Các điều kiện lọc
//     * @returns SelectQueryBuilder đã được áp dụng điều kiện lọc
//     */
//    applyFilters(query: SelectQueryBuilder<E>, filters?: Record<string, any>): SelectQueryBuilder<E> {
//       return this._processFilterConditions(query, filters ?? {}, Object.keys(filters || {}));
//    }

//    /**
//     * Xử lý tất cả các điều kiện lọc và áp dụng vào truy vấn
//     * @param query Truy vấn cần xử lý
//     * @param filters Đối tượng chứa các điều kiện lọc
//     * @param filterKeys Danh sách các khóa lọc
//     * @returns SelectQueryBuilder đã được áp dụng điều kiện
//     */
//    private _processFilterConditions(
//       query: SelectQueryBuilder<E>,
//       filters: Record<string, any>,
//       filterKeys: string[],
//    ): SelectQueryBuilder<E> {
//       /**
//        *  filter: { status: 'active', is_deleted: false }
//        *  => Object.entries(filters) = [['status', 'active'], ['is_deleted', false]]
//        */
//       if (filters) {
//          Object.entries(filters)
//             .filter((item) => filterKeys.includes(item[0]))
//             .forEach((item) => this._applySingleFilterCondition(query, item));
//       }
//       return query;
//    }

//    /**
//     * Xử lý và áp dụng một điều kiện lọc đơn lẻ vào truy vấn
//     * @param query Truy vấn cần áp dụng điều kiện
//     * @param filterPair Cặp khóa-giá trị điều kiện lọc
//     * @returns SelectQueryBuilder đã được áp dụng điều kiện
//     */
//    private _applySingleFilterCondition(
//       query: SelectQueryBuilder<E>,
//       [filterKey, filterValues]: [string, any],
//    ): SelectQueryBuilder<E> {
//       // eslint-disable-next-line prefer-const
//       let [key, suffix] = filterKey.split('_');
//       suffix = suffix?.toUpperCase();

//       if (filterValues === '') return query;

//       const {sqlRaw, queryParams} = (() => {
//          let sqlRaw: string;
//          let queryParams: ObjectLiteral;
//          const randomKey: string = randomAlphabet(10);

//          if (suffix === 'IN') {
//             sqlRaw = `${this.alias}.${key} IN (:...${randomKey})`;
//             queryParams = {[randomKey]: castArray(filterValues)};
//             return {sqlRaw, queryParams};
//          }

//          if (suffix === 'RANGE') {
//             const randomEndDateKey: string = randomAlphabet(10);
//             sqlRaw = `${this.alias}.${key} between :${randomKey} and :${randomEndDateKey}`;
//             queryParams = {
//                [randomKey]: filterValues[0],
//                [randomEndDateKey]: filterValues[1],
//             };
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'GTE') {
//             sqlRaw = `${this.alias}.${key} >= :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'LTE') {
//             sqlRaw = `${this.alias}.${key} <= :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'GT') {
//             sqlRaw = `${this.alias}.${key} > :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'LT') {
//             sqlRaw = `${this.alias}.${key} < :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'DAY') {
//             sqlRaw = `date_part('day',"${this.alias}"."${key}") = :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'MONTH') {
//             sqlRaw = `date_part('month',"${this.alias}"."${key}") = :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'YEAR') {
//             sqlRaw = `date_part('year',"${this.alias}"."${key}") = :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }
//          if (suffix === 'CONTAINS') {
//             sqlRaw = `${this.alias}.${key} LIKE :${randomKey}`;
//             queryParams = {[randomKey]: `%${filterValues}%`};
//             return {sqlRaw, queryParams};
//          }
//          if (filterKey.includes('.')) {
//             sqlRaw = `${filterKey} = :${randomKey}`;
//             queryParams = {[randomKey]: filterValues};
//             return {sqlRaw, queryParams};
//          }

//          sqlRaw = `${this.alias}.${filterKey} = :${randomKey}`;
//          queryParams = {[randomKey]: filterValues};
//          return {sqlRaw, queryParams};
//       })();

//       query.andWhere(sqlRaw, queryParams);
//       return query;
//    }
// }
