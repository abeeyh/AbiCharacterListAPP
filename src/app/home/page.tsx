import {
  CardBody,
  CardHeader,
  CardRoot,
  Flex,
  Heading,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const menuItems = [
  {
    href: "/home/montar-composicao",
    title: "Montar composição",
    description: "Crie e organize suas composições de grupo.",
    icon: "⚔️",
  },
  {
    href: "/home/editar-composicao",
    title: "Editar composição",
    description: "Edite composições salvas.",
    icon: "✏️",
  },
  {
    href: "/home/adicionar-membro",
    title: "Adicionar membro",
    description: "Adicione novos membros e personagens.",
    icon: "➕",
  },
  {
    href: "/home/editar-membro",
    title: "Editar membro",
    description: "Edite membros e personagens salvos.",
    icon: "✏️",
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gm: "GM",
  jogador: "Jogador",
};

export default async function HomePage() {
  const user = await getSession();
  return (
    <Flex
      minH="100vh"
      direction="column"
      align="center"
      justify="center"
      bg="gray.900"
      p={6}
      gap={8}
    >
      <Flex direction="column" align="center" gap={4} mb={4}>
        <Image
          src="/icon.png"
          alt="Abi Character List"
          width={80}
          height={80}
          style={{ borderRadius: 12 }}
        />
        <Heading size="xl" fontWeight="bold" textAlign="center">
          Abi Character List
        </Heading>
        <Text color="gray.500" fontSize="sm" textAlign="center">
          Gerencie seus personagens e composições
        </Text>
        {user && (
          <Flex gap={2} align="center" fontSize="sm" color="gray.400">
            <Text>{user.login}</Text>
            <Text
              as="span"
              px={2}
              py={0.5}
              borderRadius="md"
              bg="gray.700"
              color="gray.300"
              fontWeight="medium"
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
          </Flex>
        )}
      </Flex>

      <SimpleGrid
        columns={2}
        gap={5}
        maxW="640px"
        w="full"
      >
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <CardRoot
              cursor="pointer"
              variant="elevated"
              size="lg"
              h="full"
              borderWidth="1px"
              borderColor="gray.700"
              _hover={{
                borderColor: "blue.500",
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px -8px rgba(0,0,0,0.4)",
              }}
              transition="all 0.2s ease"
            >
              <CardHeader pb={2}>
                <Flex align="center" gap={3}>
                  <Flex
                    w="48px"
                    h="48px"
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="gray.800"
                    fontSize="xl"
                  >
                    {item.icon}
                  </Flex>
                  <Heading size="md" fontWeight="600">
                    {item.title}
                  </Heading>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <Text color="gray.500" fontSize="sm" lineHeight="tall">
                  {item.description}
                </Text>
              </CardBody>
            </CardRoot>
          </Link>
        ))}
      </SimpleGrid>

      <Flex mt="auto">
        <LogoutButton />
      </Flex>
    </Flex>
  );
}
