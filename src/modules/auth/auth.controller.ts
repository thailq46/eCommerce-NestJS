import {Body, Controller, Get, Post, Req, UseGuards} from '@nestjs/common';
import {Public, ResponseMessage} from 'src/base/decorators/customize.decorator';
import {AuthService} from 'src/modules/auth/auth.service';
import {LocalAuthGuard} from 'src/modules/auth/local-auth.guard';

@Controller('auth')
export class AuthController {
   constructor(private readonly authService: AuthService) {}

   @Public()
   @UseGuards(LocalAuthGuard)
   @Post('login')
   @ResponseMessage('Đăng nhập thành công')
   login(@Req() req) {
      return this.authService.login(req.user);
   }

   @Get('profile')
   getProfile(@Req() req) {
      return req.user;
   }

   @Post('logout')
   @ResponseMessage('Đăng xuất thành công')
   logout(@Body() body: {refreshToken: string}, @Req() req) {
      return this.authService.logout(body.refreshToken, req);
   }

   @Post('change-password')
   @ResponseMessage('Đổi mật khẩu thành công')
   changePassword(@Body() body: {oldPassword: string; newPassword: string}, @Req() req) {
      return this.authService.changePassword(body, req);
   }
}
