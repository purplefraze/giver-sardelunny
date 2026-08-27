import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const handleAvailable = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ handle: z.string().min(3).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("handle", data.handle)
      .maybeSingle();
    return { available: !row };
  });