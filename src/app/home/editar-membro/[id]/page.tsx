import { MembroForm } from "@/components/membro-form";

export default async function EditarMembroIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <MembroForm
      memberId={id}
      backHref="/home/editar-membro"
      title="Editar membro"
    />
  );
}
