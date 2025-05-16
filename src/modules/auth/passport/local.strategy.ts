import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {Strategy} from 'passport-local';
import {AuthService} from 'src/modules/auth/auth.service';
import {IUser} from 'src/modules/user/types';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
   constructor(private authService: AuthService) {
      super();
   }

   async validate(email: string, password: string): Promise<IUser> {
      const user = await this.authService.validateUser(email, password);
      if (!user) {
         throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng!!');
      }
      return user;
   }
}
