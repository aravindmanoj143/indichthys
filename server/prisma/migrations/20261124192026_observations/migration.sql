-- CreateTable
CREATE TABLE "Observation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "observedAt" DATETIME,
    "latitude" REAL,
    "longitude" REAL,
    "publicLatitude" REAL,
    "publicLongitude" REAL,
    "accuracyM" INTEGER,
    "placeName" TEXT,
    "waterBody" TEXT,
    "habitat" TEXT,
    "individuals" INTEGER,
    "captive" BOOLEAN NOT NULL DEFAULT false,
    "geoprivacy" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "taxonName" TEXT,
    "gbifKey" INTEGER,
    "taxonRank" TEXT,
    "qualityGrade" TEXT NOT NULL DEFAULT 'casual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObservationPhoto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "observationId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationPhoto_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObservationIdentification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "observationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "taxonName" TEXT NOT NULL,
    "gbifKey" INTEGER,
    "taxonRank" TEXT,
    "comment" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationIdentification_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationIdentification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Observation_qualityGrade_idx" ON "Observation"("qualityGrade");

-- CreateIndex
CREATE INDEX "Observation_gbifKey_idx" ON "Observation"("gbifKey");

-- CreateIndex
CREATE INDEX "Observation_publicLatitude_publicLongitude_idx" ON "Observation"("publicLatitude", "publicLongitude");

-- CreateIndex
CREATE INDEX "Observation_userId_idx" ON "Observation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationPhoto_fileName_key" ON "ObservationPhoto"("fileName");

-- CreateIndex
CREATE INDEX "ObservationIdentification_observationId_isCurrent_idx" ON "ObservationIdentification"("observationId", "isCurrent");
