import { supabase } from "@/integrations/supabase/client";
import { wallStore, type Compliment } from "@/data/wall";
import { sessionStore } from "@/data/cloud/session";
import { localIdForProfile, profileIdForLocal } from "@/data/cloud/directory";

let started = false;

export async function loadCompliments() {
  if (!sessionStore.get().profile) return;
  const { data, error } = await supabase.from("compliments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const compliments: Compliment[] = (data ?? []).flatMap((row) => {
    const aboutId = localIdForProfile(row.about_profile_id);
    const fromId = localIdForProfile(row.from_profile_id);
    return aboutId && fromId ? [{ id: row.id, aboutId, fromId, text: row.text, at: Date.parse(row.created_at) }] : [];
  });
  wallStore.mergeCloud(compliments);
}

export async function saveCompliment(aboutLocalId: string, text: string) {
  const from = sessionStore.get().profile?.id;
  const about = profileIdForLocal(aboutLocalId);
  if (!from || !about) throw new Error("finish joining giver first");
  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .select("id")
    .eq("state", "verified")
    .or(`and(owner_id.eq.${from},helper_id.eq.${about}),and(owner_id.eq.${about},helper_id.eq.${from})`)
    .limit(1)
    .maybeSingle();
  if (connectionError || !connection) throw new Error("complete something together first");
  const said = text.trim().slice(0, 160);
  const existing = (await supabase.from("compliments").select("id").eq("connection_id", connection.id).eq("from_profile_id", from).maybeSingle()).data;
  const query = existing
    ? supabase.from("compliments").update({ text: said }).eq("id", existing.id)
    : supabase.from("compliments").insert({ connection_id: connection.id, about_profile_id: about, from_profile_id: from, text: said });
  const { error } = await query;
  if (error) throw error;
  await loadCompliments();
}

export function startWallSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const run = () => void loadCompliments();
  sessionStore.subscribe(run);
  supabase.channel("compliments-shared").on("postgres_changes", { event: "*", schema: "public", table: "compliments" }, run).subscribe();
  run();
}