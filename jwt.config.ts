import type { StringValue } from 'ms';
export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET! as string,
  refreshSecret: process.env.JWT_REFRESH_SECRET! as string,
  accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue
};