/**
 * REAL MESSAGES, SAME GIVER CONVERSATION.
 *
 * The conversation screen is unchanged: it still reads the connection layer
 * (src/data/connections.ts), because in Giver a conversation is always ABOUT
 * something. This module is the persistence and delivery layer underneath it:
 *
 *   my outgoing message   -> public.messages (+ a notification for the other)
 *   an incoming message   -> merged back into the connection it belongs to
 *
 * SAMPLE GIVERS: a conversation with a sample profile is stored exactly like
 * any other, and the admin/developer answers it as that sample person from the
 * admin console. The tester only ever sees the sample Giver. This routing is
 * database-backed (profiles.is_sample + messages.sent_as_sample), never a
 * frontend trick.
 */

import { supabase } from "@/integrations/supabase/client";
import { itemsStore, type ItemType } from "@/data/items";
import { connectionsStore } from "@/data/connections";
import { sessionStore } from "@/data/cloud/session";
import {
  directoryStore,
  localIdForProfile,
  profileIdForLocal,
  profileRow,
} from "@/data/cloud/directory";
import { cloudItemId, localItemIdFor, pullItems } from "@/data/cloud/items-sync";
import { notify } from "@/data/cloud/notifications";

export type CloudConversation = {
  id: string;
  itemId: string | null;
  aId: string;
  bId: string;
  lastMessageAt: string | null;
};

export type CloudMessage = {
  id: string;
  conversationId: string;
  fromProfileId: string;
  text: string;
  at: number;
  sentAsSample: boolean;
  readAt: string | null;
};

type State = { conversations: CloudConversation[]; messages: CloudMessage[] };

const EMPTY: State = Object.freeze({ conversations: [], messages: [] });
const MAP_KEY = "giver.cloud.conversation-map.v1";

let state: State = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function commit(next: State) {
  state = next;
  for (const l of listeners) l();
}

/* ------------------------ local <-> cloud pairing ------------------------- */

type Pairs = { conv: Record<string, string>; sent: string[]; got: string[] };

function readPairs(): Pairs {
  if (typeof window === "undefined") return { conv: {}, sent: [], got: [] };
  try {
    const raw = window.localStorage.getItem(MAP_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Pairs>) : {};
    return { conv: parsed.conv ?? {}, sent: parsed.sent ?? [], got: parsed.got ?? [] };
  } catch {
    return { conv: {}, sent: [], got: [] };
  }
}

let pairs = readPairs();

function writePairs() {
  try {
    window.localStorage.setItem(
      MAP_KEY,
      JSON.stringify({
        conv: pairs.conv,
        sent: pairs.sent.slice(-500),
        got: pairs.got.slice(-500),
      }),
    );
  } catch {
    /* best effort */
  }
}

const localForCloudConv = (cloudId: string) =>
  Object.keys(pairs.conv).find((local) => pairs.conv[local] === cloudId) ?? null;

/* ------------------------------- loading ---------------------------------- */

async function load() {
  const profileId = sessionStore.get().profile?.id;
  if (!profileId) return;
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, item_id, a_id, b_id, last_message_at");
  const conversations: CloudConversation[] = (convs ?? []).map((c) => ({
    id: c.id,
    itemId: c.item_id,
    aId: c.a_id,
    bId: c.b_id,
    lastMessageAt: c.last_message_at,
  }));
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, from_profile_id, text, sent_as_sample, read_at, created_at")
    .order("created_at", { ascending: true });
  const messages: CloudMessage[] = (msgs ?? []).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    fromProfileId: m.from_profile_id,
    text: m.text,
    at: Date.parse(m.created_at),
    sentAsSample: m.sent_as_sample,
    readAt: m.read_at,
  }));
  commit({ conversations, messages });
}

export const messagingStore = {
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
};

/* ------------------------------- writing ---------------------------------- */

export async function openCloudConversation(
  otherProfileId: string,
  itemId: string | null,
): Promise<string | null> {
  const me = sessionStore.get().profile?.id;
  if (!me) return null;
  const existing = state.conversations.find(
    (c) =>
      ((c.aId === me && c.bId === otherProfileId) ||
        (c.bId === me && c.aId === otherProfileId)) &&
      (itemId ? c.itemId === itemId : true),
  );
  if (existing) return existing.id;
  const { data } = await supabase
    .from("conversations")
    .insert({ a_id: me, b_id: otherProfileId, item_id: itemId })
    .select("id, item_id, a_id, b_id, last_message_at")
    .maybeSingle();
  if (!data) return null;
  commit({
    ...state,
    conversations: [
      ...state.conversations,
      { id: data.id, itemId: data.item_id, aId: data.a_id, bId: data.b_id, lastMessageAt: null },
    ],
  });
  return data.id;
}

/** Send into a conversation. `asProfileId` is only ever an admin-as-sample send. */
export async function sendCloudMessage(
  conversationId: string,
  text: string,
  asProfileId?: string,
) {
  const me = sessionStore.get().profile?.id;
  const from = asProfileId ?? me;
  if (!from) return null;
  const { data } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      from_profile_id: from,
      text,
      sent_as_sample: Boolean(asProfileId),
    })
    .select("id, conversation_id, from_profile_id, text, sent_as_sample, read_at, created_at")
    .maybeSingle();
  if (!data) return null;
  pairs.sent.push(data.id);
  writePairs();
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  const conv = state.conversations.find((c) => c.id === conversationId);
  if (conv) {
    const other = conv.aId === from ? conv.bId : conv.aId;
    const actor = profileRow(from);
    await notify({
      profileId: other,
      kind: "message",
      body: `${actor?.name || actor?.handle || "someone"} messaged you`,
      actorProfileId: from,
      conversationId,
    });
  }
  await load();
  return data.id;
}

export async function markCloudRead(conversationId: string) {
  const me = sessionStore.get().profile?.id;
  if (!me) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("from_profile_id", me)
    .is("read_at", null);
  await load();
}

/* ------------------------------- bridging --------------------------------- */

/** Make sure the conversation behind a local connection exists in the cloud. */
async function cloudConversationFor(localConnectionId: string): Promise<string | null> {
  const mapped = pairs.conv[localConnectionId];
  if (mapped) return mapped;
  const s = connectionsStore.get();
  const c = s.connections.find((x) => x.id === localConnectionId);
  if (!c) return null;
  const otherLocal = c.ownerId === "me" ? c.helperId : c.ownerId;
  const otherProfile = profileIdForLocal(otherLocal);
  if (!otherProfile) return null;
  const item = await cloudItemId(c.itemId);
  const conv = await openCloudConversation(otherProfile, item);
  if (!conv) return null;
  pairs.conv[localConnectionId] = conv;
  writePairs();
  return conv;
}

async function mirrorOutgoing() {
  const me = sessionStore.get().profile?.id;
  if (!me) return;
  const s = connectionsStore.get();
  const mine = s.messages.filter(
    (m) => m.fromId === "me" && !pairs.sent.includes(`local:${m.id}`),
  );
  for (const m of mine) {
    const conv = await cloudConversationFor(m.connectionId);
    if (!conv) continue;
    pairs.sent.push(`local:${m.id}`);
    writePairs();
    await sendCloudMessage(conv, m.text);
  }
}

/** An incoming cloud message becomes a message in the connection it belongs to. */
async function ingestIncoming() {
  const me = sessionStore.get().profile?.id;
  if (!me) return;
  for (const m of state.messages) {
    if (m.fromProfileId === me) continue;
    if (pairs.got.includes(m.id)) continue;
    const conv = state.conversations.find((c) => c.id === m.conversationId);
    if (!conv) continue;
    if (conv.aId !== me && conv.bId !== me) continue; // an admin view, not mine
    const fromLocal = localIdForProfile(m.fromProfileId);
    if (!fromLocal) continue;

    let localConnection = localForCloudConv(conv.id);
    if (!localConnection) {
      const localItem = conv.itemId ? localItemIdFor(conv.itemId) : null;
      if (conv.itemId && !localItem) {
        await pullItems();
      }
      const resolved = conv.itemId ? localItemIdFor(conv.itemId) : null;
      const own = conv.itemId
        ? itemsStore.get().items.find((i) => i.id === resolved)
        : undefined;
      const itemForConnection = resolved ?? own?.id ?? null;
      if (!itemForConnection) continue;
      const item = itemsStore.get().items.find((i) => i.id === itemForConnection);
      if (!item) continue;
      localConnection = connectionsStore.ingest({
        itemId: item.id,
        type: item.type as ItemType,
        ownerId: item.ownerId,
        helperId: item.ownerId === "me" ? fromLocal : "me",
      });
      pairs.conv[localConnection] = conv.id;
      writePairs();
    }

    pairs.got.push(m.id);
    writePairs();
    connectionsStore.receive(localConnection, fromLocal, m.text, m.at);
  }
}

export function startMessaging() {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = () => {
    if (!sessionStore.get().profile) return;
    void load().then(() => void ingestIncoming());
    void mirrorOutgoing();
  };

  sessionStore.subscribe(run);
  directoryStore.subscribe(() => void ingestIncoming());
  connectionsStore.subscribe(() => void mirrorOutgoing());
  messagingStore.subscribe(() => void ingestIncoming());
  run();

  supabase
    .channel("messages-shared")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
      void load();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
      void load();
    })
    .subscribe();

  window.setInterval(run, 15000);
}

/** Unread cloud messages for me — used by the existing unread indicator. */
export function cloudUnread(): number {
  const me = sessionStore.get().profile?.id;
  if (!me) return 0;
  return state.messages.filter(
    (m) =>
      m.fromProfileId !== me &&
      !m.readAt &&
      state.conversations.some(
        (c) => c.id === m.conversationId && (c.aId === me || c.bId === me),
      ),
  ).length;
}
