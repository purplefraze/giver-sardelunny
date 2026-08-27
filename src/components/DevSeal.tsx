import { Link } from "@tanstack/react-router";

import { useNotifications, useSession } from "@/hooks/use-session";
import { notificationsStore } from "@/data/cloud/notifications";

/**
 * THE ONLY BACKEND UI A TESTER EVER SEES: their own @name, or the way in.
 * One line, no chrome, no tab bar — the Living G stays the navigation.
 */
export function DevSeal() {
  const session = useSession();
  useNotifications();
  const unread = notificationsStore.unread();

  if (session.status === "loading") return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-2 z-[90] flex items-baseline gap-3">
      {session.status === "signed-out" ? (
        <Link to="/auth" search={{}} className="g-meta opacity-60">
          sign in
        </Link>
      ) : (
        <>
          <span className="g-meta opacity-40">
            @{session.profile?.handle ?? "giver"}
          </span>
          {unread > 0 ? (
            <span className="g-meta" style={{ color: "var(--giver-me)" }}>
              {unread}
            </span>
          ) : null}
          {session.isAdmin ? (
            <Link to="/admin" className="g-meta opacity-50">
              dev
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
