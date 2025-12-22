import { Box, Flex, Button, Text } from '@chakra-ui/react';
import { Avatar } from './ui/avatar';
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from './ui/menu';

interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <Box
      as="nav"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center" maxW="1920px" mx="auto">
        {/* Logo/Brand */}
        <Text fontSize="xl" fontWeight="bold" color="teal.600">
          Open Social
        </Text>

        {/* Right side - User menu or Login button */}
        {user ? (
          <MenuRoot positioning={{ placement: 'bottom-end' }}>
            <MenuTrigger asChild>
              <Box cursor="pointer" _hover={{ opacity: 0.8 }} transition="opacity 0.2s">
                <Avatar
                  name={user.displayName || user.handle}
                  src={user.avatar}
                  size="sm"
                />
              </Box>
            </MenuTrigger>
            <MenuContent>
              <MenuItem value="profile" disabled>
                <Box py={1}>
                  <Text fontWeight="medium" fontSize="sm">
                    {user.displayName || user.handle}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    @{user.handle}
                  </Text>
                </Box>
              </MenuItem>
              <MenuItem value="logout" color="red.600" onClick={onLogout}>
                Logout
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        ) : (
          <Button
            colorPalette="teal"
            variant="solid"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              // Scroll to login form
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Login
          </Button>
        )}
      </Flex>
    </Box>
  );
}
