// backend/src/env.ts
// Environment variable validation and loading
import { cleanEnv, str, num } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  COOKIE_SECRET: str({ default: 'your-cookie-secret' }),
  FRONTEND_URL: str(),
  EMAIL_HOST: str(),
  EMAIL_PORT: str(),
  EMAIL_SECURE: str(),
  EMAIL_SERVICE: str({ default: 'gmail' }), // e.g., 'gmail', 'outlook', etc.
  EMAIL_USER: str(),
  EMAIL_PASSWORD: str(),
  EMAIL_FROM: str(),
  TEAM_NAME: str({ default: 'Hivers5 Asteroids' }),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_REDIRECT_URI: str({ default: 'https://localhost:3000/auth/google/callback' })
});
export default env;