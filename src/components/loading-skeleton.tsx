"use client";

import { Box, Skeleton, Stack, Flex } from "@chakra-ui/react";

interface LoadingSkeletonProps {
  variant?: "page" | "table" | "form" | "cards";
}

export function LoadingSkeleton({ variant = "page" }: LoadingSkeletonProps) {
  if (variant === "page") {
    return (
      <Flex flex={1} minH="200px" direction="column" align="center" p={6} gap={6}>
        <Stack gap={4} w="full" maxW="600px">
          <Skeleton h="32px" w="60%" borderRadius="md" />
          <Skeleton h="20px" w="80%" borderRadius="md" />
          <Skeleton h="20px" w="70%" borderRadius="md" />
          <Flex gap={4} mt={6}>
            <Skeleton h="100px" flex={1} borderRadius="lg" />
            <Skeleton h="100px" flex={1} borderRadius="lg" />
          </Flex>
        </Stack>
      </Flex>
    );
  }

  if (variant === "table") {
    return (
      <Box w="full" overflow="hidden" borderRadius="md" borderWidth="1px" borderColor="gray.700" p={4}>
        <Stack gap={3}>
          <Flex gap={4}>
            <Skeleton h="24px" w="140px" borderRadius="md" />
            <Skeleton h="24px" w="100px" borderRadius="md" />
            <Skeleton h="24px" w="60px" borderRadius="md" />
            <Skeleton h="24px" w="120px" borderRadius="md" />
          </Flex>
          {[1, 2, 3, 4, 5].map((i) => (
            <Flex key={i} gap={4} align="center">
              <Skeleton h="20px" w="120px" borderRadius="md" />
              <Skeleton h="20px" w="80px" borderRadius="md" />
              <Skeleton h="20px" w="50px" borderRadius="md" />
              <Skeleton h="20px" w="100px" borderRadius="md" />
            </Flex>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === "form") {
    return (
      <Flex flex={1} minH="200px" direction="column" align="center" p={6} gap={6}>
        <Stack gap={4} w="full" maxW="560px">
          <Skeleton h="40px" w="full" borderRadius="md" />
          <Skeleton h="40px" w="full" borderRadius="md" />
          <Skeleton h="40px" w="60%" borderRadius="md" />
          <Skeleton h="120px" w="full" borderRadius="md" mt={4} />
        </Stack>
      </Flex>
    );
  }

  // cards
  return (
    <Flex flex={1} minH="200px" direction="column" align="center" p={6} gap={6}>
      <Stack gap={4} w="full" maxW="800px">
        <Skeleton h="32px" w="40%" borderRadius="md" />
        <Flex gap={4} flexWrap="wrap">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h="80px" w="full" maxW="360px" borderRadius="xl" />
          ))}
        </Flex>
      </Stack>
    </Flex>
  );
}
