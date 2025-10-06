// pong-app/backend/src/routes/authRoutes.ts
import {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../env';
import {
  sendVerificationCode,
  sendPasswordResetEmail,
  sendRegisterSuccessEmail,
} from '../service/emailService';
import {OAuth2Client} from 'google-auth-library';
import validator from 'validator';
import speakeasy from 'speakeasy';

if (!env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}

export const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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
  userId: number;
  code: string;
}

interface ResetPasswordInput {
  email: string;
}

interface ChangePasswordInput {
  token: string;
  password: string;
}

export default function authRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions,
) {
  const {prisma} = options;

  // JWT functions
  const generateToken = (userId: number, username: string): string => {
    return jwt.sign({userId, username}, env.JWT_SECRET, {expiresIn: '1h'});
  };

  // Password functions
  const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
  };

  const comparePasswords = async (
    password: string,
    hash: string,
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
  };

  const getBaseUrl = (request: FastifyRequest) => {
    const origin = request.headers.origin;
    return origin?.includes('ngrok') ? env.FRONTEND_REMOTE_URL : env.CP_URL;
  };

  // 2FA functions
  const generateTwoFactorSecret = (
    email: string,
  ): speakeasy.GeneratedSecret => {
    const issuer = env.TEAM_NAME ?? 'Hivers5 Asteroids';
    const label = `${issuer}:${email}`;

    return speakeasy.generateSecret({
      name: label,
      issuer,
      length: 20,
    });
  };

  // Helper function to generate random code
  const generateRandomCode = (length = 6): string => {
    return Math.floor(
      10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1),
    ).toString();
  };

  // Helper function to set secure HTTPOnly cookie
  const setAuthCookie = (reply: FastifyReply, token: string) => {
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
    });
  };

  const clearAuthCookie = (reply: FastifyReply) => {
    reply.clearCookie('authToken', {
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
    });
  };

  // Helper function for friendship creation
  const createUserFriendships = async (newUser: {
    id: number;
    username: string;
  }) => {
    const existingUsers = await prisma.user.findMany({
      where: {id: {not: newUser.id}},
      select: {id: true, username: true},
    });

    const friendshipPromises = existingUsers.flatMap(existingUser => [
      prisma.friendship.create({
        data: {
          sender_id: newUser.id,
          receiver_id: existingUser.id,
          sender_username: newUser.username,
          receiver_username: existingUser.username,
          status: 'NotFriend',
        },
      }),
      prisma.friendship.create({
        data: {
          sender_id: existingUser.id,
          receiver_id: newUser.id,
          sender_username: existingUser.username,
          receiver_username: newUser.username,
          status: 'NotFriend',
        },
      }),
    ]);

    return Promise.all(friendshipPromises);
  };

  // Helper function for verification code creation and email sending
  const createAndSendVerificationCode = async (
    user: {id: number; email: string; username: string},
    context: 'email-verification' | 'login-2fa',
  ) => {
    // Delete existing verification codes
    await prisma.verificationCode.deleteMany({
      where: {userId: user.id},
    });

    // Create new verification code
    const verificationCode = await prisma.verificationCode.create({
      data: {
        code: generateRandomCode(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send appropriate email using unified function
    await sendVerificationCode(
      user.email,
      verificationCode.code,
      user.username,
      context,
    );

    return verificationCode;
  };

  // Helper function for verification code validation
  const validateAndConsumeVerificationCode = async (
    userId: number,
    code: string,
  ) => {
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        expiresAt: {gt: new Date()},
        usedAt: null,
      },
    });

    if (!verificationCode) {
      throw new Error('INVALID_CODE');
    }

    // Clean up verification codes
    await prisma.verificationCode.deleteMany({
      where: {userId},
    });

    return verificationCode;
  };

  // Helper function for updating user login status
  const updateUserLoginStatus = async (
    userId: number,
    additionalData: any = {},
  ) => {
    return prisma.user.update({
      where: {id: userId},
      data: {
        online_status: 'online',
        lastLogin: new Date(),
        ...additionalData,
      },
    });
  };

  /* **********************************************************************
   *                    GOOGLE OAUTH SIGN-IN
   * Endpoint: POST /auth/signin-with-google
   * Input: Google sign-in token from the user's Google account
   * Output: User info (id, email, username, isVerified); session started via httpOnly cookie (no token in body)
   * Description: Verifies the Google ID token, finds/creates the user, updates presence, then issues a session JWT and stores it in a secure httpOnly cookie.
   ************************************************************************ */
  app.post<{Body: {credential: string}}>(
    '/auth/signin-with-google',
    {
      schema: {
        body: {
          type: 'object',
          required: ['credential'],
          properties: {
            credential: {type: 'string'},
          },
        },
      },
    },
    async (request, reply) => {
      const {credential} = request.body;

      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name || !payload.sub) {
          return reply
            .status(400)
            .send({
              error: 'INVALID_GOOGLE_CREDENTIAL',
              message: 'Invalid Google credential',
            });
        }

        let user = await prisma.user.findUnique({
          where: {email: payload.email},
        });

        if (!user) {
          // Generate unique username
          let username = payload.name.replace(/\s+/g, '');
          let existingUser = await prisma.user.findUnique({where: {username}});

          while (existingUser) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            username = `${payload.name.replace(/\s+/g, '')}${randomSuffix}`;
            existingUser = await prisma.user.findUnique({where: {username}});
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
              lastLogin: new Date(),
            },
          });

          // Use helper function for friendship creation
          await createUserFriendships(user);
          await sendRegisterSuccessEmail(
            payload.email,
            username,
            getBaseUrl(request),
          );
        } else {
          // Use helper function for status update
          await updateUserLoginStatus(user.id);
        }
        // Use generateToken helper for consistent 1-hour expiry
        const token = generateToken(user.id, user.username);
        setAuthCookie(reply, token);

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isVerified: user.isVerified,
          },
        });
      } catch (error) {
        console.error('Google auth error:', error);
        return reply.status(500).send({
          error: 'GOOGLE_AUTH_FAILED',
          message: 'Google authentication failed. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *                    USER REGISTRATION
   * Endpoint: POST /auth/register
   * Input: Username, email, and password for creating a new account
   * Output: Success confirmation with user ID and verification requirement; verification email sent to user's email address
   * Description: Creates new user account with hashed password, generates email verification code, establishes friendship connections with existing users, and sends verification email.
   ************************************************************************ */
  app.post<{Body: RegisterInput}>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password', 'email'],
          properties: {
            username: {type: 'string', minLength: 3, maxLength: 16},
            password: {type: 'string', minLength: 6},
            email: {type: 'string', format: 'email'},
          },
        },
      },
    },
    async (request, reply) => {
      const {username, password, email} = request.body;

      try {
        if (!validator.isAlphanumeric(username)) {
          return reply
            .status(400)
            .send({
              error: 'INVALID_USERNAME',
              message: 'Username must contain only letters and numbers',
            });
        }
        if (!validator.isEmail(email)) {
          return reply
            .status(400)
            .send({error: 'INVALID_EMAIL', message: 'Invalid email format'});
        }
        if (password.length < 6) {
          return reply
            .status(400)
            .send({
              error: 'WEAK_PASSWORD',
              message: 'Password must be at least 6 characters long',
            });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{username: username}, {email: email}],
          },
        });

        if (existingUser) {
          if (existingUser.username === username) {
            return reply
              .status(400)
              .send({
                error: 'USERNAME_EXISTS',
                message: 'Username already exists',
              });
          }
          if (existingUser.email === email) {
            return reply
              .status(400)
              .send({error: 'EMAIL_EXISTS', message: 'Email already exists'});
          }
        }

        const hashedPassword = await hashPassword(password);

        const twoFactorSecret = generateTwoFactorSecret(email);
        if (twoFactorSecret.otpauth_url === undefined) {
          return reply.status(500).send({
            error: '2FA_ERROR',
            message: 'Failed to generate two-factor authentication secret',
          });
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            email,
            isVerified: false,
            twoFactorSecret: twoFactorSecret.base32,
            twoFactorURL: twoFactorSecret.otpauth_url,
            auth_provider: 'email',
          },
        });

        // Use helper functions for verification code and friendships
        await createAndSendVerificationCode(newUser, 'email-verification');
        await createUserFriendships(newUser);

        return reply.status(201).send({
          success: true,
          message: 'Verification email sent',
          userId: newUser.id,
          requiresVerification: true,
        });
      } catch (error) {
        console.error('Registration error:', error);
        return reply.status(500).send({
          error: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *                  EMAIL VERIFICATION
   * Endpoint: POST /auth/verify-email
   * Input: User ID and 6-digit verification code from email
   * Output: Success message with user info; no session started
   * Description: Validates the email verification code, marks user as verified, but does not create a session
   ************************************************************************ */
  app.post<{Body: VerifyInput}>(
    '/auth/verify-email',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'code'],
          properties: {
            userId: {type: 'number'},
            code: {type: 'string', minLength: 6, maxLength: 6},
          },
        },
      },
    },
    async (request, reply) => {
      const {userId, code} = request.body;

      try {
        // Use helper function for validation
        await validateAndConsumeVerificationCode(userId, code);

        // Verify user (set isVerified to true)
        const user = await prisma.user.update({
          where: {id: userId},
          data: {isVerified: true},
        });

        const baseUrl = getBaseUrl(request);

        // Send registration success email
        await sendRegisterSuccessEmail(user.email, user.username, baseUrl);

        // Return response with TOTP URL but don't log the user in
        return reply.send({
          success: true,
          message: 'Email verified successfully. Please login to continue.',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isVerified: true,
          },
          totp_url: user.twoFactorURL,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_CODE') {
          return reply.status(400).send({
            error: 'INVALID_CODE',
            message: 'Invalid or expired verification code',
          });
        }

        console.error('Email verification error:', error);
        return reply.status(500).send({
          error: 'EMAIL_VERIFICATION_FAILED',
          message: 'Email authentication failed. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *                    USER LOGIN
   * Endpoint: POST /auth/login
   * Input: Username and password for authentication
   * Output: 2FA requirement confirmation with user ID; 2FA code sent to user's email
   * Description: Validates user credentials, generates 6-digit email verification code, and sends 2FA code to user's registered email address for login completion.
   ************************************************************************ */
  app.post<{Body: LoginInput}>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {type: 'string'},
            password: {type: 'string'},
          },
        },
      },
    },
    async (request, reply) => {
      const {username, password} = request.body;

      try {
        if (!validator.isAlphanumeric(username)) {
          return reply
            .status(400)
            .send({
              error: 'INVALID_USERNAME',
              message: 'Invalid username format',
            });
        }

        // Find user by username
        const user = await prisma.user.findUnique({
          where: {username},
        });

        if (!user || !user.password) {
          return reply
            .status(401)
            .send({
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid username or password',
            });
        }

        if (user.auth_provider === 'google') {
          return reply
            .status(403)
            .send({
              error: 'USE_GOOGLE_SIGNIN',
              message: 'Please use Google Sign-In for this account',
            });
        }

        // Verify password
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return reply
            .status(401)
            .send({
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid username or password',
            });
        }

        if (!user.twoFactorSecret) {
          return reply.status(403).send({
            error: 'INVALID_TWOFACTOR_SECRET',
            message: 'Invalid 2 factor secret',
          });
        }

        if (!user.twoFactorURL) {
          return reply.status(403).send({
            error: 'INVALID_TWOFACTOR_URL',
            message: 'Invalid 2 factor URL',
          });
        }

        const url = user.twoFactorRegistered ? null : user.twoFactorURL;

        // Use helper function for verification code creation and email sending
        await createAndSendVerificationCode(user, 'login-2fa');

        return reply.send({
          requires2FA: true,
          userId: user.id,
          message: '2FA code sent to your email. Please verify to continue.',
          url,
        });
      } catch (error) {
        console.error('Login error:', error);
        return reply.status(500).send({
          error: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *             2FA LOGIN VERIFICATION
   * Endpoint: POST /auth/verify-2fa
   * Input: User ID and 6-digit verification code from login email
   * Output: User details and session started via httpOnly cookie
   * Description: Validates email verification code for 2FA login, creates user session, and marks TOTP as registered if first time setup.
   ************************************************************************ */
  app.post<{Body: VerifyInput}>(
    '/auth/verify-2fa',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'code'],
          properties: {
            userId: {type: 'number'},
            code: {type: 'string', minLength: 6, maxLength: 6},
          },
        },
      },
    },
    async (request, reply) => {
      const {userId, code} = request.body;

      try {
        const user = await prisma.user.findUnique({where: {id: userId}});

        if (!user) {
          return reply.status(401).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found',
          });
        }

        if (!user.twoFactorSecret) {
          return reply.status(401).send({
            error: 'TWOFACTOR_SECRET_NOT_FOUND',
            message: 'twoFactorSecret not found',
          });
        }

        // Use helper function for validation
        await validateAndConsumeVerificationCode(userId, code);

        // Use helper function for status update
        const additionalData = !user.twoFactorRegistered
          ? {twoFactorRegistered: true}
          : {};
        await updateUserLoginStatus(user.id, additionalData);

        // Generate JWT and set cookie
        const authToken = generateToken(user.id, user.username);
        setAuthCookie(reply, authToken);

        // Return user data (no token in response body for security)
        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isVerified: user.isVerified,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_CODE') {
          return reply.status(401).send({
            error: 'INVALID_CODE',
            message: 'Invalid or expired verification code',
          });
        }

        console.error('2FA verification error:', error);
        return reply.status(500).send({
          error: '2FA_VERIFICATION_FAILED',
          message: 'Two-factor authentication failed. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *              RESEND VERIFICATION CODE (Unified)
   * Endpoint: POST /auth/resend-verification-code
   * Input: User ID and context type (email-verification or login-2fa)
   * Output: Success confirmation; new verification code sent to user's email
   * Description: Generates fresh 6-digit verification code for either email verification or 2FA login, invalidates old codes, and sends appropriate email.
   ************************************************************************ */
  app.post<{
    Body: {userId: number; context?: 'email-verification' | 'login-2fa'};
  }>(
    '/auth/resend-verification-code',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {type: 'number'},
            context: {
              type: 'string',
              enum: ['email-verification', 'login-2fa'],
              default: 'email-verification',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {userId, context = 'email-verification'} = request.body;

      try {
        // Find user
        const user = await prisma.user.findUnique({
          where: {id: userId},
        });

        if (!user) {
          return reply.status(404).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found',
          });
        }

        // Context-specific validations
        if (context === 'email-verification' && user.isVerified) {
          return reply.status(400).send({
            error: 'ALREADY_VERIFIED',
            message: 'Email is already verified',
          });
        }

        // Use helper function for verification code creation and email sending
        await createAndSendVerificationCode(user, context);

        return reply.send({
          success: true,
          message:
            context === 'login-2fa'
              ? 'New 2FA code sent to your email'
              : 'New verification code sent to your email',
        });
      } catch (error) {
        console.error('Resend verification code error:', error);
        return reply.status(500).send({
          error: 'RESEND_FAILED',
          message: 'Failed to resend verification code. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *              PASSWORD RESET REQUEST
   * Endpoint: POST /auth/reset-password
   * Input: Email address for password recovery
   * Output: Generic success message; reset link sent to email if account exists
   * Description: Generates secure password reset token, creates reset link with 24-hour expiry, and emails password reset instructions to user without revealing account existence.
   ************************************************************************ */
  app.post<{Body: ResetPasswordInput}>(
    '/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {type: 'string', format: 'email'},
          },
        },
      },
    },
    async (request, reply) => {
      const {email} = request.body;

      try {
        if (!validator.isEmail(email)) {
          return reply
            .status(400)
            .send({error: 'INVALID_EMAIL', message: 'Invalid email format'});
        }

        const user = await prisma.user.findUnique({
          where: {email},
        });

        if (!user) {
          return reply.send({
            success: true,
            message: 'If the email exists, a reset link has been sent.',
          });
        }

        if (user.auth_provider === 'google') {
          return reply.status(400).send({
            error: 'GOOGLE_OAUTH_USER',
            message:
              'Google OAuth users cannot reset password. Please use Google Sign-In.',
          });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.passwordResetToken.upsert({
          where: {userId: user.id},
          update: {
            token: resetToken,
            expiresAt: expiryDate,
          },
          create: {
            token: resetToken,
            expiresAt: expiryDate,
            userId: user.id,
          },
        });

        const baseUrl = getBaseUrl(request);
        const resetLink = `${baseUrl}/change-password?token=${resetToken}`;
        await sendPasswordResetEmail(user.email, resetLink);

        return reply.send({
          success: true,
          message: 'Password reset instructions have been sent to your email.',
        });
      } catch (error) {
        console.error('Password reset error:', error);
        return reply.status(500).send({
          error: 'PASSWORD_RESET_FAILED',
          message: 'Unable to process password reset. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *            PASSWORD CHANGE
   * Endpoint: POST /auth/change-password
   * Input: Reset token and new password for account recovery
   * Output: Success confirmation; password updated and reset token invalidated
   * Description: Validates reset token, updates user password with new hashed value, and removes the used reset token from database for security.
   ************************************************************************ */
  app.post<{Body: ChangePasswordInput}>(
    '/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: {type: 'string'},
            password: {type: 'string', minLength: 6},
          },
        },
      },
    },
    async (request, reply) => {
      const {token, password} = request.body;

      try {
        if (password.length < 6) {
          return reply.status(400).send({
            error: 'WEAK_PASSWORD',
            message: 'Password must be at least 6 characters long.',
          });
        }

        const tokenRecord = await prisma.passwordResetToken.findUnique({
          where: {token},
          include: {user: true},
        });

        if (!tokenRecord) {
          return reply.status(404).send({
            error: 'TOKEN_NOT_FOUND',
            message: 'Invalid or expired reset token.',
          });
        }

        if (tokenRecord.expiresAt <= new Date()) {
          return reply.status(400).send({
            error: 'TOKEN_EXPIRED',
            message: 'Password reset link has expired.',
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and delete reset token
        await prisma.$transaction([
          prisma.user.update({
            where: {id: tokenRecord.userId},
            data: {password: hashedPassword},
          }),
          prisma.passwordResetToken.delete({
            where: {id: tokenRecord.id},
          }),
        ]);

        return reply.send({
          success: true,
          message:
            'Password successfully updated! You can now login with your new password.',
        });
      } catch (error) {
        console.error('Change password error:', error);
        return reply.status(500).send({
          error: 'CHANGE_PASSWORD_FAILED',
          message: 'Failed to change password. Please try again.',
        });
      }
    },
  );

  /* **********************************************************************
   *              USER PROFILE
   * Endpoint: GET /profile
   * Input: Authentication via httpOnly cookie
   * Output: User profile data (id, username, email, stats, avatar)
   * Description: Retrieves authenticated user's profile information using JWT from cookie, returns user data excluding sensitive fields like password and secrets.
   ************************************************************************ */
  app.get('/profile', async (request, reply) => {
    const token = request.cookies.authToken;

    if (!token) {
      return reply.status(401).send({message: 'Authentication required'});
    }

    try {
      const decoded = app.jwt.verify(token) as {
        userId: number;
        username: string;
      };

      const user = await prisma.user.findUnique({
        where: {id: decoded.userId},
        select: {
          id: true,
          username: true,
          email: true,
          isVerified: true,
          firstName: true,
          profilePic: true,
          wins: true,
          losses: true,
          favAvatar: true,
          online_status: true,
          lastLogin: true,
        },
      });

      if (!user) {
        clearAuthCookie(reply);
        return reply.status(401).send({message: 'User not found'});
      }

      // If user is offline but has a valid JWT, it means the session is stale
      if (user.online_status === 'offline') {
        clearAuthCookie(reply);
        return reply.status(401).send({
          error: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please login again.',
        });
      }

      return reply.send(user);
    } catch (err) {
      clearAuthCookie(reply);
      return reply.status(401).send({message: 'Invalid token'});
    }
  });

  /* **********************************************************************
   *            USER LOGOUT
   * Endpoint: POST /auth/logout
   * Input: Authentication via httpOnly cookie (optional)
   * Output: Success confirmation; user session terminated
   * Description: Sets user status to offline, clears authentication cookie, 
   and terminates user session securely on both client and server.
   ************************************************************************ */
  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies.authToken;

    if (token) {
      try {
        const decoded = app.jwt.verify(token) as {userId: number};
        await prisma.user.update({
          where: {id: decoded.userId},
          data: {online_status: 'offline'},
        });
      } catch (err) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token) as any;
          if (decoded && decoded.userId) {
            await prisma.user.update({
              where: {id: decoded.userId},
              data: {online_status: 'offline'},
            });
            console.log(
              `Marked user ${decoded.userId} offline during logout with expired token`,
            );
          }
        } catch (decodeErr) {
          console.error('Could not decode token during logout:', decodeErr);
        }
      }
    }

    // Clear auth cookie
    clearAuthCookie(reply);
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  const cleanupInactiveUsers = async () => {
    try {
      // Mark users as offline if their JWT would have expired (1 hour + 5 min buffer)
      const expiredTime = new Date(Date.now() - 65 * 60 * 1000); // 1 hour 5 minutes ago

      const result = await prisma.user.updateMany({
        where: {
          online_status: 'online',
          lastLogin: {
            lt: expiredTime,
          },
        },
        data: {
          online_status: 'offline',
        },
      });

      if (result.count > 0) {
        console.log(`Marked ${result.count} inactive users as offline`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  };

  // ADD THIS: Startup cleanup for all online users
  const startupCleanup = async () => {
    try {
      console.log('🔄 Running startup cleanup for online users...');

      const result = await prisma.user.updateMany({
        where: {
          online_status: 'online',
        },
        data: {
          online_status: 'offline',
        },
      });

      console.log(
        `✅ Marked ${result.count} users as offline after server restart`,
      );
    } catch (error) {
      console.error('❌ Error during startup cleanup:', error);
    }
  };

  // Run startup cleanup immediately when routes are registered
  startupCleanup();

  // Graceful shutdown cleanup (best effort, not guaranteed)
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, marking users offline...');
    try {
      await prisma.user.updateMany({
        where: {online_status: 'online'},
        data: {online_status: 'offline'},
      });
    } catch (error) {
      console.error('Shutdown cleanup failed:', error);
    }
    process.exit(0);
  });

  // Run cleanup every 10 minutes
  setInterval(cleanupInactiveUsers, 10 * 60 * 1000);

  // Run cleanup once on startup to clean existing stale sessions
  cleanupInactiveUsers();
}
