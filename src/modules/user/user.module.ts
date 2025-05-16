import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {User} from 'src/modules/user/entities/user.entity';
import {UserRepository} from 'src/modules/user/repositories';
import {UserController} from './user.controller';
import {UserService} from './user.service';

@Module({
   imports: [TypeOrmModule.forFeature([User])],
   controllers: [UserController],
   providers: [UserService, UserRepository],
   exports: [UserService],
})
export class UserModule {}
