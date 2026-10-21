import { getActor } from "../../../src/lib/authz";
import { can } from "../../../src/lib/permissions";
import { countDrafts, editableKeys } from "../../../src/lib/site-text";
import { isEditing, resolveLocale } from "../../../i18n/request";
import { EditMode } from "./EditMode";

/**
 * Rendered by the root layout. Admins (content:write) get the "Edit this page"
 * button, and in edit mode the bar, highlights and editing panel. Everyone
 * else gets nothing — not even the key list.
 */
export async function EditModeRoot() {
  const actor = await getActor().catch(() => null);
  if (!actor || actor.blocked || !can(actor.role, "content:write")) return null;

  const editing = await isEditing();
  const [keys, draftCount] = editing ? await Promise.all([editableKeys(), countDrafts(await resolveLocale())]) : [[], 0];
  return <EditMode editing={editing} keys={keys} draftCount={draftCount} />;
}
