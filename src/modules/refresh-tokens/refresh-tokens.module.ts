import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RefreshToken} from 'src/modules/refresh-tokens/entities/refresh-token.entity';
import {RefreshTokensService} from './refresh-tokens.service';

@Module({
   imports: [TypeOrmModule.forFeature([RefreshToken])],
   providers: [RefreshTokensService],
   exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
