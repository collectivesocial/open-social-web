import { Box, VStack, Heading, Text } from '@chakra-ui/react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Box
      bg="bg.card"
      borderRadius="xl"
      shadow="sm"
      p={12}
      textAlign="center"
      borderWidth="2px"
      borderStyle="dashed"
      borderColor="border.card"
    >
      <VStack gap={2}>
        <Box fontSize="4xl" color="fg.subtle" mb={2}>
          🏘️
        </Box>
        <Heading size="md" color="fg.default" fontFamily="heading">
          {title}
        </Heading>
        <Text color="fg.muted" maxW="md">
          {description}
        </Text>
      </VStack>
    </Box>
  );
}
