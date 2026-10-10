import { z } from "zod";
import { parseDateOnly, toDateOnly, yearsBetween } from "@/lib/date-only";

/** Blank stays unknown; a supplied birthday must be a real, eligible day. */
export function profileBirthdaySchema(today = new Date()) {
  return z.string().superRefine((value, context) => {
    if (!value) return;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateOnly(value) : null;
    if (!day || toDateOnly(day) !== value || value > toDateOnly(today) || yearsBetween(day, today) > 120) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "enter a valid birthday" });
    } else if (yearsBetween(day, today) < 18) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "you must be 18 or older" });
    }
  });
}
export function birthdayBounds(today = new Date()) {
  return { min: `${today.getFullYear() - 120}-01-01`, max: toDateOnly(today) };
}
