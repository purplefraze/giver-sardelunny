/**
 * THE PEOPLE DIRECTORY — SAMPLE GIVERS AND REAL TESTERS, ONE PROJECTION.
 *
 * The four sample Givers are still written in code (src/data/giver.ts) and are
 * flagged as SAMPLE in the database. Real invited testers arrive from the
 * database and are projected into the SAME Member shape every Giver view
 * already reads, so nothing in the Living G, community, profiles or
 * conversations needs to know where a person came from.
 *
 * Identity mapping, in one place:
 *   sample person   local id "giulia"  <->  profiles.sample_key
 *   real tester     local id = profiles.id (a uuid)
 */

import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/data/giver";
import { setRemoteMembers } from "@/data/giver";
import { sessionStore, type ProfileRow } from "@/data/cloud/session";

export type Directory = {
  profiles: ProfileRow[];
  /** sample_key -> profile id */
  sampleIds: Record<string, string>;
  /** profile id -> row */
  byId: Record<string, ProfileRow>;
};

const EMPTY: Directory = Object.freeze({ profiles: [], sampleIds: {}, byId: {} });

let state: Directory = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function commit(next: Directory) {
  state = next;
  for (const l of listeners) l();
}

/** A real tester, seen the way every other Giver view expects to see a person. */
export function memberFromProfile(row: ProfileRow): Member {
  const handle = row.handle ? `@${row.handle}` : "@giver";
  const answers = (row.answers ?? {}) as Record<string, string>;
  return {
    id: row.id,
    name: row.name || handle.replace("@", ""),
    username: handle,
    distance: "nearby",
    photo: row.photo_url ?? null,
    blurb: row.about ?? "",
    mode: "giving",
    world: "giving",
    action: "on giver",
    headline: "",
    activity: "",
    about: row.about ?? "",
    age: "",
    gender: row.gender ?? "",
    byDay: row.by_day ?? "",
    byNight: row.by_night ?? "",
    weekend: row.weekend ?? "",
    answers,
    bottom: [],
    active: { wish: [], give: [], trade: [], borrow: [] },
    history: { wishes: [], gives: [], trades: [] },
    since: "",
    aboutMe: row.about ?? "",
    done: { gifts: 0, wishes: 0, trades: 0, borrows: 0 },
    connections: [],
  };
}

async function load() {
  const { data } = await supabase.from("profiles").select("*");
  const rows = data ?? [];
  const sampleIds: Record<string, string> = {};
  const byId: Record<string, ProfileRow> = {};
  for (const row of rows) {
    byId[row.id] = row;
    if (row.is_sample && row.sample_key) sampleIds[row.sample_key] = row.id;
  }
  const mine = sessionStore.get().profile?.id;
  setRemoteMembers(
    rows
      .filter((r) => !r.is_sample && r.id !== mine)
      .map((r) => memberFromProfile(r)),
  );
  commit({ profiles: rows, sampleIds, byId });
}

export const directoryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    directoryStore.start();
    return () => listeners.delete(listener);
  },
  get(): Directory {
    return state;
  },
  getServer(): Directory {
    return EMPTY;
  },
  start() {
    if (started || typeof window === "undefined") return;
    started = true;
    void load();
  },
  reload: load,
};

/** A local Giver id -> the database profile it means. */
export function profileIdForLocal(localId: string): string | null {
  if (state.sampleIds[localId]) return state.sampleIds[localId]!;
  if (state.byId[localId]) return localId;
  return null;
}

/** A database profile -> the local Giver id every view already uses. */
export function localIdForProfile(profileId: string): string | null {
  const row = state.byId[profileId];
  if (!row) return null;
  return row.is_sample ? (row.sample_key ?? row.id) : row.id;
}

export const isSampleProfile = (profileId: string) =>
  state.byId[profileId]?.is_sample ?? false;

export const profileRow = (profileId: string) => state.byId[profileId] ?? null;
