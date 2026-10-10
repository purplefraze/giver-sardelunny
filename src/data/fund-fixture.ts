import type { Item } from "./items";

export const DEMO_FUND_ID = "seed-robin-wish-3";
export const DEMO_FUND_TITLE = "help a grandmother afford dentures";
/** Only the unedited synthetic record is revised, never a real person's Wish. */
export function reviseFundFixture(item: Item): Item {
  if (item.id !== DEMO_FUND_ID || item.edited) return item;
  return { ...item, text: DEMO_FUND_TITLE, note: "demo cause · helping a grandmother cover the cost of dentures. Existing demo pledges are not donations or payments.", details: { fundTarget: 150000, extras: { purpose: "dentures so she can eat comfortably" } } };
}