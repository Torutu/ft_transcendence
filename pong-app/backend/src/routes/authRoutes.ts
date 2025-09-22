// pong-app/backend/src/routes/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import env from '../env';
import { sendTwoFactorCode, sendPasswordResetEmail, sendRegisterSuccessEmail } from '../service/emailService';
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';

const client = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI
});

interface AuthRoutesOptions {
  prisma: PrismaClient;
}

interface RegisterInput {
  username: string;
  password: string;
  email: string;
}

interface LoginInput {
  username: string;
  password: string;
}

interface VerifyInput {
  username: string;
  code: string;
}

interface ResetPasswordInput {
  email: string;
}

interface ChangePasswordInput {
  token: string;
  password: string;
}

export default function authRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  const { prisma } = options;

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

  const clearAuthCookie = (reply: FastifyReply) => {
    reply.clearCookie('authToken', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    });
  };

  // Register Route
  app.post<{ Body: RegisterInput }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password', 'email'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 16 },
            password: { type: 'string', minLength: 6 },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    },
    async (request, reply) => {
      const { username, password, email } = request.body;

      try {
        // Validate input
        if (!validator.isAlphanumeric(username)) {
          return reply.status(400).send({ error: 'INVALID_USERNAME', message: 'Username must contain only letters and numbers' });
        }
        if (!validator.isEmail(email)) {
          return reply.status(400).send({ error: 'INVALID_EMAIL', message: 'Invalid email format' });
        }
        if (password.length < 6) {
          return reply.status(400).send({ error: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username },
              { email: email }
            ]
          }
        });

        if (existingUser) {
          if (existingUser.username === username) {
            return reply.status(400).send({ error: 'USERNAME_EXISTS', message: 'Username already exists' });
          }
          if (existingUser.email === email) {
            return reply.status(400).send({ error: 'EMAIL_EXISTS', message: 'Email already exists' });
          }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            email,
            isVerified: true, // Auto-verify for simplicity, or set to false if you want email verification
            auth_provider: 'email'
          }
        });

        // Create friendship entries with all existing users
        const existingUsers = await prisma.user.findMany({
          where: { id: { not: newUser.id } },
          select: { id: true, username: true }
        });

        const friendshipPromises = existingUsers.flatMap(user => [
          prisma.friendship.create({
            data: {
              sender_id: newUser.id,
              receiver_id: user.id,
              sender_username: newUser.username,
              receiver_username: user.username,
              status: 'NotFriend'
            }
          }),
          prisma.friendship.create({
            data: {
              sender_id: user.id,
              receiver_id: newUser.id,
              sender_username: user.username,
              receiver_username: newUser.username,
              status: 'NotFriend'
            }
          })
        ]);

        await Promise.all(friendshipPromises);

        // Send registration success email
        await sendRegisterSuccessEmail(email, username);

        return reply.status(201).send({
          success: true,
          message: 'User registered successfully',
          userId: newUser.id
        });

      } catch (error) {
        console.error('Registration error:', error);
        return reply.status(500).send({
          error: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.'
        });
      }
    }
  );

  // Login Route
  app.post<{ Body: LoginInput }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { username, password } = request.body;

      try {
        if (!validator.isAlphanumeric(username)) {
          return reply.status(400).send({ error: 'INVALID_USERNAME', message: 'Invalid username format' });
        }

        // Find user by username
        const user = await prisma.user.findUnique({
          where: { username }
        });

        if (!user || !user.password) {
          return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
        }

        if (user.auth_provider === 'google') {
          return reply.status(403).send({ error: 'USE_GOOGLE_SIGNIN', message: 'Please use Google Sign-In for this account' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
        }

        // Generate 2FA code
        const twoFACode = crypto.randomBytes(3).toString('hex'); // 6-character hex
        
        // Store 2FA code temporarily (you might want to add a 2FA table or use Redis)
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorSecret: twoFACode } // Reusing this field for temporary 2FA code
        });

        // Send 2FA code via email
        await sendTwoFactorCode(user.email, twoFACode, user.username);

        return reply.send({
          requires2FA: true,
          userId: user.id,
          message: '2FA code sent to your email. Please verify to continue.'
        });

      } catch (error) {
        console.error('Login error:', error);
        return reply.status(500).send({
          error: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.'
        });
      }
    }
  );

  // Verify 2FA Route
  app.post<{ Body: VerifyInput }>(
    '/auth/verify-2fa',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'code'],
          properties: {
            username: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { username, code } = request.body;

      try {
        if (!validator.isAlphanumeric(username)) {
          return reply.status(400).send({ error: 'INVALID_USERNAME', message: 'Invalid username format' });
        }

        const user = await prisma.user.findUnique({
          where: { username }
        });

        if (!user) {
          return reply.status(401).send({ error: 'USER_NOT_FOUND', message: 'User not found' });
        }

        if (user.twoFactorSecret !== code) {
          return reply.status(400).send({ error: 'INVALID_2FA_CODE', message: 'Invalid 2FA code' });
        }

        // Clear the 2FA code and update online status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorSecret: null,
            online_status: 'online',
            lastLogin: new Date()
          }
        });

        // Generate JWT token
        const token = app.jwt.sign({ 
          userId: user.id, 
          username: user.username 
        });

        setAuthCookie(reply, token);

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isVerified: user.isVerified
          }
        });

      } catch (error) {
        console.error('2FA verification error:', error);
        return reply.status(500).send({
          error: '2FA_VERIFICATION_FAILED',
          message: 'Two-factor authentication failed. Please try again.'
        });
      }
    }
  );

  // Reset Password Route
  app.post<{ Body: ResetPasswordInput }>(
    '/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        }
      }
    },
    async (request, reply) => {
      const { email } = request.body;

      try {
        if (!validator.isEmail(email)) {
          return reply.status(400).send({ error: 'INVALID_EMAIL', message: 'Invalid email format' });
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          // Don't reveal if user exists
          return reply.send({
            success: true,
            message: 'If the email exists, a reset link has been sent.'
          });
        }

        if (user.auth_provider === 'google') {
          return reply.status(400).send({
            error: 'GOOGLE_OAUTH_USER',
            message: 'Google OAuth users cannot reset password. Please use Google Sign-In.'
          });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.passwordResetToken.upsert({
          where: { userId: user.id },
          update: {
            token: resetToken,
            expiresAt: expiryDate
          },
          create: {
            token: resetToken,
            expiresAt: expiryDate,
            userId: user.id
          }
        });
        
        const getBaseUrl = (request: FastifyRequest) => {
        const origin = request.headers.origin;
        return origin?.includes('ngrok') ? env.FRONTEND_REMOTE_URL : env.CP_URL;
      };
      const baseUrl = getBaseUrl(request);

        const resetLink = `${baseUrl}/change-password?token=${resetToken}`;
        await sendPasswordResetEmail(user.email, resetLink);

        return reply.send({
          success: true,
          message: 'Password reset instructions have been sent to your email.'
        });

      } catch (error) {
        console.error('Password reset error:', error);
        return reply.status(500).send({
          error: 'PASSWORD_RESET_FAILED',
          message: 'Unable to process password reset. Please try again.'
        });
      }
    }
  );

  // Change Password Route
  app.post<{ Body: ChangePasswordInput }>(
    '/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 6 }
          }
        }
      }
    },
    async (request, reply) => {
      const { token, password } = request.body;

      try {
        if (password.length < 6) {
          return reply.status(400).send({
            error: 'WEAK_PASSWORD',
            message: 'Password must be at least 6 characters long.'
          });
        }

        const tokenRecord = await prisma.passwordResetToken.findUnique({
          where: { token },
          include: { user: true }
        });

        if (!tokenRecord) {
          return reply.status(404).send({
            error: 'TOKEN_NOT_FOUND',
            message: 'Invalid or expired reset token.'
          });
        }

        if (tokenRecord.expiresAt <= new Date()) {
          return reply.status(400).send({
            error: 'TOKEN_EXPIRED',
            message: 'Password reset link has expired.'
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and delete reset token
        await prisma.$transaction([
          prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { password: hashedPassword }
          }),
          prisma.passwordResetToken.delete({
            where: { id: tokenRecord.id }
          })
        ]);

        return reply.send({
          success: true,
          message: 'Password successfully updated! You can now login with your new password.'
        });

      } catch (error) {
        console.error('Change password error:', error);
        return reply.status(500).send({
          error: 'CHANGE_PASSWORD_FAILED',
          message: 'Failed to change password. Please try again.'
        });
      }
    }
  );

  // Google OAuth Login
  app.post<{ Body: { credential: string } }>(
    '/auth/signin-with-google',
    {
      schema: {
        body: {
          type: 'object',
          required: ['credential'],
          properties: {
            credential: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { credential } = request.body;

      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name || !payload.sub) {
          return reply.status(400).send({ error: 'INVALID_GOOGLE_CREDENTIAL', message: 'Invalid Google credential' });
        }

        let user = await prisma.user.findUnique({
          where: { email: payload.email }
        });

        if (!user) {
          // Generate unique username
          let username = payload.name.replace(/\s+/g, '');
          let existingUser = await prisma.user.findUnique({ where: { username } });
          
          while (existingUser) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            username = `${payload.name.replace(/\s+/g, '')}${randomSuffix}`;
            existingUser = await prisma.user.findUnique({ where: { username } });
          }

          // Create new user
          user = await prisma.user.create({
            data: {
              username,
              email: payload.email,
              password: null,
              isVerified: payload.email_verified || false,
              auth_provider: 'google',
              online_status: 'online',
              lastLogin: new Date()
            }
          });

          // Create friendships with existing users
          const existingUsers = await prisma.user.findMany({
            where: { id: { not: user.id } },
            select: { id: true, username: true }
          });

          const friendshipPromises = existingUsers.flatMap(existingUser => [
            prisma.friendship.create({
              data: {
                sender_id: user!.id,
                receiver_id: existingUser.id,
                sender_username: user!.username,
                receiver_username: existingUser.username,
                status: 'NotFriend'
              }
            }),
            prisma.friendship.create({
              data: {
                sender_id: existingUser.id,
                receiver_id: user!.id,
                sender_username: existingUser.username,
                receiver_username: user!.username,
                status: 'NotFriend'
              }
            })
          ]);

          await Promise.all(friendshipPromises);
          await sendRegisterSuccessEmail(payload.email, username);
        } else {
          // Update existing user's login info
          await prisma.user.update({
            where: { id: user.id },
            data: {
              online_status: 'online',
              lastLogin: new Date()
            }
          });
        }

        const token = app.jwt.sign({
          userId: user.id,
          username: user.username
        });

        setAuthCookie(reply, token);

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isVerified: user.isVerified
          }
        });

      } catch (error) {
        console.error('Google auth error:', error);
        return reply.status(500).send({
          error: 'GOOGLE_AUTH_FAILED',
          message: 'Google authentication failed. Please try again.'
        });
      }
    }
  );

  // Profile endpoint
  app.get('/profile', async (request, reply) => {
    const token = request.cookies.authToken;
    
    if (!token) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const decoded = app.jwt.verify(token) as { userId: number; username: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          isVerified: true,
          profilePic: true,
          wins: true,
          losses: true,
          favAvatar: true
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

  // Logout endpoint
  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies.authToken;
    
    if (token) {
      try {
        const decoded = app.jwt.verify(token) as { userId: number };
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { online_status: 'offline' }
        });
      } catch (err) {
        // Token invalid, ignore
      }
    }
    
    clearAuthCookie(reply);
    return reply.send({
      success: true,
      message: 'Logged out successfully'
    });
  });
}

