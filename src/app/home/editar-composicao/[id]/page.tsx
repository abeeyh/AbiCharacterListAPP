import { MontarComposicao } from "@/components/montar-composicao";

export default async function EditarComposicaoIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <MontarComposicao
      compositionId={id}
      backHref="/home/editar-composicao"
      title="Editar composição"
    />
  );
}
