import { Box, Flex, Grid, Heading, Skeleton, Text, chakra } from "@chakra-ui/react";
import type { OpportunityHistory, OpportunityStatus } from "@merkl/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, Suspense, type ReactNode } from "react";
import {
  data,
  useParams,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { ApiError } from "../api/client";
import { opportunityQueries } from "../api/queries";
import { KpiCard } from "../components/kpi";
import { Nav } from "../components/nav";
import { RoundIcon } from "../components/round-icon";
import { formatApr, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";

const STATUS_LABEL: Record<OpportunityStatus, string> = {
  LIVE: "Live",
  SOON: "Soon",
  PAST: "Past",
};

const HISTORY_ROWS = 8;

const historyDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const loadOpportunity = async ({ params, context }: LoaderFunctionArgs) => {
  const id = params.id;
  if (!id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
    throw data("This opportunity does not exist.", { status: 404 });
  }

  try {
    const client = requireQueryClient(context);
    const opportunity = await client.query(opportunityQueries.detail(id));
    void client.query(opportunityQueries.history(id)).catch(() => undefined);
    return opportunity;
  } catch (error) {
    if (error instanceof ApiError) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
      throw data(error.message, { status: error.status });
    }
    throw error;
  }
};

export function loader(args: LoaderFunctionArgs) {
  return loadOpportunity(args);
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  return loadOpportunity(args);
}

export { OpportunityErrorBoundary as ErrorBoundary } from "./error";

function historyRows(history: OpportunityHistory) {
  const byTime = new Map<number, { apr?: number; tvl?: number }>();
  for (const point of history.apr) {
    const row = byTime.get(point.timestamp) ?? {};
    row.apr = point.value;
    byTime.set(point.timestamp, row);
  }
  for (const point of history.tvl) {
    const row = byTime.get(point.timestamp) ?? {};
    row.tvl = point.value;
    byTime.set(point.timestamp, row);
  }
  return [...byTime.entries()]
    .sort((left, right) => right[0] - left[0])
    .slice(0, HISTORY_ROWS)
    .map(([timestamp, values]) => ({ timestamp, ...values }));
}

class HistoryGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <Text role="alert" color="muted" px="5" py="6">
          History could not be loaded.
        </Text>
      );
    }
    return this.props.children;
  }
}

function HistorySkeleton() {
  return (
    <Box role="status" aria-label="Loading history" px="5" pb="5">
      <Skeleton h="14px" w="180px" />
      <Skeleton mt="3" h="14px" w="240px" />
      <Skeleton mt="3" h="14px" w="160px" />
    </Box>
  );
}

function HistoryTable({ id }: { id: string }) {
  const { data } = useSuspenseQuery(opportunityQueries.history(id));
  const rows = historyRows(data);

  if (rows.length === 0) {
    return (
      <Text role="status" color="muted" px="5" py="6">
        No history for this opportunity.
      </Text>
    );
  }

  return (
    <Box role="table" aria-label="History" px="5" pb="4">
      <Box
        role="row"
        display="grid"
        gridTemplateColumns="minmax(0, 1fr) 120px 140px"
        h="36px"
        alignItems="center"
        borderBottomWidth="1px"
        borderColor="line"
      >
        <Text role="columnheader" color="muted" fontSize="12.5px">
          Date
        </Text>
        <Text role="columnheader" color="muted" fontSize="12.5px" textAlign="right">
          APR
        </Text>
        <Text role="columnheader" color="muted" fontSize="12.5px" textAlign="right">
          TVL
        </Text>
      </Box>
      {rows.map((row) => (
        <Box
          key={row.timestamp}
          role="row"
          display="grid"
          gridTemplateColumns="minmax(0, 1fr) 120px 140px"
          h="40px"
          alignItems="center"
          borderBottomWidth="1px"
          borderColor="line"
        >
          <Text role="cell">{historyDate.format(new Date(row.timestamp))}</Text>
          <Text role="cell" textAlign="right" fontFamily="mono" fontVariantNumeric="tabular-nums">
            {row.apr === undefined ? "" : formatApr(row.apr)}
          </Text>
          <Text role="cell" textAlign="right" fontFamily="mono" fontVariantNumeric="tabular-nums">
            {row.tvl === undefined ? "" : formatTvl(row.tvl)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function OpportunityPage({ id }: { id: string }) {
  const { data } = useSuspenseQuery(opportunityQueries.detail(id));

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
          {data.name}
        </Heading>
        {data.tokens.length > 0 ? (
          <Flex align="center" gap="4" mt="4">
            {data.tokens.map((token, index) => (
              <Flex key={`${token.address}-${String(index)}`} align="center" gap="1.5">
                <RoundIcon src={token.icon} name={token.symbol} size={20} />
                <Text>{token.symbol}</Text>
              </Flex>
            ))}
          </Flex>
        ) : null}
        <Flex align="center" gap="1.5" mt="4" color="muted" minW="0" flexWrap="wrap">
          {data.protocol ? (
            <>
              <RoundIcon src={data.protocol.icon} name={data.protocol.name} size={14} />
              <Text>{data.protocol.name}</Text>
              <Text>·</Text>
            </>
          ) : null}
          <RoundIcon src={data.chain.icon} name={data.chain.name} size={14} />
          <Text>{data.chain.name}</Text>
          <Text>·</Text>
          <Text color="ink">{STATUS_LABEL[data.status]}</Text>
          <Box
            display="inline-flex"
            alignItems="center"
            h="20px"
            px="1.5"
            bg="soft"
            color="ink"
            rounded="badge"
            fontSize="11px"
            fontWeight="600"
            letterSpacing="0.4px"
            textTransform="uppercase"
          >
            {data.action}
          </Box>
        </Flex>
        {data.description ? (
          <Text mt="4" maxW="640px" color="muted">
            {data.description}
          </Text>
        ) : null}
        <Grid mt="8" gap="3" templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 240px))" }}>
          <KpiCard label="APR" value={formatApr(data.apr)} />
          <KpiCard label="TVL" value={formatTvl(data.tvl)} />
          <KpiCard label="Daily rewards" value={`${formatTvl(data.dailyRewards)} /day`} />
        </Grid>
        {data.depositUrl ? (
          <chakra.a
            href={data.depositUrl}
            target="_blank"
            rel="noreferrer"
            display="inline-flex"
            mt="6"
            color="accent"
            fontWeight="600"
          >
            Deposit
          </chakra.a>
        ) : null}
        <Box
          mt="8"
          bg="surface"
          borderWidth="1px"
          borderColor="line"
          rounded="card"
          overflow="hidden"
        >
          <Text px="5" pt="5" pb="3" fontWeight="600">
            History
          </Text>
          <HistoryGuard>
            <Suspense fallback={<HistorySkeleton />}>
              <HistoryTable id={id} />
            </Suspense>
          </HistoryGuard>
        </Box>
      </Box>
    </Box>
  );
}

export default function Opportunity() {
  const { id } = useParams();
  if (!id) return null;
  return <OpportunityPage id={id} />;
}
