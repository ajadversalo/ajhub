import { getRequestUser } from "@/app/auth";

const DEFAULT_OPTIONS_DASHBOARD_URL = "https://options.ajhub.ca";

type CurrencyAmount = { usd: number; cad: number };
type RawCurrencyAmount = Partial<CurrencyAmount> | null | undefined;

type RawAccountSummary = {
  broker?: string;
  net_value?: RawCurrencyAmount;
  option_liabilities?: RawCurrencyAmount;
  remaining_capital?: RawCurrencyAmount;
  deployed_capital?: RawCurrencyAmount;
};

type RawPosition = {
  account?: string | null;
  account_id?: string | null;
  option_leg?: {
    quantity?: number | null;
    avg_price?: number | null;
    net_credit?: number | null;
  } | null;
};

type PositionsPayload = {
  updated_at?: string;
  positions?: RawPosition[];
  account_totals?: Record<string, RawAccountSummary>;
  broker_totals?: Record<string, RawAccountSummary>;
};

const readCurrency = (value: RawCurrencyAmount): CurrencyAmount => ({
  usd: typeof value?.usd === "number" && Number.isFinite(value.usd) ? value.usd : 0,
  cad: typeof value?.cad === "number" && Number.isFinite(value.cad) ? value.cad : 0,
});

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
    const totalCreditUsd = positions.reduce((total, position) => {
      const option = position.option_leg;
      if (!option) return total;
      const credit = option.net_credit ?? option.avg_price ?? 0;
      const contracts = Math.abs(option.quantity ?? 0);
      return total + credit * contracts * 100;
    }, 0);

    return Response.json({
      accountName: account?.broker ?? "Options Portfolio",
      updatedAt: payload.updated_at ?? new Date().toISOString(),
      netValue: readCurrency(account?.net_value),
      remainingCapital: readCurrency(account?.remaining_capital),
      deployedCapital: readCurrency(account?.deployed_capital),
      optionLiabilities: readCurrency(account?.option_liabilities),
      totalCreditUsd: Number(totalCreditUsd.toFixed(2)),
      positionCount: positions.length,
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" },
    });
  } catch (error) {
    console.error("Portfolio summary unavailable", error);
    return Response.json({ error: "Portfolio summary unavailable" }, { status: 502 });
  }
}
