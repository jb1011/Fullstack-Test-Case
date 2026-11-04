import { Button, Field, Input, NativeSelect, Stack } from "@chakra-ui/react";
import { serializeOpportunitiesQuery, type Filters, type OpportunitiesQuery } from "@merkl/shared";

interface Option {
  value: string;
  label: string;
}
type Change = Partial<Record<keyof OpportunitiesQuery, unknown>>;

const withCurrent = (options: Option[], value: string) =>
  options.some((option) => option.value === value)
    ? options
    : [...options, { value, label: value }];

const readNumber = (value: string) => {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

function Choice({
  label,
  value,
  options,
  onValue,
}: {
  label: string;
  value: string;
  options: Option[];
  onValue: (value: string) => void;
}) {
  return (
    <Field.Root width="40">
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Field
          value={value}
          onChange={(event) => {
            onValue(event.currentTarget.value);
          }}
        >
          {withCurrent(options, value).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  );
}

function NumberField({
  label,
  value,
  onValue,
}: {
  label: string;
  value: number | undefined;
  onValue: (value: number | undefined) => void;
}) {
  return (
    <Field.Root width="32">
      <Field.Label>{label}</Field.Label>
      <Input
        type="number"
        min={0}
        inputMode="decimal"
        value={value ?? ""}
        onChange={(event) => {
          const next = readNumber(event.currentTarget.value);
          if (event.currentTarget.value === "" || next !== undefined) onValue(next);
        }}
      />
    </Field.Root>
  );
}

export function OpportunityFilters({
  query,
  options,
  onChange,
  onReset,
}: {
  query: OpportunitiesQuery;
  options: Filters | undefined;
  onChange: (patch: Change) => void;
  onReset: () => void;
}) {
  const chains = [
    { value: "", label: "Any" },
    ...(options?.chains.map((chain) => ({ value: String(chain.id), label: chain.name })) ?? []),
  ];
  const protocols = [
    { value: "", label: "Any" },
    ...(options?.protocols.map((protocol) => ({ value: protocol.id, label: protocol.name })) ?? []),
  ];
  const actions = [
    { value: "", label: "Any" },
    ...(options?.actions.map((action) => ({ value: action, label: action })) ?? []),
  ];

  return (
    <Stack direction="row" gap="3" flexWrap="wrap" role="group" aria-label="Filters">
      <Field.Root width="56">
        <Field.Label>Search</Field.Label>
        <Input
          type="search"
          value={query.search ?? ""}
          onChange={(event) => {
            onChange({ search: event.currentTarget.value });
          }}
        />
      </Field.Root>
      <Choice
        label="Chain"
        value={query.chain?.join(",") ?? ""}
        options={chains}
        onValue={(value) => {
          onChange({ chain: value ? value.split(",").map(Number) : undefined });
        }}
      />
      <Choice
        label="Protocol"
        value={query.protocol?.join(",") ?? ""}
        options={protocols}
        onValue={(value) => {
          onChange({ protocol: value ? value.split(",") : undefined });
        }}
      />
      <Choice
        label="Action"
        value={query.action?.join(",") ?? ""}
        options={actions}
        onValue={(value) => {
          onChange({ action: value ? value.split(",") : undefined });
        }}
      />
      <Choice
        label="Status"
        value={query.status.join(",")}
        options={[
          { value: "LIVE", label: "Live" },
          { value: "PAST", label: "Past" },
          { value: "SOON", label: "Soon" },
          { value: "LIVE,PAST,SOON", label: "All" },
        ]}
        onValue={(value) => {
          onChange({ status: value.split(",") });
        }}
      />
      <NumberField
        label="Min TVL"
        value={query.minTvl}
        onValue={(value) => {
          onChange({ minTvl: value });
        }}
      />
      <NumberField
        label="Max TVL"
        value={query.maxTvl}
        onValue={(value) => {
          onChange({ maxTvl: value });
        }}
      />
      <NumberField
        label="Min APR"
        value={query.minApr}
        onValue={(value) => {
          onChange({ minApr: value });
        }}
      />
      <Choice
        label="Sort"
        value={query.sort}
        options={[
          { value: "tvl", label: "TVL" },
          { value: "apr", label: "APR" },
          { value: "rewards", label: "Rewards" },
        ]}
        onValue={(value) => {
          onChange({ sort: value });
        }}
      />
      <Choice
        label="Order"
        value={query.order}
        options={[
          { value: "desc", label: "Descending" },
          { value: "asc", label: "Ascending" },
        ]}
        onValue={(value) => {
          onChange({ order: value });
        }}
      />
      <Button
        alignSelf="flex-end"
        disabled={serializeOpportunitiesQuery(query) === ""}
        onClick={onReset}
      >
        Reset
      </Button>
    </Stack>
  );
}
