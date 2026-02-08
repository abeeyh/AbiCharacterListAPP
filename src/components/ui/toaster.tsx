"use client"

import { useEffect } from "react"
import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

export const toaster = createToaster({
  placement: "top",
  pauseOnPageIdle: true,
  duration: 3500,
})

const toastColors: Record<string, { bg: string; border: string }> = {
  success: { bg: "green.900/40", border: "green.500" },
  error: { bg: "red.900/40", border: "red.500" },
  warning: { bg: "yellow.900/40", border: "yellow.500" },
  info: { bg: "blue.900/40", border: "blue.500" },
}

export const Toaster = () => {
  useEffect(() => {
    const handleClick = () => toaster.dismiss()
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }} insetBlock="120px">
        {(toast) => {
          const colors = toast.type && toast.type !== "loading" ? toastColors[toast.type] : { bg: "gray.800", border: "gray.600" };
          return (
          <Toast.Root
            width={{ md: "sm" }}
            bg={colors.bg}
            borderWidth="1px"
            borderColor={colors.border}
            borderRadius="lg"
            shadow="lg"
            cursor="pointer"
          >
            {toast.type === "loading" ? (
              <Spinner size="sm" color="blue.solid" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        );
        }}
      </ChakraToaster>
    </Portal>
  )
}
