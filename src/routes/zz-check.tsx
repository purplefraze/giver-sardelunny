import { createFileRoute } from "@tanstack/react-router";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS } from "@/data/giver";

export const Route = createFileRoute("/zz-check")({
  component: Check,
  head: () => ({
    meta: [
      { title: "giver — sample profile check" },
      { name: "description", content: "Internal layout check for the sample Living G profiles." },
    ],
  }),
});

function Check() {
  const i = Number(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("i") ?? 0
      : 0,
  );
  const member = MEMBERS[i]!;
  return (
    <div className="fixed inset-0">
    <MemberExample
      member={member}
      first={false}
      last={false}
      sparks={50}
      onBack={() => {}}
      onPrev={() => {}}
      onNext={() => {}}
      onDone={() => {}}
    />
    </div>
  );
}
