/**
 * IN-APP NOTIFICATIONS — QUIET BY DESIGN.
 *
 * A notification in Giver is never a badge farm: it is a small, honest record
 * that somebody messaged you, that somebody stepped forward for your activity,
 * or that a Giver replied. Push and SMS are deliberately not dependencies.
 */

import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/data/cloud/session";

export type NotificationRow = {
  id: string;
  profileId: string;
  kind: string;
  body: string;
  actorProfileId: string | null;
  conversationId: string | null;
  itemId: string | null;
  readAt: string | null;
  at: number;
};

type State = { list: NotificationRow[] };
const EMPTY: State = Object.freeze({ list: [] });

let state: State = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function commit(next: State) {
  state = next;
  for (const l of listeners) l();
}

async function load() {
  const profileId = sessionStore.get().profile?.id;
  if (!profileId) return;
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(100);
  commit({
    list: (data ?? []).map((n) => ({
      id: n.id,
      profileId: n.profile_id,
      kind: n.kind,
      body: n.body,
      actorProfileId: n.actor_profile_id,
      conversationId: n.conversation_id,
      itemId: n.item_id,
      readAt: n.read_at,
      at: Date.parse(n.created_at),
    })),
  });
}

export const notificationsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): State {
    return state;
  },
  getServer(): State {
    return EMPTY;
  },
  reload: load,
  /** MINE ONLY — an admin's list also carries sample-profile traffic. */
  forMe(): NotificationRow[] {
    const me = sessionStore.get().profile?.id;
    return state.list.filter((n) => n.profileId === me);
  },
  unread(): number {
    return notificationsStore.forMe().filter((n) => !n.readAt).length;
  },
  async markAllRead() {
    const me = sessionStore.get().profile?.id;
    if (!me) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", me)
      .is("read_at", null);
    await load();
  },
};

export async function notify(input: {
  profileId: string;
  kind: string;
  body: string;
  actorProfileId?: string | null;
  conversationId?: string | null;
  itemId?: string | null;
}) {
  await supabase.from("notifications").insert({
    profile_id: input.profileId,
    kind: input.kind,
    body: input.body,
    actor_profile_id: input.actorProfileId ?? null,
    conversation_id: input.conversationId ?? null,
    item_id: input.itemId ?? null,
  });
  await load();
}

export function startNotifications() {
  if (started || typeof window === "undefined") return;
  started = true;
  sessionStore.subscribe(() => void load());
  void load();
  supabase
    .channel("notifications-shared")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
      void load();
    })
    .subscribe();
  window.setInterval(() => void load(), 20000);
}
