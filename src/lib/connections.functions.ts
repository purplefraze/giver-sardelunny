import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const changeConnectionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      connectionId: z.string().uuid(),
      action: z.enum(["handover", "return", "claim", "confirm", "dispute", "cancel"]),
      value: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .rpc("update_my_connection_state", {
        _connection_id: data.connectionId,
        _action: data.action,
        _value: data.value ?? true,
      });
    if (error) throw new Error(error.message);
    return row;
  });
/**
 * ONE LESSON OF A REPEATING GIVE: claim / confirm / dispute it. Calls the rpc
 * from supabase/unapplied/20260928_give_sessions.sql — until that is applied
 * the client never calls this (sessions-sync probes give_sessions first).
 */
type UntypedRpc = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export const changeSessionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        connectionId: z.string().uuid(),
        action: z.enum(["claim", "confirm", "dispute"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as UntypedRpc).rpc(
      "update_my_give_session",
      { _connection_id: data.connectionId, _action: data.action },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
