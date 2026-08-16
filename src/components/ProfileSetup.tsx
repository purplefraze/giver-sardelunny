import { useState } from "react";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { profileLoop } from "@/components/living-g/profile-loop";
import { buzz } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * FIRST-TIME PROFILE SETUP — the lightest possible introduction to your own
 * Living G. Not a registration form: one photo affordance and three short
 * answers, written INSIDE the loops exactly as everyone else's profile is.
 */
export type MyFields = { byDay: string; byNight: string; weekend: string };

const FIELDS: { key: keyof MyFields; label: string }[] = [
  { key: "byDay", label: "by day" },
  { key: "byNight", label: "by night" },
  { key: "weekend", label: "on the weekends" },
];

export function ProfileSetup({
  onDone,
}: {
  onDone: (fields: MyFields, photo: string | null) => void;
}) {
  const [fields, setFields] = useState<MyFields>({
    byDay: "",
    byNight: "",
    weekend: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const pickPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setPhoto(URL.createObjectURL(file));
    };
    input.click();
  };

  return (
    <div
      data-world="profile"
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex justify-center px-8">
        <span className="text-[13px] font-black lowercase tracking-[0.34em] opacity-70">
          profile
        </span>
      </div>

      <GStage>
        <LivingG
          className={G_PRESENCE}
          showLabels={false}
          regions={{
            top: {
              label: "",
              onPress: () => {
                buzz();
                pickPhoto();
              },
              render: (a) =>
                photo ? (
                  <>
                    <defs>
                      <clipPath id="setup-photo">
                        <circle cx={a.x} cy={a.y} r={40} />
                      </clipPath>
                    </defs>
                    <image
                      href={photo}
                      x={a.x - 40}
                      y={a.y - 40}
                      width={80}
                      height={80}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath="url(#setup-photo)"
                    />
                  </>
                ) : (
                  <text
                    x={a.x}
                    y={a.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--world-text)"
                    className="font-black"
                    style={{ fontSize: 44 }}
                  >
                    +
                  </text>
                ),
            },
            middle: {
              label: "",
              onPress: () => {
                buzz();
                setEditing(true);
              },
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "middle",
                  blocks: FIELDS.flatMap(({ key, label }, i) => [
                    { text: label, role: "secondary" as const, lead: i > 0 },
                    { text: fields[key] || "—", role: "primary" as const },
                  ]),
                }),
            },
            bottom: {
              label: "",
              onPress: () => {
                buzz();
                onDone(fields, photo);
              },
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "bottom",
                  blocks: [{ text: "enter giver", role: "primary" }],
                }),
            },
          }}
        />
      </GStage>

      {/* Three short answers. Nothing else. */}
      <div
        className={cn(
          "absolute inset-0 z-50 flex flex-col justify-center gap-9 px-8 transition-opacity duration-200 ease-out",
          editing ? "opacity-100" : "invisible pointer-events-none opacity-0",
        )}
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
        aria-hidden={!editing}
      >
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-2">
            <span className="text-[11px] font-black lowercase tracking-[0.28em] opacity-55">
              {label}
            </span>
            <input
              value={fields[key]}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, [key]: e.target.value.slice(0, 26) }))
              }
              placeholder="—"
              className="border-b border-current/25 bg-transparent pb-2 text-[8vw] font-black lowercase leading-none tracking-[-0.045em] outline-none placeholder:opacity-30"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => {
            buzz();
            setEditing(false);
          }}
          className="mt-4 w-fit text-[8vw] font-black lowercase leading-none tracking-[-0.045em] transition-transform active:scale-95"
          style={{ color: "var(--world-text)" }}
        >
          done
        </button>
      </div>
    </div>
  );
}
