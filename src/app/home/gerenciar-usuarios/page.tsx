"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { getUsers, updateUserPassword, impersonateUser } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { UserRole } from "@/lib/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  gm: "GM",
  jogador: "Jogador",
};

export default function GerenciarUsuariosPage() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof getUsers>>["users"]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingAs, setIsLoggingAs] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.users);
      setCurrentUserId(data.currentUserId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogarComo = async (targetUserId: string) => {
    setIsLoggingAs(targetUserId);
    try {
      const ok = await impersonateUser(targetUserId);
      if (ok) {
        toaster.create({ title: "Logado como o usuário", type: "success" });
        window.location.href = "/home";
      } else {
        toaster.create({ title: "Erro ao logar como usuário", type: "error" });
      }
    } catch {
      toaster.create({ title: "Erro ao logar como usuário", type: "error" });
    } finally {
      setIsLoggingAs(null);
    }
  };

  const handleSavePassword = async (userId: string) => {
    if (!newPassword.trim() || newPassword.length < 4) {
      toaster.create({
        title: "Senha deve ter no mínimo 4 caracteres",
        type: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserPassword(userId, newPassword);
      toaster.create({ title: "Senha alterada com sucesso", type: "success" });
      setEditingId(null);
      setNewPassword("");
    } catch {
      toaster.create({ title: "Erro ao alterar senha", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton variant="form" />;
  }

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <VStack gap={5} align="stretch" maxW="640px" w="full">
        <Heading size="lg" fontWeight="600">
          Gerenciar usuários
        </Heading>
        <Text color="gray.500" fontSize="sm">
          Troque a senha de qualquer usuário, incluindo aqueles sem perfil de jogador vinculado.
        </Text>

        {users.length === 0 ? (
          <Box py={12} textAlign="center">
            <Text color="gray.500">Nenhum usuário cadastrado.</Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {users.map((u) => (
              <Box
                key={u.id}
                p={4}
                bg="gray.800"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.700"
              >
                <Flex
                  justify="space-between"
                  align="center"
                  gap={4}
                  flexWrap="wrap"
                >
                  <Box minW={0}>
                    <Text fontWeight="600">{u.login}</Text>
                    <Flex gap={2} align="center" mt={1} flexWrap="wrap">
                      <Badge
                        size="sm"
                        colorPalette={
                          u.role === "admin"
                            ? "red"
                            : u.role === "gm"
                              ? "yellow"
                              : "gray"
                        }
                        variant="subtle"
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      {u.playerName && (
                        <Text fontSize="sm" color="gray.500">
                          Jogador: {u.playerName}
                        </Text>
                      )}
                      {!u.playerId && (
                        <Text fontSize="sm" color="gray.500" fontStyle="italic">
                          Sem perfil de jogador
                        </Text>
                      )}
                    </Flex>
                  </Box>
                  {editingId === u.id ? (
                    <Flex gap={2} align="center" flexWrap="wrap">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nova senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        size="sm"
                        w="160px"
                        bg="gray.900"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPassword((p) => !p)}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </Button>
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() => handleSavePassword(u.id)}
                        disabled={isSaving || newPassword.length < 4}
                      >
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setNewPassword("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </Flex>
                  ) : (
                    <Flex gap={2} flexWrap="wrap">
                      {u.id !== currentUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          colorPalette="orange"
                          onClick={() => handleLogarComo(u.id)}
                          disabled={!!isLoggingAs}
                        >
                          {isLoggingAs === u.id ? "Entrando..." : "Logar como"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="blue"
                        onClick={() => {
                          setEditingId(u.id);
                          setNewPassword("");
                        }}
                      >
                        Trocar senha
                      </Button>
                    </Flex>
                  )}
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Flex>
  );
}
