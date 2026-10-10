import { expect, test } from "bun:test";
import { feedFor } from "../src/components/community/CommunityFeed";
import { ME_ID, type Item } from "../src/data/items";

const at = (id: string, ownerId: string, type: Item["type"], published = true, side?: "borrow" | "lend"): Item =>
  ({ id, ownerId, type, text: id, status: "active", priority: 0, published, createdAt: 1, updatedAt: 1, ...(side ? { side } : {}) }) as Item;

const items = [at("mine-new", ME_ID, "give"), at("theirs", "someone", "give"), at("mine-old", ME_ID, "give"), at("unsaved", ME_ID, "wish", false)];

test("the just-shared give appears in the community gives category", () => {
  const ids = feedFor(items, "give", "", "mine-new").map((i) => i.id);
  expect(ids).toContain("mine-new");
  expect(ids).toContain("mine-old");
});

test("lower communi-g own scope lists all my active shared posts", () => {
  expect(feedFor(items, "mine").map((i) => i.id).sort()).toEqual(["mine-new", "mine-old"]);
});

test("a post whose save failed (unpublished) is shown nowhere", () => {
  expect(feedFor(items, "mine").map((i) => i.id)).not.toContain("unsaved");
  expect(feedFor(items, "wish", "", "unsaved")).toEqual([]);
});
