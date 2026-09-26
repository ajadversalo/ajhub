import { getRequestUser } from "@/app/auth";

const DEFAULT_OPTIONS_DASHBOARD_URL = "https://options.ajhub.ca";

type RawAccountSummary = {
  broker?: string;
};

type RawPosition = {
  symbol?: string;
  account?: string | null;
  account_id?: string | null;
  strategy?: string;
  current_price?: number | null;
  underlying_entry_price?: number | null;
  option_leg?: {
    option_type?: string | null;
    strike_price?: number | null;
    short_strike_price?: number | null;
    expiration_date?: string | null;
    quantity?: number | null;
    break_even_price?: number | null;
  } | null;
};

type PositionsPayload = {
  updated_at?: string;
  positions?: RawPosition[];
  account_totals?: Record<string, RawAccountSummary>;
  broker_totals?: Record<string, RawAccountSummary>;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function getOptionsAccount(payload: PositionsPayload) {
  const accountTotals = payload.account_totals ?? {};
  const totals = Object.keys(accountTotals).length > 0
    ? accountTotals
    : payload.broker_totals ?? {};
  const entries = Object.entries(totals);
  const match = entries.find(([key, value]) => {
    const normalizedKey = normalize(key);
    const normalizedBroker = normalize(value.broker ?? "");
    return normalizedKey === "options"
      || normalizedKey === "wealthsimpleoptions"
      || normalizedBroker === "options"
      || normalizedBroker === "wealthsimpleoptions";
  });

  return match?.[1] ?? entries[0]?.[1] ?? null;
}

function positionBelongsToOptions(position: RawPosition, account: RawAccountSummary | null) {
  const value = position.account ?? position.account_id;
  if (!value) return true;

  const normalizedValue = normalize(value);
  const normalizedBroker = normalize(account?.broker ?? "");
  return normalizedValue.includes("options")
    || normalizedValue === normalizedBroker
    || normalizedBroker.includes(normalizedValue);
}

export async function GET(request: Request) {
  if (!await getRequestUser(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.OPTIONS_DASHBOARD_URL?.trim() || DEFAULT_OPTIONS_DASHBOARD_URL;

  try {
    const response = await fetch(new URL("/api/positions", baseUrl), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.text();
    let payload: PositionsPayload;
    try {
      payload = body ? JSON.parse(body) as PositionsPayload : {};
    } catch {
      throw new Error("Options dashboard returned invalid JSON");
    }

    if (!response.ok) {
      throw new Error(typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Options dashboard returned HTTP ${response.status}`);
    }

    const account = getOptionsAccount(payload);
    const positions = (payload.positions ?? []).filter((position) => positionBelongsToOptions(position, account));
    const summaryPositions = positions.flatMap((position) => {
      const option = position.option_leg;
      if (!option || !position.symbol || !option.expiration_date) return [];

      const currentPrice = typeof position.current_price === "number" && Number.isFinite(position.current_price)
        ? position.current_price
        : 0;
      const strike = position.strategy === "PUT_CREDIT_SPREAD"
        ? option.short_strike_price ?? option.strike_price ?? 0
        : option.strike_price ?? 0;
      const breakEven = typeof option.break_even_price === "number" && Number.isFinite(option.break_even_price)
        ? Number(option.break_even_price.toFixed(2))
        : null;
      const entryPrice = typeof position.underlying_entry_price === "number" && Number.isFinite(position.underlying_entry_price) && position.underlying_entry_price > 0
        ? position.underlying_entry_price
        : null;
      const trendChangePct = entryPrice && currentPrice > 0
        ? Number((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2))
        : null;

      return [{
        symbol: position.symbol,
        optionType: option.option_type === "CALL" ? "CALL" : "PUT",
        expiration: option.expiration_date,
        currentPrice: Number(currentPrice.toFixed(2)),
        gap: Number((currentPrice - strike).toFixed(2)),
        breakEven,
        trend: trendChangePct === null ? null : trendChangePct > 0 ? "up" : trendChangePct < 0 ? "down" : "flat",
        trendChangePct,
      }];
    }).sort((left, right) => left.symbol.localeCompare(right.symbol));

    return Response.json({
      updatedAt: payload.updated_at ?? new Date().toISOString(),
      positions: summaryPositions,
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" },
    });
  } catch (error) {
    console.error("Portfolio summary unavailable", error);
    return Response.json({ error: "Portfolio summary unavailable" }, { status: 502 });
  }
}
