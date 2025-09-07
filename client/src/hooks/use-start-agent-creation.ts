import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export type StartAgentCreationOptions = {
  afterSuccessRedirect?: string; // default: "/dashboard/agents"
};

export function useStartAgentCreation() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Detect existing wizard route: prefer homepage modal with auto-open flag
  const wizardPath = useMemo(() => {
    return "/?openWizard=1";
  }, []);

  const start = useCallback(async (opts: StartAgentCreationOptions = {}) => {
    if (busy) return;
    setBusy(true);
    const afterSuccessRedirect = opts.afterSuccessRedirect ?? "/dashboard/agents";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        // Navigate to auth with next param so we continue to the wizard after login
        navigate(`/auth?next=${encodeURIComponent(wizardPath)}`);
        return;
      }

      // User is authenticated → open the existing wizard route
      navigate(wizardPath);

      // Listen for wizard success once, then redirect
      const handler = () => {
        window.removeEventListener("agent-created-success", handler);
        navigate(afterSuccessRedirect, { replace: true });
      };
      window.addEventListener("agent-created-success", handler, { once: true });
    } finally {
      setBusy(false);
    }
  }, [busy, navigate, wizardPath]);

  return { start, busy };
}