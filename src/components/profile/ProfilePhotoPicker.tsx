import { useCallback, useState, type ReactNode } from "react";
import { PhotoCropper } from "@/components/profile/PhotoCropper";
import { myProfileStore, type PhotoCrop } from "@/data/my-profile";
import { pickOneImage } from "@/lib/pick-image";
import { buzz } from "@/lib/haptics";

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
      onConfirm={(cropped, crop) => {
        myProfileStore.setPhoto(cropped, pending.source, crop);
        setPending(null);
      }}
    />
  ) : null;

  return { choose, reposition, cropper, loading, failed, positioning: Boolean(pending) };
}
