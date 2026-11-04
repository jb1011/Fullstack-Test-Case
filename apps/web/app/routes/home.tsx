import { Heading, Stack, Text } from "@chakra-ui/react";

export default function Home() {
  return (
    <Stack gap="3" padding="6">
      <Heading as="h1" size="xl">
        Opportunities
      </Heading>
      <Text>Browse Merkl opportunities.</Text>
    </Stack>
  );
}
