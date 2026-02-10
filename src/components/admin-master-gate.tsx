"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { verifyMasterPassword } from "@/lib/actions";
import { toaster } from "@/components/ui/toaster";

export function AdminMasterGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const ok = await verifyMasterPassword(password);
      if (ok) {
        toaster.create({ title: "Acesso liberado", type: "success" });
        router.refresh();
      } else {
        setError("Senha mestra incorreta.");
        setPassword("");
      }
    } catch {
      setError("Erro ao verificar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Flex
        minH="50vh"
        align="center"
        justify="center"
        p={6}
      >
        <VStack
          gap={4}
          maxW="360px"
          w="full"
          p={6}
          bg="gray.800"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Heading size="md">Senha mestra</Heading>
          <Text color="gray.400" fontSize="sm" textAlign="center">
            Digite a senha mestra para acessar a área administrativa.
          </Text>
          <Input
            type="password"
            placeholder="Senha mestra"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="lg"
            bg="gray.900"
            borderColor="gray.600"
            autoFocus
          />
          {error && (
            <Text color="red.400" fontSize="sm">
              {error}
            </Text>
          )}
          <Button
            type="submit"
            colorPalette="blue"
            size="lg"
            w="full"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? "Verificando..." : "Entrar"}
          </Button>
        </VStack>
      </Flex>
    </Box>
  );
}
