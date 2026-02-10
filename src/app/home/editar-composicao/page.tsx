"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { deleteComposition, getCompositions } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useEffect, useMemo, useState } from "react";

export default function EditarComposicaoPage() {
  const router = useRouter();
  const [compositions, setCompositions] = useState<Awaited<ReturnType<typeof getCompositions>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getCompositions();
      setCompositions(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filledCount = (comp: { slots: unknown[] }) =>
    comp.slots?.filter(Boolean).length ?? 0;

  const formatScheduled = (scheduledAt?: string) => {
    if (!scheduledAt) return null;
    try {
      const d = new Date(scheduledAt);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const { mythic, heroic } = useMemo(() => {
    const m = compositions.filter((c) => c.type === "mythic" || !c.type);
    const h = compositions.filter((c) => c.type === "heroic");
    return { mythic: m, heroic: h };
  }, [compositions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Deletar esta composição?")) {
      try {
        await deleteComposition(id);
        await load();
        toaster.create({ title: "Composição deletada", type: "success" });
      } catch {
        toaster.create({ title: "Erro ao deletar", type: "error" });
      }
    }
  };

  const CompositionCard = ({
    c,
  }: {
    c: Awaited<ReturnType<typeof getCompositions>>[number];
  }) => (
    <CardRoot
      bg="gray.800"
      borderWidth="1px"
      borderColor="gray.700"
      borderRadius="xl"
      cursor="pointer"
      _hover={{
        borderColor: "blue.500",
        boxShadow: "0 4px 12px -4px rgba(0,0,0,0.4)",
      }}
      transition="all 0.15s"
      onClick={() => router.push(`/home/editar-composicao/${c.id}`)}
    >
      <CardBody py={4} px={5}>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Box flex={1} minW={0}>
            <Flex gap={2} align="center" mb={1}>
              <Text
                as="span"
                fontSize="2xs"
                px={2}
                py={0.5}
                borderRadius="md"
                bg={c.type === "heroic" ? "yellow.900/60" : "gray.700"}
                color={c.type === "heroic" ? "yellow.300" : "gray.400"}
                fontWeight="medium"
              >
                {c.type === "heroic" ? "Heroic" : "Mythic"}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {filledCount(c)}/20
              </Text>
            </Flex>
            <Text fontWeight="600" fontSize="md" truncate title={c.name || "Sem nome"}>
              {c.name || "Sem nome"}
            </Text>
            {formatScheduled((c as { scheduledAt?: string }).scheduledAt) && (
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                📅 {formatScheduled((c as { scheduledAt?: string }).scheduledAt)}
              </Text>
            )}
          </Box>
          <Flex gap={1} flexShrink={0} onClick={(e) => e.stopPropagation()}>
            <Button
              colorPalette="blue"
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/home/editar-composicao/${c.id}`);
              }}
            >
              Editar
            </Button>
            <Button
              colorPalette="red"
              variant="ghost"
              size="xs"
              onClick={(e) => handleDelete(e, c.id)}
            >
              Deletar
            </Button>
          </Flex>
        </Flex>
      </CardBody>
    </CardRoot>
  );

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: Awaited<ReturnType<typeof getCompositions>>;
  }) =>
    items.length > 0 ? (
      <Box>
        <Text fontSize="xs" fontWeight="600" color="gray.500" mb={3}>
          {title}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          {items.map((c) => (
            <CompositionCard key={c.id} c={c} />
          ))}
        </SimpleGrid>
      </Box>
    ) : null;

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <Flex align="center" gap={4} w="full" maxW="800px" flexWrap="wrap">
        <Heading size="xl" flex={1}>
          Editar composição
        </Heading>
        <Link asChild>
          <NextLink href="/home/montar-composicao">
            <Button colorPalette="blue" size="sm">
              Nova composição
            </Button>
          </NextLink>
        </Link>
      </Flex>

      <VStack gap={6} align="stretch" maxW="800px" w="full">
        {isLoading ? (
          <LoadingSkeleton variant="cards" />
        ) : compositions.length === 0 ? (
          <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
            <CardBody py={12} textAlign="center">
              <Text fontSize="4xl" mb={4} opacity={0.5}>
                ⚔️
              </Text>
              <Heading size="md" mb={2}>
                Nenhuma composição salva
              </Heading>
              <Text color="gray.500" mb={6}>
                Monte uma composição primeiro para poder editar
              </Text>
              <Link asChild>
                <NextLink href="/home/montar-composicao">
                  <Button colorPalette="blue" size="lg">
                    Montar composição
                  </Button>
                </NextLink>
              </Link>
            </CardBody>
          </CardRoot>
        ) : (
          <>
            <Section title="Mythic" items={mythic} />
            <Section title="Heroic" items={heroic} />
          </>
        )}
      </VStack>
    </Flex>
  );
}
