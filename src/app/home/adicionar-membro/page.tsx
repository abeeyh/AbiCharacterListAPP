import { MembroForm } from "@/components/membro-form";
import { getSession } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

export default async function AdicionarMembroPage() {
  const user = await getSession();
  const allowedRoles: UserRole[] =
    user?.role === "admin"
      ? ["jogador", "gm", "admin"]
      : user?.role === "gm"
        ? ["jogador", "gm"]
        : ["jogador"];
  return <MembroForm title="Adicionar membro" allowedRoles={allowedRoles} />;
}
