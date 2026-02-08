import { redirect } from "next/navigation";
import { getSession, isGmOrAbove } from "@/lib/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!isGmOrAbove(user)) redirect("/home");
  return <>{children}</>;
}
