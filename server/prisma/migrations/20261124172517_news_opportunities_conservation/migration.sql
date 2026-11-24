-- AlterTable
ALTER TABLE "Institution" ADD COLUMN "description" TEXT;

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'news',
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "authorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'conference',
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "venue" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "organiser" TEXT,
    "url" TEXT,
    "registrationDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedById" INTEGER,
    "moderationNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "institutionId" INTEGER,
    "description" TEXT NOT NULL,
    "eligibility" TEXT,
    "amount" TEXT,
    "location" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "deadline" DATETIME,
    "startDate" DATETIME,
    "applyUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedById" INTEGER,
    "moderationNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConservationProject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'project',
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" INTEGER,
    "organisation" TEXT,
    "region" TEXT,
    "focusSpecies" TEXT,
    "projectStatus" TEXT NOT NULL DEFAULT 'ongoing',
    "startYear" INTEGER,
    "endYear" INTEGER,
    "url" TEXT,
    "howToJoin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedById" INTEGER,
    "moderationNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConservationProject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConservationProject_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_status_publishedAt_idx" ON "NewsPost"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startsOn_idx" ON "Event"("status", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE INDEX "Opportunity_section_status_deadline_idx" ON "Opportunity"("section", "status", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "ConservationProject_slug_key" ON "ConservationProject"("slug");

-- CreateIndex
CREATE INDEX "ConservationProject_status_kind_idx" ON "ConservationProject"("status", "kind");
