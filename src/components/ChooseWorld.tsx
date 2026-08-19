import { BackArrow } from "@/components/BackArrow";
import { CATEGORIES, type Category } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * AN EMPTY MIDDLE LOOP ASKS A QUESTION.
 *
 * On a brand-new My G there is no activity yet, so the middle loop never
 * assumes a wish. It asks one question and offers the four worlds — four words,
 * nothing else. No descriptions, no cards, no icons.
 */
export function ChooseWorld({
  onChoose,
  onCancel,
}: {
  onChoose: (category: Category) => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-world="profile"
      className="relative flex h-full w-full flex-col justify-center px-7 pb-16 pt-20"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onCancel} label="back to my g" />

      <h1 className="text-[11vw] font-black lowercase leading-[0.88] tracking-[-0.055em]">
        what would you like to do?
      </h1>

      <div className="mt-12 flex flex-col items-start gap-5">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              buzz();
              onChoose(category);
            }}
            className="text-[13vw] font-black lowercase leading-[0.9] tracking-[-0.055em]"
            style={{ color: `var(--me-${category})` }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
