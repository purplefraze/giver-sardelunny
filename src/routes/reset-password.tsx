import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { passwordStrongEnough } from "@/data/account";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password · Giver" },
    { name: "description", content: "Choose a new password for your Giver account." },
    { property: "og:title", content: "Reset password · Giver" },
    { property: "og:description", content: "Choose a new password for your Giver account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [recovering, setRecovering] = useState(false);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setRecovering(hash.get("type") === "recovery" || Boolean(hash.get("access_token")));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!recovering) return setMessage("open the reset link from your email first.");
    if (password !== again) return setMessage("those passwords don’t match.");
    if (!passwordStrongEnough(password)) return setMessage("use 8 characters with a letter and a number.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(error.message.toLowerCase());
    setMessage("password changed");
    window.setTimeout(() => void navigate({ to: "/" }), 500);
  }

  return <main className="g-page min-h-screen bg-giver-paper text-giver-ink">
    <h1 className="g-display mt-6">a new password</h1>
    <form onSubmit={submit} className="mt-10 space-y-6">
      <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="new password" className="g-name w-full border-b border-giver-ink/20 bg-transparent pb-2 outline-none" />
      <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="again, exactly" className="g-name w-full border-b border-giver-ink/20 bg-transparent pb-2 outline-none" />
      {message ? <p className="g-body">{message}</p> : null}
      <button type="submit" className="g-heading" style={{ color: "var(--giver-me)" }}>change it</button>
    </form>
  </main>;
}