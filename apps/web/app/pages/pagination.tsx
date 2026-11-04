import { Button, Stack, Text } from "@chakra-ui/react";

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

  return (
    <Stack as="nav" aria-label="Pagination" direction="row" gap="3" align="center">
      <Button
        disabled={page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        Previous
      </Button>
      <Text>
        Page {page} of {pageCount}
      </Text>
      <Button
        disabled={page >= pageCount}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        Next
      </Button>
    </Stack>
  );
}
