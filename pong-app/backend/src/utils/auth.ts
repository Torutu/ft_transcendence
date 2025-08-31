import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import speakeasy from 'speakeasy';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Email configuration
const transporter = nodemailer.createTransport({
  // host: process.env.EMAIL_HOST,
  // port: parseInt(process.env.EMAIL_PORT || '587'),
  // secure: process.env.EMAIL_SECURE === 'true',
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'outlook', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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
  // Key URI Format expects "Issuer:AccountName" as the label.
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

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}`,
    html: `<p>Your verification code is: <strong>${code}</strong></p>`,
  };

  await transporter.sendMail(mailOptions);
};

// Authentication middleware
export const authenticateUser = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<any | null> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    reply.status(401).send({ message: 'Authentication required' });
    return null;
  }

  try {
    const decoded = verifyToken(token) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      reply.status(401).send({ message: 'User not found' });
      return null;
    }
    return user;
  } catch (err) {
    reply.status(401).send({ message: 'Invalid token' });
    return null;
  }
};