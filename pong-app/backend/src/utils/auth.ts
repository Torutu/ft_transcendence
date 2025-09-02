// pong-app/backend/src/utils/auth.ts
// Authentication logic only
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';

// JWT functions
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};

// Password functions
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// 2FA functions
export const generateTwoFactorSecret = (email: string): speakeasy.GeneratedSecret => {
  const issuer = process.env.TEAM_NAME ?? 'Hivers5 Asteroids';
  const label = `${issuer}:${email}`;
  
  console.log("Issuer:", issuer, ", label: ", label);
  
  return speakeasy.generateSecret({ 
    name: label,
    issuer,
    length: 20 
  });
};

export const verifyTwoFactorToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
};