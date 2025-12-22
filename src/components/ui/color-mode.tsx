"use client"

import type { ReactNode } from "react"
import { ClientOnly, Skeleton } from "@chakra-ui/react"
import { ThemeProvider, useTheme } from "next-themes"

export type ColorModeProviderProps = {
  children?: ReactNode
  forcedTheme?: string
}

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      forcedTheme={props.forcedTheme}
    >
      {props.children}
    </ThemeProvider>
  )
}

export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme()
  const toggleColorMode = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light")
  }
  return {
    colorMode: resolvedTheme,
    setColorMode: setTheme,
    toggleColorMode,
  }
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode()
  return colorMode === "light" ? light : dark
}

export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return (
    <ClientOnly fallback={<Skeleton boxSize="6" />}>
      {colorMode === "light" ? "🌙" : "☀️"}
    </ClientOnly>
  )
}
