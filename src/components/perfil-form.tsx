"use client";

import {
  Badge,
  Box,
  Button,
  Collapsible,
  Flex,
  Heading,
  Input,
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
import { useCallback, useEffect, useState } from "react";
import { getMyProfile, saveMyProfile } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { type MembroData, type Personagem, generateId, toExportFormat } from "@/lib/types";

const CLASSES = [
  "Warrior", "Hunter", "Priest", "Mage", "Monk", "Demon Hunter", "Evoker",
  "Paladin", "Shaman", "Rogue", "Warlock", "Druid", "Death Knight",
] as const;

const CLASS_ICONS: Record<string, string> = {
  Warrior: "/ClassIcon_warrior.webp", Hunter: "/ClassIcon_hunter.webp",
  Priest: "/ClassIcon_priest.webp", Mage: "/ClassIcon_mage.webp",
  Monk: "/ClassIcon_monk.webp", "Demon Hunter": "/ClassIcon_demon_hunter.webp",
  Evoker: "/ClassIcon_evoker.webp", Paladin: "/ClassIcon_paladin.webp",
  Shaman: "/ClassIcon_shaman.webp", Rogue: "/ClassIcon_rogue.webp",
  Warlock: "/ClassIcon_warlock.webp", Druid: "/ClassIcon_druid.webp",
  "Death Knight": "/ClassIcon_deathknight.webp",
};

function downloadJson(data: MembroData, filename: string) {
  const blob = new Blob([JSON.stringify(toExportFormat(data), null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "meu-perfil.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function PerfilForm() {
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [characters, setCharacters] = useState<Personagem[]>([]);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Personagem>>({});
  const [newChar, setNewChar] = useState({ nome: "", realm: "", itemLevel: 0, classe: "" });
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonPaste, setJsonPaste] = useState("");
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [meta, setMeta] = useState<Pick<MembroData, "version" | "addon" | "realm" | "exportedAt">>({});
  const [memberId, setMemberId] = useState<string>("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setNoProfile(false);
    try {
      const m = await getMyProfile();
      if (m) {
        setMemberId(m.id);
        setPlayerName(m.playerName ?? m.realm ?? "");
        setCharacters(m.characters || []);
        setMeta({ version: m.version, addon: m.addon, realm: m.realm, exportedAt: m.exportedAt });
      } else {
        setNoProfile(true);
      }
      setPassword("");
    } finally {
      setIsLoading(false);
    }
    setJsonPaste("");
    setError("");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parseAndImportJson = (jsonStr: string) => {
    setError("");
    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      const chars = Array.isArray(raw.characters) ? raw.characters : [];
      const CLASS_FILE_TO_NAME: Record<string, string> = {
        WARRIOR: "Warrior", PALADIN: "Paladin", HUNTER: "Hunter", ROGUE: "Rogue",
        PRIEST: "Priest", SHAMAN: "Shaman", MAGE: "Mage", WARLOCK: "Warlock",
        MONK: "Monk", DEMONHUNTER: "Demon Hunter", DRUID: "Druid",
        DEATHKNIGHT: "Death Knight", EVOKER: "Evoker",
      };
      const normalized = (s: string) => String(s ?? "").trim().toLowerCase();
      setCharacters((prevChars) => {
        const mapped = chars.map((c: Record<string, unknown>) => {
          const nome = (c.nome ?? c.name ?? "") as string;
          const itemLevel = Number(c.ilvl ?? c.itemLevel ?? 0);
          const realm = (c.realm ?? "") as string;
          const classeFromJson = (c.classe ?? "") as string;
          const classeFromFile = (c.class ?? "") as string;
          const classe = classeFromJson || (classeFromFile && CLASS_FILE_TO_NAME[classeFromFile as string]) || "";
          const imported: Personagem = {
            ...c,
            id: (c.id as string) || generateId(),
            nome,
            realm,
            itemLevel,
            classe: classe || undefined,
          } as Personagem;
          const existing = prevChars.find(
            (e) => normalized(e.nome) === normalized(nome) && normalized(e.realm) === normalized(realm)
          );
          if (existing) {
            imported.saved_mythic = existing.saved_mythic;
            imported.saved_heroic = existing.saved_heroic;
          }
          return imported;
        });
        return mapped;
      });
      setJsonPaste("");
      if (typeof raw.version === "number" && (raw.addon === "AbiCharacterList" || raw.addon === "AlterEgo")) {
        setMeta({
          version: raw.version as number,
          addon: "AbiCharacterList",
          realm: (raw.realm as string) ?? "",
          exportedAt: (raw.exportedAt as number) ?? undefined,
        });
      }
    } catch {
      setError("JSON inválido.");
    }
  };

  const handleSalvar = async () => {
    if (isSaving || noProfile) return;
    if (!playerName.trim()) {
      setError("Nome do jogador é obrigatório.");
      return;
    }
    if (password && password.length < 4) {
      setError("Senha deve ter no mínimo 4 caracteres.");
      return;
    }
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      const saved = await saveMyProfile({
        id: memberId,
        playerName: playerName.trim(),
        characters,
        password: password.trim() || undefined,
        ...meta,
      });
      if (saved) {
        setSaveSuccess(true);
        setPassword("");
        toaster.create({ title: "Salvo com sucesso", type: "success" });
      } else {
        setError("Erro ao salvar.");
        toaster.create({ title: "Erro ao salvar", type: "error" });
      }
    } catch {
      setError("Erro ao salvar.");
      toaster.create({ title: "Erro ao salvar", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInclude = () => {
    if (!newChar.nome.trim()) return;
    setCharacters((prev) => [
      ...prev,
      {
        id: generateId(),
        nome: newChar.nome.trim(),
        realm: newChar.realm.trim(),
        itemLevel: newChar.itemLevel || 0,
        classe: newChar.classe || undefined,
      } as Personagem,
    ]);
    setNewChar({ nome: "", realm: "", itemLevel: 0, classe: "" });
  };

  const handleAlter = (id: string) => {
    const c = characters.find((x) => x.id === id);
    if (c) {
      setEditingCharId(id);
      setEditForm({ ...c });
    }
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

  const handleToggleSaved = (charId: string, type: "mythic" | "heroic") => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              saved_mythic: type === "mythic" ? !c.saved_mythic : c.saved_mythic,
              saved_heroic: type === "heroic" ? !c.saved_heroic : c.saved_heroic,
            }
          : c
      )
    );
  };

  if (isLoading) {
    return <LoadingSkeleton variant="form" />;
  }

  if (noProfile) {
    return (
      <Flex flex={1} minH="100%" direction="column" align="center" justify="center" p={6}>
        <VStack gap={4} maxW="400px" textAlign="center">
          <Heading size="md">Meu perfil</Heading>
          <Text color="gray.500">
            Seu perfil não está vinculado a um jogador. Entre em contato com um administrador ou GM para ser adicionado como membro.
          </Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <VStack gap={5} align="stretch" maxW="960px" w="full">
        <Heading size="lg" fontWeight="600">
          Meu perfil
        </Heading>

        <VStack gap={4} align="stretch">
          <Input
            placeholder="Nome do jogador"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            size="lg"
            bg="gray.800"
            borderColor="gray.600"
          />
          <Flex gap={2} align="center">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nova senha (deixe em branco para manter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="lg"
              bg="gray.800"
              borderColor="gray.600"
              flex={1}
            />
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setShowPassword((p) => !p)}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "🙈" : "👁"}
            </Button>
          </Flex>
        </VStack>

        <Collapsible.Root open={jsonOpen} onOpenChange={(e) => setJsonOpen((e as { open: boolean }).open)}>
          <Collapsible.Trigger asChild>
            <Button variant="ghost" size="sm" colorPalette="gray">
              {jsonOpen ? "−" : "+"} Importar JSON
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <VStack gap={2} align="stretch" mt={2}>
              <Textarea
                placeholder='{"characters":[...]}'
                value={jsonPaste}
                onChange={(e) => setJsonPaste(e.target.value)}
                minH="80px"
                fontSize="sm"
                bg="gray.800"
                borderColor="gray.600"
              />
              <Flex gap={2}>
                <Button size="sm" onClick={() => jsonPaste.trim() && parseAndImportJson(jsonPaste.trim())}>
                  Importar
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadJson({ id: memberId, playerName, characters, ...meta }, `meu-perfil.json`)}>
                  Baixar
                </Button>
              </Flex>
            </VStack>
          </Collapsible.Content>
        </Collapsible.Root>

        <Flex gap={2} flexWrap="wrap" align="flex-end">
          <Input
            placeholder="Nome"
            value={newChar.nome}
            onChange={(e) => setNewChar((p) => ({ ...p, nome: e.target.value }))}
            w="120px"
            size="sm"
            bg="gray.800"
          />
          <Input
            placeholder="Realm"
            value={newChar.realm}
            onChange={(e) => setNewChar((p) => ({ ...p, realm: e.target.value }))}
            w="100px"
            size="sm"
            bg="gray.800"
          />
          <Input
            placeholder="iLvl"
            type="number"
            value={newChar.itemLevel || ""}
            onChange={(e) => setNewChar((p) => ({ ...p, itemLevel: Number(e.target.value) || 0 }))}
            w="70px"
            size="sm"
            bg="gray.800"
          />
          <NativeSelectRoot w="120px" size="sm">
            <NativeSelectField
              value={newChar.classe}
              onChange={(e) => setNewChar((p) => ({ ...p, classe: e.target.value }))}
              bg="gray.800"
            >
              <option value="">Classe</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>
          <Button size="sm" colorPalette="green" onClick={handleInclude}>
            + Personagem
          </Button>
        </Flex>

        {error && (
          <Text color="red.400" fontSize="sm">{error}</Text>
        )}
        {saveSuccess && (
          <Text color="green.400" fontSize="sm">Salvo com sucesso!</Text>
        )}

        {characters.length > 0 && (
          <Box overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="gray.700" w="full" minW="800px">
            <TableRoot size="sm">
              <TableHeader>
                <TableRow bg="gray.800">
                  <TableColumnHeader minW="140px">Nome</TableColumnHeader>
                  <TableColumnHeader minW="100px">Realm</TableColumnHeader>
                  <TableColumnHeader minW="60px">iLvl</TableColumnHeader>
                  <TableColumnHeader minW="120px">Classe</TableColumnHeader>
                  <TableColumnHeader minW="90px">Mythic</TableColumnHeader>
                  <TableColumnHeader minW="90px">Heroic</TableColumnHeader>
                  <TableColumnHeader minW="120px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {characters.map((c) =>
                  editingCharId === c.id ? (
                    <TableRow key={c.id} bg="gray.800/80">
                      <TableCell><Input size="xs" value={editForm.nome ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} bg="gray.900" /></TableCell>
                      <TableCell><Input size="xs" value={editForm.realm ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, realm: e.target.value }))} bg="gray.900" /></TableCell>
                      <TableCell><Input size="xs" type="number" value={editForm.itemLevel ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, itemLevel: Number(e.target.value) || 0 }))} bg="gray.900" w="60px" /></TableCell>
                      <TableCell>
                        <NativeSelectRoot size="xs" w="100px">
                          <NativeSelectField value={editForm.classe ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, classe: e.target.value }))} bg="gray.900">
                            <option value="">—</option>
                            {CLASSES.map((x) => <option key={x} value={x}>{x}</option>)}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </TableCell>
                      <TableCell>
                        <Badge
                          size="xs"
                          cursor="pointer"
                          colorPalette={editForm.saved_mythic ? "green" : "gray"}
                          variant="subtle"
                          onClick={() => setEditForm((p) => ({ ...p, saved_mythic: !p.saved_mythic }))}
                        >
                          {editForm.saved_mythic ? "Saved" : "Unsaved"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          size="xs"
                          cursor="pointer"
                          colorPalette={editForm.saved_heroic ? "yellow" : "gray"}
                          variant="subtle"
                          onClick={() => setEditForm((p) => ({ ...p, saved_heroic: !p.saved_heroic }))}
                        >
                          {editForm.saved_heroic ? "Saved" : "Unsaved"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Flex gap={1}>
                          <Button size="xs" onClick={handleSaveAlter}>Ok</Button>
                          <Button size="xs" variant="ghost" onClick={() => { setEditingCharId(null); setEditForm({}); }}>✕</Button>
                        </Flex>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={c.id} _hover={{ bg: "gray.800/50" }}>
                      <TableCell fontWeight="medium">{c.nome}</TableCell>
                      <TableCell>{c.realm}</TableCell>
                      <TableCell><Text color="blue.400">{Number(c.itemLevel).toFixed(0)}</Text></TableCell>
                      <TableCell>
                        <Flex align="center" gap={1}>
                          {c.classe && CLASS_ICONS[c.classe] && (
                            <Image src={CLASS_ICONS[c.classe]} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
                          )}
                          <Text fontSize="sm">{c.classe || "—"}</Text>
                        </Flex>
                      </TableCell>
                      <TableCell>
                        <Badge
                          size="xs"
                          cursor="pointer"
                          colorPalette={c.saved_mythic ? "green" : "gray"}
                          variant="subtle"
                          onClick={() => handleToggleSaved(c.id, "mythic")}
                        >
                          {c.saved_mythic ? "Saved" : "Unsaved"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          size="xs"
                          cursor="pointer"
                          colorPalette={c.saved_heroic ? "yellow" : "gray"}
                          variant="subtle"
                          onClick={() => handleToggleSaved(c.id, "heroic")}
                        >
                          {c.saved_heroic ? "Saved" : "Unsaved"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Flex gap={1}>
                          <Button size="xs" variant="ghost" onClick={() => handleAlter(c.id)}>Editar</Button>
                          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleDeleteChar(c.id)}>Excluir</Button>
                        </Flex>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </TableRoot>
          </Box>
        )}

        <Button
          onClick={handleSalvar}
          colorPalette="blue"
          size="lg"
          w="full"
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </VStack>
    </Flex>
  );
}
