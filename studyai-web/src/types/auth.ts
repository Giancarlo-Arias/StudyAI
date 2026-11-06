export interface UserLogin {
  email: string;
  password: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
}