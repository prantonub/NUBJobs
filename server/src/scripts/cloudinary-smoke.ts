/**
 * Cloudinary smoke test.
 *
 * Verifies: credentials, image upload (with on-the-fly optimisation), raw
 * document upload, delivery reachability and cleanup.
 *
 * Usage: npm run test:cloudinary   (from the server/ folder)
 */
import 'dotenv/config';
import { deflateSync } from 'zlib';
import {
  CLOUDINARY_FOLDERS,
  IMAGE_TRANSFORMATIONS,
  destroyFile,
  getCloudinaryApiKeyPreview,
  getCloudinaryCloudName,
  isCloudinaryConfigured,
  optimizeImageUrl,
  parseCloudinaryUrl,
  uploadBuffer,
} from '../lib/cloudinary';

// ── Tiny dependency-free PNG encoder ────────────────────────────────────────
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Valid RGB gradient PNG, `size`×`size` pixels. */
function createPng(size = 64): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // filter type "none"
    for (let x = 0; x < size; x += 1) {
      const pixel = rowStart + 1 + x * 3;
      raw[pixel] = Math.round((x / size) * 255);
      raw[pixel + 1] = Math.round((y / size) * 255);
      raw[pixel + 2] = 200;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function httpStatus(url: string): Promise<number> {
  const response = await fetch(url, { method: 'GET' });
  return response.status;
}

async function main(): Promise<void> {
  if (!isCloudinaryConfigured()) {
    console.error(
      '❌ Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in server/.env'
    );
    process.exitCode = 1;
    return;
  }

  console.log(`☁️  Cloud: ${getCloudinaryCloudName()}`);
  console.log(`🔑 API key: ${getCloudinaryApiKeyPreview()}`);
  console.log('   (both values come from server/.env — they must match the Cloudinary dashboard exactly)');

  const uploadedUrls: string[] = [];
  let ok = true;

  try {
    const photo = await uploadBuffer(createPng(64), {
      folder: CLOUDINARY_FOLDERS.smokeTests,
      publicId: `profile-photos/smoke-${Date.now()}`,
      resourceType: 'image',
      transformation: IMAGE_TRANSFORMATIONS.profilePhoto,
    });
    uploadedUrls.push(photo.url);
    console.log(`✅ Image uploaded → ${photo.url}`);
    console.log(`   ${photo.width}x${photo.height}px · ${photo.bytes} bytes · ${photo.format}`);

    const thumbnailUrl = optimizeImageUrl(photo.url, { width: 32, height: 32, crop: 'fill' });
    const thumbnailStatus = await httpStatus(thumbnailUrl);
    ok = ok && thumbnailStatus === 200;
    console.log(`${thumbnailStatus === 200 ? '✅' : '❌'} Optimised 32x32 rendition → HTTP ${thumbnailStatus}`);

    const stamp = Date.now();
    const resume = await uploadBuffer(Buffer.from('%PDF-1.4\n% nubjobs smoke test\n%%EOF\n', 'utf8'), {
      folder: CLOUDINARY_FOLDERS.smokeTests,
      publicId: `resumes/smoke-${stamp}.pdf`,
      resourceType: 'raw',
    });
    uploadedUrls.push(resume.url);
    console.log(`✅ Raw document uploaded → ${resume.url}`);

    const documentStatus = await httpStatus(resume.url);
    ok = ok && documentStatus === 200;
    console.log(`${documentStatus === 200 ? '✅' : '❌'} Resume reachable → HTTP ${documentStatus}`);
  } catch (error) {
    ok = false;
    console.error('❌ Upload failed:', error instanceof Error ? error.message : error);
  } finally {
    for (const url of uploadedUrls) {
      const parsed = parseCloudinaryUrl(url);
      if (!parsed) continue;
      const deleted = await destroyFile(parsed.publicId, parsed.resourceType);
      console.log(`${deleted ? '🧹' : '⚠️ '} cleanup ${parsed.publicId} → ${deleted ? 'deleted' : 'not deleted'}`);
    }
  }

  console.log(ok ? '✅ Cloudinary smoke test passed' : '❌ Cloudinary smoke test failed');
  if (!ok) process.exitCode = 1;
}

void main();
