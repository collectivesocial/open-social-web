import { Box, Flex, Button, Text, HStack, IconButton, VStack } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from './ui/avatar';
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from './ui/menu';
import { LuMenu, LuX } from 'react-icons/lu';
import { useState, useEffect } from 'react';
import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

function NavLink({ label, to, active }: { label: string; to: string; active: boolean }) {
  const navigate = useNavigate();
  return (
    <Text
      fontSize="sm"
      fontWeight="medium"
      color={active ? 'accent.default' : 'fg.muted'}
      cursor="pointer"
      onClick={() => navigate(to)}
      _hover={{ color: 'accent.default' }}
      transition="color 0.2s"
      position="relative"
      pb={0.5}
      {...(active && {
        _after: {
          content: '""',
          position: 'absolute',
          bottom: '-2px',
          left: 0,
          right: 0,
          height: '2px',
          bg: 'accent.default',
          borderRadius: 'full',
        },
      })}
    >
      {label}
    </Text>
  );
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Communities', to: '/' },
    { label: 'Developer Apps', to: '/apps' },
    { label: 'Content', to: '/content' },
    { label: 'Events', to: '/events' },
  ];

  return (
    <>
      <Box
        as="nav"
        bg="bg.nav"
        backdropFilter="blur(12px)"
        borderBottom="1px solid"
        borderColor="border.subtle"
        px={{ base: 4, md: 6 }}
        py={3}
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Flex justify="space-between" align="center" maxW="container.workspace" mx="auto">
          <HStack gap={{ base: 4, md: 6 }}>
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              fontWeight="bold"
              fontFamily="heading"
              color="accent.default"
              cursor="pointer"
              onClick={() => navigate('/')}
              _hover={{ color: 'accent.hover' }}
              transition="color 0.2s"
            >
              Open Social
            </Text>

            {/* Desktop nav links */}
            {user && (
              <HStack gap={5} display={{ base: 'none', md: 'flex' }}>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    label={item.label}
                    to={item.to}
                    active={item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)}
                  />
                ))}
              </HStack>
            )}
          </HStack>

          <HStack gap={2}>
            {/* User menu (desktop) or login */}
            {user ? (
              <>
                <Box display={{ base: 'none', md: 'block' }}>
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
                          <Text fontSize="xs" color="fg.muted">
                            @{user.handle}
                          </Text>
                        </Box>
                      </MenuItem>
                      <MenuItem value="logout" color="red.600" onClick={onLogout}>
                        Logout
                      </MenuItem>
                    </MenuContent>
                  </MenuRoot>
                </Box>

                {/* Mobile hamburger */}
                <IconButton
                  display={{ base: 'flex', md: 'none' }}
                  aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  {mobileOpen ? <LuX /> : <LuMenu />}
                </IconButton>
              </>
            ) : (
              <Button
                colorPalette="accent"
                variant="solid"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Login
              </Button>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Mobile drawer */}
      {mobileOpen && user && (
        <Box
          display={{ base: 'block', md: 'none' }}
          position="fixed"
          top="53px"
          left={0}
          right={0}
          bottom={0}
          bg="bg.page"
          zIndex={9}
          px={4}
          py={4}
        >
          <VStack gap={1} align="stretch">
            {/* User info */}
            <Flex align="center" gap={3} p={3} mb={2}>
              <Avatar
                name={user.displayName || user.handle}
                src={user.avatar}
                size="sm"
              />
              <Box>
                <Text fontWeight="medium" fontSize="sm">
                  {user.displayName || user.handle}
                </Text>
                <Text fontSize="xs" color="fg.muted">@{user.handle}</Text>
              </Box>
            </Flex>

            {navItems.map((item) => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <Box
                  key={item.to}
                  as="button"
                  w="100%"
                  textAlign="left"
                  px={4}
                  py={3}
                  borderRadius="lg"
                  fontSize="md"
                  fontWeight={isActive ? '600' : '400'}
                  color={isActive ? 'accent.default' : 'fg.default'}
                  bg={isActive ? 'accent.muted' : 'transparent'}
                  _hover={{ bg: 'bg.subtle' }}
                  onClick={() => navigate(item.to)}
                  transition="all 0.15s"
                >
                  {item.label}
                </Box>
              );
            })}

            <Box borderTopWidth="1px" borderColor="border.subtle" mt={2} pt={2}>
              <Box
                as="button"
                w="100%"
                textAlign="left"
                px={4}
                py={3}
                borderRadius="lg"
                fontSize="md"
                color="red.600"
                _hover={{ bg: 'bg.subtle' }}
                onClick={onLogout}
              >
                Logout
              </Box>
            </Box>
          </VStack>
        </Box>
      )}
    </>
  );
}
