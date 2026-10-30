/**
 * ⚠ TEST BUILD ONLY — FLIP TO false BEFORE LAUNCH.
 *
 * true:  the sign-in shows "are you a giver?" and one button that enters the
 *        app as a local, read-only guest (no email, no auth user, no writes).
 * false: the email link / code sign-in returns, unchanged (useOtpSignIn).
 */
export const TEST_BUILD_DIRECT_ENTRY = true;

/** What a guest hears when they try to post, message or save. */
export const GUEST_WRITE_LINE = "you're looking around — sign in to make a wish or share.";
