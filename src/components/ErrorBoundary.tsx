import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Box, VStack, Heading, Text, Button, Flex } from '@chakra-ui/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console (can be replaced with external error reporting service)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box
            bg="bg.card"
            borderRadius="xl"
            shadow="md"
            p={8}
            maxW="lg"
            w="100%"
            borderWidth="1px"
            borderColor="border.card"
          >
            <VStack gap={4} align="stretch">
              <Box textAlign="center">
                <Box fontSize="4xl" mb={2}>⚠️</Box>
                <Heading size="lg" color="fg.error" fontFamily="heading" mb={2}>
                  Something went wrong
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                  An unexpected error occurred. You can try again or return to the home page.
                </Text>
              </Box>

              {this.state.error && (
                <Box
                  bg="bg.subtle"
                  borderRadius="lg"
                  p={4}
                  borderWidth="1px"
                  borderColor="border.subtle"
                >
                  <Text fontSize="xs" fontFamily="monospace" color="fg.muted" wordBreak="break-word">
                    {this.state.error.message}
                  </Text>
                </Box>
              )}

              <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
                <Button
                  onClick={this.handleReset}
                  colorPalette="accent"
                  variant="solid"
                  flex={1}
                >
                  Try again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  flex={1}
                >
                  Go home
                </Button>
              </Flex>
            </VStack>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
