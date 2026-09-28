/**
 * LESSONS OF A REPEATING GIVE, SHARED BETWEEN TWO PHONES.
 *
 * Needs supabase/unapplied/20260928_give_sessions.sql (the give_sessions table
 * and the update_my_give_session rpc). Until that is applied the probe below
 * finds no table, cloud connections keep the existing one-off flow ("this
 * happened" → +10 once), and nothing errors. Local-only connections always
 * count sessions through connectionsStore.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { connectionsStore, otherParty, type GiveSession } from "@/data/connections";
import { ME_ID } from "@/data/items";
import { sessionStore } from "@/data/cloud/session";
import { profileIdForLocal } from "@/data/cloud/directory";
import { changeSessionState } from "@/lib/connections.functions";
import { notify } from "@/data/cloud/notifications";

type Availability = "unknown" | "yes" | "no";
let availability: Availability = "unknown";
const listeners = new Set<() => void>();

/** Whether the server can count lessons yet. "unknown" until first probed. */
export const sessionsAvailability = {
  get: () => availability,
  getServer: (): Availability => "unknown",
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function setAvailability(next: Availability) {
  if (next === availability) return;
  availability = next;
  for (const l of listeners) l();
}

/* give_sessions is not in the generated types until the sql is applied. */
const db = () => supabase as unknown as SupabaseClient;

const isLocalId = (id: string) => !/^[0-9a-f-]{36}$/i.test(id);

async function probe(): Promise<boolean> {
  if (availability !== "unknown") return availability === "yes";
  const { error } = await db().from("give_sessions").select("id").limit(1);
  if (!error) {
    setAvailability("yes");
    return true;
  }
  const missing =
    ["42P01", "PGRST205", "PGRST204", "PGRST202"].includes(error.code ?? "") ||
    /does not exist|could not find/i.test(error.message ?? "");
  /* A missing table is an answer; a network blip is not — ask again later. */
  if (missing) setAvailability("no");
  return false;
}

type Row = {
  id: string;
  connection_id: string;
  period: string;
  claimed_by: string;
  owner_confirmed: boolean;
  helper_confirmed: boolean;
  state: GiveSession["state"];
  credited: boolean;
  credited_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function loadSessions() {
  const me = sessionStore.get().profile?.id;
  if (!me || !(await probe())) return;
  const { data, error } = await db().from("give_sessions").select("*");
  if (error) return;
  const connections = connectionsStore.get().connections;
  const rows: GiveSession[] = [];
  for (const row of (data ?? []) as Row[]) {
    const c = connections.find((x) => x.id === row.connection_id);
    if (!c) continue;
    rows.push({
      id: row.id,
      connectionId: row.connection_id,
      period: row.period,
      claimedBy: row.claimed_by === me ? ME_ID : otherParty(c),
      confirmedBy: [
        ...(row.owner_confirmed ? [c.ownerId] : []),
        ...(row.helper_confirmed ? [c.helperId] : []),
      ],
      state: row.state,
      credited: row.credited,
      ...(row.credited_at ? { creditedAt: Date.parse(row.credited_at) } : {}),
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
    });
  }
  connectionsStore.mergeCloudSessions(rows);
}

/** Does this connection count lessons right now (local always; cloud once applied)? */
export function sessionsLive(connectionId: string) {
  return isLocalId(connectionId) || availability === "yes";
}

const BODY = {
  claim: "did your lesson happen? confirm it in your conversation",
  confirm: "your lesson was confirmed",
  dispute: "a lesson isn’t confirmed yet — keep talking",
} as const;

export async function updateSession(connectionId: string, action: "claim" | "confirm" | "dispute") {
  if (isLocalId(connectionId)) {
    return action === "claim"
      ? connectionsStore.claimSession(connectionId)
      : connectionsStore.respondSession(connectionId, action === "confirm");
  }
  await changeSessionState({ data: { connectionId, action } });
  await loadSessions();
  const c = connectionsStore.get().connections.find((x) => x.id === connectionId);
  const me = sessionStore.get().profile?.id;
  const other = c ? profileIdForLocal(otherParty(c)) : null;
  if (c && me && other)
    await notify({ profileId: other, kind: "exchange", body: BODY[action], actorProfileId: me });
  return { ok: true };
}
