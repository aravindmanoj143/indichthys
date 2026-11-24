-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Observation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "guestName" TEXT,
    "guestEmail" TEXT,
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
INSERT INTO "new_Observation" ("accuracyM", "captive", "createdAt", "gbifKey", "geoprivacy", "habitat", "id", "individuals", "latitude", "longitude", "notes", "observedAt", "placeName", "publicLatitude", "publicLongitude", "qualityGrade", "taxonName", "taxonRank", "updatedAt", "userId", "waterBody") SELECT "accuracyM", "captive", "createdAt", "gbifKey", "geoprivacy", "habitat", "id", "individuals", "latitude", "longitude", "notes", "observedAt", "placeName", "publicLatitude", "publicLongitude", "qualityGrade", "taxonName", "taxonRank", "updatedAt", "userId", "waterBody" FROM "Observation";
DROP TABLE "Observation";
ALTER TABLE "new_Observation" RENAME TO "Observation";
CREATE INDEX "Observation_qualityGrade_idx" ON "Observation"("qualityGrade");
CREATE INDEX "Observation_gbifKey_idx" ON "Observation"("gbifKey");
CREATE INDEX "Observation_publicLatitude_publicLongitude_idx" ON "Observation"("publicLatitude", "publicLongitude");
CREATE INDEX "Observation_userId_idx" ON "Observation"("userId");
CREATE TABLE "new_ObservationIdentification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "observationId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestName" TEXT,
    "taxonName" TEXT NOT NULL,
    "gbifKey" INTEGER,
    "taxonRank" TEXT,
    "comment" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationIdentification_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationIdentification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ObservationIdentification" ("comment", "createdAt", "gbifKey", "id", "isCurrent", "observationId", "taxonName", "taxonRank", "userId") SELECT "comment", "createdAt", "gbifKey", "id", "isCurrent", "observationId", "taxonName", "taxonRank", "userId" FROM "ObservationIdentification";
DROP TABLE "ObservationIdentification";
ALTER TABLE "new_ObservationIdentification" RENAME TO "ObservationIdentification";
CREATE INDEX "ObservationIdentification_observationId_isCurrent_idx" ON "ObservationIdentification"("observationId", "isCurrent");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
