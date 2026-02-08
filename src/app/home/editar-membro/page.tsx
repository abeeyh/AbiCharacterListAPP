"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { getMembers, deleteMember } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useEffect, useState } from "react";

export default function EditarMembroPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getMembers>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getMembers();
      setMembers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      <VStack gap={5} align="stretch" maxW="560px" w="full">
        <Flex justify="space-between" align="center">
          <Heading size="lg" fontWeight="600">
            Editar membro
          </Heading>
          <Link asChild>
            <NextLink href="/home/adicionar-membro">
              <Button size="sm" colorPalette="blue">+ Adicionar</Button>
            </NextLink>
          </Link>
        </Flex>

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
        ) : (
          <VStack gap={2} align="stretch">
            {members.map((m) => (
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
                <Box>
                  <Text fontWeight="600">
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
                <Flex gap={2} onClick={(e) => e.stopPropagation()}>
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
        )}
      </VStack>
    </Flex>
  );
}
