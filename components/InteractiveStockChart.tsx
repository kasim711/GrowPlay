import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';

export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

interface ChartPoint {
  time: number;
  price: number;
  timeLabel: string;
}

interface Props {
  symbol: string;
  currentPrice: number;
  isPositive: boolean;
  onHoverPrice?: (price: number | null, timeStr: string | null) => void;
}

const TIMEFRAMES: { key: Timeframe; label: string; range: string; interval: string }[] = [
  { key: '1D', label: '1D', range: '1d', interval: '5m' },
  { key: '1W', label: '1W', range: '5d', interval: '15m' },
  { key: '1M', label: '1M', range: '1mo', interval: '1d' },
  { key: '1Y', label: '1Y', range: '1y', interval: '1wk' },
  { key: 'ALL', label: 'ALL', range: '5y', interval: '1mo' },
];

export default function InteractiveStockChart({
  symbol,
  currentPrice,
  isPositive,
  onHoverPrice,
}: Props) {
  const [activeTf, setActiveTf] = useState<Timeframe>('1D');
  const [dataPoints, setDataPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(330);
  const chartHeight = 180;
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchHistoricalData(activeTf);
  }, [symbol, activeTf]);

  const fetchHistoricalData = async (tf: Timeframe) => {
    setLoading(true);
    setScrubIndex(null);
    if (onHoverPrice) onHoverPrice(null, null);

    const config = TIMEFRAMES.find((t) => t.key === tf) || TIMEFRAMES[0];
    const ticker = symbol.startsWith('%5E') || symbol.startsWith('^') ? symbol : `${symbol}.NS`;

    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${config.range}&interval=${config.interval}`
      );
      const data = await res.json();
      const result = data?.chart?.result?.[0];

      if (result && result.timestamp && result.indicators?.quote?.[0]?.close) {
        const timestamps: number[] = result.timestamp;
        const closes: (number | null)[] = result.indicators.quote[0].close;

        const points: ChartPoint[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const price = closes[i];
          if (price !== null && price !== undefined && !isNaN(price) && price > 0) {
            const date = new Date(timestamps[i] * 1000);
            let timeLabel = '';
            if (tf === '1D') {
              timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } else if (tf === '1W' || tf === '1M') {
              timeLabel = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            } else {
              timeLabel = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
            }

            points.push({
              time: timestamps[i],
              price,
              timeLabel,
            });
          }
        }

        if (points.length >= 2) {
          setDataPoints(points);
          setLoading(false);
          return;
        }
      }
      generateFallbackPoints(tf, currentPrice);
    } catch (err) {
      console.log('Chart fetch error, generating fallback:', err);
      generateFallbackPoints(tf, currentPrice);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackPoints = (tf: Timeframe, basePrice: number) => {
    const price = basePrice > 0 ? basePrice : 1500;
    const count = tf === '1D' ? 40 : tf === '1W' ? 35 : tf === '1M' ? 30 : 25;
    const volatility = price * 0.015;
    const points: ChartPoint[] = [];
    let current = price * 0.985;

    const now = Date.now();
    const intervalMs =
      tf === '1D'
        ? 5 * 60 * 1000
        : tf === '1W'
        ? 2 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
      const step = (Math.random() - 0.48) * volatility;
      current = Math.max(price * 0.9, current + step);
      const time = now - (count - i) * intervalMs;
      const date = new Date(time);
      const timeLabel =
        tf === '1D'
          ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      points.push({
        time,
        price: i === count - 1 ? price : current,
        timeLabel,
      });
    }
    setDataPoints(points);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 50) {
      setChartWidth(w);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setScrubIndex(null);
        if (onHoverPrice) onHoverPrice(null, null);
      },
      onPanResponderTerminate: () => {
        setScrubIndex(null);
        if (onHoverPrice) onHoverPrice(null, null);
      },
    })
  ).current;

  const handleTouch = (touchX: number) => {
    if (!dataPoints.length || chartWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(touchX, chartWidth));
    const index = Math.round((clampedX / chartWidth) * (dataPoints.length - 1));
    const safeIndex = Math.max(0, Math.min(index, dataPoints.length - 1));
    setScrubIndex(safeIndex);

    const pt = dataPoints[safeIndex];
    if (onHoverPrice && pt) {
      onHoverPrice(pt.price, pt.timeLabel);
    }
  };

  const prices = dataPoints.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 100;
  const maxPrice = prices.length ? Math.max(...prices) : 200;
  const priceSpan = maxPrice - minPrice || 1;
  const paddingY = 20;
  const usableHeight = chartHeight - paddingY * 2;

  const getX = (idx: number) => {
    if (dataPoints.length <= 1) return 0;
    return (idx / (dataPoints.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceSpan;
    return chartHeight - paddingY - ratio * usableHeight;
  };

  let pathD = '';
  let fillD = '';
  if (dataPoints.length >= 2) {
    const coords = dataPoints.map((p, i) => ({ x: getX(i), y: getY(p.price) }));
    pathD = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    fillD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  }

  const activePoint = scrubIndex !== null ? dataPoints[scrubIndex] : null;
  const activeX = scrubIndex !== null ? getX(scrubIndex) : null;
  const activeY = activePoint ? getY(activePoint.price) : null;

  const chartThemeColor = isPositive ? '#00E05A' : '#FF4444';
  const startColor = isPositive ? 'rgba(0, 224, 90, 0.35)' : 'rgba(255, 68, 68, 0.35)';

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <View style={styles.chartCanvasContainer} {...panResponder.panHandlers}>
        {loading ? (
          <View style={[styles.loadingBox, { height: chartHeight }]}>
            <ActivityIndicator size="small" color="#00E05A" />
            <Text style={styles.loadingTxt}>Fetching real-time market candles...</Text>
          </View>
        ) : (
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="chartGradientFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={startColor} />
                <Stop offset="100%" stopColor="transparent" />
              </LinearGradient>
            </Defs>

            <Line
              x1="0"
              y1={paddingY}
              x2={chartWidth}
              y2={paddingY}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4, 4"
            />
            <Line
              x1="0"
              y1={chartHeight / 2}
              x2={chartWidth}
              y2={chartHeight / 2}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4, 4"
            />
            <Line
              x1="0"
              y1={chartHeight - paddingY}
              x2={chartWidth}
              y2={chartHeight - paddingY}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4, 4"
            />

            <SvgText
              x={chartWidth - 6}
              y={paddingY - 5}
              fill="#888"
              fontSize="10"
              textAnchor="end"
              fontWeight="bold"
            >
              H: ₹{maxPrice.toFixed(2)}
            </SvgText>
            <SvgText
              x={chartWidth - 6}
              y={chartHeight - paddingY + 12}
              fill="#888"
              fontSize="10"
              textAnchor="end"
            >
              L: ₹{minPrice.toFixed(2)}
            </SvgText>

            {fillD ? <Path d={fillD} fill="url(#chartGradientFill)" /> : null}

            {pathD ? (
              <Path
                d={pathD}
                fill="none"
                stroke={chartThemeColor}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ) : null}

            {scrubIndex === null && dataPoints.length > 0 && (
              <>
                <Circle
                  cx={chartWidth - 2}
                  cy={getY(dataPoints[dataPoints.length - 1].price)}
                  r={5}
                  fill={chartThemeColor}
                />
                <Circle
                  cx={chartWidth - 2}
                  cy={getY(dataPoints[dataPoints.length - 1].price)}
                  r={9}
                  fill={chartThemeColor}
                  opacity={0.3}
                />
              </>
            )}

            {activeX !== null && activeY !== null && (
              <>
                <Line
                  x1={activeX}
                  y1={0}
                  x2={activeX}
                  y2={chartHeight}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  strokeDasharray="3, 3"
                  opacity={0.6}
                />
                <Circle cx={activeX} cy={activeY} r={6} fill="#FFFFFF" />
                <Circle cx={activeX} cy={activeY} r={10} fill={chartThemeColor} opacity={0.4} />
              </>
            )}
          </Svg>
        )}

        {activePoint && activeX !== null && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.max(10, Math.min(activeX - 50, chartWidth - 110)),
              },
            ]}
          >
            <Text style={styles.tooltipPrice}>₹{activePoint.price.toFixed(2)}</Text>
            <Text style={styles.tooltipTime}>{activePoint.timeLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.timeframeRow}>
        {TIMEFRAMES.map((tf) => {
          const isActive = activeTf === tf.key;
          return (
            <TouchableOpacity
              key={tf.key}
              style={[styles.tfBtn, isActive && styles.tfBtnActive]}
              onPress={() => setActiveTf(tf.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tfText, isActive && styles.tfTextActive]}>{tf.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  chartCanvasContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    justifyContent: 'center',
  },
  loadingBox: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingTxt: {
    color: '#888',
    fontSize: 12,
  },
  tooltip: {
    position: 'absolute',
    top: 4,
    backgroundColor: '#1E251E',
    borderColor: '#00E05A',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipPrice: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tooltipTime: {
    color: '#00E05A',
    fontSize: 10,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tfBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  tfBtnActive: {
    backgroundColor: 'rgba(0, 224, 90, 0.15)',
    borderWidth: 1,
    borderColor: '#00E05A',
  },
  tfText: {
    color: '#859582',
    fontSize: 12,
    fontWeight: '600',
  },
  tfTextActive: {
    color: '#00E05A',
    fontWeight: 'bold',
  },
});
