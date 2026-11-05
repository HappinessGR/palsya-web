import { redirect } from "next/navigation";

/** /legal on its own goes to the privacy notice, as in the prototype. */
export default function LegalIndex() {
  redirect("/legal/privacy");
}
