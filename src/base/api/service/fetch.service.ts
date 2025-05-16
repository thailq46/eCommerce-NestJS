// import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
// import {ObjectLiteral, SelectQueryBuilder} from 'typeorm';

// type SortDirection = 'ASC' | 'DESC';

// export class FetchUtils {
//    static processFetchSpecification<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {fields, omitFields, page = 1, limit = 10, disablePagination = false, sort}: QuerySpecificationDto = {
//          fields: undefined,
//          omitFields: undefined,
//          filter: undefined,
//          page: 1,
//          limit: 10,
//          disablePagination: false,
//          sort: undefined,
//       },
//    ) {
//       // const queryWithIncludedEntities = this.addIncludedEntities(query, aliasTable, {include: include || []});
//       const queryWithSparseFieldsets = this.addFields(query, aliasTable, {
//          fields: fields || [],
//          omitFields: omitFields || [],
//       });
//       const queryWithSorting = this.addSorting(queryWithSparseFieldsets, aliasTable, {sort: sort || []});
//       const queryWithPagination = disablePagination
//          ? queryWithSorting
//          : this.addPagination(queryWithSorting, aliasTable, {
//               pageNumber: page,
//               pageSize: limit,
//            });

//       return queryWithPagination;
//    }

//    /**
//     * Wrapper over processFetchSpecification(), for single entities.
//     */
//    static processSingleEntityFetchSpecification<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {
//          fields = undefined,
//          omitFields = undefined,
//          filter = undefined,
//       }: Pick<QuerySpecificationDto, 'fields' | 'omitFields' | 'filter'> = {
//          fields: undefined,
//          omitFields: undefined,
//          filter: undefined,
//       },
//    ) {
//       return this.processFetchSpecification(query, aliasTable, {
//          fields,
//          omitFields,
//          filter,
//          disablePagination: true,
//          page: undefined,
//          limit: undefined,
//       });
//    }

//    static addFields<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {fields = [], omitFields = []}: {fields?: string[]; omitFields?: string[]},
//    ): SelectQueryBuilder<T> {
//       if (fields?.length > 0) {
//          query.select(fields.map((f) => `${aliasTable}.${f}`));
//       } else if (omitFields?.length > 0) {
//          // Nếu có omitFields, lấy tất cả trường trừ các trường bị loại trừ
//          const metadata = query.expressionMap.mainAlias?.metadata;
//          if (metadata) {
//             // Lấy tất cả tên cột từ metadata
//             const allColumns = metadata.columns.map((col) => col.propertyName);
//             // Lọc ra các cột không nằm trong omitFields
//             const selectedColumns = allColumns.filter((col) => !omitFields.includes(col));
//             if (selectedColumns.length > 0) {
//                query.select(selectedColumns.map((col) => `${aliasTable}.${col}`));
//             }
//          }
//       }
//       return query;
//    }

//    static addIncludedEntities<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {include}: {include: string[]},
//    ) {
//       /**
//        * Select entities to be included as per fetch specification.
//        */
//       if (include && include.length > 0) {
//          include.forEach((inc) => {
//             const parts = inc.split('.');
//             let lastPart: string | null = null;
//             let completed = '';
//             if (parts.length > 1) {
//                parts.forEach((element, index) => {
//                   if (index > 0) {
//                      completed += '.';
//                   }
//                   completed += element;
//                   const alias = completed.replace('.', '_');
//                   if (include.indexOf(completed) === -1 || completed === inc) {
//                      if (index === 0) {
//                         query.leftJoinAndSelect(`${aliasTable}.${element}`, alias);
//                      } else {
//                         query.leftJoinAndSelect(`${lastPart}.${element}`, alias);
//                      }
//                   }

//                   lastPart = alias;
//                });
//             } else {
//                query.leftJoinAndSelect(`${aliasTable}.${inc}`, inc);
//             }
//          });
//       }
//       return query;
//    }

//    static addSorting<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {sort = []}: {sort: string[]},
//    ) {
//       if (sort) {
//          sort.map((s) => {
//             const sortByColumn = s.replace(/^[+-]/, '');
//             // if the first character is '-', sort descending; otherwise, sort ascending
//             const sortDirection: SortDirection = RegExp(/^-/).exec(s) ? 'DESC' : 'ASC';
//             query.addOrderBy(`${aliasTable}.${sortByColumn}`, sortDirection);
//          });
//       }

//       return query;
//    }

//    static addPagination<T extends ObjectLiteral>(
//       query: SelectQueryBuilder<T>,
//       aliasTable: string,
//       {pageSize, pageNumber}: {pageSize: number; pageNumber: number},
//    ) {
//       query.take(pageSize);
//       query.skip(pageSize * (pageNumber - 1));
//       return query;
//    }
// }
