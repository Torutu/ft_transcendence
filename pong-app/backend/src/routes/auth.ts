// import { FastifyInstance } from 'fastify';
// import { PrismaClient } from '@prisma/client';
// import { hashPassword, comparePasswords, generateToken } from '../utils/auth';

// const prisma = new PrismaClient();

// export default async function authRoutes(fastify: FastifyInstance) {
//   // Register endpoint
//   fastify.post<{ Body: { email: string; password: string; name?: string } }>(
//     '/register',
//     {
//       schema: {
//         body: {
//           type: 'object',
//           required: ['email', 'password'],
//           properties: {
//             email: { type: 'string', format: 'email' },
//             password: { type: 'string', minLength: 6 },
//             name: { type: 'string', minLength: 2 }
//           }
//         }
//       }
//     },
//     async (request, reply) => {
//       const { email, password, name } = request.body;

//       const existingUser = await prisma.user.findUnique({ where: { email } });
//       if (existingUser) {
//         return reply.status(400).send({
//           error: 'USER_EXISTS',
//           message: 'Email already in use'
//         });
//       }

//       try {
//         const hashedPassword = await hashPassword(password);
//         const user = await prisma.user.create({
//           data: { email, password: hashedPassword, name }
//         });

//         const token = generateToken(user.id);
//         return reply.status(201).send({
//           message: 'Registration successful',
//           user: { id: user.id, email: user.email, name: user.name },
//           token
//         });
//       } catch (error) {
//         fastify.log.error(error);
//         return reply.status(500).send({
//           error: 'SERVER_ERROR',
//           message: 'Internal server error'
//         });
//       }
//     }
//   );

//   // Login endpoint
//   fastify.post<{ Body: { email: string; password: string } }>(
//     '/login',
//     {
//       schema: {
//         body: {
//           type: 'object',
//           required: ['email', 'password'],
//           properties: {
//             email: { type: 'string', format: 'email' },
//             password: { type: 'string', minLength: 6 }
//           }
//         }
//       }
//     },
//     async (request, reply) => {
//       const { email, password } = request.body;

//       try {
//         const user = await prisma.user.findUnique({ where: { email } });
//         if (!user || !user.password) {
//           return reply.status(401).send({
//             error: 'INVALID_CREDENTIALS',
//             message: 'Invalid email or password'
//           });
//         }

//         const passwordMatch = await comparePasswords(password, user.password);
//         if (!passwordMatch) {
//           return reply.status(401).send({
//             error: 'INVALID_CREDENTIALS',
//             message: 'Invalid email or password'
//           });
//         }

//         const token = generateToken(user.id);
//         return reply.send({
//           token,
//           user: { id: user.id, email: user.email, name: user.name }
//         });
//       } catch (error) {
//         fastify.log.error(error);
//         return reply.status(500).send({
//           error: 'SERVER_ERROR',
//           message: 'Internal server error'
//         });
//       }
//     }
//   );
// }


import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import env from '../env';
import { hashPassword, comparePasswords, generateToken, authenticateUser, verifyToken, generateTwoFactorSecret, verifyTwoFactorToken } from '../utils/auth';
import { sendVerificationEmail } from '../utils/email';

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

  // Login endpoint
  fastify.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'password'],
          properties: {
            username: { type: 'string', minLength: 2 },
            password: { type: 'string', minLength: 6 }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      console.log('Request body:', request.body);
      console.log('Request headers:', request.headers);
      const { name, password } = request.body as { name: string; password: string };

      try {
        const user = await prisma.user.findUnique({ where: { name } });
        
        if (!user || !user.password) {
          return reply.status(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          });
        }

        // Check if email is verified
        if (!user.isVerified) {
          return reply.status(403).send({
            error: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email first',
            userId: user.id
          });
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return reply.status(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          });
        }

        const twoFactorSecret = generateTwoFactorSecret();
        if (twoFactorSecret.otpauth_url === undefined) {
          return reply.status(500).send({
            error: '2FA_ERROR',
            message: 'Failed to generate two-factor authentication secret'
          });
        }
        // Update user with 2FA secret
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorSecret: twoFactorSecret.base32, twoFactorEnabled: true }
        });
        
        return reply.send({
          requires2FA: true,
          userId: user.id,
          message: 'Two-factor authentication required',
          totp_url: twoFactorSecret.otpauth_url
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
        const user = await prisma.user.create({
          data: { 
            email, 
            password: hashedPassword, 
            name,
            isVerified: false
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

        // Mark code as used
        // await prisma.verificationCode.update({
        //   where: { id: verificationCode.id },
        //   data: { usedAt: new Date() }
        // });

        await prisma.verificationCode.deleteMany({
          where: {
            userId,
            // usedAt: null,
            // expiresAt: { lt: new Date() }
          }
        });

        // Verify user
        const user = await prisma.user.update({
          where: { id: userId },
          data: { isVerified: true }
        });

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          return reply.send({
            success: true,
            twoFactorEnabled: true,
            message: 'Email verified. Two-factor authentication required.'
          });
        }

        // Generate JWT token
        const token = generateToken(user.id);

        return reply.send({
          success: true,
          twoFactorEnabled: false,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isVerified: true,
            twoFactorEnabled: false
          }
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

  // // Login endpoint
  // fastify.post<{ Body: { email: string; password: string } }>(
  //   '/auth/login',
  //   {
  //     schema: {
  //       body: {
  //         type: 'object',
  //         required: ['email', 'password'],
  //         properties: {
  //           email: { type: 'string', format: 'email' },
  //           password: { type: 'string', minLength: 6 }
  //         }
  //       }
  //     }
  //   },
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     console.log('Request body:', request.body);
  //     console.log('Request headers:', request.headers);
  //     const { email, password } = request.body as { email: string; password: string };

  //     try {
  //       const user = await prisma.user.findUnique({ where: { email } });
        
  //       if (!user || !user.password) {
  //         return reply.status(401).send({
  //           error: 'INVALID_CREDENTIALS',
  //           message: 'Invalid email or password'
  //         });
  //       }

  //       // Check if email is verified
  //       if (!user.isVerified) {
  //         return reply.status(403).send({
  //           error: 'EMAIL_NOT_VERIFIED',
  //           message: 'Please verify your email first',
  //           userId: user.id
  //         });
  //       }

  //       const passwordMatch = await comparePasswords(password, user.password);
  //       if (!passwordMatch) {
  //         return reply.status(401).send({
  //           error: 'INVALID_CREDENTIALS',
  //           message: 'Invalid email or password'
  //         });
  //       }

  //       // Check if 2FA is enabled
  //       if (user.twoFactorEnabled) {
  //         return reply.send({
  //           requires2FA: true,
  //           userId: user.id,
  //           message: '2FA required'
  //         });
  //       }

  //       const token = generateToken(user.id);
  //       return reply.send({
  //         token,
  //         user: {
  //           id: user.id,
  //           email: user.email,
  //           name: user.name,
  //           isVerified: user.isVerified,
  //           twoFactorEnabled: user.twoFactorEnabled
  //         }
  //       });

  //     } catch (error) {
  //       fastify.log.error(error);
  //       return reply.status(500).send({
  //         error: 'LOGIN_FAILED',
  //         message: 'Login failed. Please try again.'
  //       });
  //     }
  //   }
  // );

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
        
        if (!user || !user.twoFactorSecret) {
          return reply.status(404).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found or 2FA not enabled'
          });
        }

        const base32secret = user.twoFactorSecret;

        // Verify 2FA token (implement your 2FA verification logic)
        const verified = verifyTwoFactorToken(base32secret, token);

        if (!verified) {
          return reply.status(401).send({
            error: 'INVALID_2FA_TOKEN',
            message: 'Invalid 2FA code'
          });
        }

        const authToken = generateToken(user.id);
        return reply.send({
          token: authToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled
          }
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

  // Declare a route
  fastify.get('/profile', async function handler (request, reply) {
    // const user = authenticateUser(request, reply);
    // if (!user) {
    //   return reply.status(401).send({ message: 'Unauthorized' });
    // }
    // // return { hello: 'world' }
    // return reply.send({
    //   name: user.name,
    //   email: user.email 
    // });

    const token = request.headers.authorization?.split(' ')[1];
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
        // return user;
        return reply.send({
          name: user.name,
          email: user.email 
      });
      } catch (err) {
        reply.status(401).send({ message: 'Invalid token' });
        return null;
      }
  });
  
  // Google OAuth login endpoint
  fastify.post<{ Body: { userId: string; token: string } }>(
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
      // Verify the token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      fastify.log.info('Google credential verified successfully');
      // Get the payload from the ticket
      if (!ticket) {
        reply.status(401).send({ success: false, message: 'Invalid Google credential' });
        return;
      }
      fastify.log.info('Google credential ticket:', ticket);
      // Extract user information from the payload
      // The payload contains user info: email, name, sub (Google user ID), etc
      const payload = ticket.getPayload();

      if (!payload) {
        reply.status(401).send({ success: false, message: 'Invalid Google credential: payload missing' });
        return;
      }
      fastify.log.info('Google credential payload:', payload);
      // Check if the payload contains necessary fields
      if (!payload.email || !payload.name || !payload.sub) {
        reply.status(400).send({ success: false, message: 'Google credential payload is missing required fields.' });
        return;
      }

      // payload contains user info: email, name, sub (Google user ID), etc.
      // Example: Find or create user in your DB
      // const user = await findOrCreateUser(payload);
      if (!payload.email) {
        reply.status(400).send({ success: false, message: 'Google account email is missing.' });
        return;
      }
      var user = await prisma.user.findUnique({ where: { email: payload.email } });
      if (!user) {
        // User not found, create a new user
        fastify.log.info('Creating new user with Google credentials:', payload.email);
        // Check if email_verified is true
        if (!payload.email_verified) {
          reply.status(400).send({ success: false, message: 'Google account email is not verified.' });
          return;
        }
        if (!payload.name) {
          reply.status(400).send({ success: false, message: 'Google account name is missing.' });
          return;
        }
        // Create a new user if not found
        user = await prisma.user.create({
          data: { 
            email: payload.email,
            password: '', // No password for Google login
            name: payload.name,
            isVerified: payload.email_verified,
            googleId: payload.sub // Store Google user ID
          }
        });
      }

      const authToken = generateToken(user.id);
      // Respond with success and user info
      fastify.log.info('User authenticated:', user);
      return reply.send({
        token: authToken,
        user: {
          id: user.id,            
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          twoFactorEnabled: user.twoFactorEnabled
        }
      });
    } catch (err) {
      reply.status(401).send({ success: false, message: 'Invalid Google credential' });
      fastify.log.error(err);
    }

  });
}