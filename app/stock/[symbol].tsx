import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { placeTrade, getProfile, getOrCreateProfile, updateXP } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InteractiveStockChart from '@/components/InteractiveStockChart';

const STOCK_NAMES: Record<string, string> = {
  RELIANCE: 'Reliance Industries Ltd.',
  TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank Ltd.',
  INFY: 'Infosys Ltd.',
  ICICIBANK: 'ICICI Bank Ltd.',
  HINDUNILVR: 'Hindustan Unilever Ltd.',
  SBIN: 'State Bank of India',
  BHARTIARTL: 'Bharti Airtel Ltd.',
  KOTAKBANK: 'Kotak Mahindra Bank',
  LT: 'Larsen & Toubro Ltd.',
  WIPRO: 'Wipro Ltd.',
  AXISBANK: 'Axis Bank Ltd.',
  MARUTI: 'Maruti Suzuki India',
  TATAPOWER: 'Tata Power Company Ltd.',
  SUNPHARMA: 'Sun Pharmaceutical',
  ULTRACEMCO: 'UltraTech Cement Ltd.',
  TITAN: 'Titan Company Ltd.',
  BAJFINANCE: 'Bajaj Finance Ltd.',
  NESTLEIND: 'Nestle India Ltd.',
  JIOFIN: 'Jio Financial Services Ltd.',
  IRCTC: 'Indian Railway Catering',
  HAL: 'Hindustan Aeronautics',
  ADANIENT: 'Adani Enterprises Ltd.',
  ITC: 'ITC Ltd.',
};

const STOCK_ABOUT: Record<string, string> = {
  RELIANCE: 'Reliance Industries Limited is an Indian multinational conglomerate company. It has diverse businesses including energy, petrochemicals, natural gas, retail, telecommunications and media.',
  TCS: 'Tata Consultancy Services is an Indian multinational information technology company. It is a subsidiary of the Tata Group and operates in 150+ locations across 46 countries.',
  HDFCBANK: 'HDFC Bank Limited is an Indian banking and financial services company. It is one of the largest private sector banks in India by assets.',
  INFY: 'Infosys Limited is an Indian multinational IT company that provides business consulting, information technology and outsourcing services.',
  SBIN: 'State Bank of India is an Indian multinational public sector bank and financial services statutory body. It is the largest bank in India.',
  JIOFIN: 'Jio Financial Services Limited is a leading Indian non-banking financial company offering digital payments, insurance, asset management, and consumer lending solutions.',
};

export default function StockDetail() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [balance, setBalance] = useState(1000000);
  const [userId, setUserId] = useState<string | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetchStockData();
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
      let profile = await getProfile(data.user.id);
      if (!profile) {
        profile = await getOrCreateProfile(data.user.id, data.user.email || '');
      }
      if (profile) setBalance(profile.virtual_balance);
    }
  };

  const fetchStockData = async () => {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`
      );
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta) { setStockData(null); setLoading(false); return; }

      const price = meta?.regularMarketPrice ?? 0;
      const prevClose = meta?.previousClose ?? meta?.chartPreviousClose ?? price;
      const change = price - prevClose;
      const changePercent = ((change / prevClose) * 100).toFixed(2);

      setStockData({
        price,
        change: change.toFixed(2),
        changePercent,
        isPositive: change >= 0,
        high: meta?.regularMarketDayHigh?.toFixed(2) ?? '--',
        low: meta?.regularMarketDayLow?.toFixed(2) ?? '--',
        open: (meta?.regularMarketOpen ?? meta?.chartPreviousClose ?? prevClose).toFixed(2),
        prevClose: prevClose.toFixed(2),
        marketCap: meta?.marketCap,
        shortName: meta?.shortName ?? STOCK_NAMES[symbol as string] ?? symbol,
      });
      if (!limitPrice) setLimitPrice(price.toFixed(2));
    } catch (e) {
      console.log('Error:', e);
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatMarketCap = (cap: number) => {
    if (!cap) return '--';
    if (cap >= 1e12) return `₹${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `₹${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e7) return `₹${(cap / 1e7).toFixed(2)}Cr`;
    return `₹${cap.toLocaleString('en-IN')}`;
  };

  const qty = parseInt(quantity || '0');
  const executionPrice = orderType === 'LIMIT' && parseFloat(limitPrice) > 0 ? parseFloat(limitPrice) : (stockData?.price ?? 0);
  const totalCost = executionPrice * qty;

  const handleTrade = async (mode: 'BUY' | 'SELL') => {
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }
    if (!userId) {
      Alert.alert(
        'Login Required to Trade 📈',
        'You are browsing as Guest. Sign up or login to receive ₹10,00,000 virtual balance and place real-time paper trades!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login / Sign Up 🚀', onPress: () => router.push('/auth' as any) }
        ]
      );
      return;
    }
    if (mode === 'BUY' && totalCost > balance) {
      Alert.alert('Insufficient Balance', `You need ₹${totalCost.toLocaleString('en-IN')} but have ₹${balance.toLocaleString('en-IN')}`);
      return;
    }

    setTradeLoading(true);
    const result = await placeTrade(userId, symbol as string, mode, qty, executionPrice);
    setTradeLoading(false);

    if (result?.error) {
      Alert.alert('Trade Failed', result.error);
      return;
    }

    if (mode === 'BUY') setBalance(b => b - totalCost);
    else setBalance(b => b + totalCost);

    // Award 25 XP for successful trade execution
    try {
      const savedXP = await AsyncStorage.getItem('total_xp');
      const currentXP = savedXP ? Math.max(0, parseInt(savedXP) || 0) : 0;
      await AsyncStorage.setItem('total_xp', (currentXP + 25).toString());
      if (userId) {
        await updateXP(userId, 25);
      }
    } catch (e) {
      console.log('Trade XP update error:', e);
    }

    setTradeSuccess({
      mode,
      qty,
      price: executionPrice,
      total: totalCost,
      orderType,
      xp: 25,
    });
  };

  const isPositive = stockData?.isPositive ?? true;
  const priceColor = isPositive ? '#00C853' : '#ff4444';

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSymbol} numberOfLines={1}>{symbol}</Text>
          <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
            {STOCK_NAMES[symbol as string] ?? stockData?.shortName ?? symbol}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="star-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Guest Mode Notice */}
      {!userId && (
        <TouchableOpacity
          style={styles.guestBar}
          onPress={() => router.push('/auth' as any)}
        >
          <Ionicons name="information-circle-outline" size={16} color="#00C853" />
          <Text style={styles.guestBarText} numberOfLines={1} ellipsizeMode="tail">Guest Mode: Real quotes only. Login to trade with ₹10L!</Text>
          <Text style={styles.guestBarBtn}>Login →</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00C853" />
            <Text style={styles.loadingText}>Loading stock details...</Text>
          </View>
        ) : stockData ? (
          <>
            {/* Price Section */}
            <View style={styles.priceSection}>
              <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
                ₹{(hoverPrice !== null ? hoverPrice : stockData.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
              {hoverTime ? (
                <View style={styles.hoverTimeRow}>
                  <Ionicons name="time-outline" size={14} color="#00E05A" />
                  <Text style={styles.hoverTimeText}>At {hoverTime}</Text>
                </View>
              ) : (
                <View style={styles.priceChangeRow}>
                  <View style={[styles.changeBadge, { backgroundColor: priceColor + '20' }]}>
                    <Ionicons
                      name={isPositive ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color={priceColor}
                    />
                    <Text style={[styles.changeText, { color: priceColor }]}>
                      {isPositive ? '+' : ''}{stockData.change} ({isPositive ? '+' : ''}{stockData.changePercent}%)
                    </Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Interactive Real Stock Chart */}
            <View style={styles.chartContainer}>
              <InteractiveStockChart
                symbol={symbol as string}
                currentPrice={stockData.price}
                isPositive={isPositive}
                onHoverPrice={(p, t) => {
                  setHoverPrice(p);
                  setHoverTime(t);
                }}
              />
            </View>

            {/* Market Stats */}
            <Text style={styles.sectionTitle}>Market Stats</Text>
            <View style={styles.statsGrid}>
              {[
                { label: 'Open', value: `₹${stockData.open}` },
                { label: 'High', value: `₹${stockData.high}` },
                { label: 'Low', value: `₹${stockData.low}` },
                { label: 'Market Cap', value: formatMarketCap(stockData.marketCap) },
                { label: 'P/E Ratio', value: '--' },
                { label: 'Prev Close', value: `₹${stockData.prevClose}` },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
                </View>
              ))}
            </View>

            {/* Analysis & About */}
            <Text style={styles.sectionTitle}>Analysis & About</Text>

            {/* Analyst Sentiment */}
            <View style={styles.sentimentCard}>
              <View style={styles.sentimentHeader}>
                <Text style={styles.sentimentLabel}>Analyst Sentiment</Text>
                <Text style={[styles.sentimentValue, { color: isPositive ? '#00C853' : '#ff4444' }]}>
                  {isPositive ? '72% Buy' : '45% Buy'}
                </Text>
              </View>
              <View style={styles.sentimentBar}>
                <View style={[styles.sentimentBuy, { flex: isPositive ? 72 : 45 }]} />
                <View style={[styles.sentimentHold, { flex: isPositive ? 18 : 30 }]} />
                <View style={[styles.sentimentSell, { flex: isPositive ? 10 : 25 }]} />
              </View>
              <View style={styles.sentimentLabels}>
                <Text style={styles.sentimentBuyLabel}>BUY</Text>
                <Text style={styles.sentimentHoldLabel}>HOLD</Text>
                <Text style={styles.sentimentSellLabel}>SELL</Text>
              </View>
            </View>

            {/* About */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText} numberOfLines={4}>
                {STOCK_ABOUT[symbol as string] ??
                  `${STOCK_NAMES[symbol as string] ?? symbol} is a publicly listed company on the National Stock Exchange of India (NSE). It is part of the Nifty 50 index and is one of the leading companies in its sector.`}
              </Text>
              <TouchableOpacity>
                <Text style={styles.readMore}>Read more</Text>
              </TouchableOpacity>
            </View>

            {/* Balance */}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>💰 Virtual Cash</Text>
              <Text style={styles.balanceValue}>₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>

            {/* Order Type Selector */}
            <View style={styles.orderTypeCard}>
              <Text style={styles.inputSectionTitle}>Order Type</Text>
              <View style={styles.orderTypeRow}>
                <TouchableOpacity
                  style={[styles.orderTypeBtn, orderType === 'MARKET' && styles.orderTypeBtnActive]}
                  onPress={() => setOrderType('MARKET')}
                >
                  <Text style={[styles.orderTypeBtnText, orderType === 'MARKET' && styles.orderTypeBtnTextActive]}>Market Order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderTypeBtn, orderType === 'LIMIT' && styles.orderTypeBtnActive]}
                  onPress={() => setOrderType('LIMIT')}
                >
                  <Text style={[styles.orderTypeBtnText, orderType === 'LIMIT' && styles.orderTypeBtnTextActive]}>Limit Order</Text>
                </TouchableOpacity>
              </View>

              {orderType === 'LIMIT' && (
                <View style={styles.limitPriceRow}>
                  <Text style={styles.limitLabel}>Limit Price (₹)</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={limitPrice}
                    onChangeText={setLimitPrice}
                    keyboardType="numeric"
                    placeholder="Enter limit price"
                    placeholderTextColor="#555"
                  />
                </View>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Quantity (Shares)</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(q => Math.max(1, parseInt(q || '1') - 1).toString())}
                >
                  <Ionicons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(q => (parseInt(q || '0') + 1).toString())}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Quantity Chips */}
            <View style={styles.chipsRow}>
              {['1', '5', '10', '25', '50', '100'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chipBtn, quantity === chip && styles.chipBtnActive]}
                  onPress={() => setQuantity(chip)}
                >
                  <Text style={[styles.chipText, quantity === chip && styles.chipTextActive]}>+{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Advanced Risk Controls */}
            <View style={styles.riskCard}>
              <View style={styles.riskRow}>
                <TouchableOpacity
                  style={styles.riskCheck}
                  onPress={() => setStopLossEnabled(!stopLossEnabled)}
                >
                  <Ionicons
                    name={stopLossEnabled ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={stopLossEnabled ? '#00E05A' : '#888'}
                  />
                  <Text style={styles.riskLabel}>Stop Loss Trigger</Text>
                </TouchableOpacity>
                {stopLossEnabled && (
                  <TextInput
                    style={styles.riskInput}
                    value={stopLossPrice}
                    onChangeText={setStopLossPrice}
                    placeholder={`₹${((stockData?.price ?? 100) * 0.95).toFixed(1)}`}
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                )}
              </View>

              <View style={[styles.riskRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={styles.riskCheck}
                  onPress={() => setTargetEnabled(!targetEnabled)}
                >
                  <Ionicons
                    name={targetEnabled ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={targetEnabled ? '#00E05A' : '#888'}
                  />
                  <Text style={styles.riskLabel}>Take Profit Target</Text>
                </TouchableOpacity>
                {targetEnabled && (
                  <TextInput
                    style={styles.riskInput}
                    value={targetPrice}
                    onChangeText={setTargetPrice}
                    placeholder={`₹${((stockData?.price ?? 100) * 1.08).toFixed(1)}`}
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                )}
              </View>
            </View>

            {/* Total Estimated Cost */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Estimated Amount</Text>
                <Text style={styles.totalSub}>Brokerage: ₹0 (Paper Trading)</Text>
              </View>
              <Text style={styles.totalValue}>₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
            </View>

            <View style={{ height: 110 }} />
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={{ color: '#888', fontSize: 16 }}>Failed to load data</Text>
            <TouchableOpacity onPress={fetchStockData} style={{ marginTop: 12 }}>
              <Text style={{ color: '#00C853' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      {stockData && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.sellBtn}
            onPress={() => handleTrade('SELL')}
            disabled={tradeLoading}
          >
            {tradeLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sellBtnText} numberOfLines={1} adjustsFontSizeToFit>Sell</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => handleTrade('BUY')}
            disabled={tradeLoading}
          >
            {tradeLoading
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.buyBtnText} numberOfLines={1} adjustsFontSizeToFit>Buy {symbol}</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Gamified Trade Success Modal */}
      <Modal visible={!!tradeSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#00E05A" />
            </View>

            <Text style={styles.modalTitle}>Order Executed!</Text>
            <Text style={styles.modalSub}>
              Successfully {tradeSuccess?.mode === 'BUY' ? 'bought' : 'sold'} {tradeSuccess?.qty} shares of {symbol} at ₹{tradeSuccess?.price?.toLocaleString('en-IN')}
            </Text>

            <View style={styles.xpRewardBox}>
              <Ionicons name="flash" size={20} color="#FFD700" />
              <Text style={styles.xpRewardText}>+{tradeSuccess?.xp} XP Earned!</Text>
            </View>

            <View style={styles.modalDetailsBox}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Order Type</Text>
                <Text style={styles.modalDetailVal}>{tradeSuccess?.orderType}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Total Amount</Text>
                <Text style={styles.modalDetailVal}>₹{tradeSuccess?.total?.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Remaining Cash</Text>
                <Text style={styles.modalDetailVal}>₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setTradeSuccess(null);
                router.back();
              }}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
  },
  headerSymbol: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerName: {
    color: '#888',
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  loadingText: {
    color: '#888',
  },
  priceSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  price: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00C85320',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00C85350',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C853',
  },
  liveText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    flex: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sentimentCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  sentimentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sentimentLabel: {
    color: '#888',
    fontSize: 14,
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sentimentBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sentimentBuy: {
    backgroundColor: '#00C853',
  },
  sentimentHold: {
    backgroundColor: '#888',
  },
  sentimentSell: {
    backgroundColor: '#ff4444',
  },
  sentimentLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sentimentBuyLabel: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: '600',
  },
  sentimentHoldLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  sentimentSellLabel: {
    color: '#ff4444',
    fontSize: 11,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  aboutText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 22,
  },
  readMore: {
    color: '#00C853',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  quantityLabel: {
    color: '#888',
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  qtyInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    width: 50,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  totalLabel: {
    color: '#888',
    fontSize: 14,
  },
  totalValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  sellBtn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sellBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buyBtn: {
    flex: 2,
    minWidth: 0,
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  hoverTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hoverTimeText: {
    color: '#00E05A',
    fontSize: 13,
    fontWeight: '600',
  },
  inputSectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  orderTypeCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  orderTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  orderTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  orderTypeBtnActive: {
    backgroundColor: 'rgba(0, 224, 90, 0.15)',
    borderWidth: 1,
    borderColor: '#00E05A',
  },
  orderTypeBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  orderTypeBtnTextActive: {
    color: '#00E05A',
    fontWeight: 'bold',
  },
  limitPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  limitLabel: {
    color: '#888',
    fontSize: 13,
  },
  limitInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#333',
    width: 130,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chipBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  chipBtnActive: {
    borderColor: '#00E05A',
    backgroundColor: 'rgba(0, 224, 90, 0.12)',
  },
  chipText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#00E05A',
  },
  riskCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  riskInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
    width: 100,
    textAlign: 'right',
  },
  totalSub: {
    color: '#00E05A',
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#141A14',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 90, 0.3)',
    shadowColor: '#00E05A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalSuccessIcon: {
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalSub: {
    color: '#859582',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  xpRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  xpRewardText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalDetailLabel: {
    color: '#888',
    fontSize: 12,
  },
  modalDetailVal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalDoneBtn: {
    width: '100%',
    backgroundColor: '#00E05A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00E05A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalDoneBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  guestBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C85315',
    borderWidth: 1,
    borderColor: '#00C85335',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    gap: 6,
  },
  guestBarText: {
    flex: 1,
    color: '#00C853',
    fontSize: 11,
    fontWeight: '500',
  },
  guestBarBtn: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
  },
});