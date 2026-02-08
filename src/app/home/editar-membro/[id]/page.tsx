import { MembroForm } from "@/components/membro-form";
import { getSession } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

export default async function EditarMembroIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  const allowedRoles: UserRole[] =
    user?.role === "admin"
      ? ["jogador", "gm", "admin"]
      : user?.role === "gm"
        ? ["jogador", "gm"]
        : ["jogador"];
  return (
    <MembroForm
      memberId={id}
      title="Editar membro"
      allowedRoles={allowedRoles}
    />
  );
}
