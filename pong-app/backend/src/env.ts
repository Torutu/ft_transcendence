// // backend/src/env.ts
// import { cleanEnv, str, num, url } from 'envalid';

// export default cleanEnv(process.env, {
//   // Required variables
//   DATABASE_URL: str(),
//   JWT_SECRET: str(),
  
//   // Optional with defaults
//   PORT: num({ default: 3000 }),
//   NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  
//   // Google 
//   GOOGLE_CLIENT_ID: str(),
//   GOOGLE_CLIENT_SECRET: str(),
//   GOOGLE_REDIRECT_URI: url(),
// });


// backend/src/env.ts
import { cleanEnv, str, num } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
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