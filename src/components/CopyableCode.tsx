import { Box, Code, Button, Flex, Text } from '@chakra-ui/react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface CopyableCodeProps {
  value: string;
  /** Shown as a label above the code block; also used as the copy button aria-label prefix */
  label?: string;
  fontSize?: string;
  wordBreak?: 'break-all' | 'break-word' | 'normal';
}

/**
 * Renders a Chakra `<Code>` block paired with a clipboard copy button.
 * Uses `useCopyToClipboard` internally so callers don't need their own state.
 */
export function CopyableCode({ value, label, fontSize = 'xs', wordBreak = 'break-all' }: CopyableCodeProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={1}>
        {label ? (
          <Text fontWeight="medium" fontSize="sm">{label}</Text>
        ) : (
          <Box />
        )}
        <Button
          size="xs"
          variant="ghost"
          onClick={() => copy(value)}
          aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </Flex>
      <Code p={2} borderRadius="md" display="block" fontSize={fontSize} wordBreak={wordBreak} whiteSpace="pre-wrap">
        {value}
      </Code>
    </Box>
  );
}
