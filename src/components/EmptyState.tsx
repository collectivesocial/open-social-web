import { Box, VStack, Heading, Text } from '@chakra-ui/react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      shadow="sm"
      p={12}
      textAlign="center"
      borderWidth="2px"
      borderStyle="dashed"
      borderColor="gray.300"
    >
      <VStack gap={2}>
        <Box fontSize="4xl" color="gray.400" mb={2}>
          🏘️
        </Box>
        <Heading size="md" color="gray.700">
          {title}
        </Heading>
        <Text color="gray.600" maxW="md">
          {description}
        </Text>
      </VStack>
    </Box>
  );
}
