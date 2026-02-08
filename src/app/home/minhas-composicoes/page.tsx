"use client";

import {
  Box,
  CardBody,
  CardRoot,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMyCompositions } from "@/lib/actions";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { CompositionData, SlotChar } from "@/lib/types";

const filledCount = (comp: { slots: unknown[] }) =>
  comp.slots?.filter(Boolean).length ?? 0;

export default function MinhasComposicoesPage() {
  const router = useRouter();
  const [compositions, setCompositions] = useState<CompositionData[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getMyCompositions();
      setCompositions(data.compositions);
      setPlayerId(data.playerId);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { mythic, heroic } = useMemo(() => {
    const m = compositions.filter((c) => c.type === "mythic" || !c.type);
    const h = compositions.filter((c) => c.type === "heroic");
    return { mythic: m, heroic: h };
  }, [compositions]);

  const getMySlotsInComp = (comp: CompositionData) =>
    (comp.slots ?? []).filter(
      (s): s is SlotChar => s != null && playerId != null && s.memberId === playerId
    );

  const CompositionCard = ({ c }: { c: CompositionData }) => {
    const mySlots = getMySlotsInComp(c);
    return (
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
        onClick={() => router.push(`/home/minhas-composicoes/${c.id}`)}
      >
        <CardBody py={4} px={5}>
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
          {mySlots.length > 0 && (
            <Text fontSize="xs" color="blue.400" mt={2}>
              Seus personagens: {mySlots.map((s) => `${s.char.classe ?? "?"} — ${s.char.nome}`).join(", ")}
            </Text>
          )}
        </CardBody>
      </CardRoot>
    );
  };

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: CompositionData[];
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
      <Heading size="xl" w="full" maxW="800px">
        Minhas composições
      </Heading>
      <Text color="gray.500" fontSize="sm" w="full" maxW="800px">
        Composições em que algum dos seus personagens está vinculado.
      </Text>

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
                Nenhuma composição
              </Heading>
              <Text color="gray.500">
                Seus personagens ainda não estão vinculados a nenhuma composição.
              </Text>
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
