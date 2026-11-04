import { Heading, Stack, Text } from "@chakra-ui/react";
import { serializeOpportunitiesQuery } from "@merkl/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  data,
  useSearchParams,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { ApiError } from "../api/client";
import { opportunityQueries } from "../api/queries";
import { formatApr, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";
import { OpportunityFilters } from "./filters";
import { Pagination } from "./pagination";
import { queryFromRequest, queryFromSearch, withFilter, withPage } from "./search";

const loadPage = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const query = queryFromRequest(request);
    const client = requireQueryClient(context);
    const [page] = await Promise.all([
      client.query(opportunityQueries.list(query)),
      client.query(opportunityQueries.filters()),
    ]);
    return page;
  } catch (error) {
    // A plain Error is stripped before it reaches the browser, so the reason has to travel as a response.
    if (error instanceof ApiError) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
      throw data(error.message, { status: error.status });
    }
    if (error instanceof Error && error.name === "ZodError") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
      throw data("These filters are not valid.", { status: 400 });
    }
    throw error;
  }
};

export function loader(args: LoaderFunctionArgs) {
  return loadPage(args);
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  return loadPage(args);
}

export { ListErrorBoundary as ErrorBoundary } from "./error";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = queryFromSearch(searchParams.toString());
  const { data } = useSuspenseQuery(opportunityQueries.list(query));
  const { data: filterOptions } = useSuspenseQuery(opportunityQueries.filters());

  return (
    <Stack gap="6" padding="6">
      <Stack gap="1">
        <Heading as="h1" size="xl">
          Opportunities
        </Heading>
        <Text color="fg.muted">Total TVL {formatTvl(data.totalTvl)}</Text>
      </Stack>
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
      {data.items.length === 0 ? (
        <Text role="status">
          {data.total === 0
            ? "No opportunities match these filters."
            : "No opportunities on this page."}
        </Text>
      ) : (
        <Stack gap="4" role="list">
          {data.items.map((item) => (
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
      )}
      {data.total > 0 ? (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={data.total}
          onPage={(page) => {
            const next = serializeOpportunitiesQuery(withPage(query, page));
            setSearchParams(new URLSearchParams(next));
          }}
        />
      ) : null}
    </Stack>
  );
}
