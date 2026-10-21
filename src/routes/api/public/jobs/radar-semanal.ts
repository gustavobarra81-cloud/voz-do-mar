import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/radar-semanal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { executarVarreduraRadar } = await import("@/lib/radar.functions");
          const r = await executarVarreduraRadar(supabaseAdmin);
          return Response.json({ success: true, encontrados: r.encontrados });
        } catch (e) {
          console.error("radar-semanal", e);
          return Response.json({ success: false }, { status: 500 });
        }
      },
    },
  },
});
