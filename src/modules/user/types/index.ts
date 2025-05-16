import {EUserGender, EUserStatus} from 'src/base/shared/enum/common.enum';

export interface IUser {
   usr_id: number;
   usr_email: string;
   usr_username: string;
   usr_phone: string | null;
   usr_gender: EUserGender;
   usr_avatar: string | null;
   usr_date_of_birth: Date | null;
   status: EUserStatus;
   usr_last_login_at: number;
   usr_last_login_ip_at: string | null;
   usr_login_times: number;
}
