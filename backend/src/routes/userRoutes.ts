// backend/src/routes/userRoutes.ts
import { FastifyInstance, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";
import validator from "validator";

interface UserRoutesOptions {
  prisma: PrismaClient;
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: string;
  favAvatar?: string;
  profilePic?: string;
}

export default function userRoutes(
  app: FastifyInstance,
  options: UserRoutesOptions
) {
  const { prisma } = options;

  // Helper function to verify authentication
  const verifyAuth = (request: FastifyRequest) => {
    const token = request.cookies.authToken;
    if (!token) {
      throw new Error("AUTHENTICATION_REQUIRED");
    }
    return app.jwt.verify(token) as { userId: number; username: string };
  };

  // GET /user/profile - Full user profile data (for MyLockerTab)
  app.get("/user/profile", async (request, reply) => {
    try {
      const decoded = verifyAuth(request);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          nickname: true,
          dateOfBirth: true,
          gender: true,
          favAvatar: true,
          wins: true,
          losses: true,
          profilePic: true,
          online_status: true,
          lastLogin: true,
          isVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply
          .status(404)
          .send({ error: "USER_NOT_FOUND", message: "User not found" });
      }

      return reply.send(user);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      console.error("Get profile error:", error);
      return reply.status(500).send({
        error: "PROFILE_FETCH_FAILED",
        message: "Failed to fetch profile",
      });
    }
  });

  // PUT /user/profile - Update profile (for MyLockerTab save functionality)
  app.put<{ Body: UpdateProfileInput }>(
    "/user/profile",
    async (request, reply) => {
      try {
        const decoded = verifyAuth(request);
        const {
          firstName,
          lastName,
          nickname,
          dateOfBirth,
          gender,
          favAvatar,
          profilePic,
        } = request.body;

        // Validate date format if provided
        if (dateOfBirth && !validator.isDate(dateOfBirth)) {
          return reply
            .status(400)
            .send({ error: "INVALID_DATE", message: "Invalid date format" });
        }

        // Validate profilePic if provided (base64 validation)
        if (profilePic && profilePic.length > 0) {
          // Check if it's a valid base64 data URL
          if (!profilePic.startsWith("data:image/")) {
            return reply.status(400).send({
              error: "INVALID_IMAGE",
              message: "Invalid image format",
            });
          }

          // Check size (limit to 1MB base64 string, which is ~750KB actual image)
          if (profilePic.length > 1.5 * 1024 * 1024) {
            // 1.5MB base64 = ~1MB image
            return reply.status(400).send({
              error: "IMAGE_TOO_LARGE",
              message: "Image size exceeds 1MB limit",
            });
          }
        }

        // Check for nickname duplicates or conflicts with usernames
        if (nickname && nickname.trim() !== "") {
          const trimmed = nickname.trim();

          // Check both nickname and username collisions
          const conflict = await prisma.user.findFirst({
            where: {
              NOT: { id: decoded.userId },
              OR: [
                { nickname: trimmed },
                { username: trimmed },
              ],
            },
            select: { id: true },
          });

          if (conflict) {
            return reply.status(409).send({
              error: "NICKNAME_CONFLICT",
              message:
                "This nickname is already used as a nickname or username by another user.",
            });
          }
        }

        const genderValue =
          gender && gender.trim() ? (gender as any) : undefined;
        const favAvatarValue =
          favAvatar && favAvatar.trim() ? (favAvatar as any) : undefined;

        const updatedUser = await prisma.user.update({
          where: { id: decoded.userId },
          data: {
            firstName: firstName || null,
            lastName: lastName || null,
            nickname: nickname || null,
            dateOfBirth: dateOfBirth || null,
            gender: genderValue,
            favAvatar: favAvatarValue,
            profilePic: profilePic || null,
          },
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            nickname: true,
            dateOfBirth: true,
            gender: true,
            favAvatar: true,
            wins: true,
            losses: true,
            profilePic: true,
            isVerified: true,
          },
        });

        return reply.send({
          success: true,
          message: "Profile updated successfully",
          user: updatedUser,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "AUTHENTICATION_REQUIRED"
        ) {
          return reply.status(401).send({
            error: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          });
        }
        console.error("Profile update error:", error);
        return reply.status(500).send({
          error: "PROFILE_UPDATE_FAILED",
          message: "Failed to update profile",
        });
      }
    }
  );

  // GET /user/stats - User statistics (for OverviewTab)
  app.get("/user/stats", async (request, reply) => {
    try {
      const decoded = verifyAuth(request);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { wins: true, losses: true, createdAt: true },
      });

      if (!user) {
        return reply
          .status(404)
          .send({ error: "USER_NOT_FOUND", message: "User not found" });
      }

      const totalMatches = user.wins + user.losses;
      const winRate = totalMatches > 0 ? (user.wins / totalMatches) * 100 : 0;

      return reply.send({
        wins: user.wins,
        losses: user.losses,
        totalMatches,
        winRate: Math.round(winRate * 10) / 10,
        currentWinStreak: 0,
        longestWinStreak: 0,
        monthlyWins: 0,
        source: "game_api",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      console.error("Get stats error:", error);
      return reply.status(500).send({
        error: "STATS_FETCH_FAILED",
        message: "Failed to fetch statistics",
      });
    }
  });

  // POST /user/upload-avatar - Profile picture upload (placeholder)
  app.post("/user/avatar", async (request, reply) => {
    try {
      const decoded = verifyAuth(request);

      return reply.status(501).send({
        error: "NOT_IMPLEMENTED",
        message: "Avatar upload functionality not yet implemented",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      return reply
        .status(500)
        .send({ error: "UPLOAD_FAILED", message: "Upload failed" });
    }
  });

  /* **********************************************************************
   * GET /user/avatars - Get available avatars (for avatar selection)
   ************************************************************************ */
  app.get("/user/avatars", async (request, reply) => {
    try {
      const avatars = [
        {
          id: "AstroAce",
          name: "Astro Ace",
          imageUrl: "/avatars/astro_ace.png", // Keep consistent with your actual file names
          description: "Space explorer, ready for any cosmic challenge.",
        },
        {
          id: "PixelPirate",
          name: "Pixel Pirate",
          imageUrl: "/avatars/pixel_pirate.png",
          description: "A swashbuckler who sails the digital seas.",
        },
        {
          id: "RoboRacer",
          name: "Robo Racer",
          imageUrl: "/avatars/robo_racer.png",
          description: "Futuristic racer, built for speed and style.",
        },
        {
          id: "ShadowNinja",
          name: "Shadow Ninja",
          imageUrl: "/avatars/shadow_ninja.png",
          description: "Silent, swift, and always in control.",
        },
        {
          id: "CyberKitty",
          name: "Cyber Kitty",
          imageUrl: "/avatars/cyber_kitty.png",
          description: "Sleek, curious, and a master of the cyber world.",
        },
        {
          id: "MysticMage",
          name: "Mystic Mage",
          imageUrl: "/avatars/mystic_mage.png",
          description: "Wielder of ancient arcane powers.",
        },
        {
          id: "CaptainQuasar",
          name: "Captain Quasar",
          imageUrl: "/avatars/captain_quasar.png",
          description: "Defender of the galaxies, always vigilant.",
        },
        {
          id: "NeonSamurai",
          name: "Neon Samurai",
          imageUrl: "/avatars/neon_samurai.png",
          description: "Blade of light, honor in every move.",
        },
        {
          id: "RocketRaccoon",
          name: "Rocket Raccoon",
          imageUrl: "/avatars/rocket_raccoon.png",
          description: "Inventive and quick, with a nose for victory.",
        },
        {
          id: "JungleJaguar",
          name: "Jungle Jaguar",
          imageUrl: "/avatars/jungle_jaguar.png",
          description: "Agile and powerful, ruler of the jungle.",
        },
        {
          id: "AquaSpirit",
          name: "Aqua Spirit",
          imageUrl: "/avatars/aqua_spirit.png",
          description: "Calm and mysterious, master of the waves.",
        },
        {
          id: "DesertPhantom",
          name: "Desert Phantom",
          imageUrl: "/avatars/desert_phantom.png",
          description: "A wanderer with secrets hidden in the sands.",
        },
      ];

      return reply.send(avatars);
    } catch (error) {
      console.error("Get avatars error:", error);
      return reply.status(500).send({
        error: "AVATARS_FETCH_FAILED",
        message: "Failed to fetch avatars",
      });
    }
  });
}
