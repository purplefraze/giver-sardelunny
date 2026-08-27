import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { lookupInvite } from "@/lib/invites.functions";

/**
 * AN INVITED FRIEND'S OWN LINK. It says almost nothing to a stranger; it simply
 * carries the token into the dev door.
 */
export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "you're invited · giver" },
      { name: "description", content: "an invitation to the shared giver dev prototype." },
      { property: "og:title", content: "you're invited · giver" },
      { property: "og:description", content: "an invitation to try giver with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InviteScreen,
});

function InviteScreen() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok" | "no">("checking");

  useEffect(() => {
    let alive = true;
    void lookupInvite({ data: { token } }).then((res) => {
      if (!alive) return;
      if (res.ok) {
        window.localStorage.setItem("giver.invite.token", token);
        setState("ok");
      } else setState("no");
    });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="g-page min-h-screen bg-giver-paper text-giver-ink">
      <p className="g-meta">giver</p>
      {state === "checking" ? <h1 className="g-display mt-6">one moment</h1> : null}
      {state === "no" ? (
        <>
          <h1 className="g-display mt-6">that link is finished</h1>
          <p className="g-body mt-4 max-w-[28ch]">ask for a fresh one.</p>
        </>
      ) : null}
      {state === "ok" ? (
        <>
          <h1 className="g-display mt-6">you're in</h1>
          <p className="g-body mt-4 max-w-[28ch]">
            make your giver, then meet the others already here.
          </p>
          <button
            type="button"
            className="g-heading mt-10 self-start"
            style={{ color: "var(--giver-me)" }}
            onClick={() => void navigate({ to: "/auth", search: { invite: token } })}
          >
            make my giver
          </button>
        </>
      ) : null}
    </main>
  );
}
