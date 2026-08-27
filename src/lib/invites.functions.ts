/**
 * INVITES AND MEMBERSHIP — THE DEV DOOR INTO GIVER.
 *
 * An invited friend opens their link, makes an email account, and becomes a
 * real person in the shared dev environment. No SMS, no fake verification: the
 * invite IS the verification for this build, and the user model is untouched by
 * that choice so production phone verification can be added later.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Does this invite link mean anything? Public, and tells a stranger nothing. */
export const lookupInvite = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(6).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, label, accepted_profile_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { ok: false as const };
    return { ok: true as const, label: invite.label, used: Boolean(invite.accepted_profile_id) };
  });

/**
 * BECOME A PERSON ON GIVER. Creates my profile row if it does not exist, links
 * the invite that brought me, and gives me a role. The very first account in a
 * fresh dev environment is the developer/admin (that is Fraser).
 */
export const joinGiver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        handle: z.string().min(1).max(20),
        name: z.string().max(40).optional(),
        token: z.string().max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let profile = existing;
    if (!profile) {
      const handle = data.handle.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 20);
      const { data: taken } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      const finalHandle = taken ? `${handle}${Math.floor(Math.random() * 900 + 100)}` : handle;
      const { data: created, error } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: userId,
          handle: finalHandle,
          name: data.name ?? finalHandle,
          is_sample: false,
        })
        .select("*")
        .maybeSingle();
      if (error) return { ok: false as const, reason: error.message };
      profile = created;
    }
    if (!profile) return { ok: false as const, reason: "profile" };

    /* THE FIRST PERSON IN A FRESH DEV ENVIRONMENT IS THE DEVELOPER. */
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const role = (count ?? 0) === 0 ? "admin" : "tester";
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" },
    );

    if (data.token) {
      const { data: invite } = await supabaseAdmin
        .from("invites")
        .select("id, accepted_profile_id")
        .eq("token", data.token)
        .maybeSingle();
      if (invite && !invite.accepted_profile_id) {
        await supabaseAdmin
          .from("invites")
          .update({ accepted_profile_id: profile.id, accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
      }
    }

    return { ok: true as const, profileId: profile.id, role };
  });
