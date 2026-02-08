"use client";

import {
  Box,
  Button,
  CardBody,
  CardHeader,
  CardRoot,
  Flex,
  Heading,
  Input,
  Link,
  NativeSelectField,
  NativeSelectRoot,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMember, saveMember } from "@/lib/actions";
import { type MembroData, type Personagem, generateId, toExportFormat } from "@/lib/types";

const CLASSES = [
  "Warrior",
  "Hunter",
  "Priest",
  "Mage",
  "Monk",
  "Demon Hunter",
  "Evoker",
  "Paladin",
  "Shaman",
  "Rogue",
  "Warlock",
  "Druid",
  "Death Knight",
] as const;

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

function downloadJson(data: MembroData, filename: string) {
  const exportData = toExportFormat(data);
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "membros.json";
  a.click();
  URL.revokeObjectURL(url);
}

interface MembroFormProps {
  memberId?: string;
  backHref?: string;
  title?: string;
  onSaved?: () => void;
}

export function MembroForm({ memberId, backHref = "/home", title, onSaved }: MembroFormProps) {
  const isEdit = Boolean(memberId);
  const [playerName, setPlayerName] = useState("");
  const [characters, setCharacters] = useState<Personagem[]>([]);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Personagem>>({});
  const [newChar, setNewChar] = useState({ nome: "", realm: "", itemLevel: 0, classe: "" });
  const [jsonPaste, setJsonPaste] = useState("");
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [meta, setMeta] = useState<Pick<MembroData, "version" | "addon" | "realm" | "exportedAt">>({});

  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (memberId) {
        const m = await getMember(memberId);
        if (m) {
          setPlayerName(m.playerName ?? m.realm ?? "");
          setCharacters(m.characters || []);
          setMeta({
            version: m.version,
            addon: m.addon,
            realm: m.realm,
            exportedAt: m.exportedAt,
          });
        }
      } else {
        setPlayerName("");
        setCharacters([]);
        setMeta({});
      }
    } finally {
      setIsLoading(false);
    }
    setJsonPaste("");
    setError("");
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const parseAndImportJson = (jsonStr: string) => {
    setError("");
    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      const chars = Array.isArray(raw.characters) ? raw.characters : [];
      const isAbiCharacterList = typeof raw.version === "number" && (raw.addon === "AbiCharacterList" || raw.addon === "AlterEgo");

      const CLASS_FILE_TO_NAME: Record<string, string> = {
      WARRIOR: "Warrior", PALADIN: "Paladin", HUNTER: "Hunter", ROGUE: "Rogue",
      PRIEST: "Priest", SHAMAN: "Shaman", MAGE: "Mage", WARLOCK: "Warlock",
      MONK: "Monk", DEMONHUNTER: "Demon Hunter", DRUID: "Druid",
      DEATHKNIGHT: "Death Knight", EVOKER: "Evoker",
    };
    const mapped = chars.map((c: Record<string, unknown>) => {
      const nameVal = (c.nome ?? c.name ?? "") as string;
      const ilvlVal = Number(c.ilvl ?? c.itemLevel ?? 0);
      const realmVal = (c.realm ?? "") as string;
      const classFile = (c.class ?? "") as string;
      const classeFromJson = (c.classe ?? "") as string;
      const classeVal = classeFromJson || (classFile && CLASS_FILE_TO_NAME[classFile]) || "";
      const { name, nome, ilvl, itemLevel, class: _class, ...rest } = c as Record<string, unknown>;
      return {
        ...rest,
        id: (c.id as string) || generateId(),
        nome: nameVal,
        realm: realmVal,
        itemLevel: ilvlVal,
        classe: classeVal || undefined,
      } as Personagem;
    });

      setCharacters(mapped);
      setJsonPaste("");
      if (isAbiCharacterList) {
        setMeta({
          version: raw.version as number,
          addon: "AbiCharacterList",
          realm: (raw.realm as string) ?? "",
          exportedAt: (raw.exportedAt as number) ?? undefined,
        });
      } else {
        setMeta({});
      }
    } catch {
      setError("JSON inválido. Cole o conteúdo do arquivo Abi Character List ou formato simples.");
    }
  };

  const handleSalvar = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      await saveMember({
        id: memberId,
        playerName,
        characters,
        ...meta,
      });
      setSaveSuccess(true);
      onSaved?.();
      if (!isEdit) {
        setPlayerName("");
        setCharacters([]);
        setMeta({});
        setNewChar({ nome: "", realm: "", itemLevel: 0, classe: "" });
      }
    } catch {
      setError("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInclude = () => {
    if (!newChar.nome.trim()) return;
    const char: Personagem = {
      id: generateId(),
      nome: newChar.nome.trim(),
      realm: newChar.realm.trim(),
      itemLevel: newChar.itemLevel || 0,
      classe: newChar.classe || undefined,
    };
    setCharacters((prev) => [...prev, char]);
    setNewChar({ nome: "", realm: "", itemLevel: 0, classe: "" });
  };

  const handleAlter = (id: string) => {
    const char = characters.find((c) => c.id === id);
    if (!char) return;
    setEditingCharId(id);
    setEditForm({ ...char });
  };

  const handleSaveAlter = () => {
    if (!editingCharId) return;
    setCharacters((prev) =>
      prev.map((c) => (c.id === editingCharId ? { ...c, ...editForm } : c))
    );
    setEditingCharId(null);
    setEditForm({});
  };

  const handleDeleteChar = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (editingCharId === id) {
      setEditingCharId(null);
      setEditForm({});
    }
  };

  const handleDownload = () => {
    const fn = playerName ? `${playerName.replace(/\s+/g, "-")}-personagens.json` : "membros.json";
    downloadJson({ id: memberId ?? "", playerName, characters, ...meta }, fn);
  };

  return (
    <Flex minH="100vh" direction="column" align="center" bg="gray.900" p={6} gap={6}>
      <Flex align="center" gap={4} w="full" maxW="900px">
        <Link asChild color="blue.400" _hover={{ color: "blue.300", textDecoration: "underline" }}>
          <NextLink href={backHref}>← Voltar</NextLink>
        </Link>
        <Image
          src="/icon.png"
          alt="Abi Character List"
          width={40}
          height={40}
          style={{ borderRadius: 8 }}
        />
        <Heading size="xl" flex={1}>
          {title ?? (isEdit ? "Editar membro" : "Adicionar membro")}
        </Heading>
      </Flex>

      <VStack gap={6} align="stretch" maxW="900px" w="full">
        {isLoading && (
          <Box bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl" p={4} textAlign="center">
            <Text color="gray.500">Carregando...</Text>
          </Box>
        )}
        <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
          <CardHeader>
            <Heading size="md">Dados do jogador</Heading>
          </CardHeader>
          <CardBody>
            <Input
              placeholder="Nome do jogador"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              size="lg"
            />
          </CardBody>
        </CardRoot>

        <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
          <CardHeader>
            <Heading size="md">Importar JSON</Heading>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Cole o JSON do Abi Character List ou formato simples
            </Text>
          </CardHeader>
          <CardBody>
            <Textarea
              placeholder='{"version":31,"addon":"AbiCharacterList","characters":[...]}'
              value={jsonPaste}
              onChange={(e) => setJsonPaste(e.target.value)}
              minH="100px"
              fontFamily="mono"
              fontSize="sm"
              bg="gray.900"
              borderColor="gray.600"
            />
            <Flex gap={3} mt={3} flexWrap="wrap">
              <Button
                onClick={() => jsonPaste.trim() && parseAndImportJson(jsonPaste.trim())}
                colorPalette="blue"
                size="md"
              >
                Importar
              </Button>
              <Button onClick={handleDownload} colorPalette="blue" variant="outline" size="md">
                Baixar JSON
              </Button>
            </Flex>
          </CardBody>
        </CardRoot>

        {error && (
          <Box bg="red.900" borderWidth="1px" borderColor="red.600" color="red.200" px={4} py={3} borderRadius="lg" fontSize="sm">
            {error}
          </Box>
        )}
        {saveSuccess && (
          <Box bg="green.900" borderWidth="1px" borderColor="green.600" color="green.200" px={4} py={3} borderRadius="lg" fontSize="sm">
            Salvo com sucesso!
          </Box>
        )}

        <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
          <CardHeader>
            <Heading size="md">Incluir personagem</Heading>
          </CardHeader>
          <CardBody>
            <Flex gap={3} flexWrap="wrap" align="flex-end">
              <Input
                placeholder="Nome"
                value={newChar.nome}
                onChange={(e) => setNewChar((p) => ({ ...p, nome: e.target.value }))}
                w={{ base: "full", sm: "140px" }}
              />
              <Input
                placeholder="Realm"
                value={newChar.realm}
                onChange={(e) => setNewChar((p) => ({ ...p, realm: e.target.value }))}
                w={{ base: "full", sm: "120px" }}
              />
              <Input
                placeholder="Item Level"
                type="number"
                value={newChar.itemLevel || ""}
                onChange={(e) => setNewChar((p) => ({ ...p, itemLevel: Number(e.target.value) || 0 }))}
                w={{ base: "full", sm: "100px" }}
              />
              <NativeSelectRoot w={{ base: "full", sm: "140px" }} size="md">
                <NativeSelectField
                  value={newChar.classe}
                  onChange={(e) => setNewChar((p) => ({ ...p, classe: e.target.value }))}
                >
                  <option value="">Classe</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
              <Button onClick={handleInclude} colorPalette="green" size="md" w={{ base: "full", sm: "auto" }}>
                Incluir
              </Button>
            </Flex>
          </CardBody>
        </CardRoot>

        <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
          <CardHeader>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
              <Heading size="md">Personagens</Heading>
              <Text fontSize="sm" color="gray.500">
                {characters.length} na lista
              </Text>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            {characters.length === 0 ? (
              <Box py={8} textAlign="center">
                <Text color="gray.500" mb={2}>
                  Nenhum personagem
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Importe um JSON ou inclua manualmente acima
                </Text>
              </Box>
            ) : (
              <Box overflowX="auto" borderRadius="lg" borderWidth="1px" borderColor="gray.700">
                <TableRoot size="sm" w="100%" style={{ tableLayout: "fixed" } as React.CSSProperties}>
                  <TableHeader>
                    <TableRow bg="gray.700/50">
                      <TableColumnHeader w="25%">Nome</TableColumnHeader>
                      <TableColumnHeader w="20%">Realm</TableColumnHeader>
                      <TableColumnHeader w="12%">iLvl</TableColumnHeader>
                      <TableColumnHeader w="23%">Classe</TableColumnHeader>
                      <TableColumnHeader w="20%" textAlign="right">Ações</TableColumnHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {characters.map((c) =>
                      editingCharId === c.id ? (
                        <TableRow key={c.id} bg="gray.700/30">
                          <TableCell w="25%">
                            <Input size="sm" value={editForm.nome ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} bg="gray.900" w="full" />
                          </TableCell>
                          <TableCell w="20%">
                            <Input size="sm" value={editForm.realm ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, realm: e.target.value }))} bg="gray.900" w="full" />
                          </TableCell>
                          <TableCell w="12%">
                            <Input
                              size="sm"
                              type="number"
                              value={editForm.itemLevel ?? ""}
                              onChange={(e) => setEditForm((p) => ({ ...p, itemLevel: Number(e.target.value) || 0 }))}
                              bg="gray.900"
                              w="full"
                            />
                          </TableCell>
                          <TableCell w="23%">
                            <NativeSelectRoot size="sm" w="full">
                              <NativeSelectField
                                value={editForm.classe ?? ""}
                                onChange={(e) => setEditForm((p) => ({ ...p, classe: e.target.value }))}
                                bg="gray.900"
                              >
                                <option value="">—</option>
                                {CLASSES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </NativeSelectField>
                            </NativeSelectRoot>
                          </TableCell>
                          <TableCell w="20%" textAlign="right">
                            <Flex gap={2} justify="flex-end">
                              <Button size="xs" colorPalette="blue" onClick={handleSaveAlter}>
                                Salvar
                              </Button>
                              <Button size="xs" variant="ghost" onClick={() => { setEditingCharId(null); setEditForm({}); }}>
                                Cancelar
                              </Button>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={c.id} _hover={{ bg: "gray.700/20" }}>
                          <TableCell w="25%" fontWeight="medium">{c.nome}</TableCell>
                          <TableCell w="20%">{c.realm}</TableCell>
                          <TableCell w="12%">
                            <Text color="blue.400" fontWeight="medium">
                              {typeof c.itemLevel === "number" ? c.itemLevel.toFixed(1) : c.itemLevel}
                            </Text>
                          </TableCell>
                          <TableCell w="23%">
                            <Flex align="center" gap={2}>
                              {c.classe && CLASS_ICONS[c.classe] && (
                                <Image
                                  src={CLASS_ICONS[c.classe]}
                                  alt={c.classe}
                                  width={24}
                                  height={24}
                                  style={{ borderRadius: 4 }}
                                />
                              )}
                              <Text>{c.classe || "—"}</Text>
                            </Flex>
                          </TableCell>
                          <TableCell w="20%" textAlign="right">
                            <Flex gap={2} justify="flex-end">
                              <Button size="xs" colorPalette="blue" variant="outline" onClick={() => handleAlter(c.id)}>
                                Editar
                              </Button>
                              <Button size="xs" colorPalette="red" variant="outline" onClick={() => handleDeleteChar(c.id)}>
                                Excluir
                              </Button>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </TableRoot>
              </Box>
            )}
          </CardBody>
        </CardRoot>

        <Button
          onClick={handleSalvar}
          colorPalette="blue"
          size="lg"
          w="full"
          h="14"
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </VStack>
    </Flex>
  );
}
