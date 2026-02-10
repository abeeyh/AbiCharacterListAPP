"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { getMembers, deleteMember, getCurrentUserRole } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
const COLUMN_SIZE = 5;

export default function EditarMembroPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getMembers>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.playerName ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  const load = async () => {
    setIsLoading(true);
    try {
      const [data, role] = await Promise.all([getMembers(), getCurrentUserRole()]);
      setMembers(data);
      setIsAdmin(role === "admin");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Deletar este membro e todos os personagens?")) {
      try {
        await deleteMember(id);
        await load();
        toaster.create({ title: "Membro deletado", type: "success" });
      } catch {
        toaster.create({ title: "Erro ao deletar", type: "error" });
      }
    }
  };

  const topIlvl = (m: { characters?: Array<{ itemLevel?: number }> }) => {
    const chars = m.characters ?? [];
    if (chars.length === 0) return null;
    const max = Math.max(...chars.map((c) => Number(c.itemLevel) || 0));
    return max > 0 ? max.toFixed(1) : null;
  };

  return (
    <Flex flex={1} minH="100%" direction="column" align="center" p={6} gap={6}>
      <VStack gap={5} align="stretch" maxW="960px" w="full">
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <Heading size="lg" fontWeight="600">
            Listagem de membros
          </Heading>
          <Flex gap={2}>
            {isAdmin && (
              <Link asChild>
                <NextLink href="/home/gerenciar-usuarios">
                  <Button size="sm" variant="outline">Trocar senhas</Button>
                </NextLink>
              </Link>
            )}
            <Link asChild>
              <NextLink href="/home/adicionar-membro">
                <Button size="sm" colorPalette="blue">+ Adicionar</Button>
              </NextLink>
            </Link>
          </Flex>
        </Flex>

        {!isLoading && members.length > 0 && (
          <Input
            placeholder="Buscar por nome do jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="md"
            bg="gray.800"
            borderColor="gray.600"
          />
        )}

        {isLoading ? (
          <LoadingSkeleton variant="cards" />
        ) : members.length === 0 ? (
          <Box py={12} textAlign="center">
            <Text fontSize="4xl" mb={4} opacity={0.5}>
              👤
            </Text>
            <Text fontWeight="600" mb={2}>
              Nenhum membro salvo
            </Text>
            <Text color="gray.500" mb={4} fontSize="sm">
              Adicione um membro para poder editar
            </Text>
            <Link asChild>
              <NextLink href="/home/adicionar-membro">
                <Button colorPalette="blue" size="md">Adicionar membro</Button>
              </NextLink>
            </Link>
          </Box>
        ) : filtered.length === 0 ? (
          <Box py={12} textAlign="center">
            <Text fontWeight="600" mb={2}>
              {search.trim() ? "Nenhum membro encontrado" : "Nenhum membro salvo"}
            </Text>
            {!search.trim() && (
              <>
                <Text color="gray.500" mb={4} fontSize="sm">
                  Adicione um membro para poder editar
                </Text>
                <Link asChild>
                  <NextLink href="/home/adicionar-membro">
                    <Button colorPalette="blue" size="md">Adicionar membro</Button>
                  </NextLink>
                </Link>
              </>
            )}
          </Box>
        ) : (
          <VStack gap={2} align="stretch">
            <Grid
              templateColumns={{ base: "1fr", md: "1fr 1fr" }}
              gap={4}
              w="full"
            >
              {[paginated.slice(0, COLUMN_SIZE), paginated.slice(COLUMN_SIZE, PAGE_SIZE)].map(
                (column, colIndex) => (
                  <VStack key={colIndex} gap={2} align="stretch">
                    {column.map((m) => (
                      <Flex
                        key={m.id}
                        align="center"
                        justify="space-between"
                        gap={4}
                        px={4}
                        py={3}
                        borderRadius="md"
                        bg="gray.800"
                        borderWidth="1px"
                        borderColor="gray.700"
                        cursor="pointer"
                        _hover={{ borderColor: "gray.600" }}
                        onClick={() => router.push(`/home/editar-membro/${m.id}`)}
                      >
                        <Box minW={0}>
                          <Text fontWeight="600" truncate>
                            {m.playerName || m.realm || "Sem nome"}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {m.characters?.length ?? 0} personagem(ns)
                            {topIlvl(m) && (
                              <Text as="span" color="blue.400" ml={2}>
                                · iLvl {topIlvl(m)}
                              </Text>
                            )}
                          </Text>
                        </Box>
                        <Flex gap={2} shrink={0} onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/home/editar-membro/${m.id}`)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={(e) => handleDelete(e, m.id)}
                          >
                            Deletar
                          </Button>
                        </Flex>
                      </Flex>
                    ))}
                  </VStack>
                )
              )}
            </Grid>
            {totalPages > 1 && (
              <Flex justify="space-between" align="center" w="full" pt={2}>
                <Text fontSize="sm" color="gray.500">
                  {filtered.length} membro(s) · página {page + 1} de {totalPages}
                </Text>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </Flex>
              </Flex>
            )}
          </VStack>
        )}
      </VStack>
    </Flex>
  );
}
