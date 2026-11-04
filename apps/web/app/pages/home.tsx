import { Heading, Stack, Text } from "@chakra-ui/react";
import { opportunitiesQuerySchema } from "@merkl/shared";
import { useQuery } from "@tanstack/react-query";
import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from "react-router";

import { opportunityQueries } from "../api/queries";
import { formatApr, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";

export const firstPage = opportunitiesQuerySchema.parse({});

const listQuery = () => opportunityQueries.list(firstPage);

const loadFirstPage = (context: LoaderFunctionArgs["context"]) =>
  requireQueryClient(context).query(listQuery());

export function loader({ context }: LoaderFunctionArgs) {
  return loadFirstPage(context);
}

export function clientLoader({ context }: ClientLoaderFunctionArgs) {
  return loadFirstPage(context);
}

export default function Home() {
  const { data } = useQuery(listQuery());

  return (
    <Stack gap="6" padding="6">
      <Heading as="h1" size="xl">
        Opportunities
      </Heading>
      <Stack gap="4" role="list">
        {data?.items.map((item) => (
          <Stack key={item.id} role="listitem" gap="1">
            <Stack direction="row" gap="2" align="center">
              {item.tokens.map((token) =>
                token.icon ? (
                  <img
                    key={token.address}
                    src={token.icon}
                    alt={token.symbol}
                    width={16}
                    height={16}
                  />
                ) : (
                  <Text key={token.address} fontSize="sm">
                    {token.symbol}
                  </Text>
                ),
              )}
              <Text fontWeight="medium">{item.name}</Text>
            </Stack>
            <Text color="fg.muted" fontSize="sm">
              {item.chain.name}
              {item.protocol ? ` · ${item.protocol.name}` : ""}
              {` · ${item.status} · ${formatApr(item.apr)} · ${formatTvl(item.tvl)}`}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
