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
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { toaster } from "@/components/ui/toaster";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        toaster.create({ title: result.error, type: "error" });
      } else if (result?.success) {
        toaster.create({ title: "Entrando...", type: "success" });
        router.push("/home");
      }
    } catch {
      setError("Erro ao entrar. Tente novamente.");
      toaster.create({ title: "Erro ao entrar", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="gray.900"
      p={4}
    >
      <CardRoot maxW="400px" w="full" size="lg" variant="elevated">
        <CardHeader>
          <Flex direction="column" align="center" gap={4}>
            <Heading size="xl">Abi Character List</Heading>
            <Text color="gray.400">
              Entre com seu usuário (nome do jogador) e senha
            </Text>
          </Flex>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              {error && (
                <Box
                  bg="red.500"
                  color="white"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="sm"
                >
                  {error}
                </Box>
              )}
              <Box>
                <Text mb={2} fontSize="sm" fontWeight="medium">
                  Usuário (nome do jogador)
                </Text>
                <Input
                  placeholder="Ex: abi"
                  size="lg"
                  type="text"
                  name="login"
                  required
                  autoComplete="username"
                />
              </Box>
              <Box>
                <Text mb={2} fontSize="sm" fontWeight="medium">
                  Senha
                </Text>
                <Input
                  placeholder="••••••••"
                  size="lg"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                />
              </Box>
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                w="full"
                mt={2}
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </VStack>
          </form>
        </CardBody>
      </CardRoot>
    </Flex>
  );
}
