import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyRequest } from 'fastify';
import { config } from '../config';

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface SavedPhoto {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Read a multipart form: text fields plus photos saved to the upload dir under random names.
 * On error, saved photos are deleted and the error is rethrown. Call `cleanup` if a later step fails.
 */
export async function readPhotoForm(request: FastifyRequest) {
  const fields: Record<string, string> = {};
  const saved: SavedPhoto[] = [];
  const cleanup = () => Promise.all(saved.map((f) => unlink(path.join(config.uploadDir, f.fileName)).catch(() => {})));
  try {
    for await (const part of request.parts()) {
      if (part.type === 'field') {
        fields[part.fieldname] = String(part.value);
        continue;
      }
      const ext = PHOTO_TYPES[part.mimetype];
      if (!ext) {
        part.file.resume();
        throw Object.assign(new Error(`Unsupported photo type: ${part.mimetype}`), { statusCode: 400 });
      }
      if (saved.length >= config.maxPhotosPerRequest) {
        part.file.resume();
        throw Object.assign(new Error(`At most ${config.maxPhotosPerRequest} photos`), { statusCode: 400 });
      }
      const fileName = `${randomUUID()}${ext}`;
      await pipeline(part.file, createWriteStream(path.join(config.uploadDir, fileName)));
      saved.push({ fileName, originalName: part.filename.slice(0, 200), mimeType: part.mimetype, size: part.file.bytesRead });
      if (part.file.truncated) throw Object.assign(new Error('Photo too large (max 10 MB)'), { statusCode: 413 });
    }
  } catch (err) {
    await cleanup();
    throw err;
  }
  // Empty strings mean "not given".
  const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim() !== ''));
  return { fields: nonEmpty, photos: saved, cleanup };
}

/** Deletes local upload files; external photos (http(s) URLs, e.g. iNaturalist imports) are skipped. */
export const deleteUploads = (fileNames: string[]) =>
  Promise.all(fileNames.filter((f) => !/^https?:\/\//.test(f)).map((f) => unlink(path.join(config.uploadDir, f)).catch(() => {})));
