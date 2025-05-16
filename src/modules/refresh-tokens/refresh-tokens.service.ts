import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RefreshToken} from 'src/modules/refresh-tokens/entities/refresh-token.entity';
import {Repository} from 'typeorm';
import {CreateRefreshTokenDto} from './dto/create-refresh-token.dto';

@Injectable()
export class RefreshTokensService {
   constructor(
      @InjectRepository(RefreshToken)
      private refreshTokenRepo: Repository<RefreshToken>,
   ) {}

   async create(payload: CreateRefreshTokenDto) {
      const refreshToken = this.refreshTokenRepo.create(payload);
      await this.refreshTokenRepo.save(refreshToken);
      return refreshToken;
   }

   async findOne(token: string) {
      const isExist = await this.refreshTokenRepo
         .createQueryBuilder('refresh_token')
         .where('refresh_token.token = :token', {token})
         .getOne();
      if (!isExist) {
         return null;
      }
      return isExist;
   }

   remove(token: string) {
      return this.refreshTokenRepo.delete({token});
   }
}
