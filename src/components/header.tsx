"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  HStack,
} from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gm: "GM",
  jogador: "Jogador",
};

type User = { login: string; role: string } | null;

export function Header({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname !== "/" && pathname !== "/home";

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={50}
      bg="gray.900"
      borderBottomWidth="1px"
      borderColor="gray.700"
      shadow="md"
    >
      <Flex
        maxW="1200px"
        mx="auto"
        px={4}
        py={3}
        align="center"
        justify="space-between"
        gap={4}
      >
        <HStack gap={3}>
          {showBack && (
            <Button
              size="sm"
              variant="ghost"
              colorPalette="gray"
              onClick={() => router.back()}
            >
              ← Voltar
            </Button>
          )}
          <Link href={user ? "/home" : "/"} style={{ textDecoration: "none" }}>
            <HStack gap={3}>
            <Image
              src="/icon.png"
              alt="Hollywood Purple Filter"
              width={40}
              height={40}
              style={{ borderRadius: 8 }}
            />
            <Heading size="md" fontWeight="bold" color="white">
              Hollywood Purple Filter
            </Heading>
            </HStack>
          </Link>
        </HStack>

        {user ? (
          <HStack gap={3}>
            <Link href="/home/meu-perfil">
              <Button size="sm" variant="ghost" colorPalette="gray">
                Meu perfil
              </Button>
            </Link>
            <Text fontSize="sm" color="gray.400">
              {user.login}
            </Text>
            <Text
              as="span"
              px={2}
              py={0.5}
              borderRadius="md"
              bg="gray.700"
              color="gray.300"
              fontSize="xs"
              fontWeight="medium"
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
            <LogoutButton />
          </HStack>
        ) : null}
      </Flex>
    </Box>
  );
}
