/**
 * PLACEHOLDER TRUST COPY for the fund form (anna pass2 #2).
 * NEEDS FRAZER'S APPROVAL — these slots intentionally state NO policy.
 * Replace `text` only with wording frazer has approved.
 */
export const FUND_TRUST_PLACEHOLDER_TAG = "placeholder — needs frazer's approval";
export const FUND_TRUST_PLACEHOLDERS = [
  { key: "fees", label: "fees", text: `[${FUND_TRUST_PLACEHOLDER_TAG}]` },
  { key: "verification", label: "who verifies", text: `[${FUND_TRUST_PLACEHOLDER_TAG}]` },
  { key: "destination", label: "where the money goes", text: `[${FUND_TRUST_PLACEHOLDER_TAG}]` },
] as const;

/** HIDDEN from users until frazer approves real copy (anna pass3). Flip only with approved text. */
export const FUND_TRUST_VISIBLE = false;
