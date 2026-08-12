import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { apiRequest } from '../api/client';

export type UploadEntity = 'task-photo' | 'avatar' | 'receipt';

interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

interface PresignDownloadResponse {
  url: string;
  expiresIn: number;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

function getImageWidth(uri: string): Promise<number> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width) => resolve(width),
      () => resolve(0), // unknown — skip the resize step, still compress
    );
  });
}

// Downscales/recompresses a locally picked photo before it ever leaves the
// device — receipts and task-completion photos come straight off the camera
// at full sensor resolution otherwise, which is far more detail than the app
// displays anywhere. Always re-encodes as JPEG (transparency isn't used for
// photos/receipts/avatars in this app, all of which come from camera/gallery
// picks, not generated icons).
async function compressImage(localUri: string): Promise<{ uri: string; contentType: 'image/jpeg' }> {
  const width = await getImageWidth(localUri);
  const actions = width > MAX_DIMENSION ? [{ resize: { width: MAX_DIMENSION } }] : [];
  const result = await manipulateAsync(localUri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, contentType: 'image/jpeg' };
}

// Uploads a local image (picked via expo-image-picker/camera) directly to R2
// using a short-lived presigned PUT URL — the file never passes through our
// own server. Returns the R2 object key, which is what gets persisted in the
// relevant DB field (Task.completionPhotoUrl, FamilyMember.avatar, etc.)
// instead of the local-only file:// URI that was stored before this existed.
export async function uploadImageToR2(localUri: string, entity: UploadEntity): Promise<string> {
  const { uri, contentType } = await compressImage(localUri);

  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();

  const { key, uploadUrl } = await apiRequest<PresignUploadResponse>('/uploads/presign-upload', {
    method: 'POST',
    body: JSON.stringify({ entity, contentType, contentLength: blob.size }),
  });

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`Upload to storage failed: ${putRes.status}`);

  return key;
}

// In-memory cache so multiple components displaying the same R2 key (e.g.
// the same member's avatar rendered in several places on one screen) don't
// each independently request a fresh signed URL — presigned GET URLs are
// valid for an hour server-side, so a shorter client-side cache is safe.
const downloadUrlCache = new Map<string, { url: string; fetchedAt: number }>();
const CACHE_TTL_MS = 45 * 60 * 1000;

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const cached = downloadUrlCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.url;
  }
  const { url } = await apiRequest<PresignDownloadResponse>('/uploads/presign-download', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
  downloadUrlCache.set(key, { url, fetchedAt: Date.now() });
  return url;
}

// R2 keys look like "families/<id>/<entity>/<uuid>.jpg" — anything else
// (a local file:// URI, or a plain http(s) URL from before this existed) is
// already directly usable and doesn't need signing.
export function isR2Key(value?: string | null): value is string {
  return !!value && value.startsWith('families/');
}
