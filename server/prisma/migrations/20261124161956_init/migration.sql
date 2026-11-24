-- CreateTable
CREATE TABLE "Taxon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gbifKey" INTEGER,
    "scientificName" TEXT NOT NULL,
    "authorship" TEXT,
    "rank" TEXT NOT NULL DEFAULT 'species',
    "family" TEXT,
    "order" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unit" TEXT,
    "group" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CharacterState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "characterId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CharacterState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxonCharacterState" (
    "taxonId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,

    PRIMARY KEY ("taxonId", "stateId"),
    CONSTRAINT "TaxonCharacterState_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaxonCharacterState_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "CharacterState" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxonNumericRange" (
    "taxonId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "min" REAL NOT NULL,
    "max" REAL NOT NULL,
    "source" TEXT,

    PRIMARY KEY ("taxonId", "characterId"),
    CONSTRAINT "TaxonNumericRange_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaxonNumericRange_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdentificationKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "scope" TEXT,
    "authors" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KeyLead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyId" INTEGER NOT NULL,
    "couplet" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "nextCouplet" INTEGER,
    "taxonId" INTEGER,
    "resultName" TEXT,
    "imageUrl" TEXT,
    CONSTRAINT "KeyLead_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "IdentificationKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyLead_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegionalGuide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT,
    "authors" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuideEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guideId" INTEGER NOT NULL,
    "taxonId" INTEGER NOT NULL,
    "fieldMarks" TEXT,
    "similar" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GuideEntry_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "RegionalGuide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideEntry_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdentificationRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
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
    CONSTRAINT "IdentificationRequest_verifiedTaxonId_fkey" FOREIGN KEY ("verifiedTaxonId") REFERENCES "Taxon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestPhoto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestPhoto_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "IdentificationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdentificationProposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "taxonId" INTEGER NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "confidence" TEXT NOT NULL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentificationProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "IdentificationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IdentificationProposal_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposalId" INTEGER NOT NULL,
    "reviewer" TEXT NOT NULL,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalReview_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "IdentificationProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Taxon_gbifKey_key" ON "Taxon"("gbifKey");

-- CreateIndex
CREATE INDEX "Taxon_scientificName_idx" ON "Taxon"("scientificName");

-- CreateIndex
CREATE UNIQUE INDEX "Character_code_key" ON "Character"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterState_characterId_code_key" ON "CharacterState"("characterId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "IdentificationKey_slug_key" ON "IdentificationKey"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "KeyLead_keyId_couplet_label_key" ON "KeyLead"("keyId", "couplet", "label");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalGuide_slug_key" ON "RegionalGuide"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GuideEntry_guideId_taxonId_key" ON "GuideEntry"("guideId", "taxonId");

-- CreateIndex
CREATE INDEX "IdentificationRequest_status_idx" ON "IdentificationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RequestPhoto_fileName_key" ON "RequestPhoto"("fileName");
