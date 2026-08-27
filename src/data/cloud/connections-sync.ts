import { supabase } from "@/integrations/supabase/client";
import { connectionsStore, type Connection } from "@/data/connections";
import { itemsStore, ME_ID, type ItemType } from "@/data/items";
import { sessionStore } from "@/data/cloud/session";
import { localIdForProfile, profileIdForLocal } from "@/data/cloud/directory";
import { changeConnectionState } from "@/lib/connections.functions";
import { notify } from "@/data/cloud/notifications";

let started = false;

function localItemId(cloudId: string) {
  return itemsStore.get().items.find((item) => item.id === `cloud:${cloudId}` || item.cloudId === cloudId)?.id ?? `cloud:${cloudId}`;
}

export function cloudConnectionId(localId: string) {
  return /^[0-9a-f-]{36}$/i.test(localId) ? localId : null;
}

export async function loadConnections() {
  const me = sessionStore.get().profile?.id;
  if (!me) return;
  const { data, error } = await supabase.from("connections").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  const rows: Connection[] = (data ?? []).map((row) => {
    const ownerId = row.owner_id === me ? ME_ID : (localIdForProfile(row.owner_id) ?? row.owner_id);
    const helperId = row.helper_id === me ? ME_ID : (localIdForProfile(row.helper_id) ?? row.helper_id);
    const confirmedBy = [
      ...(row.owner_confirmed ? [ownerId] : []),
      ...(row.helper_confirmed ? [helperId] : []),
    ];
    const item = itemsStore.get().items.find((candidate) => candidate.id === localItemId(row.item_id));
    return {
      id: row.id,
      itemId: localItemId(row.item_id),
      type: (item?.type ?? "give") as ItemType,
      ownerId,
      helperId,
      state: row.state as Connection["state"],
      ...(row.claimed_by ? { claimedBy: row.claimed_by === me ? ME_ID : (localIdForProfile(row.claimed_by) ?? row.claimed_by) } : {}),
      confirmedBy,
      handedOver: row.handed_over,
      returned: row.returned,
      ...(row.settled_at ? { settledAt: Date.parse(row.settled_at) } : {}),
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
    };
  });
  connectionsStore.mergeCloud(rows);
}

export async function startConnection(itemId: string): Promise<string> {
  const me = sessionStore.get().profile?.id;
  if (!me) throw new Error("finish joining giver first");
  const item = itemsStore.get().items.find((candidate) => candidate.id === itemId);
  if (!item || item.ownerId === ME_ID) throw new Error("this connection cannot start");
  const ownerId = profileIdForLocal(item.ownerId);
  const cloudId = item.cloudId ?? (item.id.startsWith("cloud:") ? item.id.slice(6) : null);
  if (!ownerId || !cloudId) throw new Error("this give is not available yet");
  const { data, error } = await supabase.from("connections").upsert(
    { item_id: cloudId, owner_id: ownerId, helper_id: me },
    { onConflict: "item_id,helper_id" },
  ).select("id").single();
  if (error) throw error;
  await supabase.from("conversations").upsert(
    { connection_id: data.id, item_id: cloudId, a_id: ownerId, b_id: me },
    { onConflict: "connection_id" },
  );
  await loadConnections();
  await notify({
    profileId: ownerId,
    kind: "connection",
    body: "someone wants to connect about your activity",
    actorProfileId: me,
    itemId: cloudId,
  });
  return data.id;
}

export async function updateConnection(connectionId: string, action: "handover" | "return" | "claim" | "confirm" | "dispute" | "cancel", value?: boolean) {
  await changeConnectionState({ data: { connectionId, action, ...(value === undefined ? {} : { value }) } });
  await loadConnections();
  const connection = connectionsStore.get().connections.find((candidate) => candidate.id === connectionId);
  const me = sessionStore.get().profile?.id;
  if (connection && me) {
    const otherLocal = connection.ownerId === ME_ID ? connection.helperId : connection.ownerId;
    const other = profileIdForLocal(otherLocal);
    if (other) {
      await notify({
        profileId: other,
        kind: "exchange",
        body: action === "confirm" ? "your giver connection was confirmed" : `your giver connection changed: ${action}`,
        actorProfileId: me,
        itemId: connection.itemId.startsWith("cloud:") ? connection.itemId.slice(6) : (itemsStore.get().items.find((item) => item.id === connection.itemId)?.cloudId ?? null),
      });
    }
  }
}

export function startConnectionsSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const run = () => {
    if (sessionStore.get().profile) void loadConnections();
  };
  sessionStore.subscribe(run);
  supabase.channel("connections-shared").on("postgres_changes", { event: "*", schema: "public", table: "connections" }, run).subscribe();
  window.setInterval(run, 15000);
  run();
}