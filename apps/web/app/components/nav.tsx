import { Box, Flex, chakra } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";

const RouteLink = chakra(RouterLink);

export function Nav() {
  return (
    <Box as="header" borderBottomWidth="1px" borderColor="line">
      <Flex maxW="1240px" mx="auto" px="12" h="60px" align="center" justify="space-between">
        <RouteLink
          to="/"
          display="flex"
          alignItems="center"
          gap="2"
          color="ink"
          fontWeight="600"
          textDecoration="none"
        >
          <Box boxSize="16px" rounded="4px" bg="accent" />
          Merkl Explorer
        </RouteLink>
        <RouteLink to="/" color="ink" fontSize="14px" fontWeight="500" textDecoration="none">
          Opportunities
        </RouteLink>
      </Flex>
    </Box>
  );
}
