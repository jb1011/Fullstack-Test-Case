import { Heading, Stack, Text } from "@chakra-ui/react";
import { serializeOpportunitiesQuery } from "@merkl/shared";
import { useQuery } from "@tanstack/react-query";
import {
  useSearchParams,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { opportunityQueries } from "../api/queries";
import { formatApr, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";
import { OpportunityFilters } from "./filters";
import { queryFromRequest, queryFromSearch, withFilter } from "./search";

const loadPage = ({ request, context }: LoaderFunctionArgs) => {
  const query = queryFromRequest(request);
  const client = requireQueryClient(context);
  return Promise.all([
    client.query(opportunityQueries.list(query)),
    client.query(opportunityQueries.filters()),
  ]).then(([page]) => page);
};

export function loader(args: LoaderFunctionArgs) {
  return loadPage(args);
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  return loadPage(args);
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = queryFromSearch(searchParams.toString());
  const { data } = useQuery(opportunityQueries.list(query));
  const { data: filterOptions } = useQuery(opportunityQueries.filters());

  return (
    <Stack gap="6" padding="6">
      <Heading as="h1" size="xl">
        Opportunities
      </Heading>
      <OpportunityFilters
        query={query}
        options={filterOptions}
        onChange={(patch) => {
          const next = serializeOpportunitiesQuery(withFilter(query, patch));
          setSearchParams(new URLSearchParams(next));
        }}
        onReset={() => {
          setSearchParams(new URLSearchParams());
        }}
      />
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
