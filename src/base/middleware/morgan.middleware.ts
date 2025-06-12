import * as morgan from 'morgan';
import {IUser} from 'src/modules/user/types';

declare module 'http' {
   interface IncomingMessage {
      user: IUser;
      body?: any;
   }
}

morgan.token('user', (req) => {
   if (req.user) return req.user.usr_username;
   return 'Anonymous';
});

morgan.token('body', (req) => {
   const body = req.body || {};
   // Lọc các thông tin nhạy cảm
   if (body.password) body.password = '******';
   if (body.token) body.token = '******';
   if (body.refreshToken) body.refreshToken = '******';

   return JSON.stringify(body);
});

morgan.format('custom', (tokens, req, res) => {
   // tokens['remote-addr-cus'] = () => tokens['remote-addr'](req).padStart(29, ' ').substr(0, 29);
   // const frm = `ACCESS :date[iso] :remote-addr-cus | :user :method :url :status - :response-time ms`;
   const frm = `:remote-addr :user :method :url :status - :response-time ms :body`;
   const fn = morgan.compile(frm);
   return fn(tokens, req, res);
});

/**
 * 1. Morgan tạo ra chuỗi: (Example) 127.0.0.1 thailq POST /v1/auth/login 201 - 54.076 ms
 * 2. Chuỗi này được chuyển đến phương thức write của logger trong LoggingService._access()
 * 3. Log4js áp dụng layout access, chuyển đổi nó thành định dạng cuối cùng với timestamp và category
 */
export function useMorgan(logger) {
   return morgan('custom', {
      stream: logger,
   });
}
