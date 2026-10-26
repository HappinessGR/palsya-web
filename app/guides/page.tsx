import { redirect } from "next/navigation";

// Guides are for patients only: they live in the patient dashboard's library
// (signed in, self:programme). Old /guides links land there instead.
export default function GuidesPage() {
  redirect("/dashboard/library");
}
