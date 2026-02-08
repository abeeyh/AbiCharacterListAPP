"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Link,
  NativeSelectField,
  NativeSelectRoot,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getMembers,
  getCompositions,
  getComposition,
  saveComposition as persistComposition,
  deleteComposition as removeComposition,
} from "@/lib/actions";
import type { CompositionType, SlotChar, MembroData, Personagem } from "@/lib/types";
import {
  getClassesInComposition,
  checkUtility,
  LUST,
  BATTLE_REZ,
  RAID_BUFFS,
  RAID_DEBUFFS,
} from "@/lib/raid-utils";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";

const SLOT_SIZE = { minH: "52px", h: "52px", flexShrink: 0 };

/** Por classe: primeiro = Main, segundo = Alt 1, terceiro = Alt 2, etc. */
function getMainAltLabel(member: MembroData, char: Personagem): string {
  const chars = member.characters ?? [];
  const cls = char.classe ?? "Sem classe";
  let sameClassIndex = 0;
  for (const c of chars) {
    if ((c.classe ?? "Sem classe") === cls) {
      if (c.id === char.id) {
        return sameClassIndex === 0 ? "Main" : `Alt ${sameClassIndex}`;
      }
      sameClassIndex++;
    }
  }
  return "";
}

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

const CLASS_COLORS: Record<string, string> = {
  Warrior: "#C69B6D",
  Hunter: "#AAD372",
  Priest: "#FFFFFF",
  Mage: "#3FC7EB",
  Monk: "#00FF98",
  "Demon Hunter": "#A330C9",
  Evoker: "#33937F",
  Paladin: "#F48CBA",
  Shaman: "#0070DD",
  Rogue: "#FFF468",
  Warlock: "#8788EE",
  Druid: "#FF7C0A",
  "Death Knight": "#C41E3A",
};

interface MontarComposicaoProps {
  compositionId?: string;
  title?: string;
}

export function MontarComposicao({ compositionId, title = "Montar composição" }: MontarComposicaoProps = {}) {
  const [members, setMembers] = useState<MembroData[]>([]);
  const [compositions, setCompositions] = useState<Awaited<ReturnType<typeof getCompositions>>>([]);
  const [name, setName] = useState("");
  const [compositionType, setCompositionType] = useState<CompositionType>("mythic");
  const [slots, setSlots] = useState<(SlotChar | null)[]>(Array(20).fill(null));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayerBySlot, setSelectedPlayerBySlot] = useState<Record<number, string>>({});
  const router = useRouter();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersData, compsData] = await Promise.all([
        getMembers(),
        getCompositions(),
      ]);
      setMembers(membersData);
      setCompositions(compsData);
      if (compositionId) {
        const comp = await getComposition(compositionId);
        if (comp) {
          setName(comp.name);
          setCompositionType((comp.type === "mythic" || comp.type === "heroic" ? comp.type : "mythic") as CompositionType);
          setSlots(comp.slots);
        }
      } else {
        setName("");
        setCompositionType("mythic");
        setSlots(Array(20).fill(null));
      }
    } finally {
      setIsLoading(false);
    }
    setSaveSuccess(false);
    setSelectedPlayerBySlot({});
  }, [compositionId]);

  useEffect(() => {
    load();
  }, [load]);

  const allOptions: Array<{ memberId: string; playerName: string; char: Personagem }> = [];
  for (const m of members) {
    for (const c of m.characters ?? []) {
      allOptions.push({
        memberId: m.id,
        playerName: m.playerName ?? m.realm ?? "?",
        char: c,
      });
    }
  }

  const charsInOtherCompositionsSameType = new Set<string>();
  for (const comp of compositions) {
    if (comp.id === compositionId) continue;
    if (comp.type !== compositionType) continue;
    for (const slot of comp.slots ?? []) {
      if (slot?.memberId && slot?.char?.id) {
        charsInOtherCompositionsSameType.add(`${slot.memberId}::${slot.char.id}`);
      }
    }
  }

  const isMythic = compositionType === "mythic";
  const isHeroic = compositionType === "heroic";

  const isCharAvailableForMythic = (memberId: string, charId: string) =>
    !charsInOtherCompositionsSameType.has(`${memberId}::${charId}`);

  const isCharAvailableForSlot = (excludeSlotIndex: number, memberId: string, charId: string) => {
    const key = `${memberId}::${charId}`;
    const usedInThisExceptSlot = slots.some(
      (s, i) => i !== excludeSlotIndex && s != null && `${s.memberId}::${s.char.id}` === key
    );
    if (usedInThisExceptSlot) return false;
    if (isMythic) return isCharAvailableForMythic(memberId, charId);
    return true;
  };

  const availableMembersForSlot = (excludeSlotIndex: number) => {
    const usedMemberIds = new Set<string>();
    for (let i = 0; i < slots.length; i++) {
      if (i !== excludeSlotIndex && slots[i]?.memberId) {
        usedMemberIds.add(slots[i]!.memberId);
      }
    }
    return members.filter((m) => {
      if (usedMemberIds.has(m.id)) return false;
      return (m.characters ?? []).some((c) => isCharAvailableForSlot(excludeSlotIndex, m.id, c.id));
    });
  };

  const handleSalvar = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const saved = await persistComposition({ id: compositionId, name, type: compositionType, slots });
      setSaveSuccess(true);
      toaster.create({ title: "Salvo com sucesso", type: "success" });
      router.push(`/home/editar-composicao/${saved.id}`);
    } catch (err) {
      console.error(err);
      toaster.create({ title: "Erro ao salvar", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletar = async () => {
    if (!compositionId || isSaving) return;
    if (typeof window !== "undefined" && !window.confirm("Deletar esta composição?")) return;
    setIsSaving(true);
    try {
      await removeComposition(compositionId);
      toaster.create({ title: "Composição deletada", type: "success" });
      router.push("/home/editar-composicao");
    } catch {
      toaster.create({ title: "Erro ao deletar", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (v: string) => {
    setName(v);
  };

  const handleSelectPlayer = (slotIndex: number, memberId: string) => {
    setSelectedPlayerBySlot((prev) => ({ ...prev, [slotIndex]: memberId }));
  };

  const handleSelectChar = (slotIndex: number, memberId: string, charId: string) => {
    const opt = allOptions.find((o) => o.memberId === memberId && o.char.id === charId);
    if (!opt) return;
    const usedInOtherCompSameType = charsInOtherCompositionsSameType.has(`${memberId}::${charId}`);
    const next = [...slots];
    next[slotIndex] = {
      ...opt,
      saved: isHeroic ? usedInOtherCompSameType : false,
    };
    setSlots(next);
    setSelectedPlayerBySlot((prev) => {
      const p = { ...prev };
      delete p[slotIndex];
      return p;
    });
  };

  const handleToggleSaved = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot) return;
    const next = [...slots];
    next[slotIndex] = { ...slot, saved: !slot.saved };
    setSlots(next);
  };

  const handleClear = (slotIndex: number) => {
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
  };

  const DangerIcon = () => (
    <Box w="32px" h="32px" flexShrink={0} color="red.500" lineHeight={0}>
      <svg viewBox="0 0 24 24" fill="currentColor" width={32} height={32}>
        <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
      </svg>
    </Box>
  );

  const renderSlot = (slot: SlotChar | null, i: number) => {
    if (slot) {
      const slotMember = members.find((m) => m.id === slot.memberId);
      const mainAlt = slotMember ? getMainAltLabel(slotMember, slot.char) : "";
      const color = (slot.char.classe && CLASS_COLORS[slot.char.classe]) || "#ccc";
      const hasClassIcon = slot.char.classe && CLASS_ICONS[slot.char.classe];
      return (
        <Flex
          key={i}
          align="center"
          gap={2}
          {...SLOT_SIZE}
          px={3}
          borderRadius="md"
          bg="gray.800"
          borderWidth="1px"
          borderColor="gray.700"
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
            <DangerIcon />
          )}
          <Box flex={1} minW={0}>
            <Flex align="center" gap={2} wrap="nowrap" minW={0}>
              <Text fontWeight="600" truncate style={{ color }}>
                {slot.playerName} — {mainAlt}
              </Text>
              {isHeroic && (
                <Badge
                  colorPalette={slot.saved ? "yellow" : "green"}
                  variant="subtle"
                  cursor="pointer"
                  onClick={() => handleToggleSaved(i)}
                  fontSize="2xs"
                >
                  {slot.saved ? "Saved" : "Unsaved"}
                </Badge>
              )}
            </Flex>
          </Box>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleClear(i)}>
            ✕
          </Button>
        </Flex>
      );
    }
    const availMembers = availableMembersForSlot(i);
    const selPlayerId = selectedPlayerBySlot[i] ?? "";
    const selMember = members.find((m) => m.id === selPlayerId);
    const charOptions = (selMember?.characters ?? []).filter(
      (c) => selMember && isCharAvailableForSlot(i, selMember.id, c.id)
    );

    return (
      <Flex
        key={i}
        align="center"
        gap={2}
        {...SLOT_SIZE}
        px={3}
        borderRadius="md"
        bg="gray.800/60"
        borderWidth="1px"
        borderColor="gray.700"
        borderStyle="dashed"
        overflow="hidden"
      >
        <NativeSelectRoot flex={1} minW={0} size="sm">
          <NativeSelectField
            value={selPlayerId}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setSelectedPlayerBySlot((p) => {
                  const next = { ...p };
                  delete next[i];
                  return next;
                });
              } else {
                handleSelectPlayer(i, v);
              }
            }}
            bg="transparent"
            border="none"
          >
            <option value="">— Jogador —</option>
            {availMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.playerName ?? m.realm ?? "Sem nome"}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
        <NativeSelectRoot flex={1} minW={0} size="sm" disabled={!selPlayerId}>
          <NativeSelectField
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v && selPlayerId) {
                handleSelectChar(i, selPlayerId, v);
              }
            }}
            bg="transparent"
            border="none"
          >
            <option value="">— Personagem —</option>
            {charOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classe ?? "?"} — {selMember ? getMainAltLabel(selMember, c) : ""}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
      </Flex>
    );
  };

  const Group = ({ label, startIdx }: { label: string; startIdx: number }) => (
    <Box>
      <Text fontSize="xs" fontWeight="600" color="gray.500" mb={1}>
        {label}
      </Text>
      <VStack gap={1.5} align="stretch">
        {[0, 1, 2, 3, 4].map((j) => renderSlot(slots[startIdx + j], startIdx + j))}
      </VStack>
    </Box>
  );

  const classesInComp = getClassesInComposition(slots, isMythic || isHeroic);
  const lustCheck = checkUtility(LUST, classesInComp);
  const brezCheck = checkUtility(BATTLE_REZ, classesInComp);
  const hasAnySlot = slots.some(Boolean);

  const UtilsPanel = () => (
    <Box
      w="full"
      maxW="240px"
      flexShrink={0}
      p={3}
      borderRadius="md"
      bg="gray.800"
      borderWidth="1px"
      borderColor="gray.700"
      alignSelf="flex-start"
    >
      <Text fontSize="xs" fontWeight="600" color="gray.500" mb={2}>
        Utilitários
      </Text>
      {!hasAnySlot ? (
        <Text fontSize="xs" color="gray.600">Adicione personagens</Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {lustCheck.has ? (
            <Text fontSize="xs" color="green.400">✓ Lust — {lustCheck.providedBy}</Text>
          ) : (
            <Text fontSize="xs" color="red.400">✗ Lust ({LUST.classes.join(", ")})</Text>
          )}
          {brezCheck.has ? (
            <Text fontSize="xs" color="green.400">✓ Brez — {brezCheck.providedBy}</Text>
          ) : (
            <Text fontSize="xs" color="red.400">✗ Brez ({BATTLE_REZ.classes.join(", ")})</Text>
          )}
          <Box>
            <Text fontSize="xs" fontWeight="600" color="gray.500" mb={0.5}>Buffs</Text>
            <VStack align="stretch" gap={0.5}>
              {RAID_BUFFS.map((u) => {
                const check = checkUtility(u, classesInComp);
                return check.has ? (
                  <Text key={u.id} fontSize="xs" color="green.400">
                    ✓ {u.name} — {check.providedBy}
                  </Text>
                ) : (
                  <Text key={u.id} fontSize="xs" color="gray.500">
                    ✗ {u.name} — {u.classes.join(", ")}
                  </Text>
                );
              })}
            </VStack>
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="600" color="gray.500" mb={0.5}>Debuffs</Text>
            <VStack align="stretch" gap={0.5}>
              {RAID_DEBUFFS.map((u) => {
                const check = checkUtility(u, classesInComp);
                return check.has ? (
                  <Text key={u.id} fontSize="xs" color="green.400">
                    ✓ {u.name} — {check.providedBy}
                  </Text>
                ) : (
                  <Text key={u.id} fontSize="xs" color="gray.500">
                    ✗ {u.name} — {u.classes.join(", ")}
                  </Text>
                );
              })}
            </VStack>
          </Box>
        </VStack>
      )}
    </Box>
  );

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <VStack gap={5} align="stretch" maxW="900px" w="full">
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Heading size="lg" fontWeight="600">
            {title}
          </Heading>
          {compositionId && (
            <Link asChild>
              <NextLink href="/home/montar-composicao">
                <Button size="sm" colorPalette="blue" variant="outline">+ Nova</Button>
              </NextLink>
            </Link>
          )}
        </Flex>

        <Flex gap={4} flexWrap="wrap" align="flex-end">
          <Box flex={1} minW="200px">
            <Text fontSize="xs" color="gray.500" mb={1}>Nome</Text>
            <Input
              placeholder="Ex: Raid Terça 20h"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              size="md"
              bg="gray.800"
              borderColor="gray.600"
            />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Tipo</Text>
            <NativeSelectRoot size="md" w="220px">
              <NativeSelectField
                value={compositionType}
                onChange={(e) => setCompositionType(e.target.value as CompositionType)}
                bg="gray.800"
                borderColor="gray.600"
              >
                <option value="mythic">Mythic</option>
                <option value="heroic">Heroic</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>
        </Flex>

        {saveSuccess && (
          <Text color="green.400" fontSize="sm">Salvo!</Text>
        )}

        {isLoading ? (
          <LoadingSkeleton variant="page" />
        ) : members.length === 0 ? (
          <Box py={10} textAlign="center">
            <Text color="gray.500" mb={3}>Nenhum membro cadastrado.</Text>
            <Link asChild>
              <NextLink href="/home/adicionar-membro">
                <Button size="sm" colorPalette="blue">Adicionar membro</Button>
              </NextLink>
            </Link>
          </Box>
        ) : (
          <>
            <Flex gap={6} w="full" align="flex-start" flexWrap="wrap" flexDirection={{ base: "column", lg: "row" }}>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} flex={1} minW={0}>
                <Group label="Grupo 1" startIdx={0} />
                <Group label="Grupo 2" startIdx={5} />
                <Group label="Grupo 3" startIdx={10} />
                <Group label="Grupo 4" startIdx={15} />
              </SimpleGrid>
              <UtilsPanel />
            </Flex>
            <Flex gap={3} w="full" flexDirection={{ base: "column", sm: "row" }}>
              <Button
                onClick={handleSalvar}
                colorPalette="blue"
                size="lg"
                flex={1}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              {compositionId && (
                <Button
                  onClick={handleDeletar}
                  colorPalette="red"
                  variant="outline"
                  size="lg"
                  disabled={isSaving}
                >
                  Deletar
                </Button>
              )}
            </Flex>
          </>
        )}
      </VStack>
    </Flex>
  );
}
