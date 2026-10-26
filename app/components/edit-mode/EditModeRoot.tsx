import { getActor } from "../../../src/lib/authz";
import { can } from "../../../src/lib/permissions";
import { countDrafts, editableKeys } from "../../../src/lib/site-text";
import { isEditing, resolveLocale } from "../../../i18n/request";
import { EditMode } from "./EditMode";
import { EditModeAuthSync } from "./EditModeAuthSync";

/**
 * Rendered by the root layout. Admins (content:write) get the "Edit this page"
 * button, and in edit mode the bar, highlights and editing panel. Everyone
 * else gets nothing — not even the key list. EditModeAuthSync refreshes this
 * after a client-side sign-in or sign-out.
 */
export async function EditModeRoot() {
  const actor = await getActor().catch(() => null);
  const sync = <EditModeAuthSync serverUserId={actor?.clerkUserId ?? null} />;
  if (!actor || actor.blocked || !can(actor.role, "content:write")) return sync;

  const editing = await isEditing();
  const [keys, draftCount] = editing ? await Promise.all([editableKeys(), countDrafts(await resolveLocale())]) : [[], 0];
  return (
    <>
      {sync}
      <EditMode editing={editing} keys={keys} draftCount={draftCount} />
    </>
  );
}
