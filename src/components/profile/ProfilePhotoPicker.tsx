import { useCallback, useState, type ReactNode } from "react";
import { PhotoCropper } from "@/components/profile/PhotoCropper";
import { myProfileStore, type PhotoCrop } from "@/data/my-profile";
import { pickOneImage } from "@/lib/pick-image";
import { buzz } from "@/lib/haptics";
import { dataUrlToBlob, uploadMedia } from "@/lib/media";
import { sessionStore } from "@/data/cloud/session";

/**
 * THE ONE PROFILE PHOTO FLOW, wherever a photo is chosen.
 *
 * Choose → position inside the real circle → confirm. Nothing is committed
 * until the circle is confirmed, and the confirmed crop is stored beside the
 * untouched picture so "reposition" can always reopen exactly where it left off.
 */
export function useProfilePhoto() {
  /** The picture currently being positioned, and the crop it starts from. */
  const [pending, setPending] = useState<{ source: string; crop: PhotoCrop | null } | null>(null);
  /** Reading a picture off the device takes a moment; say so. */
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  /** CHOOSE A NEW PICTURE. A new picture always starts from a fresh circle. */
  const choose = useCallback(async () => {
    buzz();
    setFailed(false);
    setLoading(true);
    try {
      const source = await pickOneImage();
      if (!source) return;
      setPending({ source, crop: null });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /** REOPEN THE CIRCLE for a picture that is already mine. */
  const reposition = useCallback((source: string, crop: PhotoCrop | null) => {
    buzz();
    setPending({ source, crop });
  }, []);

  /** The cropper itself, rendered by whichever screen is using this flow. */
  const cropper: ReactNode = pending ? (
    <PhotoCropper
      source={pending.source}
      initial={pending.crop}
      onCancel={() => setPending(null)}
      onConfirm={async (cropped, crop) => {
        /*
          CONFIRM MEANS SAVED. Keep the positioning screen present while the
          chosen circle is uploaded, then commit the durable URL in one move.
          If this phone is offline, the exact same circle is retained locally.
        */
        const blob = dataUrlToBlob(cropped);
        const hosted = blob ? await uploadMedia(blob, { extension: "jpg" }) : null;
        const savedPhoto = hosted ?? cropped;
        myProfileStore.setPhoto(savedPhoto, pending.source, crop);
        /* Do not close on a promise that the background mirror may fulfil later:
           when a hosted URL exists, persist it to this account before confirming. */
        if (hosted) await sessionStore.saveProfile({ photo_url: hosted });
        setPending(null);
      }}
    />
  ) : null;

  return { choose, reposition, cropper, loading, failed, positioning: Boolean(pending) };
}
