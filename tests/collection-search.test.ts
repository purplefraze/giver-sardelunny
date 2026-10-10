import { expect, test } from "bun:test";
import { searchCollectionArea } from "../src/lib/collection-search";

test("provider results establish an approximate area, not a public home address", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify([{lat:"55.971234",lon:"-3.171234",address:{house_number:"123",road:"example street",suburb:"Leith",city:"Edinburgh",country:"United Kingdom"}}]), {status:200})) as typeof fetch;
  try { expect(await searchCollectionArea("leith, edinburgh")).toEqual([{label:"leith, edinburgh, united kingdom",pin:{lat:55.97,lng:-3.17},source:"place"}]); }
  finally { globalThis.fetch = original; }
});
test("no geocoder match means no invented location", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("[]", {status:200})) as typeof fetch;
  try { expect(await searchCollectionArea("nonsense area")).toEqual([]); }
  finally { globalThis.fetch = original; }
});