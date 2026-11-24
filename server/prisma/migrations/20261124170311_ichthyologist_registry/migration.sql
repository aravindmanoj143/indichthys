-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ichthyologist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "honorific" TEXT,
    "position" TEXT,
    "bio" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "region" TEXT,
    "city" TEXT,
    "contactEmail" TEXT,
    "website" TEXT,
    "orcid" TEXT,
    "googleScholar" TEXT,
    "researchGate" TEXT,
    "acceptingCollaboration" BOOLEAN NOT NULL DEFAULT true,
    "acceptingStudents" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verificationEvidence" TEXT,
    "verifiedAt" DATETIME,
    "verifiedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ichthyologist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ichthyologist_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpertiseArea" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ProfileExpertise" (
    "profileId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,

    PRIMARY KEY ("profileId", "areaId"),
    CONSTRAINT "ProfileExpertise_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileExpertise_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ExpertiseArea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchInterest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ResearchInterest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Affiliation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Affiliation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affiliation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "year" INTEGER,
    "journal" TEXT,
    "volume" TEXT,
    "pages" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'article',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PublicationAuthor" (
    "publicationId" INTEGER NOT NULL,
    "profileId" INTEGER NOT NULL,

    PRIMARY KEY ("publicationId", "profileId"),
    CONSTRAINT "PublicationAuthor_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicationAuthor_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "senderUserId" INTEGER,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Ichthyologist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IdentificationProposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "taxonId" INTEGER NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "confidence" TEXT NOT NULL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentificationProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "IdentificationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IdentificationProposal_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IdentificationProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IdentificationProposal" ("confidence", "createdAt", "id", "isExpert", "proposedBy", "reasoning", "requestId", "taxonId") SELECT "confidence", "createdAt", "id", "isExpert", "proposedBy", "reasoning", "requestId", "taxonId" FROM "IdentificationProposal";
DROP TABLE "IdentificationProposal";
ALTER TABLE "new_IdentificationProposal" RENAME TO "IdentificationProposal";
CREATE TABLE "new_IdentificationRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "submitterId" INTEGER,
    "observedOn" DATETIME,
    "locality" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" REAL,
    "longitude" REAL,
    "habitat" TEXT,
    "characterNotes" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "verifiedTaxonId" INTEGER,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IdentificationRequest_verifiedTaxonId_fkey" FOREIGN KEY ("verifiedTaxonId") REFERENCES "Taxon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IdentificationRequest_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IdentificationRequest" ("characterNotes", "country", "createdAt", "habitat", "id", "latitude", "locality", "longitude", "notes", "observedOn", "region", "status", "submitterEmail", "submitterName", "title", "updatedAt", "verifiedAt", "verifiedTaxonId") SELECT "characterNotes", "country", "createdAt", "habitat", "id", "latitude", "locality", "longitude", "notes", "observedOn", "region", "status", "submitterEmail", "submitterName", "title", "updatedAt", "verifiedAt", "verifiedTaxonId" FROM "IdentificationRequest";
DROP TABLE "IdentificationRequest";
ALTER TABLE "new_IdentificationRequest" RENAME TO "IdentificationRequest";
CREATE INDEX "IdentificationRequest_status_idx" ON "IdentificationRequest"("status");
CREATE TABLE "new_ProposalReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposalId" INTEGER NOT NULL,
    "reviewer" TEXT NOT NULL,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalReview_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "IdentificationProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProposalReview" ("comment", "createdAt", "decision", "id", "isExpert", "proposalId", "reviewer") SELECT "comment", "createdAt", "decision", "id", "isExpert", "proposalId", "reviewer" FROM "ProposalReview";
DROP TABLE "ProposalReview";
ALTER TABLE "new_ProposalReview" RENAME TO "ProposalReview";
CREATE UNIQUE INDEX "ProposalReview_proposalId_userId_key" ON "ProposalReview"("proposalId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ichthyologist_userId_key" ON "Ichthyologist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ichthyologist_slug_key" ON "Ichthyologist"("slug");

-- CreateIndex
CREATE INDEX "Ichthyologist_verificationStatus_idx" ON "Ichthyologist"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertiseArea_slug_key" ON "ExpertiseArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchInterest_profileId_label_key" ON "ResearchInterest"("profileId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_country_key" ON "Institution"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_doi_key" ON "Publication"("doi");

-- CreateIndex
CREATE INDEX "ContactRequest_profileId_status_idx" ON "ContactRequest"("profileId", "status");
