import { baseMemberById, type Member } from "@/data/giver";
import { memberEditsStore } from "@/data/member-edits";
import { useMemberEdits } from "@/hooks/use-member-edits";
import { AdminArea, AdminNumber, AdminText } from "@/components/admin/AdminFields";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * EDIT A PERSON — any sample person, not one special case.
 *
 * Every keystroke is written straight into the member-edits store, which the
 * one Member projection is rebuilt from, so their profile, the community feed,
 * every item's detail page and their activity counts all follow instantly.
 */

/** The plain-text fields of a person, in the order they read on the profile. */
const TEXT_FIELDS: { key: keyof Member; label: string }[] = [
  { key: "username", label: "@handle" },
  { key: "name", label: "name" },
  { key: "age", label: "age" },
  { key: "gender", label: "gender identity" },
  { key: "distance", label: "distance" },
  { key: "since", label: "member since" },
  { key: "byDay", label: "by day" },
  { key: "byNight", label: "by night" },
  { key: "weekend", label: "by weekend" },
  { key: "headline", label: "headline" },
  { key: "activity", label: "current activity" },
];

const DONE_FIELDS: { key: keyof Member["done"]; label: string }[] = [
  { key: "gifts", label: "gifts shared" },
  { key: "wishes", label: "wishes granted" },
  { key: "trades", label: "trades completed" },
  { key: "borrows", label: "borrows completed" },
];

export function AdminMemberEditor({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  /* Re-read through the store so the fields always show what is persisted. */
  useMemberEdits();
  const base = baseMemberById(member.id);
  const edited = Boolean(memberEditsStore.get()[member.id]);

  const set = (fields: Partial<Member>) => memberEditsStore.patch(member.id, fields);

  return (
    <AdminShell
      title={member.username}
      kind="person"
      edited={edited}
      onRevert={base ? () => memberEditsStore.reset(member.id) : undefined}
      onClose={onClose}
    >
      {TEXT_FIELDS.map((f) => (
        <AdminText
          key={String(f.key)}
          label={f.label}
          value={String(member[f.key] ?? "")}
          onChange={(value) => set({ [f.key]: value } as Partial<Member>)}
        />
      ))}

      <AdminArea
        label="about me"
        value={member.aboutMe}
        onChange={(value) => set({ aboutMe: value })}
      />
      <AdminArea label="blurb" value={member.blurb} onChange={(value) => set({ blurb: value })} />
      <AdminArea label="about" value={member.about} onChange={(value) => set({ about: value })} />

      <p className="g-heading mt-9">completed activity</p>
      <div className="grid grid-cols-2 gap-x-6">
        {DONE_FIELDS.map((f) => (
          <AdminNumber
            key={f.key}
            label={f.label}
            value={member.done[f.key]}
            onChange={(value) => set({ done: { ...member.done, [f.key]: value ?? 0 } })}
          />
        ))}
      </div>
    </AdminShell>
  );
}
