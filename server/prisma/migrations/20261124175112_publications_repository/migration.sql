-- CreateTable
CREATE TABLE "PublicationTopic" (
    "publicationId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,

    PRIMARY KEY ("publicationId", "areaId"),
    CONSTRAINT "PublicationTopic_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicationTopic_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ExpertiseArea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicationTaxon" (
    "publicationId" INTEGER NOT NULL,
    "gbifKey" INTEGER NOT NULL,
    "scientificName" TEXT NOT NULL,

    PRIMARY KEY ("publicationId", "gbifKey"),
    CONSTRAINT "PublicationTaxon_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedPublication" (
    "userId" INTEGER NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "publicationId"),
    CONSTRAINT "SavedPublication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedPublication_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Publication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "year" INTEGER,
    "journal" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "publisher" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "abstract" TEXT,
    "type" TEXT NOT NULL DEFAULT 'article',
    "addedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Publication_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Publication" ("authors", "createdAt", "doi", "id", "journal", "pages", "title", "type", "url", "volume", "year") SELECT "authors", "createdAt", "doi", "id", "journal", "pages", "title", "type", "url", "volume", "year" FROM "Publication";
DROP TABLE "Publication";
ALTER TABLE "new_Publication" RENAME TO "Publication";
CREATE UNIQUE INDEX "Publication_doi_key" ON "Publication"("doi");
CREATE INDEX "Publication_year_idx" ON "Publication"("year");
CREATE INDEX "Publication_type_idx" ON "Publication"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PublicationTaxon_gbifKey_idx" ON "PublicationTaxon"("gbifKey");
