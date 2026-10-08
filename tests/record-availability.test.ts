import { expect, test } from "bun:test";
import { recordAvailable } from "../src/intelligence/record-availability";
test("record is available on the default full G", () => expect(recordAvailable(null)).toBe(true));
test("settled welcome must not hide record", () => expect(recordAvailable("settled")).toBe(true));
test("only active welcome animation temporarily owns input", () => expect(recordAvailable("ceremony")).toBe(false));