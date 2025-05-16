import {Injectable, NotFoundException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {InjectRepository} from '@nestjs/typeorm';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from 'src/base/config';
import {TokenPayload} from 'src/modules/auth/types';
import {UserRepository} from 'src/modules/user/repositories';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
   constructor(
      private configService: ConfigService,
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository,
   ) {
      super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         ignoreExpiration: false,
         secretOrKey: configService.ACCESS_SECRET,
      });
   }

   async validate(payload: TokenPayload) {
      const {user_id} = payload;
      const user = await this.userRepository.findUserById(user_id);
      if (!user) {
         throw new NotFoundException('Không tìm thấy người dùng');
      }
      return {
         usr_id: user_id,
         usr_email: user.usr_email,
         usr_username: user.usr_username,
         usr_phone: user.usr_phone,
         usr_avatar: user.usr_avatar,
         usr_date_of_birth: user.usr_date_of_birth,
         usr_last_login_at: user.usr_last_login_at,
         usr_last_login_ip_at: user.usr_last_login_ip_at,
         usr_login_times: user.usr_login_times,
         status: user.status,
      };
   }
}
