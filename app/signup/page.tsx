import { redirect } from "next/navigation";
import { redirectSignedInToDashboard } from "../../src/lib/authz";

// "/signup" is a common guess for the sign-up URL. Signed-in users go to their
// own dashboard (role from the database); everyone else to the real page,
// keeping ?plan= and any other query parameters.
export default async function SignupAliasPage({ searchParams }: PageProps<"/signup">) {
  await redirectSignedInToDashboard();

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v !== undefined) query.append(key, v);
  }
  const qs = query.toString();
  redirect(qs ? `/sign-up?${qs}` : "/sign-up");
}
