"use client";

import {
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";

const ADDON_LINK = "https://github.com/abeeyh/abicharacteraddon";
const RELEASES_LINK = "https://github.com/abeeyh/abicharacteraddon/releases";

export function ComoUtilizarModal() {
  return (
    <Dialog.Root size="xl">
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" colorPalette="blue">
          Como utilizar
        </Button>
      </Dialog.Trigger>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxH="90vh" overflowY="auto">
          <Dialog.CloseTrigger />
          <Dialog.Header>
            <Dialog.Title>Como utilizar</Dialog.Title>
            <Dialog.Description>
              Guia para sincronizar seus personagens do WoW com seu perfil
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="stretch" gap={6} textAlign="left">
              {/* 1. Link e instalação do addon */}
              <Box>
                <Heading size="sm" mb={2}>
                  1. Instale o addon AbiCharacterList
                </Heading>
                <Text color="gray.400" fontSize="sm" mb={2}>
                  O addon permite exportar os dados dos seus personagens diretamente do jogo. Baixe a versão mais recente:
                </Text>
                <Flex gap={3} flexWrap="wrap">
                  <Link
                    href={RELEASES_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    colorPalette="blue"
                    textDecoration="underline"
                  >
                    Abrir Releases (última versão)
                  </Link>
                  <Link
                    href={ADDON_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    colorPalette="gray"
                    textDecoration="underline"
                  >
                    Repositório do addon
                  </Link>
                </Flex>
                <Box mt={3} p={3} bg="gray.800" borderRadius="md" fontSize="sm">
                  <Text fontWeight="600" mb={2}>Como instalar:</Text>
                  <Box as="ol" pl={4} listStyleType="decimal" gap={1}>
                    <Box as="li" mb={1}>Baixe o arquivo .zip da última release (ex: v0.0.1)</Box>
                    <Box as="li" mb={1}>Extraia a pasta AbiCharacterList do arquivo</Box>
                    <Box as="li" mb={1}>Cole a pasta em WoW/_retail_/Interface/AddOns/</Box>
                    <Box as="li">Reinicie o WoW ou use /reload no jogo</Box>
                  </Box>
                </Box>
              </Box>

              {/* 2. Botão de exportar no addon */}
              <Box>
                <Heading size="sm" mb={2}>
                  2. Exporte os personagens no jogo
                </Heading>
                <Text color="gray.400" fontSize="sm" mb={2}>
                  No WoW, abra a janela do AbiCharacterList e clique no botão de exportar no canto superior direito:
                </Text>
                <Box
                  position="relative"
                  w="full"
                  maxW="600px"
                  aspectRatio={16 / 9}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="gray.700"
                >
                  <Image
                    src="/addon-export-button.png"
                    alt="Janela do AbiCharacterList mostrando o botão Export characters (JSON) no canto superior direito"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </Box>
                <Text color="gray.500" fontSize="xs" mt={1}>
                  Clique no ícone para copiar todos os dados dos personagens como JSON
                </Text>
              </Box>

              {/* 3. Código JSON */}
              <Box>
                <Heading size="sm" mb={2}>
                  3. Copie o código JSON
                </Heading>
                <Text color="gray.400" fontSize="sm" mb={2}>
                  Após clicar, será aberta uma janela com o código JSON. Copie todo o conteúdo (Ctrl+A, Ctrl+C):
                </Text>
                <Box
                  position="relative"
                  w="full"
                  maxW="600px"
                  aspectRatio={16 / 9}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="gray.700"
                >
                  <Image
                    src="/addon-json-export.png"
                    alt="Janela AbiCharacterList - Character Export (JSON) com o código dos personagens"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </Box>
                <Text color="gray.500" fontSize="xs" mt={1}>
                  Cole o JSON no campo &quot;Importar JSON&quot; na edição do seu perfil
                </Text>
              </Box>

              {/* 4. Importar no site */}
              <Box>
                <Heading size="sm" mb={2}>
                  4. Importe no seu perfil
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  Na seção &quot;+ Importar JSON&quot; desta página, cole o código copiado e clique em Importar. 
                  Os personagens serão mesclados com os que você já tem. Depois clique em Salvar para gravar no servidor.
                </Text>
              </Box>
            </VStack>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
