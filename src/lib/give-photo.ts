/**
 * ONE GIVE PHOTO, MADE SAFE TO SHARE.
 *
 *   1. Decode with the EXIF orientation applied (createImageBitmap with
 *      imageOrientation "from-image"; browsers that ignore the option already
 *      honour EXIF orientation for images by default).
 *   2. Resize so the long edge is at most 1600px.
 *   3. Re-encode through a canvas as WebP at 0.8 (JPEG 0.8 where the browser
 *      can't encode WebP). A canvas re-encode carries NO metadata, so every
 *      EXIF / GPS / maker tag is gone.
 * HEIC (or anything the browser can't decode) resolves to { ok: false } so
 * the flow can say one quiet line instead of crashing.
 */
import { supabase } from "@/integrations/supabase/client";

export const PHOTO_LONG_EDGE = 1600;
export const PHOTO_QUALITY = 0.8;

export type PreparedPhoto = { blob: Blob; url: string; type: "image/webp" | "image/jpeg"; width: number; height: number };

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    /* Fallback: an <img> (also applies EXIF orientation in modern browsers). */
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
}

export async function prepareGivePhoto(
  file: Blob,
): Promise<{ ok: true; photo: PreparedPhoto } | { ok: false }> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    return { ok: false };
  }
  const w0 = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h0 = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!w0 || !h0) return { ok: false };
  const scale = Math.min(1, PHOTO_LONG_EDGE / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false };
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();
  let blob = await toBlob(canvas, "image/webp");
  let type: PreparedPhoto["type"] = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg");
    type = "image/jpeg";
  }
  if (!blob) return { ok: false };
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob!);
  });
  return { ok: true, photo: { blob, url, type, width, height } };
}

const BUCKET = "post-media";
const LINK_SECONDS = 60 * 60 * 24 * 365;

/**
 * Upload to post-media at give-photos/{user_id}/{item_id}.webp|jpg. The
 * bucket's existing policies (owner-only insert/update/delete, read for
 * signed-in users) fit. Returns null on ANY failure: the give still saves
 * without its photo and the flow says so quietly.
 */
export async function uploadGivePhoto(
  itemId: string,
  photo: PreparedPhoto,
): Promise<{ path: string; url: string } | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;
    const path = `give-photos/${userId}/${itemId}.${photo.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, photo.blob, { contentType: photo.type, upsert: true });
    if (error) return null;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
    return data?.signedUrl ? { path, url: data.signedUrl } : null;
  } catch {
    return null;
  }
}
