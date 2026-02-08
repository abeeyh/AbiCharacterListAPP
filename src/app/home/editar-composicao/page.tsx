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
import { deleteComposition, getCompositions } from "@/lib/actions";
import { useEffect, useState } from "react";

export default function EditarComposicaoPage() {
  const router = useRouter();
  const [compositions, setCompositions] = useState<Awaited<ReturnType<typeof getCompositions>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getCompositions();
      setCompositions(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filledCount = (comp: { slots: unknown[] }) =>
    comp.slots?.filter(Boolean).length ?? 0;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Deletar esta composição?")) {
      await deleteComposition(id);
      await load();
    }
  };

  return (
    <Flex minH="100vh" direction="column" align="center" bg="gray.900" p={6} gap={6}>
      <Flex align="center" gap={4} w="full" maxW="700px" flexWrap="wrap">
        <Link asChild color="blue.400" _hover={{ color: "blue.300", textDecoration: "underline" }}>
          <NextLink href="/home">← Voltar</NextLink>
        </Link>
        <Image src="/icon.png" alt="Abi Character List" width={40} height={40} style={{ borderRadius: 8 }} />
        <Heading size="xl" flex={1}>
          Editar composição
        </Heading>
        <Link asChild>
          <NextLink href="/home/montar-composicao">
            <Button colorPalette="blue" variant="outline" size="sm">
              Nova composição
            </Button>
          </NextLink>
        </Link>
      </Flex>

      <VStack gap={4} align="stretch" maxW="700px" w="full">
        {isLoading ? (
          <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
            <CardBody py={12} textAlign="center">
              <Text color="gray.500">Carregando...</Text>
            </CardBody>
          </CardRoot>
        ) : compositions.length === 0 ? (
          <CardRoot bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="xl">
            <CardBody py={12} textAlign="center">
              <Text fontSize="4xl" mb={4} opacity={0.5}>
                ⚔️
              </Text>
              <Heading size="md" mb={2}>
                Nenhuma composição salva
              </Heading>
              <Text color="gray.500" mb={6}>
                Monte uma composição primeiro para poder editar
              </Text>
              <Link asChild>
                <NextLink href="/home/montar-composicao">
                  <Button colorPalette="blue" size="lg">
                    Montar composição
                  </Button>
                </NextLink>
              </Link>
            </CardBody>
          </CardRoot>
        ) : (
          compositions.map((c) => (
            <CardRoot
              key={c.id}
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
              onClick={() => router.push(`/home/editar-composicao/${c.id}`)}
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
                      ⚔️
                    </Flex>
                    <Box>
                      <Text fontWeight="600" fontSize="lg">
                        {c.name || "Sem nome"}
                      </Text>
                      <Flex gap={2} mt={1} fontSize="sm" color="gray.500" align="center">
                        <Text>{filledCount(c)}/20 slots</Text>
                        <Text
                          as="span"
                          fontSize="2xs"
                          px={1.5}
                          py={0.5}
                          borderRadius="md"
                          bg={c.type === "heroic" ? "yellow.900" : "gray.700"}
                          color={c.type === "heroic" ? "yellow.300" : "gray.400"}
                        >
                          {c.type === "heroic" ? "Heroic" : "Mythic"}
                        </Text>
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
                        router.push(`/home/editar-composicao/${c.id}`);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      colorPalette="red"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, c.id)}
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
