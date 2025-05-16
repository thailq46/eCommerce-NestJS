// import {Logger} from 'log4js';
// import {DataSource, Repository, SelectQueryBuilder} from 'typeorm';
// import {FindOneOptions} from 'typeorm/find-options/FindOneOptions';

// import {BadRequestException, NotFoundException} from '@nestjs/common';
// import {QueryDbError} from 'src/base/db/db.constant';
// import {BaseEntity} from 'src/base/model/model.entity';
// import {EntityId} from 'typeorm/repository/EntityId';

// export interface IServiceOptions {
//   idProperty?: string;
//   sort?: string[];
// }

// export interface IQueryOptions {
//   doesThrow?: boolean;
// }

// export class GenericService<E extends BaseEntity> {
//   protected readonly options: IServiceOptions;
//   private readonly defaultOptions: IServiceOptions = {
//     idProperty: 'id',
//     sort: ['-id'],
//   };

//   constructor(
//     protected readonly model,
//     protected readonly repository: Repository<E>,
//     protected readonly alias: string = 'base', // Tên table
//     protected readonly logger: Logger,
//     protected readonly dataSource: DataSource,
//     protected readonly serviceOptions?: IServiceOptions,
//   ) {
//     this.options = Object.assign(this.defaultOptions, serviceOptions);
//   }

//   /* Repository */
//   public getRepository(): Repository<E> {
//     return this.repository;
//   }

//   getQuery(alias: string = this.alias): SelectQueryBuilder<E> {
//     return this.repository.createQueryBuilder(alias);
//   }

//   find(options?: FindOneOptions<E>): Promise<E[]> {
//     return this.repository.find(Object.assign({order: {[String(this.options.idProperty)]: 'DESC'}}, options));
//   }

//   /* Handle */
//   protected getName(): string {
//     return this.alias.replace(/^\w/, (c) => c.toUpperCase());
//   }

//   protected handleDbError(error: any) {
//     switch (error.code) {
//       case QueryDbError.UNIQUE_VIOLATION:
//         throw new BadRequestException(error?.detail.replace(/['"()-]/gi, ''));

//       case QueryDbError.SYNTAX_ERROR:
//         this.logger.error(error);
//         throw new BadRequestException('Syntax error');

//       case QueryDbError.INVALID_TEXT_REPRESENTATION:
//         this.logger.error(error);
//         throw new BadRequestException('Invalid text input params');

//       case QueryDbError.FOREIGN_KEY_VIOLATION:
//         this.logger.error(error);
//         throw new BadRequestException('The data is protected, please delete the relevant data first');

//       default:
//         throw error;
//     }
//   }

//   returningColumns(excludeColumns?: string[]): string[] {
//     return GenericService.returningColumns(this.model, this.dataSource, excludeColumns);
//   }

//   static returningColumns(entity, dataSource: DataSource, excludeColumns?: string[]): string[] {
//     const columns = dataSource.getMetadata(entity).ownColumns.map((column) => column.propertyName);
//     if (excludeColumns) return columns.filter((item) => !excludeColumns.includes(item));
//     return columns;
//   }

//   /* Retrieve */
//   async getEntity(id: EntityId, queryOptions?: IQueryOptions): Promise<E | undefined> {
//     const query = this.getQuery();
//     query.andWhere(`${this.alias}.${this.options.idProperty} = :id`).setParameter('id', id);
//     const entity = await query.getOne().catch((e) => this.handleDbError(e));
//     if (entity) return entity;

//     if (!queryOptions?.doesThrow) throw new NotFoundException(this.getName() + ' not found');
//     return undefined;
//   }

//   async getById(id: EntityId, queryOptions?: IQueryOptions): Promise<E | undefined> {
//     return this.getEntity(id, queryOptions);
//   }
// }
