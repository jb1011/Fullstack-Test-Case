import { Box, Button, Checkbox, Flex, Input, Popover, Portal, Text } from "@chakra-ui/react";
import { serializeOpportunitiesQuery, type Filters, type OpportunitiesQuery } from "@merkl/shared";
import { useState } from "react";

import { formatTvl } from "../lib/format";
import { RoundIcon } from "./round-icon";

type Patch = Partial<Record<keyof OpportunitiesQuery, unknown>>;

const ACTIONS = [
  { value: "ALL", label: "All" },
  { value: "LEND", label: "Lend" },
  { value: "BORROW", label: "Borrow" },
  { value: "POOL", label: "Pool" },
  { value: "HOLD", label: "Hold" },
] as const;

const STATUSES = [
  { value: "LIVE", label: "Live", dot: true },
  { value: "SOON", label: "Soon", dot: false },
  { value: "PAST", label: "Past", dot: false },
] as const;

const TVL_PRESETS = [
  { label: "$100K", value: 100_000 },
  { label: "$1M", value: 1_000_000 },
  { label: "$10M", value: 10_000_000 },
  { label: "$100M", value: 100_000_000 },
] as const;

const chip = {
  type: "button" as const,
  h: "34px",
  px: "3",
  rounded: "pill",
  borderWidth: "1px",
  borderColor: "line",
  bg: "surface",
  fontSize: "13px",
  color: "ink",
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  flexShrink: 0,
};

interface Choice {
  id: string;
  name: string;
  icon: string | null;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LiveDot() {
  return (
    <Box
      boxSize="6px"
      rounded="full"
      bg="positive"
      boxShadow="0 0 0 3px rgba(22, 163, 74, 0.18)"
      flexShrink={0}
    />
  );
}

function Segmented({
  label,
  value,
  options,
  onValue,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; dot?: boolean }[];
  onValue: (value: string) => void;
}) {
  return (
    <Box
      role="group"
      aria-label={label}
      display="inline-flex"
      bg="soft"
      rounded="pill"
      p="3px"
      flexShrink={0}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            unstyled
            type="button"
            aria-pressed={active}
            h="28px"
            px="3"
            rounded="pill"
            bg={active ? "surface" : "transparent"}
            color={active ? "ink" : "muted"}
            fontSize="13px"
            fontWeight="500"
            display="inline-flex"
            alignItems="center"
            gap="1.5"
            boxShadow={
              active ? "0 1px 2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)" : undefined
            }
            onClick={() => {
              if (!active) onValue(option.value);
            }}
          >
            {option.dot ? <LiveDot /> : null}
            {option.label}
          </Button>
        );
      })}
    </Box>
  );
}

function MultiSelect({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: Choice[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const shown = items.filter((item) =>
    item.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const picked = items.filter((item) => selected.has(item.id)).slice(0, 3);

  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-start" }}
      onOpenChange={(details) => {
        if (!details.open) setFilter("");
      }}
    >
      <Popover.Trigger {...chip} aria-label={label}>
        {picked.length > 0 ? (
          <Flex align="center">
            {picked.map((item, index) => (
              <Box key={item.id} ml={index === 0 ? 0 : "-6px"}>
                <RoundIcon src={item.icon} name={item.name} size={16} ring />
              </Box>
            ))}
          </Flex>
        ) : null}
        {picked.length > 0 ? (
          <Text as="span" color="muted">
            {selected.size}
          </Text>
        ) : (
          label
        )}
        <Text as="span" color="muted">
          ▾
        </Text>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            bg="surface"
            borderWidth="1px"
            borderColor="line"
            rounded="card"
            boxShadow="none"
            w="260px"
            p="2"
          >
            <Input
              aria-label={`Filter ${label}`}
              placeholder="Search"
              value={filter}
              onChange={(event) => {
                setFilter(event.currentTarget.value);
              }}
              h="32px"
              mb="2"
              rounded="pill"
              borderColor="line"
              fontSize="13px"
            />
            <Box maxH="280px" overflowY="auto">
              {shown.length === 0 ? (
                <Text color="muted" fontSize="13px" px="2" py="2">
                  Nothing matches
                </Text>
              ) : (
                shown.map((item) => (
                  <Checkbox.Root
                    key={item.id}
                    checked={selected.has(item.id)}
                    onCheckedChange={() => {
                      onToggle(item.id);
                    }}
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap="2"
                    py="1.5"
                    px="1"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control cursor="pointer" />
                    <RoundIcon src={item.icon} name={item.name} size={16} />
                    <Checkbox.Label fontSize="13px">{item.name}</Checkbox.Label>
                  </Checkbox.Root>
                ))
              )}
            </Box>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function tvlText(value: number) {
  return TVL_PRESETS.find((preset) => preset.value === value)?.label ?? formatTvl(value);
}

function single<T>(values: readonly T[] | undefined): T | undefined {
  return values?.length === 1 ? values[0] : undefined;
}

export function FilterBar({
  query,
  options,
  onChange,
  onReset,
}: {
  query: OpportunitiesQuery;
  options: Filters;
  onChange: (patch: Patch) => void;
  onReset: () => void;
}) {
  const actionValue = query.action === undefined ? "ALL" : (single(query.action) ?? "");
  const statusValue = query.status.length === 1 ? (query.status[0] ?? "") : "";
  const dirty = serializeOpportunitiesQuery(query) !== "";

  const toggle = (current: readonly (string | number)[] | undefined, id: string) => {
    const next = new Set((current ?? []).map(String));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return [...next];
  };

  return (
    <Box position="sticky" top="0" zIndex="10" bg="canvas" py="3">
      <Flex wrap="wrap" gap="2" align="center">
        <Flex
          align="center"
          h="34px"
          px="3"
          gap="2"
          bg="surface"
          borderWidth="1px"
          borderColor="line"
          rounded="pill"
          color="muted"
          flex="1"
          maxW="280px"
          minW="200px"
        >
          <SearchIcon />
          <Input
            aria-label="Search"
            placeholder="Search token, protocol"
            value={query.search ?? ""}
            onChange={(event) => {
              onChange({ search: event.currentTarget.value });
            }}
            unstyled
            flex="1"
            h="full"
            color="ink"
            fontSize="13px"
            outline="none"
            _focus={{ outline: "none" }}
            _focusVisible={{ outline: "none" }}
            _placeholder={{ color: "muted" }}
          />
        </Flex>
        <MultiSelect
          label="Chains"
          items={options.chains.map((chain) => ({
            id: String(chain.id),
            name: chain.name,
            icon: chain.icon,
          }))}
          selected={new Set((query.chain ?? []).map(String))}
          onToggle={(id) => {
            const chain = toggle(query.chain, id)
              .map(Number)
              .sort((a, b) => a - b);
            onChange({ chain: chain.length > 0 ? chain : undefined });
          }}
        />
        <MultiSelect
          label="Protocol"
          items={options.protocols.map((protocol) => ({
            id: protocol.id.toLowerCase(),
            name: protocol.name,
            icon: protocol.icon,
          }))}
          selected={new Set(query.protocol ?? [])}
          onToggle={(id) => {
            const protocol = toggle(query.protocol, id).sort();
            onChange({ protocol: protocol.length > 0 ? protocol : undefined });
          }}
        />
        <Segmented
          label="Action"
          value={actionValue}
          options={ACTIONS}
          onValue={(value) => {
            onChange({
              action:
                value === "LEND" || value === "BORROW" || value === "POOL" || value === "HOLD"
                  ? [value]
                  : undefined,
            });
          }}
        />
        <Segmented
          label="Status"
          value={statusValue}
          options={STATUSES}
          onValue={(value) => {
            if (value === "LIVE" || value === "SOON" || value === "PAST") {
              onChange({ status: [value] });
            }
          }}
        />
        <Popover.Root lazyMount unmountOnExit positioning={{ placement: "bottom-start" }}>
          <Popover.Trigger {...chip} aria-label="Minimum TVL">
            {query.minTvl === undefined ? "TVL" : `TVL ≥ ${tvlText(query.minTvl)}`}
            <Text as="span" color="muted">
              ▾
            </Text>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content
                bg="surface"
                borderWidth="1px"
                borderColor="line"
                rounded="card"
                boxShadow="none"
                p="3"
                w="220px"
              >
                <Text color="muted" fontSize="12.5px" mb="2">
                  Minimum TVL
                </Text>
                <Flex wrap="wrap" gap="2">
                  {TVL_PRESETS.map((preset) => {
                    const active = query.minTvl === preset.value;
                    return (
                      <Button
                        key={preset.value}
                        unstyled
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          onChange({ minTvl: active ? undefined : preset.value });
                        }}
                        h="28px"
                        px="3"
                        rounded="pill"
                        borderWidth="1px"
                        borderColor={active ? "accent" : "line"}
                        bg={active ? "accentSoft" : "surface"}
                        color={active ? "accent" : "ink"}
                        fontSize="13px"
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </Flex>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        {dirty ? (
          <Button
            unstyled
            type="button"
            onClick={onReset}
            flexShrink={0}
            color="ink"
            fontSize="13px"
            textDecoration="underline"
            textUnderlineOffset="3px"
          >
            Reset
          </Button>
        ) : null}
      </Flex>
    </Box>
  );
}
