import { Button, Flex, Text } from "@chakra-ui/react";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const range =
    from > total
      ? `0 of ${String(total)}`
      : `${String(from)}\u2013${String(to)} of ${String(total)}`;

  return (
    <Flex
      as="nav"
      aria-label="Pagination"
      h="52px"
      px="5"
      align="center"
      justify="space-between"
      borderTopWidth="1px"
      borderColor="line"
    >
      <Text color="muted" fontFamily="mono" fontSize="13px" fontVariantNumeric="tabular-nums">
        {range}
      </Text>
      <Flex gap="4" align="center">
        <Button
          unstyled
          type="button"
          aria-label="Prev"
          disabled={page <= 1}
          onClick={() => {
            onPage(page - 1);
          }}
          color="muted"
          fontSize="13px"
          _disabled={{ opacity: 0.4 }}
        >
          ← Prev
        </Button>
        <Button
          unstyled
          type="button"
          aria-label="Next"
          disabled={page >= pageCount}
          onClick={() => {
            onPage(page + 1);
          }}
          color="ink"
          fontSize="13px"
          fontWeight="500"
          _disabled={{ opacity: 0.4 }}
        >
          Next →
        </Button>
      </Flex>
    </Flex>
  );
}
