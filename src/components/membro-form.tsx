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
import { getMember, getMemberUserRole, saveMember } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { UserRole } from "@/lib/auth";
import { type MembroData, type Personagem, generateId, mergeAndValidateCharacters, toExportFormat } from "@/lib/types";

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
  a.download = filename || "membros.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

interface MembroFormProps {
  memberId?: string;
  title?: string;
  onSaved?: () => void;
  /** Opções de cargo permitidas. Admin: todas; GM: gm, jogador; omitir: apenas jogador. */
  allowedRoles?: UserRole[];
}

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: "jogador", label: "Jogador" },
  { value: "gm", label: "GM" },
  { value: "admin", label: "Administrador" },
];

export function MembroForm({ memberId, title, onSaved, allowedRoles }: MembroFormProps) {
  const isEdit = Boolean(memberId);
  const roleOptions = allowedRoles?.length
    ? ALL_ROLES.filter((r) => allowedRoles.includes(r.value))
    : [{ value: "jogador" as UserRole, label: "Jogador" }];
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("jogador");
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
  const [meta, setMeta] = useState<Pick<MembroData, "version" | "addon" | "realm" | "exportedAt">>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (memberId) {
        const [m, userRole] = await Promise.all([
          getMember(memberId),
          getMemberUserRole(memberId),
        ]);
        if (m) {
          setPlayerName(m.playerName ?? m.realm ?? "");
          setCharacters(m.characters || []);
          setMeta({ version: m.version, addon: m.addon, realm: m.realm, exportedAt: m.exportedAt });
        }
        const loadedRole = (userRole as UserRole) ?? "jogador";
        setRole(allowedRoles?.length && !allowedRoles.includes(loadedRole) ? allowedRoles[0] : loadedRole);
      } else {
        setPlayerName("");
        setCharacters([]);
        setMeta({});
        setRole(allowedRoles?.[0] ?? "jogador");
      }
      setPassword("");
    } finally {
      setIsLoading(false);
    }
    setJsonPaste("");
    setError("");
  }, [memberId, allowedRoles]);

  useEffect(() => {
    load();
  }, [load]);

  const parseAndImportJson = (jsonStr: string) => {
    setError("");
    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      const chars = Array.isArray(raw.characters) ? raw.characters : [];
      setCharacters((prevChars) => mergeAndValidateCharacters(prevChars, chars));
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
    if (isSaving) return;
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
      await saveMember({
        id: memberId,
        playerName: playerName.trim(),
        characters,
        password: password.trim() || undefined,
        role,
        ...meta,
      });
      setSaveSuccess(true);
      toaster.create({ title: "Salvo com sucesso", type: "success" });
      onSaved?.();
      if (!isEdit) {
        setPlayerName("");
        setPassword("");
        setRole(allowedRoles?.[0] ?? "jogador");
        setCharacters([]);
        setMeta({});
        setNewChar({ nome: "", realm: "", itemLevel: 0, classe: "" });
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

  const handleSetMainAlt = (charId: string, value: string) => {
    setCharacters((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== charId) {
          if (value === "main") return { ...c, isMain: false, altNumber: undefined };
          return c;
        }
        if (value === "main") return { ...c, isMain: true, altNumber: undefined };
        if (value === "") return { ...c, isMain: undefined, altNumber: undefined };
        const num = parseInt(value, 10);
        return { ...c, isMain: false, altNumber: Number.isFinite(num) ? num : undefined };
      });
      return updated;
    });
  };

  const getMainAltValue = (c: Personagem): string => {
    if (c.isMain) return "main";
    if (c.altNumber && c.altNumber >= 1) return String(c.altNumber);
    return "";
  };

  const altOptions = Array.from(
    { length: Math.max(0, characters.length - 1) },
    (_, i) => i + 1
  );
  const editAltOptions = editForm.altNumber && !altOptions.includes(editForm.altNumber)
    ? [...altOptions, editForm.altNumber].sort((a, b) => a - b)
    : altOptions;

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

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <VStack gap={5} align="stretch" maxW="960px" w="full">
        <Heading size="lg" fontWeight="600">
          {title ?? (isEdit ? "Editar membro" : "Adicionar membro")}
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
              placeholder={isEdit ? "Nova senha (deixe em branco para manter)" : "Senha para login"}
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
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Cargo</Text>
            <NativeSelectRoot size="lg" w="full">
              <NativeSelectField
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                bg="gray.800"
                borderColor="gray.600"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>
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
                <Button size="sm" variant="outline" onClick={() => downloadJson({ id: memberId ?? "", playerName, characters, ...meta }, `${playerName || "membro"}.json`)}>
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
                  <TableColumnHeader minW="70px">Main/Alt</TableColumnHeader>
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
                      <TableCell>
                        <NativeSelectRoot size="xs" w="80px">
                          <NativeSelectField
                            value={editForm.isMain ? "main" : (editForm.altNumber ? String(editForm.altNumber) : "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditForm((p) =>
                                v === "main" ? { ...p, isMain: true, altNumber: undefined }
                                : v === "" ? { ...p, isMain: undefined, altNumber: undefined }
                                : { ...p, isMain: false, altNumber: parseInt(v, 10) }
                              );
                            }}
                            bg="gray.900"
                          >
                            <option value="">—</option>
                            <option value="main">Main</option>
                            {editAltOptions.map((n) => (
                              <option key={n} value={String(n)}>Alt {n}</option>
                            ))}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </TableCell>
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
                      <TableCell>
                        <NativeSelectRoot size="xs" w="80px">
                          <NativeSelectField
                            value={getMainAltValue(c)}
                            onChange={(e) => handleSetMainAlt(c.id, e.target.value)}
                            bg="gray.800"
                            borderColor="gray.600"
                          >
                            <option value="">—</option>
                            <option value="main">Main</option>
                            {(c.altNumber && !altOptions.includes(c.altNumber) ? [...altOptions, c.altNumber].sort((a, b) => a - b) : altOptions).map((n) => (
                              <option key={n} value={String(n)}>Alt {n}</option>
                            ))}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </TableCell>
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
