import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import {
  serializeOpportunitiesQuery,
  type OpportunitiesQuery,
  type OpportunityList,
  type OpportunitySort,
} from "@merkl/shared";
import { useQueryClient, useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import {
  data,
  useNavigation,
  useSearchParams,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { ApiError } from "../api/client";
import { LIST_STALE_MS, opportunityQueries } from "../api/queries";
import { FilterBar } from "../components/filter-bar";
import { KpiCard } from "../components/kpi";
import { Nav } from "../components/nav";
import { OpportunityTable, OpportunityTableSkeleton } from "../components/opportunity-table";
import { formatCount, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";
import { Pagination } from "./pagination";
import { pendingQuery, queryFromRequest, queryFromSearch, withFilter, withPage } from "./search";

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

function freshList(client: QueryClient, query: OpportunitiesQuery) {
  const key = opportunityQueries.list(query).queryKey;
  const state = client.getQueryState(key);
  if (state?.status !== "success" || state.isInvalidated) return undefined;
  if (Date.now() - state.dataUpdatedAt >= LIST_STALE_MS) return undefined;
  return client.getQueryData<OpportunityList>(key);
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const query = queryFromSearch(searchParams.toString());
  const pending =
    navigation.state === "loading" && navigation.location.pathname === "/"
      ? pendingQuery(navigation.location.search)
      : null;
  const cached = pending ? freshList(queryClient, pending) : undefined;
  const loadingList = pending !== null && cached === undefined;
  const displayed = pending ?? query;
  const { data } = useSuspenseQuery(opportunityQueries.list(query));
  const shown = cached ?? data;
  const { data: filterOptions } = useSuspenseQuery(opportunityQueries.filters());
  const onlyStatus = displayed.status.length === 1 ? displayed.status[0] : undefined;
  const empty =
    shown.items.length === 0
      ? shown.total === 0
        ? "No opportunities match these filters."
        : "No opportunities on this page."
      : null;

  return (
    <Box minH="100vh">
      <Nav />
      <Box maxW="1240px" mx="auto" px="12" pt="11" pb="16">
        <Heading
          as="h1"
          fontSize="44px"
          fontWeight="650"
          letterSpacing="-1.6px"
          lineHeight="1"
          color="ink"
        >
          Opportunities
        </Heading>
        <Text mt="3" color="muted">
          Live incentives across DeFi, refreshed every minute.
        </Text>
        <Grid mt="8" gap="3" templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 380px))" }}>
          <KpiCard
            label="Total value locked"
            value={formatTvl(shown.totalTvl)}
            loading={loadingList}
          />
          <KpiCard
            label={onlyStatus === "LIVE" ? "Live opportunities" : "Opportunities"}
            value={formatCount(shown.total)}
            loading={loadingList}
          />
        </Grid>
        <FilterBar
          query={displayed}
          options={filterOptions}
          onChange={(patch) => {
            const next = serializeOpportunitiesQuery(withFilter(displayed, patch));
            setSearchParams(new URLSearchParams(next));
          }}
          onReset={() => {
            setSearchParams(new URLSearchParams());
          }}
        />
        <Box bg="surface" borderWidth="1px" borderColor="line" rounded="card" overflow="hidden">
          {loadingList ? (
            <Box overflowX="auto">
              <OpportunityTableSkeleton />
            </Box>
          ) : empty ? (
            <Flex align="center" justify="center" minH="240px" px="6">
              <Text role="status" color="muted" textAlign="center">
                {empty}
              </Text>
            </Flex>
          ) : (
            <Box overflowX="auto">
              <OpportunityTable
                items={shown.items}
                sort={displayed.sort}
                order={displayed.order}
                onSort={(sort: OpportunitySort) => {
                  const order =
                    displayed.sort === sort && displayed.order === "desc" ? "asc" : "desc";
                  const next = serializeOpportunitiesQuery(withFilter(displayed, { sort, order }));
                  setSearchParams(new URLSearchParams(next));
                }}
              />
            </Box>
          )}
          {!loadingList && shown.total > 0 ? (
            <Pagination
              page={displayed.page}
              pageSize={displayed.pageSize}
              total={shown.total}
              onPage={(page) => {
                const next = serializeOpportunitiesQuery(withPage(displayed, page));
                setSearchParams(new URLSearchParams(next));
              }}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
