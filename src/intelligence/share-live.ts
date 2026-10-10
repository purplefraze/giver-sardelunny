import { defaultExpiry, expiresAt } from "@/data/give-when";
import { removePin, savePin } from "@/data/give-pins";
import { itemsStore } from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { ensureLiveSession } from "@/data/cloud/session";
import { confirmItemSaved, pullItems } from "@/data/cloud/items-sync";
import { prepareGivePhoto, uploadGivePhoto } from "@/lib/give-photo";
import { TOPIC_OF } from "@/components/give/GiveFlow";
import { conversation } from "@/intelligence/voice-conversation";
import { createShareCoordinator } from "@/intelligence/share-coordinator";

/** The production Share coordinator, wired to the real stores and backend. */
export const shareCoordinator = createShareCoordinator({
  ensureLiveSession: () => ensureLiveSession(),
  addItem: (category, text, parts, note, extra) => myProfileStore.addItem(category, text, parts, note, extra),
  getItem: (id) => itemsStore.get().items.find((i) => i.id === id),
  patchItem: (id, fields, remove) => itemsStore.patch(id, fields, remove),
  savePin,
  removePin,
  savePrivatePlaces: (id, exact) => {
    try {
      const key = `giver.private-places.${id}`;
      if (exact) localStorage.setItem(key, JSON.stringify(exact)); else localStorage.removeItem(key);
    } catch {
      /* storage unavailable — the public post already hides the address */
    }
  },
  uploadGivePhoto: async (id, file) => {
    const prep = await prepareGivePhoto(file);
    return prep.ok ? await uploadGivePhoto(id, prep.photo) : null;
  },
  confirmItemSaved,
  pullItems,
  giveMeta: (kind) => ({ topic: TOPIC_OF[kind], expiresAt: expiresAt(defaultExpiry(kind), null).toISOString() }),
  conversation,
});
