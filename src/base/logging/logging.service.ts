import {Injectable} from '@nestjs/common';
import {Appender, configure, Logger as FourLogger, getLogger, Layout} from 'log4js';
import {Logger, QueryRunner} from 'typeorm';

import {config} from 'src/base/config';
import {QueryDbError} from 'src/base/db/db.constant';

// Cấu hình Layouts (định dạng log)
const layouts: Record<string, Layout> = {
   /**
    * Định dạng log khi hiển thị trên console
    * - %p: level
    * - %d: date
    * - -6p: level có độ dài tối đa 6 ký tự
    * - %25.25f{2}: tên file với độ dài tối đa 25 ký tự, hiển thị 2 dấu chấm
    * - %-4.-4l: tên function với độ dài tối đa 4 ký tự, hiển thị 4 ký tự cuối
    * - %m: message
    * - %c: category
    * - %[%.6000m (%c)%]: message với độ dài tối đa 6000 ký tự
    * - %28.28x{remoteAddr}: địa chỉ IP của client với độ dài tối đa 28 ký tự
    * - %x{access}: message với độ dài tối đa 6000 ký tự
    */
   console: {
      type: 'pattern',
      pattern: '%-6p %d %25.25f{2}:%-4.-4l| %[%.6000m (%c)%]',
   },
   // Định dạng log khi hiển thị trên file (không có màu sắc)
   dateFile: {
      type: 'pattern',
      pattern: '%-6p %d %28.28f{2}:%-4.-4l| %m (%c)',
   },
   // Định dạng đặc biệt cho HTTP requests
   access: {
      type: 'pattern',
      pattern: 'ACCESS %d %20.20x{remoteAddr}  | %x{access} (%c)',
      tokens: {
         remoteAddr: function (logEvent) {
            let remoteAddr = logEvent.data.toString().split(' ', 1).pop();
            remoteAddr = remoteAddr?.replace(/^.*:/, '');
            remoteAddr = remoteAddr === '1' ? '127.0.0.1' : remoteAddr;
            return remoteAddr;
         },
         access: function (logEvent) {
            const messageParts = logEvent.data.toString().split(' ');

            // Lấy tất cả nội dung sau địa chỉ IP nhưng trước JSON
            const [, ...data] = messageParts;

            const jsonIndex = data.findIndex((part) => part.startsWith('{'));

            if (jsonIndex >= 0) {
               // Lấy phần trước JSON
               const beforeJson = data.slice(0, jsonIndex).join(' ');

               // Lấy phần JSON và làm sạch
               try {
                  const jsonPart = data.slice(jsonIndex).join(' ');
                  const jsonObj = JSON.parse(jsonPart);

                  // Định dạng JSON gọn gàng
                  const cleanJson = JSON.stringify(jsonObj);

                  return `${beforeJson} [Body: ${cleanJson}]`;
               } catch (e) {
                  // Nếu xử lý JSON lỗi, trả về chuỗi gốc
                  return data.join(' ');
               }
            }

            return data.join(' ');
         },
      },
   },
};

// Cấu hình Appenders (đầu ra log)
const appenders: Record<string, Appender> = {
   console: {
      type: 'console',
      layout: layouts.console,
   },
   dateFile: {
      type: 'dateFile',
      filename: 'logs/out.log',
      pattern: '-yyyy-MM-dd', // tạo file mới mỗi ngày (out-2025-03-24.log)
      alwaysIncludePattern: true, // QUAN TRỌNG: Luôn thêm pattern vào tên file
      keepFileExt: true, // giữ lại phần mở rộng của file
      compress: false, // Không nén file cũ
      layout: layouts.dateFile,
   },
   access: {
      type: 'console',
      layout: layouts.access,
   },
};

class DbLogger implements Logger {
   constructor(private logger: FourLogger) {}

   /**
    * Logs query and parameters used in it.(Ghi log câu truy vấn và tham số ở mức DEBUG)
    */
   logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
      this.logger.debug(`query=${query}` + (parameters ? ` parameters=${JSON.stringify(parameters)}` : ``));
   }

   /**
    * Logs query that is failed.
    *  + Log lỗi ở mức DEBUG
    *  + Nếu lỗi thuộc QueryDbError (lỗi đã biết) thì chỉ log WARNING
    *  + Các lỗi khác log ở mức ERROR với cả truy vấn và tham số
    */
   logQueryError(error: Error & {code: string}, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
      this.logger.debug(error);
      const errorMessage = error.message ? error.message : error;
      if (Object.values(QueryDbError).includes(error?.code)) return this.logger.warn(errorMessage);

      this.logger.error(errorMessage);
      this.logger.error(`query=${query} parameters=${JSON.stringify(parameters)}`);
   }

   /**
    * Logs query that is slow. (Ghi log các câu truy vấn chậm ở mức WARN)
    */
   logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
      this.logger.warn(`time=${time} query=${query} parameters=${JSON.stringify(parameters)}`);
   }

   /**
    * Logs events from the schema build process.
    */
   logSchemaBuild(message: string, queryRunner?: QueryRunner): any {}

   /**
    * Logs events from the migrations run process.
    */
   logMigration(message: string, queryRunner?: QueryRunner): any {}

   /**
    * Perform logging using given logger, or by default to the console.
    * Log has its own level and message.
    */
   log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
      this.logger[level](message);
   }
}

@Injectable()
export class LoggingService {
   log(message: any, arg1: string, arg2: any) {
      throw new Error('Method not implemented.');
   }
   /**
    * config logging
    * ________________________________________
    * | NODE_ENV | DEBUG true  | DEBUG false |
    * ---------------------------------------=
    * | dev      | debug       | info        |
    * | test     | debug       | off         |
    * | product  | info        | info        |
    * ----------------------------------------
    */
   constructor() {
      const isDev = config.NODE_ENV === config.DEV;
      const level = config.DEBUG ? 'debug' : 'info';

      configure({
         appenders: appenders,
         categories: {
            default: {
               appenders: ['console', 'dateFile'],
               level: level,
               enableCallStack: true,
            },
            access: {
               appenders: ['access', 'dateFile'],
               level: 'info',
               enableCallStack: true,
            },
         },
      });
   }

   getLogger = getLogger;

   // Tạo logger đặc biệt cho HTTP access log
   private _access = () => {
      const logger = this.getLogger('access');
      // Bọc method info của logger access trong một object với method write để tương thích với Express middleware morgan
      return {
         write: logger.info.bind(logger),
      };
   };

   logger = {
      default: getLogger('default'),
      access: this._access(),
      thirdParty: getLogger('thirdParty'),
   };

   getDbLogger(category: string) {
      return new DbLogger(this.getLogger(category));
   }
}
