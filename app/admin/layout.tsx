import { requirePagePermission } from "../../src/lib/authz";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requirePagePermission("users:read");
  return <>{children}</>;
}
