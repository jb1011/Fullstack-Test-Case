import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react";
import type { HistoryPoint } from "@merkl/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, Suspense, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { DotItemDotProps } from "recharts";

import { opportunityQueries } from "../api/queries";
import { formatAprNumber, formatScale } from "../lib/format";
import {
  changeSinceYesterday,
  scaleTicks,
  sliceRange,
  valueDomain,
  type HistoryRange,
} from "../pages/history";

const ACCENT = "#2F6BFF";
const MUTED = "#78716C";
const LINE = "#E7E5E4";

const chartDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const RANGES = ["7D", "30D", "All"] as const;

function EndDot({ cx, cy, index, points }: DotItemDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number" || index !== points.length - 1) {
    return <g />;
  }
  return <circle cx={cx} cy={cy} r={4} fill={ACCENT} stroke="#FFFFFF" strokeWidth={2} />;
}

class HistoryGuard extends Component<
  { children: ReactNode; quiet?: boolean },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      if (this.props.quiet) return null;
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
      <Skeleton h="180px" rounded="8px" />
    </Box>
  );
}

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Flex bg="soft" rounded="pill" p="1" gap="0.5">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Button
            key={option}
            unstyled
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onChange(option);
            }}
            h="28px"
            px="3"
            rounded="pill"
            fontSize="13px"
            fontWeight={selected ? "600" : "500"}
            color={selected ? "ink" : "muted"}
            bg={selected ? "surface" : "transparent"}
          >
            {option === "apr" ? "APR" : option === "tvl" ? "TVL" : option}
          </Button>
        );
      })}
    </Flex>
  );
}

function pointCount(count: number) {
  return count === 1 ? "1 point" : String(count) + " points";
}

function HistoryPlot({
  id,
  series,
  range,
}: {
  id: string;
  series: "apr" | "tvl";
  range: HistoryRange;
}) {
  const { data } = useSuspenseQuery(opportunityQueries.history(id));
  const plotted = sliceRange(series === "apr" ? data.apr : data.tvl, range);
  const label = series === "apr" ? "APR" : "TVL";
  const domain = valueDomain(plotted);

  if (plotted.length === 0) {
    return (
      <Text role="status" color="muted" px="5" py="6">
        No history for this opportunity.
      </Text>
    );
  }

  return (
    <Box role="img" aria-label={`${label} history, ${pointCount(plotted.length)}`} h="220px" px="2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={plotted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal vertical={false} stroke={LINE} />
          <YAxis
            domain={domain}
            ticks={scaleTicks(domain)}
            width={72}
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickFormatter={(value: number) => formatScale(series, value)}
          />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickFormatter={(value: number) => chartDate.format(new Date(value))}
            tickMargin={8}
            minTickGap={28}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#history-fill)"
            dot={EndDot}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function HistoryCard({ id }: { id: string }) {
  const [series, setSeries] = useState<"apr" | "tvl">("apr");
  const [range, setRange] = useState<HistoryRange>("7D");

  return (
    <Box bg="surface" borderWidth="1px" borderColor="line" rounded="card" overflow="hidden">
      <Flex align="center" justify="space-between" gap="3" px="4" pt="4" pb="2">
        <Segment options={["apr", "tvl"] as const} value={series} onChange={setSeries} />
        <Segment options={RANGES} value={range} onChange={setRange} />
      </Flex>
      <HistoryGuard>
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryPlot id={id} series={series} range={range} />
        </Suspense>
      </HistoryGuard>
    </Box>
  );
}

function AprChange({ points }: { points: HistoryPoint[] }) {
  const change = changeSinceYesterday(points);
  if (change === null) return null;
  const amount = formatAprNumber(Math.abs(change));
  if (amount === "0") return null;
  const up = change > 0;
  return (
    <Text mt="2" color={up ? "positive" : "muted"} fontSize="13px" fontWeight="600">
      {up ? "▲" : "▼"} {amount} pts today
    </Text>
  );
}

function AprChangeQuery({ id }: { id: string }) {
  const { data } = useSuspenseQuery(opportunityQueries.history(id));
  return <AprChange points={data.apr} />;
}

export function AprToday({ id }: { id: string }) {
  return (
    <HistoryGuard quiet>
      <Suspense fallback={null}>
        <AprChangeQuery id={id} />
      </Suspense>
    </HistoryGuard>
  );
}
