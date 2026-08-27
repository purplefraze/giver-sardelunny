/**
 * SHARED ACTIVITY — ONE ITEM, ONE RECORD, EVERY TESTER.
 *
 * My own gives/wishes/trades/borrows are still authored locally by the Living G
 * (src/data/items.ts). This module is the two-way door to the shared dev
 * database:
 *
 *   PUSH   my items -> public.items (keyed by local_id, so no duplicates)
 *   PULL   everyone else's published items -> itemsStore, as "cloud:<id>"
 *
 * Nothing here changes how an item looks or behaves; it only makes the
 * community real instead of browser-local.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  ME_ID,
  itemsStore,
  type Item,
  type ItemDetails,
  type ItemType,
} from "@/data/items";
import { sessionStore } from "@/data/cloud/session";
import { directoryStore, localIdForProfile } from "@/data/cloud/directory";

const CLOUD = "cloud:";

let started = false;
let pushing = false;
let pushQueued = false;

type Row = {
  id: string;
  owner_id: string;
  local_id: string | null;
  type: string;
  side: string | null;
  text: string;
  offer: string | null;
  want: string | null;
  note: string | null;
  status: string;
  priority: number;
  published: boolean;
  photos: unknown;
  details: unknown;
  distance_km: number | null;
  boost_count: number;
  created_at: string;
  updated_at: string;
};

function rowToItem(row: Row): Item | null {
  const owner = row.owner_id === sessionStore.get().profile?.id ? ME_ID : localIdForProfile(row.owner_id);
  if (!owner) return null;
  return {
    id: `${CLOUD}${row.id}`,
    ownerId: owner,
    type: row.type as ItemType,
    text: row.text,
    ...(row.offer ? { offer: row.offer } : {}),
    ...(row.want ? { want: row.want } : {}),
    ...(row.note ? { note: row.note } : {}),
    ...(row.side ? { side: row.side as "borrow" | "lend" } : {}),
    ...(Array.isArray(row.photos) && row.photos.length
      ? { photos: row.photos as string[] }
      : {}),
    ...(row.details && Object.keys(row.details as object).length
      ? { details: row.details as ItemDetails }
      : {}),
    status: row.status as Item["status"],
    priority: row.priority,
    published: row.published,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    boostCount: row.boost_count,
    ...(row.distance_km != null ? { distanceKm: Number(row.distance_km) } : {}),
    edited: true,
  };
}

export async function pullItems() {
  const { data } = await supabase
    .from("items")
    .select("*")
    .neq("status", "archived");
  const rows = (data ?? []) as unknown as Row[];
  const items = rows
    .map(rowToItem)
    .filter((i): i is Item => Boolean(i));
  itemsStore.mergeRemote(items);
}

export async function pushItems() {
  const profileId = sessionStore.get().profile?.id;
  if (!profileId) return;
  if (pushing) {
    pushQueued = true;
    return;
  }
  pushing = true;
  try {
    const mine = itemsStore.get().items.filter((i) => i.ownerId === ME_ID);
    if (mine.length) {
      const { error } = await supabase.from("items").upsert(
        mine.map((i) => ({
          owner_id: profileId,
          local_id: i.id,
          type: i.type,
          side: i.side ?? null,
          text: i.text,
          offer: i.offer ?? null,
          want: i.want ?? null,
          note: i.note ?? null,
          status: i.status,
          priority: i.priority,
          published: i.published,
          photos: i.photos ?? [],
          details: i.details ?? {},
          boost_count: i.boostCount ?? 0,
        })),
        { onConflict: "owner_id,local_id" },
      );
      if (error) throw error;
    }
  } finally {
    pushing = false;
    if (pushQueued) {
      pushQueued = false;
      void pushItems();
    }
  }
}

/** The cloud id behind an item, when it has one. */
export async function cloudItemId(localItemId: string): Promise<string | null> {
  if (localItemId.startsWith(CLOUD)) return localItemId.slice(CLOUD.length);
  const profileId = sessionStore.get().profile?.id;
  if (!profileId) return null;
  await pushItems();
  const { data } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", profileId)
    .eq("local_id", localItemId)
    .maybeSingle();
  return data?.id ?? null;
}

/** A cloud item id -> the local id this device knows it by. */
export function localItemIdFor(cloudId: string): string | null {
  const items = itemsStore.get().items;
  const remote = items.find((i) => i.id === `${CLOUD}${cloudId}`);
  return remote ? remote.id : null;
}

export function startItemsSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedulePush = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushItems(), 600);
  };

  itemsStore.subscribe(schedulePush);
  directoryStore.subscribe(() => void pullItems());

  const run = () => {
    if (sessionStore.get().status !== "ready" || !sessionStore.get().profile) return;
    void pushItems();
    void pullItems();
  };
  sessionStore.subscribe(run);
  run();

  supabase
    .channel("items-shared")
    .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
      void pullItems();
    })
    .subscribe();

  window.setInterval(() => void pullItems(), 20000);
}

export const isCloudItem = (id: string) => id.startsWith(CLOUD);
