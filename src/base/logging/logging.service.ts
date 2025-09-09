import { Injectable } from '@nestjs/common';
import { Appender, configure, getLogger, Layout } from 'log4js';
import { config } from 'src/base/config';

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
   // Dùng khi muốn khi gửi log lên Logstash -> ElasticSearch
   // logstash: {
   //    type: '@log4js-node/logstash-http',
   //    url: 'http://localhost:5044',
   //    application: 'logstash-log4js',
   //    logType: 'application',
   //    logChannel: 'node',
   //    timeout: 10000,
   // },
};

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
      const level = config.DEBUG ? 'debug' : 'info';

      configure({
         appenders: appenders,
         categories: {
            default: {
               // appenders: ['console', 'dateFile', 'logstash'],
               appenders: ['console', 'dateFile'],
               level: level,
               enableCallStack: true,
            },
            access: {
               // appenders: ['access', 'dateFile', 'logstash'],
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
   };
}
