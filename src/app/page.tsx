import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/home");
  return <LoginForm />;
}
