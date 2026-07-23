-- CreateEnum
CREATE TYPE "VisionProviderType" AS ENUM ('ANTHROPIC', 'OPENAI', 'MISTRAL');

-- CreateTable
CREATE TABLE "VisionProviderSetting" (
    "id" TEXT NOT NULL,
    "provider" "VisionProviderType" NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionProviderSetting_pkey" PRIMARY KEY ("id")
);
