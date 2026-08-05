-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ENCODER', 'DECODER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "type" "DeviceType" NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "netmask" TEXT NOT NULL DEFAULT '255.255.0.0',
    "gateway" TEXT,
    "dhcp" BOOLEAN NOT NULL DEFAULT false,
    "firmware" TEXT,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "uptimeSec" INTEGER NOT NULL DEFAULT 0,
    "inSystem" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" SERIAL NOT NULL,
    "signal" TEXT NOT NULL,
    "decoderId" INTEGER NOT NULL,
    "encoderId" INTEGER,
    "follow" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoWall" (
    "id" SERIAL NOT NULL,
    "wallId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "monitoring" BOOLEAN NOT NULL DEFAULT false,
    "bezel" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "VideoWall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoWallPanel" (
    "id" SERIAL NOT NULL,
    "wallId" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "decoderId" INTEGER,

    CONSTRAINT "VideoWallPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallPreset" (
    "id" SERIAL NOT NULL,
    "wallId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL DEFAULT 'A',
    "layout" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WallPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "routes" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiLayout" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pages" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "UiLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_mac_key" ON "Device"("mac");

-- CreateIndex
CREATE UNIQUE INDEX "Device_type_deviceId_key" ON "Device"("type", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_signal_decoderId_key" ON "Route"("signal", "decoderId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoWall_wallId_key" ON "VideoWall"("wallId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoWallPanel_wallId_row_col_key" ON "VideoWallPanel"("wallId", "row", "col");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "UiLayout_userId_key" ON "UiLayout"("userId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_decoderId_fkey" FOREIGN KEY ("decoderId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_encoderId_fkey" FOREIGN KEY ("encoderId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWallPanel" ADD CONSTRAINT "VideoWallPanel_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "VideoWall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWallPanel" ADD CONSTRAINT "VideoWallPanel_decoderId_fkey" FOREIGN KEY ("decoderId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPreset" ADD CONSTRAINT "WallPreset_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "VideoWall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preset" ADD CONSTRAINT "Preset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UiLayout" ADD CONSTRAINT "UiLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
