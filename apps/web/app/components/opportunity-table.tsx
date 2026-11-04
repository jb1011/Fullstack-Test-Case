import { Box, Button, Flex, Skeleton, Text, chakra } from "@chakra-ui/react";
import type { OpportunitySort, OpportunitySummary, SortOrder } from "@merkl/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router";

import { opportunityQueries } from "../api/queries";
import { formatAprNumber, formatTvl } from "../lib/format";
import { RoundIcon } from "./round-icon";

const RouteLink = chakra(RouterLink);

const columns = "minmax(0, 1fr) 110px 120px 150px 120px 70px";

function SortButton({
  label,
  sort,
  active,
  order,
  onSort,
}: {
  label: string;
  sort: OpportunitySort;
  active: boolean;
  order: SortOrder;
  onSort: (sort: OpportunitySort) => void;
}) {
  const mark = active ? (order === "asc" ? "↑" : "↓") : "";
  return (
    <Flex justify="flex-end">
      <Button
        unstyled
        type="button"
        onClick={() => {
          onSort(sort);
        }}
        color="muted"
        fontSize="12.5px"
        fontWeight="500"
      >
        {label}
        {mark ? ` ${mark}` : ""}
      </Button>
    </Flex>
  );
}

function TokenStack({ tokens }: { tokens: OpportunitySummary["tokens"] }) {
  const shown = tokens.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <Flex flexShrink={0} mr="3">
      {shown.map((token, index) => (
        <Box
          key={`${token.address}-${String(index)}`}
          ml={index === 0 ? 0 : "-8px"}
          zIndex={shown.length - index}
        >
          <RoundIcon src={token.icon} name={token.symbol} size={28} ring />
        </Box>
      ))}
    </Flex>
  );
}

const skeletonRows = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function useWarmOpportunity() {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.query(opportunityQueries.detail(id)).catch(() => undefined);
    void queryClient.query(opportunityQueries.history(id)).catch(() => undefined);
  };
}

export function OpportunityTableSkeleton() {
  return (
    <Box minW="980px" role="status" aria-label="Loading opportunities" aria-busy="true">
      <Box
        display="grid"
        gridTemplateColumns={columns}
        h="42px"
        px="5"
        alignItems="center"
        borderBottomWidth="1px"
        borderColor="line"
      >
        <Text color="muted" fontSize="12.5px">
          Opportunity
        </Text>
        <Text color="muted" fontSize="12.5px">
          Action
        </Text>
        <Text color="muted" fontSize="12.5px" textAlign="right">
          TVL
        </Text>
        <Text color="muted" fontSize="12.5px" textAlign="right">
          Daily rewards
        </Text>
        <Text color="muted" fontSize="12.5px" textAlign="right">
          APR
        </Text>
        <Box />
      </Box>
      {skeletonRows.map((key, index) => (
        <Box
          key={key}
          display="grid"
          gridTemplateColumns={columns}
          h="72px"
          px="5"
          alignItems="center"
          borderBottomWidth={index === skeletonRows.length - 1 ? 0 : "1px"}
          borderColor="line"
        >
          <Flex align="center" gap="3">
            <Skeleton boxSize="28px" rounded="full" />
            <Skeleton h="14px" w="220px" />
          </Flex>
          <Skeleton h="14px" w="56px" />
          <Skeleton h="14px" w="72px" justifySelf="end" />
          <Skeleton h="14px" w="80px" justifySelf="end" />
          <Skeleton h="14px" w="48px" justifySelf="end" />
          <Box />
        </Box>
      ))}
    </Box>
  );
}

export function OpportunityTable({
  items,
  sort,
  order,
  onSort,
}: {
  items: OpportunitySummary[];
  sort: OpportunitySort;
  order: SortOrder;
  onSort: (sort: OpportunitySort) => void;
}) {
  const warm = useWarmOpportunity();
  return (
    <Box minW="980px">
      <Box
        display="grid"
        gridTemplateColumns={columns}
        h="42px"
        px="5"
        alignItems="center"
        borderBottomWidth="1px"
        borderColor="line"
      >
        <Text color="muted" fontSize="12.5px">
          Opportunity
        </Text>
        <Text color="muted" fontSize="12.5px">
          Action
        </Text>
        <SortButton label="TVL" sort="tvl" active={sort === "tvl"} order={order} onSort={onSort} />
        <SortButton
          label="Daily rewards"
          sort="rewards"
          active={sort === "rewards"}
          order={order}
          onSort={onSort}
        />
        <SortButton label="APR" sort="apr" active={sort === "apr"} order={order} onSort={onSort} />
        <Box />
      </Box>
      <Box role="list">
        {items.map((item, index) => (
          <Box
            key={item.id}
            role="listitem"
            borderBottomWidth={index === items.length - 1 ? 0 : "1px"}
            borderColor="line"
          >
            <RouteLink
              to={`/opportunities/${item.id}`}
              prefetch="intent"
              onMouseEnter={() => {
                warm(item.id);
              }}
              onFocus={() => {
                warm(item.id);
              }}
              display="grid"
              gridTemplateColumns={columns}
              minH="72px"
              px="5"
              alignItems="center"
              color="inherit"
              textDecoration="none"
              transition="background-color 150ms ease-out"
              _hover={{ bg: "rowHover", boxShadow: "inset 3px 0 0 {colors.accent}" }}
            >
              <Flex align="center" minW="0">
                <TokenStack tokens={item.tokens} />
                <Box minW="0">
                  <Text fontSize="14.5px" fontWeight="550" truncate>
                    {item.name}
                  </Text>
                  <Flex align="center" gap="1.5" mt="0.5" color="muted" fontSize="12.5px" minW="0">
                    {item.protocol ? (
                      <>
                        <RoundIcon src={item.protocol.icon} name={item.protocol.name} size={14} />
                        <Text truncate>{item.protocol.name}</Text>
                        <Text flexShrink={0}>·</Text>
                      </>
                    ) : null}
                    <RoundIcon src={item.chain.icon} name={item.chain.name} size={14} />
                    <Text truncate>{item.chain.name}</Text>
                  </Flex>
                </Box>
              </Flex>
              <Box>
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
                  {item.action}
                </Box>
              </Box>
              <Text
                textAlign="right"
                fontFamily="mono"
                fontSize="14px"
                fontVariantNumeric="tabular-nums"
              >
                {formatTvl(item.tvl)}
              </Text>
              <Text
                textAlign="right"
                fontFamily="mono"
                fontSize="14px"
                fontVariantNumeric="tabular-nums"
              >
                {formatTvl(item.dailyRewards)}
                <Text as="span" color="muted" fontSize="12px">
                  {" "}
                  /day
                </Text>
              </Text>
              <Text
                textAlign="right"
                fontSize="21px"
                fontWeight="600"
                letterSpacing="-0.6px"
                fontVariantNumeric="tabular-nums"
              >
                {formatAprNumber(item.apr)}
                <Text as="span" color="muted" fontSize="13px" fontWeight="500">
                  %
                </Text>
              </Text>
              <Box textAlign="right" fontSize="13px" color="muted">
                ›
              </Box>
            </RouteLink>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
