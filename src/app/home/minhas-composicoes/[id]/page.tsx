"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCompositionIfPlayerIn } from "@/lib/actions";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { CompositionData, SlotChar } from "@/lib/types";

const CLASS_ICONS: Record<string, string> = {
  Warrior: "/ClassIcon_warrior.webp",
  Hunter: "/ClassIcon_hunter.webp",
  Priest: "/ClassIcon_priest.webp",
  Mage: "/ClassIcon_mage.webp",
  Monk: "/ClassIcon_monk.webp",
  "Demon Hunter": "/ClassIcon_demon_hunter.webp",
  Evoker: "/ClassIcon_evoker.webp",
  Paladin: "/ClassIcon_paladin.webp",
  Shaman: "/ClassIcon_shaman.webp",
  Rogue: "/ClassIcon_rogue.webp",
  Warlock: "/ClassIcon_warlock.webp",
  Druid: "/ClassIcon_druid.webp",
  "Death Knight": "/ClassIcon_deathknight.webp",
};

export default function MinhasComposicoesDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [comp, setComp] = useState<CompositionData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getCompositionIfPlayerIn(id);
        if (data) {
          setComp(data.composition);
          setPlayerId(data.playerId);
        } else {
          setComp(null);
          setPlayerId(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) {
    return <LoadingSkeleton variant="page" />;
  }

  if (!comp) {
    return (
      <Flex flex={1} minH="100%" direction="column" align="center" justify="center" p={6}>
        <VStack gap={4}>
          <Heading size="md">Composição não encontrada</Heading>
          <Text color="gray.500">
            Você não tem personagens nesta composição ou ela não existe.
          </Text>
          <Button colorPalette="blue" asChild>
            <Link href="/home/minhas-composicoes">Voltar</Link>
          </Button>
        </VStack>
      </Flex>
    );
  }

  const myPlayerId = playerId;

  const renderSlot = (slot: SlotChar | null, i: number) => {
    if (!slot) {
      return (
        <Flex
          key={i}
          align="center"
          justify="center"
          minH="52px"
          h="52px"
          px={3}
          borderRadius="md"
          bg="gray.800/40"
          borderWidth="1px"
          borderColor="gray.700"
          borderStyle="dashed"
        >
          <Text fontSize="xs" color="gray.600">—</Text>
        </Flex>
      );
    }
    const isMine = myPlayerId != null && slot.memberId === myPlayerId;
    const hasClassIcon = slot.char.classe && CLASS_ICONS[slot.char.classe];
    return (
      <Flex
        key={i}
        align="center"
        gap={2}
        minH="52px"
        h="52px"
        px={3}
        borderRadius="md"
        bg={isMine ? "blue.900/30" : "gray.800"}
        borderWidth="1px"
        borderColor={isMine ? "blue.600" : "gray.700"}
        overflow="hidden"
      >
        {hasClassIcon ? (
          <Image
            src={CLASS_ICONS[slot.char.classe!]}
            alt={slot.char.classe ?? ""}
            width={28}
            height={28}
            style={{ borderRadius: 4, flexShrink: 0 }}
          />
        ) : (
          <Box w="28px" h="28px" flexShrink={0} />
        )}
        <Box flex={1} minW={0}>
          <Text fontWeight="600" truncate fontSize="sm">
            {slot.playerName} — {slot.char.classe ?? "?"} — {slot.char.nome}
          </Text>
          {comp.type === "heroic" && slot.saved !== undefined && (
            <Text fontSize="xs" color="gray.500">
              {slot.saved ? "Saved" : "Unsaved"}
            </Text>
          )}
        </Box>
        {isMine && (
          <Text fontSize="2xs" color="blue.400" fontWeight="medium">Você</Text>
        )}
      </Flex>
    );
  };

  const Group = ({ label, startIdx }: { label: string; startIdx: number }) => (
    <Box>
      <Text fontSize="xs" fontWeight="600" color="gray.500" mb={1}>
        {label}
      </Text>
      <VStack gap={1.5} align="stretch">
        {[0, 1, 2, 3, 4].map((j) =>
          renderSlot(comp!.slots[startIdx + j] ?? null, startIdx + j)
        )}
      </VStack>
    </Box>
  );

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <Flex align="center" justify="space-between" w="full" maxW="900px" flexWrap="wrap" gap={4}>
        <VStack align="flex-start" gap={0}>
          <Heading size="xl">{comp.name || "Sem nome"}</Heading>
          <Flex gap={2} align="center">
            <Text
              as="span"
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="md"
              bg={comp.type === "heroic" ? "yellow.900/60" : "gray.700"}
              color={comp.type === "heroic" ? "yellow.300" : "gray.400"}
            >
              {comp.type === "heroic" ? "Heroic" : "Mythic"}
            </Text>
          </Flex>
        </VStack>
        <Button colorPalette="gray" variant="outline" size="sm" asChild>
          <Link href="/home/minhas-composicoes">← Voltar</Link>
        </Button>
      </Flex>

      <Flex gap={6} w="full" maxW="900px" flexWrap="wrap">
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} flex={1} minW={0}>
          <Group label="Grupo 1" startIdx={0} />
          <Group label="Grupo 2" startIdx={5} />
          <Group label="Grupo 3" startIdx={10} />
          <Group label="Grupo 4" startIdx={15} />
        </SimpleGrid>
      </Flex>
    </Flex>
  );
}
