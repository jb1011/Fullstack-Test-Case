import { Box, Flex, Grid, Heading, Text, chakra } from "@chakra-ui/react";
import type { OpportunityDetail, OpportunityStatus } from "@merkl/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  data,
  Link as RouterLink,
  useParams,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { ApiError } from "../api/client";
import { opportunityQueries } from "../api/queries";
import { AprToday, HistoryCard } from "../components/history-chart";
import { KpiCard } from "../components/kpi";
import { Nav } from "../components/nav";
import { RoundIcon } from "../components/round-icon";
import { formatAprNumber, formatEndsIn, formatTvl } from "../lib/format";
import { requireQueryClient } from "../lib/queryClient";

const RouteLink = chakra(RouterLink);

const STATUS_LABEL: Record<OpportunityStatus, string> = {
  LIVE: "Live",
  SOON: "Soon",
  PAST: "Past",
};

const titleWord = (value: string) => {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

function Pill({ children }: { children: ReactNode }) {
  return (
    <Flex
      align="center"
      gap="1.5"
      h="28px"
      px="2.5"
      bg="surface"
      borderWidth="1px"
      borderColor="line"
      rounded="pill"
      fontSize="13px"
      color="ink"
    >
      {children}
    </Flex>
  );
}

function Crumb({ opportunity }: { opportunity: OpportunityDetail }) {
  return (
    <Flex align="center" gap="2" color="muted" fontSize="13px">
      <RouteLink to="/" color="muted" textDecoration="none">
        ← Opportunities
      </RouteLink>
      <Text>/</Text>
      <Text>{opportunity.chain.name}</Text>
      {opportunity.protocol ? (
        <>
          <Text>/</Text>
          <Text color="ink">{opportunity.protocol.name}</Text>
        </>
      ) : null}
    </Flex>
  );
}

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

function OpportunityPage({ id }: { id: string }) {
  const { data } = useSuspenseQuery(opportunityQueries.detail(id));
  const icon = data.tokens[0];
  // The label is a day count, so it has to be read when the page renders.
  // eslint-disable-next-line react-hooks/purity -- Date.now is the clock for "ends in"
  const now = Date.now();
  const ends = data.endsAt === null ? null : formatEndsIn(data.endsAt, now);
  const depositLabel = data.protocol ? `Deposit on ${data.protocol.name}` : "Deposit";

  return (
    <Box minH="100vh">
      <Nav />
      <Box maxW="1240px" mx="auto" px="12" pt="8" pb="16">
        <Crumb opportunity={data} />
        <Flex mt="6" align="flex-end" justify="space-between" gap="8">
          <Box minW="0">
            <RoundIcon src={icon?.icon ?? null} name={icon?.symbol ?? data.name} size={48} />
            <Heading
              as="h1"
              mt="4"
              maxW="720px"
              fontSize="40px"
              fontWeight="650"
              letterSpacing="-1.4px"
              lineHeight="1.05"
              color="ink"
            >
              {data.name}
            </Heading>
          </Box>
          <Box textAlign="right" flexShrink={0}>
            <Text color="muted" fontSize="12.5px">
              Current APR
            </Text>
            <Text
              mt="1"
              color="ink"
              fontSize="56px"
              fontWeight="650"
              letterSpacing="-2px"
              lineHeight="0.9"
              fontVariantNumeric="tabular-nums"
            >
              {formatAprNumber(data.apr)}
              <Text as="span" fontSize="28px" fontWeight="600" letterSpacing="-1px">
                %
              </Text>
            </Text>
            <AprToday id={id} />
          </Box>
        </Flex>
        <Flex align="center" gap="2" mt="5" flexWrap="wrap">
          <Pill>
            <RoundIcon src={data.chain.icon} name={data.chain.name} size={14} />
            {data.chain.name}
          </Pill>
          {data.protocol ? (
            <Pill>
              <RoundIcon src={data.protocol.icon} name={data.protocol.name} size={14} />
              {data.protocol.name}
            </Pill>
          ) : null}
          <Pill>{titleWord(data.action)}</Pill>
          <Pill>
            {data.status === "LIVE" ? <Box boxSize="6px" rounded="full" bg="positive" /> : null}
            {STATUS_LABEL[data.status]}
          </Pill>
        </Flex>
        <Grid mt="8" gap="3" templateColumns="repeat(auto-fit, minmax(180px, 1fr))">
          <KpiCard label="TVL" value={formatTvl(data.tvl)} />
          <KpiCard label="Daily rewards" value={formatTvl(data.dailyRewards)} />
          {ends ? <KpiCard label="Ends in" value={ends} /> : null}
        </Grid>
        <Grid mt="4" gap="4" templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 320px" }}>
          <Box minW="0">
            <HistoryCard id={id} />
            {data.description ? (
              <Text mt="4" color="muted" fontSize="13px" lineHeight="1.5">
                {data.description}
              </Text>
            ) : null}
          </Box>
          {data.depositUrl || data.tokens.length > 0 ? (
            <Flex direction="column" gap="3">
              {data.depositUrl ? (
                <chakra.a
                  href={data.depositUrl}
                  target="_blank"
                  rel="noreferrer"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  h="44px"
                  bg="ink"
                  color="surface"
                  rounded="12px"
                  fontWeight="600"
                  textDecoration="none"
                >
                  {depositLabel}
                </chakra.a>
              ) : null}
              {data.tokens.length > 0 ? (
                <Box bg="surface" borderWidth="1px" borderColor="line" rounded="card" px="5" py="4">
                  <Text fontWeight="600">Tokens</Text>
                  {data.tokens.map((token, index) => (
                    <Flex
                      key={`${token.address}-${String(index)}`}
                      align="center"
                      gap="2"
                      mt="3"
                      pt={index === 0 ? 0 : "3"}
                      borderTopWidth={index === 0 ? 0 : "1px"}
                      borderColor="line"
                    >
                      <RoundIcon src={token.icon} name={token.symbol} size={22} />
                      <Text>{token.symbol}</Text>
                    </Flex>
                  ))}
                </Box>
              ) : null}
            </Flex>
          ) : null}
        </Grid>
      </Box>
    </Box>
  );
}

export default function Opportunity() {
  const { id } = useParams();
  if (!id) return null;
  return <OpportunityPage id={id} />;
}
