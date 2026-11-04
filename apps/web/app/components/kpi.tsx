import { Box, Skeleton, Text } from "@chakra-ui/react";

export function KpiCard({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Box bg="surface" borderWidth="1px" borderColor="line" rounded="kpi" px="5" py="4">
      <Text color="muted" fontSize="12.5px">
        {label}
      </Text>
      {loading ? (
        <Skeleton mt="2" h="29px" w="120px" />
      ) : (
        <Text
          mt="2"
          color="ink"
          fontFamily="mono"
          fontSize="26px"
          fontWeight="500"
          letterSpacing="-0.5px"
          fontVariantNumeric="tabular-nums"
          lineHeight="1.1"
        >
          {value}
        </Text>
      )}
    </Box>
  );
}
