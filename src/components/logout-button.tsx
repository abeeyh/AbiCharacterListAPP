"use client";

import { Button } from "@chakra-ui/react";
import { logoutAction } from "@/lib/auth-actions";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      colorPalette="gray"
      onClick={() => logoutAction()}
    >
      Sair
    </Button>
  );
}
