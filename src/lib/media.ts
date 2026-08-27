/**
 * MEDIA THAT OUTLIVES ONE PHONE.
 *
 * A picture kept as a data URL only ever exists on the device that chose it —
 * fine for a sketch, useless for a shared dev build where another tester has to
 * SEE what you posted. So media chosen while signed in is uploaded to the
 * backend and the record keeps a long-lived link instead of the bytes.
 *
 * Two deliberate details:
 *   · a GIF is uploaded untouched, because redrawing it kills the animation;
 *   · when the upload can't happen (signed out, offline), we fall back to the
 *     local data URL so creating a post NEVER fails because of a picture.
 */

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "post-media";
/* Long enough that a dev/test link never rots mid-session. */
const LINK_SECONDS = 60 * 60 * 24 * 365;

const isGif = (file: File) => file.type === "image/gif";

/** Already a hosted link (so we never re-upload something we stored before). */
export const isHostedMedia = (src: string) => /^https?:\/\//.test(src);

function extensionFor(file: File) {
  if (isGif(file)) return "gif";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Upload one chosen file and return a link everybody can load, or null when
 * uploading isn't possible right now.
 */
export async function uploadMedia(
  file: Blob,
  { extension = "jpg" }: { extension?: string } = {},
): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) return null;

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, LINK_SECONDS);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** A data URL back to bytes, so we can upload what we already shrank. */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [head, body] = dataUrl.split(",");
    if (!head || !body) return null;
    const type = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
    const bytes = atob(body);

    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
    return new Blob([buffer], { type });
  } catch {
    return null;
  }
}

/**
 * THE ONE WAY A CHOSEN PICTURE BECOMES SOMETHING OTHERS CAN SEE.
 *
 * `shrink` turns a file into the small data URL the app already uses; GIFs skip
 * it entirely. The result is a hosted link when we're signed in, and the local
 * data URL otherwise.
 */
export async function storeChosenImage(
  file: File,
  shrink: (file: File) => Promise<string>,
): Promise<string> {
  if (isGif(file)) {
    const hosted = await uploadMedia(file, { extension: "gif" });
    if (hosted) return hosted;
    /* No upload possible: keep the animation locally. */
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("unreadable"));
      reader.readAsDataURL(file);
    });
  }

  const small = await shrink(file);
  const blob = dataUrlToBlob(small);
  if (blob) {
    const hosted = await uploadMedia(blob, { extension: extensionFor(file) });
    if (hosted) return hosted;
  }
  return small;
}
