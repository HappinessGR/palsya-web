/**
 * Password rules, shared by the live checklist on /reset-password (client)
 * and the server action that sets the password — the server never trusts the
 * browser's check. Messages for each rule id live in passwordReset.rules.<id>.
 */
export const PASSWORD_MIN_LENGTH = 8;
// Clerk (bcrypt) rejects passwords longer than 72 bytes.
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_RULES = [
  { id: "length", test: (pw: string) => pw.length >= PASSWORD_MIN_LENGTH },
  { id: "upper", test: (pw: string) => /\p{Lu}/u.test(pw) },
  { id: "lower", test: (pw: string) => /\p{Ll}/u.test(pw) },
  { id: "number", test: (pw: string) => /\p{Nd}/u.test(pw) },
  { id: "symbol", test: (pw: string) => /[^\p{L}\p{Nd}\s]/u.test(pw) },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]["id"];

export function checkPassword(pw: string): { id: PasswordRuleId; ok: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ id: r.id, ok: r.test(pw) }));
}

export function isPasswordTooLong(pw: string): boolean {
  return new TextEncoder().encode(pw).length > PASSWORD_MAX_BYTES;
}

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw)) && !isPasswordTooLong(pw);
}
