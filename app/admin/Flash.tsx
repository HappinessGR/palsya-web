import { getTranslations } from "next-intl/server";
import { toErrorCode } from "./shared";

/**
 * Shows the outcome of the last admin action, passed back via ?result= / ?error=
 * after the server action redirects. Only known codes are rendered.
 */
export async function Flash({
  result,
  error,
  resultNs,
  resultCodes,
}: {
  result?: string;
  error?: string;
  resultNs: "users" | "invite";
  resultCodes: readonly string[];
}) {
  const t = await getTranslations("admin");
  const errorCode = toErrorCode(error);
  if (errorCode) {
    return (
      <div className="note note-safety" role="alert" style={{ marginBottom: "var(--s-5)" }}>
        <div>{t(`errors.${errorCode}`)}</div>
      </div>
    );
  }
  if (result && resultCodes.includes(result)) {
    return (
      <div className="note note-ok" role="status" style={{ marginBottom: "var(--s-5)" }}>
        <div>{t(`${resultNs}.result.${result}`)}</div>
      </div>
    );
  }
  return null;
}
