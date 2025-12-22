"use client"

import { IconButton } from "@chakra-ui/react"
import * as React from "react"
import { LuX } from "react-icons/lu"

export interface CloseButtonProps {}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  function CloseButton(props, ref) {
    return (
      <IconButton bg="transparent" variant="ghost" aria-label="Close" ref={ref} {...props}>
        <LuX />
      </IconButton>
    )
  },
)
