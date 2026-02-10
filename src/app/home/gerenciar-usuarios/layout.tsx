import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { hasMasterCookie } from "@/lib/auth";
import { AdminMasterGate } from "@/components/admin-master-gate";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user || !isAdmin(user)) redirect("/home");
  const hasMaster = await hasMasterCookie();
  if (!hasMaster) return <AdminMasterGate />;
  return <>{children}</>;
}
