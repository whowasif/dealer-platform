import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { menuForUser, primaryRoleLabel } from "@/lib/rbac";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = menuForUser(user);
  const roleLabel = primaryRoleLabel(user);

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} roleLabel={roleLabel} />
      <div className="flex flex-1 flex-col">
        <Topbar fullName={user.full_name} roleLabel={roleLabel} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
