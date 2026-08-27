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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    void context.userId;
    const { data: row, error } = await supabaseAdmin
      .rpc("update_my_connection_state", {
        _connection_id: data.connectionId,
        _action: data.action,
        _value: data.value ?? true,
      });
    if (error) throw new Error(error.message);
    return row;
  });