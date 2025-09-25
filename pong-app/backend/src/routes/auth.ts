// pong-app/backend/src/routes/auth.ts
// Authentication routes only
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import env from '../env';
import { hashPassword, comparePasswords, generateToken, verifyToken, generateTwoFactorSecret, verifyTwoFactorToken } from '../utils/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { OAuth2Client } from 'google-auth-library';

// Initialize Google OAuth client
const oauth2ClientOptions = {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI
};

if (!oauth2ClientOptions.clientId || !oauth2ClientOptions.clientSecret || !oauth2ClientOptions.redirectUri) {
  throw new Error('Google OAuth client configuration is missing. Please check your environment variables.');
}

export const client = new OAuth2Client(oauth2ClientOptions);

interface AuthRoutesOptions {
  prisma: PrismaClient;
}

export default function authRoutes(fastify: FastifyInstance, options: AuthRoutesOptions) {
  const { prisma } = options;

  // Helper function to generate random code
  const generateRandomCode = (length = 6): string => {
    return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)).toString();
  };

  const generatePasswordResetToken = (): string => {
    return randomBytes(32).toString('hex');
  };

  // Helper function to set secure HTTPOnly cookie
  const setAuthCookie = (reply: FastifyReply, token: string) => {
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    });
  };

  // Helper function to clear auth cookie
  const clearAuthCookie = (reply: FastifyReply) => {
    reply.clearCookie('authToken', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    });
  };

  // Login endpoint
  fastify.post<{ Body: { name: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'password'],
          properties: {
            name: { type: 'string', minLength: 2 },
            password: { type: 'string', minLength: 6 }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, password } = request.body as { name: string; password: string };

      try {
        const user = await prisma.user.findUnique({ where: { name } });
        
        if (!user || !user.password) {
          return reply.status(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          });
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return reply.status(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          });
        }

        if (!user.twoFactorSecret) {
          return reply.status(403).send({
            error: 'INVALID_TWOFACTOR_SECRET',
            message: 'Invalid 2 factor secret'
          });
        }

        if (!user.twoFactorURL) {
          return reply.status(403).send({
            error: 'INVALID_TWOFACTOR_URL',
            message: 'Invalid 2 factor URL'
          });
        }
        
        const totp_url = user.twoFactorRegistered ? null : user.twoFactorURL;
        return reply.send({
          requires2FA: true,
          userId: user.id,
          message: 'Two-factor authentication required',
          totp_url
        });

      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.'
        });
      }
    }
  );

  // Register endpoint
  fastify.post<{ Body: { email: string; password: string; name: string } }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string', minLength: 2 }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name } = request.body as { email: string; password: string; name: string };

      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return reply.status(400).send({
            error: 'USER_EXISTS',
            message: 'Email already in use'
          });
        }

        // Create user
        const hashedPassword = await hashPassword(password);

        const twoFactorSecret = generateTwoFactorSecret(email);
        if (twoFactorSecret.otpauth_url === undefined) {
          return reply.status(500).send({
            error: '2FA_ERROR',
            message: 'Failed to generate two-factor authentication secret'
          });
        }

        const user = await prisma.user.create({
          data: { 
            email, 
            password: hashedPassword, 
            name,
            isVerified: false,
            twoFactorSecret: twoFactorSecret.base32, 
            twoFactorURL: twoFactorSecret.otpauth_url
          }
        });

        // Create verification code
        const verificationCode = await prisma.verificationCode.create({
          data: {
            code: generateRandomCode(),
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });

        // Send verification email
        await sendVerificationEmail(user.email, verificationCode.code);

        return reply.status(201).send({
          success: true,
          message: 'Verification email sent',
          requiresVerification: true,
          userId: user.id,
          email: user.email
        });

      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.'
        });
      }
    }
  );

  // Email verification endpoint
  fastify.post<{ Body: { userId: string; code: string } }>(
  '/auth/verify-otp',
  {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'code'],
        properties: {
          userId: { type: 'string' },
          code: { type: 'string', minLength: 6, maxLength: 6 }
        }
      }
    }
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, code } = request.body as { userId: string; code: string };

    try {
      // Find and validate verification code
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          userId,
          code,
          expiresAt: { gt: new Date() },
          usedAt: null
        }
      });

      if (!verificationCode) {
        return reply.status(400).send({
          error: 'INVALID_CODE',
          message: 'Invalid or expired verification code'
        });
      }

      await prisma.verificationCode.deleteMany({
        where: {
          userId,
        }
      });

      // Verify user (set isVerified to true)
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true }
      });

      // ⭐⭐ IMPORTANT: DO NOT set auth cookie here ⭐⭐
      // The user should login normally after email verification
      // const token = generateToken(user.id);
      // setAuthCookie(reply, token);

      // Return response with TOTP URL but don't log the user in
      return reply.send({
        success: true,
        message: 'Email verified successfully. Please login to continue.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: true
        },
        totp_url: user.twoFactorURL
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'VERIFICATION_FAILED',
        message: 'Email verification failed. Please try again.'
      });
    }
  }
  );

  // Resend verification code endpoint
  fastify.post<{ Body: { userId: string } }>(
    '/auth/resend-verification',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.body as { userId: string };

      try {
        // Find user
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return reply.status(404).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found'
          });
        }

        // Delete any existing unused codes
        await prisma.verificationCode.deleteMany({
          where: {
            userId,
            usedAt: null,
            expiresAt: { gt: new Date() }
          }
        });

        // Create new verification code
        const newCode = generateRandomCode();
        await prisma.verificationCode.create({
          data: {
            code: newCode,
            userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });

        // Send new verification email
        await sendVerificationEmail(user.email, newCode);

        return reply.send({
          success: true,
          message: 'New verification code sent to your email'
        });

      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'RESEND_FAILED',
          message: 'Failed to resend verification code. Please try again.'
        });
      }
    }
  );


  // Reset Password endpoint
  fastify.post<{ Body: { email: string } }>(
  '/auth/reset-password',
  {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        }
      }
    }
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };

    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Security: Don't reveal if user exists, return generic message
      if (!user) {
        return reply.send({
          success: true,
          message: 'If the email exists, a reset link has been sent to the registered email address.'
        });
      }

      // ⭐⭐ Prevent Google OAuth users from resetting password
      if (user.googleId) {
        return reply.status(400).send({
          error: 'GOOGLE_OAUTH_USER',
          message: 'Google OAuth users cannot reset password. Please use Google Sign-In.'
        });
      }

      // Check if email is verified
      if (!user.isVerified) {
        return reply.status(400).send({
          error: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email first before resetting password.',
          userId: user.id,
          requiresVerification: true
        });
      }

      const resetToken = generatePasswordResetToken();
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create or update password reset token
      const tokenRecord = await prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        update: {
          token: resetToken,
          expiresAt: expiryDate
        },
        create: {
          token: resetToken,
          expiresAt: expiryDate,
          userId: user.id,
        },
      });

      const resetLink = `${env.FRONTEND_URL}/change-password?token=${resetToken}`;

      // Send password reset email using the proper function from email.ts
      await sendPasswordResetEmail(user.email, resetLink);

      return reply.send({
        success: true,
        message: 'Instructions to reset your password has been sent to the registered email address.'
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'PASSWORD_RESET_EMAIL_SEND_FAILED',
        message: 'Unable to reset password. Please try again.'
      });
    }
  }
  );

  // Change password endpoint
  fastify.post<{ Body: { token: string; password: string } }>(
    '/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, password } = request.body as { token: string; password: string };

      try {
        const tokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: token } });
        
        if (!tokenRecord) {
          return reply.status(404).send({
            error: 'TOKEN_NOT_FOUND',
            message: 'Password reset token is not found.'
          });
        }

        if (tokenRecord.expiresAt <= new Date()) {
          return reply.status(404).send({
            error: 'TOKEN_EXPIRED',
            message: 'Password reset link has expired.'
          });
        }

        const hashedPassword = await hashPassword(password);

        // update password
        await prisma.user.update({
          where: { id: tokenRecord.userId },
          data: { password: hashedPassword }
        });

        await prisma.passwordResetToken.delete({
          where: {
            id: tokenRecord.id
          }
        });
        
        return reply.status(200).send({
          success: true,
          message: 'Password is changed successfully. You may login now with the new password.'
        });

      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'CHANGE_PASSWORD_FAILED',
          message: 'Change password failed. Please try again.'
        });
      }
    }
  );


 // 2FA verification endpoint
 fastify.post<{ Body: { userId: string; token: string } }>(
  '/auth/verify-2fa',
  {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'token'],
        properties: {
          userId: { type: 'string' },
          token: { type: 'string' }
        }
      }
    }
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: string; token: string };

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        return reply.status(401).send({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!user.twoFactorSecret) {
        return reply.status(401).send({
          error: 'TWOFACTOR_SECRET_NOT_FOUND',
          message: 'twoFactorSecret not found'
        });
      }

      const base32secret = user.twoFactorSecret;
      const verified = verifyTwoFactorToken(base32secret, token);

      if (!verified) {
        return reply.status(401).send({
          error: 'INVALID_2FA_TOKEN',
          message: 'Invalid 2FA code'
        });
      }

      if (!user.twoFactorRegistered) {
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorRegistered: true }
        });
      }
      
      const authToken = generateToken(user.id);
      setAuthCookie(reply, authToken);

      // ⭐⭐ Make sure to return both user data and token ⭐⭐
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
        // token: authToken // Include token in response
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: '2FA_VERIFICATION_FAILED',
        message: 'Two-factor authentication failed. Please try again.'
      });
    }
  }
 );


  // Profile endpoint
  fastify.get('/profile', async function handler (request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies.authToken;
    
    if (!token) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const decoded = verifyToken(token) as { userId: string };
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          avatarUrl: true,
          createdAt: true
        }
      });
      
      if (!user) {
        clearAuthCookie(reply);
        return reply.status(401).send({ message: 'User not found' });
      }
      
      return reply.send(user);
    } catch (err) {
      clearAuthCookie(reply);
      return reply.status(401).send({ message: 'Invalid token' });
    }
  });

  // Google OAuth login endpoint
  fastify.post<{ Body: { credential: string } }>(
    '/auth/signin-with-google',
    {
      schema: {
        body: {
          type: 'object',
          required: ['credential'],
          properties: {
            credential: { type: 'string' },
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { credential } = request.body as { credential: string };
      
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID,
        });

        if (!ticket) {
          return reply.status(401).send({ success: false, message: 'Invalid Google credential' });
        }

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name || !payload.sub) {
          return reply.status(400).send({ success: false, message: 'Invalid Google credential payload' });
        }

        let user = await prisma.user.findUnique({ where: { email: payload.email } });
        if (!user) {
          user = await prisma.user.create({
            data: { 
              email: payload.email,
              password: '',
              name: payload.name,
              isVerified: payload.email_verified || false,
              googleId: payload.sub
            }
          });
        }

        const authToken = generateToken(user.id);
        setAuthCookie(reply, authToken);

        return reply.send({
          user: {
            id: user.id,            
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
          }
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(401).send({ success: false, message: 'Invalid Google credential' });
      }
    }
  );

  // Logout endpoint
  fastify.post(
    '/auth/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      clearAuthCookie(reply);
      
      return reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    }
  );

// Add this at the top of your auth routes
fastify.addHook('preHandler', async (request, reply) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  console.log('Headers:', request.headers);
  console.log('Body:', request.body);
});


}







