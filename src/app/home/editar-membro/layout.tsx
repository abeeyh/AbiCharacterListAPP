import { redirect } from "next/navigation";
import { getSession, isAdmin, isGmOrAbove } from "@/lib/auth";
import { hasMasterCookie } from "@/lib/auth";
import { AdminMasterGate } from "@/components/admin-master-gate";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!isGmOrAbove(user)) redirect("/home");
  if (isAdmin(user)) {
    const hasMaster = await hasMasterCookie();
    if (!hasMaster) return <AdminMasterGate />;
  }
  return <>{children}</>;
}
