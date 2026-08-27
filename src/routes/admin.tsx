import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useDirectory, useSession, useCloudMessages, useNotifications } from "@/hooks/use-session";
import {
  markCloudRead,
  messagingStore,
  openCloudConversation,
  sendCloudMessage,
} from "@/data/cloud/messaging";
import { notificationsStore } from "@/data/cloud/notifications";
import { directoryStore } from "@/data/cloud/directory";

/**
 * THE DEVELOPER CONSOLE. Not part of Giver: a private back room for running the
 * test. Invited testers can never see it — the role lives in the database and
 * every read here is still governed by row-level security.
 */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "dev console · giver" },
      { name: "description", content: "private developer console for the giver dev prototype." },
      { property: "og:title", content: "dev console · giver" },
      { property: "og:description", content: "private developer console for the giver dev prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsole,
});

/**
 * AN INVITE IS A RECORD, NOT A LINK. Who it was for, when it was issued, who
 * issued it, when it was accepted, and which person and account it became.
 */
type Invite = {
  id: string;
  token: string;
  label: string;
  created_at: string;
  created_by: string | null;
  accepted_profile_id: string | null;
  accepted_user_id: string | null;
  accepted_at: string | null;
};

/** SHORT, HUMAN, NEVER A TIMESTAMP STRING. */
const stamp = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** An account is shown as a short reference — never a full identifier. */
const shortId = (id: string | null) => (id ? id.slice(0, 8) : "");


function AdminConsole() {
  const session = useSession();
  const directory = useDirectory();
  const messages = useCloudMessages();
  useNotifications();
  const navigate = useNavigate();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const activity = notificationsStore.get().list.slice(0, 12);

  const loadInvites = () =>
    void supabase
      .from("invites")
      .select(
        "id, token, label, created_at, created_by, accepted_profile_id, accepted_user_id, accepted_at",
      )

      .order("created_at", { ascending: false })
      .then(({ data }) => setInvites((data ?? []) as Invite[]));

  useEffect(() => {
    if (!session.isAdmin) return;
    loadInvites();
    void messagingStore.reload();
    void notificationsStore.reload();
    void directoryStore.reload();
  }, [session.isAdmin]);

  if (session.status === "loading") {
    return <main className="g-page min-h-screen bg-giver-paper text-giver-ink"><p className="g-meta">one moment</p></main>;
  }
  if (!session.isAdmin) {
    return (
      <main className="g-page min-h-screen bg-giver-paper text-giver-ink">
        <h1 className="g-display mt-6">nothing here</h1>
        <button className="g-heading mt-8 self-start" onClick={() => void navigate({ to: "/" })}>
          back to giver
        </button>
      </main>
    );
  }

  const samples = directory.profiles.filter((p) => p.is_sample);
  const testers = directory.profiles.filter((p) => !p.is_sample);
  const sampleIds = new Set(samples.map((s) => s.id));

  const sampleThreads = messages.conversations
    .filter((c) => sampleIds.has(c.aId) || sampleIds.has(c.bId))
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  const thread = messages.messages
    .filter((m) => m.conversationId === openThread)
    .sort((a, b) => a.at - b.at);

  const nameOf = (id: string) => {
    const row = directory.byId[id];
    return row ? (row.name || row.handle || "someone") : "someone";
  };

  async function sendAsSample() {
    if (!openThread || !reply.trim()) return;
    const conv = messages.conversations.find((c) => c.id === openThread);
    if (!conv) return;
    const sampleId = sampleIds.has(conv.aId) ? conv.aId : conv.bId;
    await sendCloudMessage(openThread, reply.trim().slice(0, 280), sampleId);
    setReply("");
    await messagingStore.reload();
  }

  async function createInvite() {
    const token = `${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`;
    await supabase.from("invites").insert({
      token,
      label: label.trim() || "tester",
      created_by: session.userId,
    });
    setLabel("");
    loadInvites();
  }

  const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const unreadFor = (conversationId: string) =>
    messages.messages.filter(
      (m) => m.conversationId === conversationId && !m.readAt && !sampleIds.has(m.fromProfileId),
    ).length;

  return (
    <main className="g-page min-h-screen bg-giver-paper pb-24 text-giver-ink">
      <p className="g-meta">giver · dev console</p>
      <h1 className="g-display mt-4">the test</h1>

      {/* INVITES ---------------------------------------------------------- */}
      <h2 className="g-heading mt-12">invites</h2>
      <div className="mt-4 flex items-end gap-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="who is this for"
          className="g-body flex-1 border-b border-giver-ink/20 bg-transparent pb-1 outline-none"
        />
        <button className="g-meta" style={{ color: "var(--giver-me)" }} onClick={() => void createInvite()}>
          new link
        </button>
      </div>
      <ul className="mt-6 flex flex-col gap-4">
        {invites.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-4">
            <div>
              <p className="g-name">{i.label}</p>
              <p className="g-meta">
                {i.accepted_profile_id ? `joined · ${nameOf(i.accepted_profile_id)}` : "not used yet"}
              </p>
            </div>
            <button
              className="g-meta shrink-0 underline decoration-giver-ink/20"
              onClick={() => {
                void navigator.clipboard.writeText(inviteLink(i.token));
                setCopied(i.id);
              }}
            >
              {copied === i.id ? "copied" : "copy link"}
            </button>
          </li>
        ))}
        {invites.length === 0 ? <li className="g-meta">no invites yet</li> : null}
      </ul>

      {/* TESTERS ---------------------------------------------------------- */}
      <h2 className="g-heading mt-14">people</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {testers.map((p) => (
          <li key={p.id} className="g-body flex justify-between">
            <span>@{p.handle}</span>
            <span className="g-meta">{p.user_id ? "real" : "no login"}</span>
          </li>
        ))}
      </ul>
      <p className="g-meta mt-4">
        sample givers: {samples.map((s) => `@${s.handle}`).join(" · ")}
      </p>

      {/* SAMPLE CONVERSATIONS --------------------------------------------- */}
      <h2 className="g-heading mt-14">talking to a sample giver</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {sampleThreads.map((c) => {
          const sampleId = sampleIds.has(c.aId) ? c.aId : c.bId;
          const testerId = sampleId === c.aId ? c.bId : c.aId;
          const unread = unreadFor(c.id);
          return (
            <li key={c.id}>
              <button
                className="flex w-full items-baseline justify-between gap-4 text-left"
                onClick={() => {
                  setOpenThread(c.id);
                  void markCloudRead(c.id);
                }}
              >
                <span className="g-name">
                  {nameOf(testerId)} → {nameOf(sampleId)}
                </span>
                <span className="g-meta" style={unread ? { color: "var(--giver-me)" } : undefined}>
                  {unread ? `${unread} new` : "open"}
                </span>
              </button>
            </li>
          );
        })}
        {sampleThreads.length === 0 ? <li className="g-meta">nobody has written in yet</li> : null}
      </ul>

      {openThread ? (
        <div className="mt-8">
          <div className="g-rule" />
          <ul className="mt-4 flex flex-col gap-3">
            {thread.map((m) => (
              <li key={m.id} className="g-body">
                <span className="g-meta mr-2">{nameOf(m.fromProfileId)}{m.sentAsSample ? " (as sample)" : ""}</span>
                {m.text}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-end gap-3">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="reply as this giver"
              className="g-body flex-1 border-b border-giver-ink/20 bg-transparent pb-1 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendAsSample();
              }}
            />
            <button className="g-meta" style={{ color: "var(--giver-me)" }} onClick={() => void sendAsSample()}>
              send
            </button>
          </div>
          <button className="g-meta mt-6 underline decoration-giver-ink/20" onClick={() => setOpenThread(null)}>
            close
          </button>
        </div>
      ) : null}

      {/* ACTIVITY --------------------------------------------------------- */}
      <h2 className="g-heading mt-14">activity</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {activity.map((n) => (
          <li key={n.id} className="g-body">
            <span className="g-meta mr-2">to {nameOf(n.profileId)} ·</span>
            {n.body}
          </li>
        ))}
        {activity.length === 0 ? <li className="g-meta">quiet</li> : null}
      </ul>

      <div className="mt-16 flex gap-6">
        <button className="g-meta underline decoration-giver-ink/20" onClick={() => void directoryStore.reload()}>
          refresh
        </button>
        <button className="g-meta underline decoration-giver-ink/20" onClick={() => void navigate({ to: "/" })}>
          back to giver
        </button>
        <button
          className="g-meta underline decoration-giver-ink/20"
          onClick={() =>
            void openCloudConversation(testers[0]?.id ?? "", null).then((id) => id && setOpenThread(id))
          }
        >
          message a tester directly
        </button>
      </div>
    </main>
  );
}
