"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { TurtleMoansEasterEgg } from "@/components/turtlemoans-easter-egg";
import { HollywoodPurpleFilterEasterEgg } from "@/components/hollywood-purple-filter-easter-egg";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      {children}
      <Toaster />
      <TurtleMoansEasterEgg />
      <HollywoodPurpleFilterEasterEgg />
    </ChakraProvider>
  );
}
