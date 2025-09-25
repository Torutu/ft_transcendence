-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "email" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorURL" TEXT,
    "twoFactorRegistered" BOOLEAN NOT NULL DEFAULT false,
    "googleId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'other',
    "favAvatar" TEXT NOT NULL DEFAULT 'None',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "profilePic" TEXT,
    "online_status" TEXT NOT NULL DEFAULT 'offline',
    "last_activity" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" DATETIME,
    "auth_provider" TEXT NOT NULL DEFAULT 'email',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Friendship" (
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "sender_username" TEXT NOT NULL,
    "receiver_username" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NotFriend',

    PRIMARY KEY ("sender_id", "receiver_id"),
    CONSTRAINT "Friendship_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id_game" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_user" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rounds_json" TEXT NOT NULL,
    "game_name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");
