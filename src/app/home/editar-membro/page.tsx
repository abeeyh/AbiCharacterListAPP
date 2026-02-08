"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { getMembers, deleteMember } from "@/lib/actions";
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
      await deleteMember(id);
      await load();
    }
  };

  const topIlvl = (m: { characters?: Array<{ itemLevel?: number }> }) => {
    const chars = m.characters ?? [];
    if (chars.length === 0) return null;
    const max = Math.max(...chars.map((c) => Number(c.itemLevel) || 0));
    return max > 0 ? max.toFixed(1) : null;
  };

  return (
    <Flex minH="100vh" direction="column" align="center" bg="gray.900" p={6} gap={6}>
      <Flex align="center" gap={4} w="full" maxW="700px">
        <Link asChild color="blue.400" _hover={{ color: "blue.300", textDecoration: "underline" }}>
          <NextLink href="/home">← Voltar</NextLink>
        </Link>
        <Image src="/icon.png" alt="Abi Character List" width={40} height={40} style={{ borderRadius: 8 }} />
        <Heading size="xl" flex={1}>
          Editar membro
        </Heading>
      </Flex>

      <VStack gap={4} align="stretch" maxW="700px" w="full">
        {isLoading ? (
          <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
            <CardBody py={12} textAlign="center">
              <Text color="gray.500">Carregando...</Text>
            </CardBody>
          </CardRoot>
        ) : members.length === 0 ? (
          <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
            <CardBody py={12} textAlign="center">
              <Text fontSize="4xl" mb={4} opacity={0.5}>
                👤
              </Text>
              <Heading size="md" mb={2}>
                Nenhum membro salvo
              </Heading>
              <Text color="gray.500" mb={6}>
                Adicione um membro primeiro para poder editar
              </Text>
              <Link asChild>
                <NextLink href="/home/adicionar-membro">
                  <Button colorPalette="blue" size="lg">
                    Adicionar membro
                  </Button>
                </NextLink>
              </Link>
            </CardBody>
          </CardRoot>
        ) : (
          members.map((m) => (
            <CardRoot
              key={m.id}
              bg="gray.800"
              borderWidth="1px"
              borderColor="gray.700"
              borderRadius="xl"
              cursor="pointer"
              _hover={{
                borderColor: "blue.500",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
              }}
              transition="all 0.2s"
              onClick={() => router.push(`/home/editar-membro/${m.id}`)}
            >
              <CardBody>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                  <Flex align="center" gap={4}>
                    <Flex
                      w="48px"
                      h="48px"
                      align="center"
                      justify="center"
                      borderRadius="lg"
                      bg="gray.700"
                      fontSize="xl"
                    >
                      👤
                    </Flex>
                    <Box>
                      <Text fontWeight="600" fontSize="lg">
                        {m.playerName || m.realm || "Sem nome"}
                      </Text>
                      <Flex gap={3} mt={1} fontSize="sm" color="gray.500">
                        <Text>{m.characters?.length ?? 0} personagem(ns)</Text>
                        {topIlvl(m) && (
                          <Text color="blue.400">iLvl máx: {topIlvl(m)}</Text>
                        )}
                      </Flex>
                    </Box>
                  </Flex>
                  <Flex gap={2}>
                    <Button
                      colorPalette="blue"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/home/editar-membro/${m.id}`);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      colorPalette="red"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, m.id)}
                    >
                      Deletar
                    </Button>
                  </Flex>
                </Flex>
              </CardBody>
            </CardRoot>
          ))
        )}
      </VStack>
    </Flex>
  );
}
