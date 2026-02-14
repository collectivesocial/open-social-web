"use client"

import { ChakraProvider } from "@chakra-ui/react"
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode"
import { system } from "@/theme"
import { Toaster } from "./toaster"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider forcedTheme="light" {...props} />
      <Toaster />
    </ChakraProvider>
  )
}
