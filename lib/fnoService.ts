// Futures & Options (F&O) calculation and pricing engine for GrowPlay

export interface FnoUnderlying {
  symbol: string;
  name: string;
  ticker: string; // Yahoo Finance ticker
  lotSize: number;
  strikeStep: number;
}

export const UNDERLYINGS: FnoUnderlying[] = [
  { symbol: 'NIFTY', name: 'NIFTY 50', ticker: '%5ENSEI', lotSize: 25, strikeStep: 50 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', ticker: '%5ENSEBANK', lotSize: 15, strikeStep: 100 },
  { symbol: 'FINNIFTY', name: 'FIN NIFTY', ticker: 'NIFTY_FIN_SERVICE.NS', lotSize: 25, strikeStep: 50 },
];

export interface OptionContract {
  strike: number;
  isAtm: boolean;
  call: {
    symbol: string;
    ltp: number;
    changePercent: number;
    isPositive: boolean;
    oi: number;
    iv: number;
    delta: number;
    theta: number;
    isItm: boolean;
  };
  put: {
    symbol: string;
    ltp: number;
    changePercent: number;
    isPositive: boolean;
    oi: number;
    iv: number;
    delta: number;
    theta: number;
    isItm: boolean;
  };
}

export interface FutureContract {
  symbol: string;
  name: string;
  expiry: string;
  ltp: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  spotPrice: number;
  premium: number;
  lotSize: number;
  marginRequired: number;
  oi: number;
}

// Normal Cumulative Distribution Function for Black-Scholes
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// Black-Scholes Option Pricing Formula
export function blackScholes(
  spot: number,
  strike: number,
  timeYears: number,
  volatility: number = 0.14,
  rate: number = 0.065
) {
  const T = Math.max(timeYears, 0.001);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (rate + (volatility * volatility) / 2) * T) / (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const n_minus_d1 = normalCdf(-d1);
  const n_minus_d2 = normalCdf(-d2);

  const discount = Math.exp(-rate * T);

  const callPrice = Math.max(0.05, spot * nd1 - strike * discount * nd2);
  const putPrice = Math.max(0.05, strike * discount * n_minus_d2 - spot * n_minus_d1);

  const callDelta = nd1;
  const putDelta = nd1 - 1;
  const thetaCall = -((spot * volatility * Math.exp((-d1 * d1) / 2)) / (2 * sqrtT * Math.sqrt(2 * Math.PI))) / 365;

  return {
    callPrice: Math.round(callPrice * 20) / 20, // 0.05 tick size
    putPrice: Math.round(putPrice * 20) / 20,
    callDelta: parseFloat(callDelta.toFixed(2)),
    putDelta: parseFloat(putDelta.toFixed(2)),
    theta: parseFloat(thetaCall.toFixed(1)),
  };
}

// Get Upcoming Expiry Dates
export function getExpiryDates(): { label: string; dateStr: string; daysLeft: number }[] {
  const expiries = [];
  const now = new Date();

  // Find next Thursday
  let d1 = new Date(now);
  const dayOfWeek = d1.getDay();
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7;
  d1.setDate(d1.getDate() + daysUntilThursday);

  const monthShort = d1.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  expiries.push({
    label: `${d1.getDate()} ${monthShort} (Weekly)`,
    dateStr: d1.toISOString().split('T')[0],
    daysLeft: Math.max(1, Math.round((d1.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
  });

  // Next week Thursday
  let d2 = new Date(d1);
  d2.setDate(d2.getDate() + 7);
  const m2Short = d2.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  expiries.push({
    label: `${d2.getDate()} ${m2Short} (Next Wk)`,
    dateStr: d2.toISOString().split('T')[0],
    daysLeft: Math.max(8, Math.round((d2.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
  });

  // Monthly Expiry (Last Thursday of current month)
  let d3 = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
  while (d3.getDay() !== 4) {
    d3.setDate(d3.getDate() - 1);
  }
  if (d3 < now) {
    d3 = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    while (d3.getDay() !== 4) {
      d3.setDate(d3.getDate() - 1);
    }
  }
  const m3Short = d3.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  expiries.push({
    label: `${d3.getDate()} ${m3Short} (Monthly)`,
    dateStr: d3.toISOString().split('T')[0],
    daysLeft: Math.max(14, Math.round((d3.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
  });

  return expiries;
}

// Fetch live spot price for underlying
export async function fetchSpotPrice(underlying: FnoUnderlying): Promise<{ price: number; change: number; changePercent: number }> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${underlying.ticker}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      return {
        price,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      };
    }
  } catch (e) {
    console.log('Spot price fetch error:', e);
  }

  // Fallback realistic defaults
  if (underlying.symbol === 'NIFTY') return { price: 23398.1, change: 105.4, changePercent: 0.45 };
  if (underlying.symbol === 'BANKNIFTY') return { price: 50120.4, change: -102.3, changePercent: -0.2 };
  return { price: 24110.5, change: 76.8, changePercent: 0.32 };
}

// Build Option Chain
export function generateOptionChain(
  underlying: FnoUnderlying,
  spotPrice: number,
  daysLeft: number
): OptionContract[] {
  const step = underlying.strikeStep;
  const atmStrike = Math.round(spotPrice / step) * step;
  const numStrikes = 6; // 6 strikes above and 6 below

  const contracts: OptionContract[] = [];
  const timeYears = Math.max(daysLeft, 1) / 365;

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const strike = atmStrike + i * step;
    const isAtm = strike === atmStrike;
    const isItmCall = strike < spotPrice;
    const isItmPut = strike > spotPrice;

    // IV slightly higher for OTM Puts (volatility skew)
    const iv = 0.13 + Math.abs(strike - spotPrice) / spotPrice * 0.08;
    const { callPrice, putPrice, callDelta, putDelta, theta } = blackScholes(spotPrice, strike, timeYears, iv);

    const strikeDiff = Math.abs(strike - atmStrike) / step;
    const baseOi = Math.max(12000, Math.round(85000 - strikeDiff * 9000 + (Math.random() * 5000)));

    // Simulated daily change %
    const callChange = isItmCall ? 8.5 + (Math.random() * 6) : -4.2 + (Math.random() * 12);
    const putChange = isItmPut ? 6.2 + (Math.random() * 5) : -6.5 + (Math.random() * 8);

    contracts.push({
      strike,
      isAtm,
      call: {
        symbol: `${underlying.symbol} ${strike} CE`,
        ltp: callPrice,
        changePercent: parseFloat(callChange.toFixed(2)),
        isPositive: callChange >= 0,
        oi: baseOi,
        iv: Math.round(iv * 100),
        delta: callDelta,
        theta,
        isItm: isItmCall,
      },
      put: {
        symbol: `${underlying.symbol} ${strike} PE`,
        ltp: putPrice,
        changePercent: parseFloat(putChange.toFixed(2)),
        isPositive: putChange >= 0,
        oi: Math.round(baseOi * (isItmPut ? 1.15 : 0.9)),
        iv: Math.round((iv + 0.01) * 100),
        delta: putDelta,
        theta,
        isItm: isItmPut,
      },
    });
  }

  return contracts;
}

// Generate Index Futures
export function generateFutures(
  underlying: FnoUnderlying,
  spotPrice: number,
  spotChange: number,
  spotChangePercent: number
): FutureContract {
  const basisPremium = underlying.symbol === 'BANKNIFTY' ? 140 : 55;
  const futurePrice = spotPrice + basisPremium;
  const change = spotChange * 1.02;
  const changePercent = spotChangePercent;

  return {
    symbol: `${underlying.symbol} MAR FUT`,
    name: `${underlying.name} Future (Current Month)`,
    expiry: '28 MAR 2026',
    ltp: parseFloat(futurePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    isPositive: change >= 0,
    spotPrice,
    premium: basisPremium,
    lotSize: underlying.lotSize,
    marginRequired: Math.round(futurePrice * underlying.lotSize * 0.12), // approx 12% margin
    oi: 185420,
  };
}
