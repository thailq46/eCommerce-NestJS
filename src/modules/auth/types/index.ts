export interface TokenPayload {
   user_id: number;
   email: string;
   jit: string;
   token_type: TokenType;
   iat: number;
   exp: number;
}

export enum TokenType {
   AccessToken = 'access_token',
   RefreshToken = 'refresh_token',
}
