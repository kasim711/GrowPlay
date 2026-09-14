import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import NavHeader from '@/components/NavHeader';
import { getHoldings, placeTrade, updateXP, getProfile, getOrCreateProfile } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  UNDERLYINGS,
  FnoUnderlying,
  OptionContract,
  FutureContract,
  fetchSpotPrice,
  generateOptionChain,
  generateFutures,
  getExpiryDates,
} from '@/lib/fnoService';

const PortfolioMiniChart = ({ pnl }: { pnl: number }) => {
  const isPositive = pnl >= 0;
  const isZero = pnl === 0;
  const color = isPositive ? '#00C853' : '#ff4444';

  const path = isZero
    ? "M0,30 L300,30"
    : isPositive
    ? "M0,50 C40,48 60,45 90,40 C120,35 140,38 170,30 C200,22 220,25 250,15 C270,8 285,5 300,2"
    : "M0,10 C40,12 60,15 90,20 C120,25 140,22 170,30 C200,38 220,35 250,45 C270,52 285,55 300,58";

  const fillPath = isZero
    ? "M0,30 L300,30 L300,60 L0,60 Z"
    : isPositive
    ? "M0,50 C40,48 60,45 90,40 C120,35 140,38 170,30 C200,22 220,25 250,15 C270,8 285,5 300,2 L300,60 L0,60 Z"
    : "M0,10 C40,12 60,15 90,20 C120,25 140,22 170,30 C200,38 220,35 250,45 C270,52 285,55 300,58 L300,60 L0,60 Z";

  return (
    <View style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden' }}>
      <Svg width="100%" height="60" viewBox="0 0 300 60">
        <Defs>
          <LinearGradient id="portGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d={fillPath} fill="url(#portGrad2)" />
      </Svg>
    </View>
  );
};

const NIFTY_50_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'INFY', name: 'Infosys' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
  { symbol: 'ITC', name: 'ITC Limited' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank' },
  { symbol: 'LT', name: 'Larsen & Toubro' },
  { symbol: 'AXISBANK', name: 'Axis Bank' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical' },
  { symbol: 'WIPRO', name: 'Wipro' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement' },
  { symbol: 'TITAN', name: 'Titan Company' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
  { symbol: 'NESTLEIND', name: 'Nestle India' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp' },
  { symbol: 'NTPC', name: 'NTPC Limited' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel' },
  { symbol: 'TATASTEEL', name: 'Tata Steel' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports' },
  { symbol: 'HCLTECH', name: 'HCL Technologies' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries' },
  { symbol: 'DRREDDY', name: 'Dr Reddys Laboratories' },
  { symbol: 'CIPLA', name: 'Cipla' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals' },
  { symbol: 'DIVISLAB', name: 'Divis Laboratories' },
  { symbol: 'COALINDIA', name: 'Coal India' },
  { symbol: 'BPCL', name: 'Bharat Petroleum' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank' },
  { symbol: 'GRASIM', name: 'Grasim Industries' },
  { symbol: 'TECHM', name: 'Tech Mahindra' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance' },
  { symbol: 'ZOMATO', name: 'Zomato' },
  { symbol: 'IRCTC', name: 'IRCTC' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics' },
  { symbol: 'BEL', name: 'Bharat Electronics' },
  { symbol: 'DMART', name: 'Avenue Supermarts' },
];

const INDICES = [
  { symbol: '%5ENSEI', name: 'NIFTY 50' },
  { symbol: '%5EBSESN', name: 'SENSEX' },
  { symbol: '%5ENSEBANK', name: 'BANKNIFTY' },
  { symbol: 'ES%3DF', name: 'S&P 500' },
];

type StockData = {
  symbol: string;
  name: string;
  price: string;
  changePercent: string;
  isPositive: boolean;
  loading: boolean;
};

type IndexData = {
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
};

export default function Trade() {
  const [stocks, setStocks] = useState<StockData[]>(
    NIFTY_50_STOCKS.map(s => ({
      ...s,
      price: '--',
      changePercent: '--',
      isPositive: true,
      loading: true,
    }))
  );
  const [indices, setIndices] = useState<IndexData[]>([
    { name: 'NIFTY 50', price: '--', change: '--', isPositive: true },
    { name: 'SENSEX', price: '--', change: '--', isPositive: true },
    { name: 'BANKNIFTY', price: '--', change: '--', isPositive: true },
  ]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'markets' | 'fno' | 'portfolio'>('markets');
  const [holdings, setHoldings] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState({ totalValue: 0, totalInvested: 0, pnl: 0, balance: 1000000 });
  const [userId, setUserId] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<StockData | null>(null);
  const [searching, setSearching] = useState(false);
  const [xp, setXp] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  // F&O States
  const expiries = getExpiryDates();
  const [selectedUnderlying, setSelectedUnderlying] = useState<FnoUnderlying>(UNDERLYINGS[0]);
  const [selectedExpiry, setSelectedExpiry] = useState(expiries[0]);
  const [fnoLoading, setFnoLoading] = useState(false);
  const [fnoSpot, setFnoSpot] = useState({ price: 23398.1, change: 105.4, changePercent: 0.45 });
  const [optionChain, setOptionChain] = useState<OptionContract[]>([]);
  const [futureContract, setFutureContract] = useState<FutureContract | null>(null);
  const [fnoTradeModal, setFnoTradeModal] = useState<{
    visible: boolean;
    symbol: string;
    type: 'CALL' | 'PUT' | 'FUT';
    strike?: number;
    price: number;
    lotSize: number;
    lots: number;
    delta?: number;
    theta?: number;
  } | null>(null);
  const [fnoSuccessModal, setFnoSuccessModal] = useState<any>(null);

  useEffect(() => {
    loadFnoData();
  }, [selectedUnderlying, selectedExpiry]);

  const loadFnoData = async () => {
    setFnoLoading(true);
    try {
      const spot = await fetchSpotPrice(selectedUnderlying);
      setFnoSpot(spot);
      const chain = generateOptionChain(selectedUnderlying, spot.price, selectedExpiry.daysLeft);
      setOptionChain(chain);
      const fut = generateFutures(selectedUnderlying, spot.price, spot.change, spot.changePercent);
      setFutureContract(fut);
    } catch (err) {
      console.log('F&O load error:', err);
    } finally {
      setFnoLoading(false);
    }
  };

  const handleFnoTrade = async () => {
    if (!fnoTradeModal) return;
    if (!userId) {
      Alert.alert('Login Required', 'Please login to trade F&O contracts', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth' as any) }
      ]);
      return;
    }
    const totalQty = fnoTradeModal.lots * fnoTradeModal.lotSize;
    const totalCost = fnoTradeModal.type === 'FUT'
      ? Math.round(fnoTradeModal.price * totalQty * 0.12)
      : Math.round(fnoTradeModal.price * totalQty);

    if (totalCost > portfolio.balance) {
      Alert.alert('Insufficient Balance', `You need ₹${totalCost.toLocaleString('en-IN')} but have ₹${portfolio.balance.toLocaleString('en-IN')}`);
      return;
    }

    const res = await placeTrade(userId, fnoTradeModal.symbol, 'BUY', totalQty, fnoTradeModal.price);
    if (res?.error) {
      Alert.alert('Trade Failed', res.error);
      return;
    }

    setPortfolio(p => ({ ...p, balance: p.balance - totalCost }));

    // Award 30 XP for F&O trade execution
    try {
      const savedXP = await AsyncStorage.getItem('total_xp');
      const currentXP = savedXP ? Math.max(0, parseInt(savedXP) || 0) : 0;
      await AsyncStorage.setItem('total_xp', (currentXP + 30).toString());
      if (userId) {
        await updateXP(userId, 30);
      }
    } catch (e) {
      console.log('F&O XP update error:', e);
    }

    setFnoSuccessModal({
      symbol: fnoTradeModal.symbol,
      lots: fnoTradeModal.lots,
      qty: totalQty,
      price: fnoTradeModal.price,
      total: totalCost,
      xp: 30,
    });
    setFnoTradeModal(null);
  };

  useEffect(() => {
    loadUser();
    fetchIndices();
    fetchStocksInBatches();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  useEffect(() => {
    if (activeTab === 'portfolio' && userId) {
      loadPortfolio(userId);
    }
  }, [activeTab]);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
      let p = await getProfile(data.user.id);
      if (!p) {
        p = await getOrCreateProfile(data.user.id, data.user.email || '');
      }
      if (p) {
        setProfile(p);
        const validXP = Math.max(0, p.xp ?? 0);
        setXp(validXP);
        setPortfolio(prev => ({ ...prev, balance: p.virtual_balance ?? 1000000 }));
        await AsyncStorage.setItem('total_xp', validXP.toString());
      }
      await loadPortfolio(data.user.id);
    }
  };

  const fetchIndices = async () => {
    try {
      const symbols = ['%5ENSEI', '%5EBSESN', '%5ENSEBANK'];
      const names = ['NIFTY 50', 'SENSEX', 'BANKNIFTY'];

      const results = await Promise.all(
        symbols.map(s =>
          fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}`).then(r => r.json())
        )
      );

      const updated = results.map((data, i) => {
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice ?? 0;
        const prevClose = meta?.previousClose ?? price;
        const change = price - prevClose;
        const changePct = prevClose > 0 ? ((change / prevClose) * 100).toFixed(2) : '0.00';
        return {
          name: names[i],
          price: price > 0 ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '--',
          change: price > 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct}%)` : '--',
          isPositive: change >= 0,
        };
      });

      setIndices(updated);
    } catch (e) {
      console.log('Indices error:', e);
    }
  };

  const fetchStocksInBatches = async () => {
    const batchSize = 5;
    for (let i = 0; i < NIFTY_50_STOCKS.length; i += batchSize) {
      const batch = NIFTY_50_STOCKS.slice(i, i + batchSize);
      await Promise.all(batch.map(stock => fetchSingleStock(stock.symbol)));
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const fetchSingleStock = async (symbol: string) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return;

      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = ((change / prevClose) * 100).toFixed(2);

      setStocks(prev => prev.map(s =>
        s.symbol === symbol ? {
          ...s,
          price: price.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          changePercent: `${change >= 0 ? '+' : ''}${changePercent}%`,
          isPositive: change >= 0,
          loading: false,
        } : s
      ));
    } catch {
      setStocks(prev => prev.map(s =>
        s.symbol === symbol ? { ...s, loading: false } : s
      ));
    }
  };

  const searchStock = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const symbol = search.toUpperCase().trim();
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) { setSearching(false); return; }
      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = ((change / prevClose) * 100).toFixed(2);
      setSearchResult({
        symbol,
        name: meta.shortName ?? symbol,
        price: price.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
        changePercent: `${change >= 0 ? '+' : ''}${changePercent}%`,
        isPositive: change >= 0,
        loading: false,
      });
    } catch { }
    setSearching(false);
  };

  const loadPortfolio = async (uid: string) => {
    const { data: profileData } = await supabase
      .from('profiles').select('virtual_balance').eq('id', uid).single();
    if (profileData) setPortfolio(p => ({ ...p, balance: profileData.virtual_balance }));

    const h = await getHoldings(uid);
    if (!h.length) { setHoldings([]); return; }

    const holdingsWithPrice = await Promise.all(h.map(async (holding: any) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${holding.symbol}.NS`);
        const data = await res.json();
        const currentPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? holding.avg_buy_price;
        const currentValue = currentPrice * holding.quantity;
        const invested = holding.avg_buy_price * holding.quantity;
        const pnl = currentValue - invested;
        return { ...holding, currentPrice, currentValue, invested, pnl, pnlPercent: ((pnl / invested) * 100).toFixed(2), isPositive: pnl >= 0 };
      } catch {
        return { ...holding, currentPrice: holding.avg_buy_price, currentValue: holding.avg_buy_price * holding.quantity, invested: holding.avg_buy_price * holding.quantity, pnl: 0, pnlPercent: '0.00', isPositive: true };
      }
    }));

    const totalInvested = holdingsWithPrice.reduce((sum, h) => sum + h.invested, 0);
    const totalValue = holdingsWithPrice.reduce((sum, h) => sum + h.currentValue, 0);
    setHoldings(holdingsWithPrice);
    setPortfolio(p => ({ ...p, totalValue, totalInvested, pnl: totalValue - totalInvested }));
  };

  const filtered = stocks.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const trending = stocks.filter(s => !s.loading).slice(0, 5);

  const StockCard = ({ stock }: { stock: StockData }) => (
    <TouchableOpacity
      style={styles.stockCard}
      onPress={() => router.push(`/stock/${stock.symbol}` as any)}
    >
      <View style={styles.stockLeft}>
        <View style={styles.stockIcon}>
          <Text style={styles.stockIconText}>{stock.symbol[0]}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.stockSymbol} numberOfLines={1} ellipsizeMode="tail">{stock.symbol}</Text>
          <Text style={styles.stockName} numberOfLines={1} ellipsizeMode="tail">{stock.name}</Text>
        </View>
      </View>
      <View style={styles.stockRight}>
        {stock.loading ? (
          <ActivityIndicator size="small" color="#00C853" />
        ) : (
          <>
            <Text style={styles.stockPrice} numberOfLines={1}>₹{stock.price}</Text>
            <View style={[styles.changeBadge, { backgroundColor: stock.isPositive ? '#0d2818' : '#2d0a0a' }]}>
              <Text style={[styles.changeText, { color: stock.isPositive ? '#00C853' : '#ff4444' }]} numberOfLines={1}>
                {stock.changePercent}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Top Navbar */}
      <NavHeader />

      <View style={styles.contentWrap}>
        {/* Guest Mode Banner */}
        {!userId && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/auth' as any)}
          >
            <Ionicons name="trending-up" size={16} color="#00C853" />
            <Text style={styles.guestBannerText} numberOfLines={1} ellipsizeMode="tail">Guest Mode: Quotes live. Login to trade with ₹10,00,000!</Text>
            <Ionicons name="chevron-forward" size={14} color="#00C853" />
          </TouchableOpacity>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#555" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks, indices, ETFs..."
            placeholderTextColor="#444"
            value={search}
            onChangeText={text => {
              setSearch(text);
              if (!text) setSearchResult(null);
            }}
            onSubmitEditing={searchStock}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearch(''); setSearchResult(null); }}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          ) : (
            searching
              ? <ActivityIndicator size="small" color="#00C853" />
              : null
          )}
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggle}>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('markets')}>
            <Text style={[styles.tabText, activeTab === 'markets' && styles.tabTextActive]}>Equity</Text>
            {activeTab === 'markets' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('fno')}>
            <Text style={[styles.tabText, activeTab === 'fno' && styles.tabTextActive]}>F&O Options</Text>
            {activeTab === 'fno' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('portfolio')}>
            <Text style={[styles.tabText, activeTab === 'portfolio' && styles.tabTextActive]}>Portfolio</Text>
            {activeTab === 'portfolio' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        {activeTab === 'markets' ? (
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Indices Grid */}
            <View style={styles.indicesGrid}>
              {indices.map((idx, i) => (
                <View key={i} style={styles.indexCard}>
                  <Text style={styles.indexName} numberOfLines={1}>{idx.name}</Text>
                  <Text style={styles.indexPrice} numberOfLines={1} adjustsFontSizeToFit>{idx.price}</Text>
                  <View style={styles.indexChangeRow}>
                    <Ionicons
                      name={idx.isPositive ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={idx.isPositive ? '#00C853' : '#ff4444'}
                    />
                    <Text
                      style={[styles.indexChange, { color: idx.isPositive ? '#00C853' : '#ff4444' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {idx.change}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

          {/* Search Result */}
          {searchResult && (
            <View>
              <Text style={styles.sectionLabel}>Search Result</Text>
              <StockCard stock={searchResult} />
            </View>
          )}

          {/* Trending Stocks */}
          {!search && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trending Stocks</Text>
              </View>
              {trending.map(stock => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </>
          )}

          {/* All Stocks */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {search ? 'Results' : 'All Stocks'}
            </Text>
          </View>
          {filtered.map(stock => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      ) : activeTab === 'fno' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* F&O Underlying Selector Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fnoUnderlyingRow}>
            {UNDERLYINGS.map(u => {
              const isSel = selectedUnderlying.symbol === u.symbol;
              return (
                <TouchableOpacity
                  key={u.symbol}
                  style={[styles.fnoUnderlyingChip, isSel && styles.fnoUnderlyingChipActive]}
                  onPress={() => setSelectedUnderlying(u)}
                >
                  <Text style={[styles.fnoUnderlyingText, isSel && styles.fnoUnderlyingTextActive]}>
                    {u.name}
                  </Text>
                  <Text style={styles.fnoLotTag}>Lot: {u.lotSize}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Spot Price & Market Status */}
          <View style={styles.fnoSpotCard}>
            <View style={styles.fnoSpotTop}>
              <View>
                <Text style={styles.fnoSpotSymbol}>{selectedUnderlying.name} SPOT</Text>
                <Text style={styles.fnoSpotPrice}>₹{fnoSpot.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={[styles.changeBadge, { backgroundColor: fnoSpot.change >= 0 ? '#0d2818' : '#2d0a0a' }]}>
                <Ionicons name={fnoSpot.change >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={fnoSpot.change >= 0 ? '#00C853' : '#ff4444'} />
                <Text style={[styles.changeText, { color: fnoSpot.change >= 0 ? '#00C853' : '#ff4444' }]}>
                  {fnoSpot.change >= 0 ? '+' : ''}{fnoSpot.change} ({fnoSpot.changePercent}%)
                </Text>
              </View>
            </View>

            {/* Expiry Selector */}
            <View style={styles.expiryRow}>
              <Text style={styles.expiryLabel}>Expiry:</Text>
              {expiries.map(exp => {
                const isSel = selectedExpiry.dateStr === exp.dateStr;
                return (
                  <TouchableOpacity
                    key={exp.dateStr}
                    style={[styles.expiryChip, isSel && styles.expiryChipActive]}
                    onPress={() => setSelectedExpiry(exp)}
                  >
                    <Text style={[styles.expiryText, isSel && styles.expiryTextActive]}>{exp.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick 1-Tap ATM Trade Cards */}
          {(() => {
            const atm = optionChain.find(c => c.isAtm) || optionChain[Math.floor(optionChain.length / 2)];
            if (!atm) return null;
            return (
              <View style={styles.quickAtmRow}>
                {/* Bullish Call */}
                <TouchableOpacity
                  style={styles.quickCallCard}
                  onPress={() => setFnoTradeModal({
                    visible: true,
                    symbol: atm.call.symbol,
                    type: 'CALL',
                    strike: atm.strike,
                    price: atm.call.ltp,
                    lotSize: selectedUnderlying.lotSize,
                    lots: 1,
                    delta: atm.call.delta,
                    theta: atm.call.theta,
                  })}
                >
                  <View style={styles.quickCardHeader}>
                    <Text style={styles.quickCallTag}>🐂 Bullish Call</Text>
                    <Text style={styles.quickLtp}>₹{atm.call.ltp}</Text>
                  </View>
                  <Text style={styles.quickStrikeText}>{atm.strike} CE</Text>
                  <Text style={styles.quickSubText}>Breakeven: ₹{(atm.strike + atm.call.ltp).toFixed(0)}</Text>
                  <View style={styles.quickBuyCallBtn}>
                    <Text style={styles.quickBuyCallBtnText}>Buy Call ⚡</Text>
                  </View>
                </TouchableOpacity>

                {/* Bearish Put */}
                <TouchableOpacity
                  style={styles.quickPutCard}
                  onPress={() => setFnoTradeModal({
                    visible: true,
                    symbol: atm.put.symbol,
                    type: 'PUT',
                    strike: atm.strike,
                    price: atm.put.ltp,
                    lotSize: selectedUnderlying.lotSize,
                    lots: 1,
                    delta: atm.put.delta,
                    theta: atm.put.theta,
                  })}
                >
                  <View style={styles.quickCardHeader}>
                    <Text style={styles.quickPutTag}>🐻 Bearish Put</Text>
                    <Text style={styles.quickLtp}>₹{atm.put.ltp}</Text>
                  </View>
                  <Text style={styles.quickStrikeText}>{atm.strike} PE</Text>
                  <Text style={styles.quickSubText}>Breakeven: ₹{(atm.strike - atm.put.ltp).toFixed(0)}</Text>
                  <View style={styles.quickBuyPutBtn}>
                    <Text style={styles.quickBuyPutBtnText}>Buy Put ⚡</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Option Chain Table Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Option Chain ({selectedUnderlying.symbol})</Text>
            <Text style={styles.chainSubNote}>Tap row to trade • Greeks active</Text>
          </View>

          <View style={styles.chainTable}>
            <View style={styles.chainHeaderRow}>
              <Text style={styles.chainColCall}>CALLS (CE)</Text>
              <Text style={styles.chainColStrike}>STRIKE</Text>
              <Text style={styles.chainColPut}>PUTS (PE)</Text>
            </View>

            {fnoLoading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator color="#00E05A" size="small" />
                <Text style={{ color: '#888', marginTop: 8, fontSize: 12 }}>Computing Black-Scholes Greeks...</Text>
              </View>
            ) : (
              optionChain.map((contract) => (
                <View
                  key={contract.strike}
                  style={[
                    styles.chainRow,
                    contract.isAtm && styles.chainRowAtm,
                  ]}
                >
                  {/* Call side */}
                  <TouchableOpacity
                    style={[styles.chainSideBtn, contract.call.isItm && styles.itmCallBg]}
                    onPress={() => setFnoTradeModal({
                      visible: true,
                      symbol: contract.call.symbol,
                      type: 'CALL',
                      strike: contract.strike,
                      price: contract.call.ltp,
                      lotSize: selectedUnderlying.lotSize,
                      lots: 1,
                      delta: contract.call.delta,
                      theta: contract.call.theta,
                    })}
                  >
                    <Text style={[styles.chainPrice, { color: contract.call.isPositive ? '#00C853' : '#ff4444' }]}>
                      ₹{contract.call.ltp.toFixed(2)}
                    </Text>
                    <Text style={styles.chainOi}>OI: {(contract.call.oi / 1000).toFixed(0)}k</Text>
                  </TouchableOpacity>

                  {/* Center Strike */}
                  <View style={[styles.chainStrikeBadge, contract.isAtm && styles.chainStrikeAtm]}>
                    <Text style={[styles.chainStrikeText, contract.isAtm && styles.chainStrikeAtmText]}>
                      {contract.strike}
                    </Text>
                    {contract.isAtm && <Text style={styles.atmBadgeTag}>ATM</Text>}
                  </View>

                  {/* Put side */}
                  <TouchableOpacity
                    style={[styles.chainSideBtn, contract.put.isItm && styles.itmPutBg]}
                    onPress={() => setFnoTradeModal({
                      visible: true,
                      symbol: contract.put.symbol,
                      type: 'PUT',
                      strike: contract.strike,
                      price: contract.put.ltp,
                      lotSize: selectedUnderlying.lotSize,
                      lots: 1,
                      delta: contract.put.delta,
                      theta: contract.put.theta,
                    })}
                  >
                    <Text style={[styles.chainPrice, { color: contract.put.isPositive ? '#00C853' : '#ff4444' }]}>
                      ₹{contract.put.ltp.toFixed(2)}
                    </Text>
                    <Text style={styles.chainOi}>OI: {(contract.put.oi / 1000).toFixed(0)}k</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Active Futures Contract Card */}
          {futureContract && (
            <View style={styles.futuresCard}>
              <View style={styles.futuresTop}>
                <View>
                  <Text style={styles.futuresTitle}>⚡ Active Index Future</Text>
                  <Text style={styles.futuresSymbol}>{futureContract.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.futuresPrice}>₹{futureContract.ltp.toLocaleString('en-IN')}</Text>
                  <Text style={{ color: futureContract.isPositive ? '#00C853' : '#ff4444', fontSize: 12, fontWeight: 'bold' }}>
                    {futureContract.isPositive ? '+' : ''}{futureContract.change} ({futureContract.changePercent}%)
                  </Text>
                </View>
              </View>

              <View style={styles.futuresDetailsRow}>
                <Text style={styles.futuresDetailItem}>Lot: {futureContract.lotSize}</Text>
                <Text style={styles.futuresDetailItem}>Expiry: {futureContract.expiry}</Text>
                <Text style={styles.futuresDetailItem}>Margin: ₹{futureContract.marginRequired.toLocaleString('en-IN')}</Text>
              </View>

              <TouchableOpacity
                style={styles.futuresTradeBtn}
                onPress={() => setFnoTradeModal({
                  visible: true,
                  symbol: futureContract.symbol,
                  type: 'FUT',
                  price: futureContract.ltp,
                  lotSize: futureContract.lotSize,
                  lots: 1,
                })}
              >
                <Text style={styles.futuresTradeBtnText}>Trade Future Contract</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
      
          {/* Professional Portfolio Summary Card */}
          <View style={styles.portfolioCard}>
            {/* Subtle top corner ambient glow */}
            <View
              style={[
                styles.portfolioCardGlow,
                { backgroundColor: portfolio.pnl >= 0 ? '#00C85315' : '#ff444415' },
              ]}
            />

            {/* Top Row: Label only */}
            <View style={styles.portfolioTopRow}>
              <Text style={styles.portfolioSuperLabel}>PORTFOLIO NET WORTH</Text>
            </View>

            {/* Main Net Worth Value */}
            <Text style={styles.portfolioValue} numberOfLines={1} adjustsFontSizeToFit>
              ₹{(portfolio.balance + portfolio.totalValue).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            {/* Total Returns Chip */}
            <View style={styles.pnlStatusRow}>
              <View
                style={[
                  styles.pnlChip,
                  {
                    backgroundColor: portfolio.pnl >= 0 ? '#00C85318' : '#ff444418',
                    borderColor: portfolio.pnl >= 0 ? '#00C85340' : '#ff444440',
                  },
                ]}
              >
                <Ionicons
                  name={portfolio.pnl >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={portfolio.pnl >= 0 ? '#00C853' : '#ff4444'}
                />
                <Text style={[styles.pnlChipText, { color: portfolio.pnl >= 0 ? '#00C853' : '#ff4444' }]}>
                  {portfolio.pnl >= 0 ? '+' : ''}₹{Math.abs(portfolio.pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  {portfolio.totalInvested > 0 && (
                    <Text style={styles.pnlPctText}>
                      {' '}({portfolio.pnl >= 0 ? '+' : ''}{((portfolio.pnl / portfolio.totalInvested) * 100).toFixed(2)}%)
                    </Text>
                  )}
                </Text>
              </View>
              <Text style={styles.overallReturnsLabel}>Overall Returns</Text>
            </View>

            {/* Chart */}
            {/* Chart */}
            <PortfolioMiniChart pnl={portfolio.pnl} />
          </View>

              {/* Allocation */}
              <Text style={styles.sectionTitle}>Portfolio Allocation</Text> 
              <View style={styles.allocationCard}>
                {(() => {
                  const isFnoHolding = (symbol: string) =>
                    symbol.includes(' CE') ||
                    symbol.includes(' PE') ||
                    symbol.includes('FUT') ||
                    symbol.includes('CALL') ||
                    symbol.includes('PUT');

                  const stocksHoldings = holdings.filter(h => !isFnoHolding(h.symbol));
                  const fnoHoldings = holdings.filter(h => isFnoHolding(h.symbol));

                  const stocksValue = Math.max(0, stocksHoldings.reduce((sum, h) => sum + (h.currentValue || h.invested || 0), 0));
                  const fnoValue = Math.max(0, fnoHoldings.reduce((sum, h) => sum + (h.currentValue || h.invested || 0), 0));
                  const cashBalance = Math.max(0, portfolio.balance);

                  const total = stocksValue + fnoValue + cashBalance;

                  let stocksPct = total > 0 ? Math.round((stocksValue / total) * 100) : 0;
                  let fnoPct = total > 0 ? Math.round((fnoValue / total) * 100) : 0;
                  let cashPct = total > 0 ? Math.max(0, 100 - stocksPct - fnoPct) : 100;

                  if (stocksValue > 0 && stocksPct === 0) stocksPct = 1;
                  if (fnoValue > 0 && fnoPct === 0) fnoPct = 1;
                  if (cashBalance > 0 && cashPct === 0) cashPct = 1;
                  if (total > 0) cashPct = Math.max(0, 100 - stocksPct - fnoPct);

                  return (
                    <>
                      {/* Allocation Header with Net Capital */}
                      <View style={styles.allocationHeaderRow}>
                        <Text style={styles.allocationSubheader}>ASSET DISTRIBUTION</Text>
                        <Text style={styles.allocationTotal}>
                          Total: ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                      </View>

                      {/* Multi-Segment Color-Coded Allocation Bar */}
                      <View style={styles.allocationBar}>
                        {stocksPct > 0 && (
                          <View style={[styles.allocationFillStocks, { flex: stocksPct }]} />
                        )}
                        {fnoPct > 0 && (
                          <View style={[styles.allocationFillFno, { flex: fnoPct }]} />
                        )}
                        {cashPct > 0 && (
                          <View style={[styles.allocationFillCash, { flex: cashPct }]} />
                        )}
                      </View>

                      {/* 3 Modern Breakdown Cards */}
                      <View style={styles.allocationGrid}>
                        {/* Stocks */}
                        <View style={styles.allocationItem}>
                          <View style={styles.allocationItemHeader}>
                            <View style={[styles.legendDot, { backgroundColor: '#00C853' }]} />
                            <Text style={styles.allocationItemTitle}>Stocks</Text>
                            <Text style={styles.allocationItemPct}>{stocksPct}%</Text>
                          </View>
                          <Text style={styles.allocationItemAmount} numberOfLines={1} adjustsFontSizeToFit>
                            ₹{stocksValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>

                        {/* F&O */}
                        <View style={styles.allocationItem}>
                          <View style={styles.allocationItemHeader}>
                            <View style={[styles.legendDot, { backgroundColor: '#AB47BC' }]} />
                            <Text style={styles.allocationItemTitle}>F&O</Text>
                            <Text style={styles.allocationItemPct}>{fnoPct}%</Text>
                          </View>
                          <Text style={styles.allocationItemAmount} numberOfLines={1} adjustsFontSizeToFit>
                            ₹{fnoValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>

                        {/* Cash/Balance */}
                        <View style={styles.allocationItem}>
                          <View style={styles.allocationItemHeader}>
                            <View style={[styles.legendDot, { backgroundColor: '#29B6F6' }]} />
                            <Text style={styles.allocationItemTitle}>Cash</Text>
                            <Text style={styles.allocationItemPct}>{cashPct}%</Text>
                          </View>
                          <Text style={styles.allocationItemAmount} numberOfLines={1} adjustsFontSizeToFit>
                            ₹{cashBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Holdings */}
              <Text style={styles.sectionTitle}>My Holdings</Text>
              {!userId ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>🔐</Text>
                  <Text style={styles.emptyText}>Login to see portfolio</Text>
                  <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth' as any)}>
                    <Text style={styles.loginBtnText}>Login / Sign Up</Text>
                  </TouchableOpacity>
                </View>
              ) : holdings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>No holdings yet!</Text>
                  <Text style={styles.emptySubText}>Buy stocks or trade F&O to build your portfolio</Text>
                </View>
              ) : (
                holdings.map(holding => {
                  const isFno = holding.symbol.includes(' CE') ||
                    holding.symbol.includes(' PE') ||
                    holding.symbol.includes('FUT') ||
                    holding.symbol.includes('CALL') ||
                    holding.symbol.includes('PUT');

                  return (
                    <TouchableOpacity
                      key={holding.id}
                      style={styles.holdingCard}
                      onPress={() => {
                        if (isFno) {
                          setActiveTab('fno');
                        } else {
                          router.push(`/stock/${holding.symbol}` as any);
                        }
                      }}
                    >
                      <View style={styles.stockLeft}>
                        <View style={[
                          styles.holdingIconCircle,
                          isFno && { backgroundColor: '#AB47BC20', borderColor: '#AB47BC50' }
                        ]}>
                          <Text style={[styles.stockIconText, isFno && { color: '#AB47BC' }]}>
                            {isFno ? '⚡' : holding.symbol[0]}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.stockSymbol} numberOfLines={1} ellipsizeMode="tail">{holding.symbol}</Text>
                            {isFno && (
                              <View style={styles.fnoHoldingBadge}>
                                <Text style={styles.fnoHoldingBadgeText}>F&O</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.stockName} numberOfLines={1} ellipsizeMode="tail">
                            {isFno ? `${holding.quantity} Qty` : `${holding.quantity} Shares`} • Avg ₹{holding.avg_buy_price ? Number(holding.avg_buy_price).toFixed(2) : '0.00'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.stockRight}>
                        <Text style={styles.stockPrice} numberOfLines={1}>
                          ₹{holding.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text style={[styles.holdingPct, { color: holding.isPositive ? '#00C853' : '#ff4444' }]} numberOfLines={1}>
                          {holding.isPositive ? '+' : ''}{holding.pnlPercent}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
      </View>

      {/* F&O Trade Execution Modal */}
      <Modal visible={!!fnoTradeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{fnoTradeModal?.symbol}</Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  {fnoTradeModal?.type === 'CALL' ? 'Call Option (CE)' : fnoTradeModal?.type === 'PUT' ? 'Put Option (PE)' : 'Index Future'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFnoTradeModal(null)} style={{ flexShrink: 0, padding: 4 }}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Price & Greeks */}
            <View style={styles.fnoModalStatsRow}>
              <View style={styles.fnoModalStatBox}>
                <Text style={styles.fnoModalStatLabel}>LTP</Text>
                <Text style={styles.fnoModalStatVal}>₹{fnoTradeModal?.price?.toFixed(2)}</Text>
              </View>
              {fnoTradeModal?.delta !== undefined && (
                <View style={styles.fnoModalStatBox}>
                  <Text style={styles.fnoModalStatLabel}>Delta (Δ)</Text>
                  <Text style={styles.fnoModalStatVal}>{fnoTradeModal?.delta}</Text>
                </View>
              )}
              {fnoTradeModal?.theta !== undefined && (
                <View style={styles.fnoModalStatBox}>
                  <Text style={styles.fnoModalStatLabel}>Theta (Decay)</Text>
                  <Text style={styles.fnoModalStatVal}>{fnoTradeModal?.theta}</Text>
                </View>
              )}
            </View>

            {/* Lot Counter */}
            <View style={styles.lotStepperCard}>
              <Text style={styles.lotStepperLabel}>Number of Lots (Lot Size: {fnoTradeModal?.lotSize})</Text>
              <View style={styles.lotStepperRow}>
                <TouchableOpacity
                  style={styles.lotStepBtn}
                  onPress={() => setFnoTradeModal(m => m ? ({ ...m, lots: Math.max(1, m.lots - 1) }) : null)}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.lotCountCenter}>
                  <Text style={styles.lotCountText}>{fnoTradeModal?.lots} Lot{fnoTradeModal && fnoTradeModal.lots > 1 ? 's' : ''}</Text>
                  <Text style={styles.lotQuantitySub}>{((fnoTradeModal?.lots || 1) * (fnoTradeModal?.lotSize || 25))} Qty</Text>
                </View>
                <TouchableOpacity
                  style={styles.lotStepBtn}
                  onPress={() => setFnoTradeModal(m => m ? ({ ...m, lots: m.lots + 1 }) : null)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Premium / Margin Breakdown */}
            <View style={styles.marginBreakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Required Premium/Margin</Text>
                <Text style={styles.breakdownVal}>
                  ₹{fnoTradeModal?.type === 'FUT'
                    ? Math.round((fnoTradeModal?.price || 0) * (fnoTradeModal?.lots || 1) * (fnoTradeModal?.lotSize || 25) * 0.12).toLocaleString('en-IN')
                    : Math.round((fnoTradeModal?.price || 0) * (fnoTradeModal?.lots || 1) * (fnoTradeModal?.lotSize || 25)).toLocaleString('en-IN')
                  }
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Available Virtual Cash</Text>
                <Text style={styles.breakdownVal}>₹{portfolio.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>

            {/* Action CTA */}
            <TouchableOpacity style={styles.fnoExecuteBtn} onPress={handleFnoTrade}>
              <Text style={styles.fnoExecuteBtnText}>Confirm Buy Order ⚡</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gamified F&O Trade Success Modal */}
      <Modal visible={!!fnoSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#00E05A" />
            </View>

            <Text style={styles.modalTitle}>F&O Order Executed!</Text>
            <Text style={styles.modalSub}>
              Bought {fnoSuccessModal?.lots} Lot(s) ({fnoSuccessModal?.qty} Qty) of {fnoSuccessModal?.symbol} at ₹{fnoSuccessModal?.price}
            </Text>

            <View style={styles.xpRewardBox}>
              <Ionicons name="flash" size={20} color="#FFD700" />
              <Text style={styles.xpRewardText}>+{fnoSuccessModal?.xp} XP Earned! ⚡</Text>
            </View>

            <View style={styles.marginBreakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Invested Amount</Text>
                <Text style={styles.breakdownVal}>₹{fnoSuccessModal?.total?.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Remaining Cash</Text>
                <Text style={styles.breakdownVal}>₹{portfolio.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.fnoExecuteBtn}
              onPress={() => setFnoSuccessModal(null)}
            >
              <Text style={styles.fnoExecuteBtnText}>View in Portfolio</Text>
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
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatarText: {
    color: '#00C853',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoText: {
    color: '#00C853',
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  starCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  tabToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 24,
    position: 'relative',
  },
  tabText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00C853',
    borderRadius: 1,
  },
  indicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  indexCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  indexName: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  indexPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  indexChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indexChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
  },
  viewAll: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '600',
  },
  stockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  stockIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    flexShrink: 0,
  },
  stockIconText: {
    color: '#00C853',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stockSymbol: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  stockName: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
    flexShrink: 1,
  },
  stockRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  stockPrice: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  portfolioCard: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioSuperLabel: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
  },
  simulatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C85315',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00C85330',
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  simulatorPillText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cashAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#292929',
  },
  cashAvailableText: {
    color: '#ddd',
    fontSize: 11,
    fontWeight: '600',
  },
  portfolioValue: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  pnlStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pnlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pnlChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pnlPctText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overallReturnsLabel: {
    color: '#888',
    fontSize: 11,
  },
  portfolioMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#252525',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  metricValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#292929',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubText: {
    color: '#888',
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loginBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  miniChartContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  portfolioStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  portfolioReturns: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  portfolioReturnsPct: {
    fontSize: 14,
    fontWeight: '500',
  },
  allocationCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  allocationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  allocationSubheader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#666',
    textTransform: 'uppercase',
  },
  allocationTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  allocationBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1c1c1c',
    gap: 2,
  },
  allocationFillStocks: {
    backgroundColor: '#00C853',
    borderRadius: 3,
  },
  allocationFillFno: {
    backgroundColor: '#AB47BC',
    borderRadius: 3,
  },
  allocationFillCash: {
    backgroundColor: '#29B6F6',
    borderRadius: 3,
  },
  allocationGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  allocationItem: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
    minWidth: 0,
    overflow: 'hidden',
  },
  allocationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  allocationItemTitle: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '600',
    marginLeft: 4,
    flexShrink: 1,
  },
  allocationItemPct: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 'auto',
  },
  allocationItemAmount: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
  },
  fnoHoldingBadge: {
    backgroundColor: '#AB47BC22',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#AB47BC55',
  },
  fnoHoldingBadgeText: {
    color: '#AB47BC',
    fontSize: 10,
    fontWeight: '700',
  },
  allocationLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#888',
    fontSize: 13,
  },
  holdingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  holdingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00C853',
  },
  holdingPct: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  fnoUnderlyingRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fnoUnderlyingChip: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  fnoUnderlyingChipActive: {
    backgroundColor: 'rgba(0, 224, 90, 0.12)',
    borderColor: '#00E05A',
  },
  fnoUnderlyingText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  fnoUnderlyingTextActive: {
    color: '#00E05A',
    fontWeight: 'bold',
  },
  fnoLotTag: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  fnoSpotCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2a1f',
  },
  fnoSpotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  fnoSpotSymbol: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fnoSpotPrice: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 12,
  },
  expiryLabel: {
    color: '#777',
    fontSize: 12,
    marginRight: 2,
  },
  expiryChip: {
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#262626',
  },
  expiryChipActive: {
    backgroundColor: 'rgba(0, 224, 90, 0.15)',
    borderColor: '#00E05A',
  },
  expiryText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '500',
  },
  expiryTextActive: {
    color: '#00E05A',
    fontWeight: 'bold',
  },
  quickAtmRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickCallCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#121A12',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 90, 0.3)',
    overflow: 'hidden',
  },
  quickPutCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#1A1212',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    overflow: 'hidden',
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  quickCallTag: {
    color: '#00E05A',
    fontSize: 11,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  quickPutTag: {
    color: '#ff6666',
    fontSize: 11,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  quickLtp: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 0,
  },
  quickStrikeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quickSubText: {
    color: '#777',
    fontSize: 10,
    marginBottom: 10,
  },
  quickBuyCallBtn: {
    backgroundColor: '#00E05A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickBuyCallBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickBuyPutBtn: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickBuyPutBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chainSubNote: {
    color: '#666',
    fontSize: 11,
  },
  chainTable: {
    backgroundColor: '#111',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 16,
  },
  chainHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#181818',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  chainColCall: {
    flex: 1,
    color: '#00E05A',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chainColStrike: {
    width: 80,
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chainColPut: {
    flex: 1,
    color: '#ff6666',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chainRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    alignItems: 'center',
  },
  chainRowAtm: {
    backgroundColor: 'rgba(0, 224, 90, 0.05)',
    borderColor: '#00E05A',
    borderWidth: 1,
  },
  chainSideBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  itmCallBg: {
    backgroundColor: 'rgba(0, 224, 90, 0.06)',
  },
  itmPutBg: {
    backgroundColor: 'rgba(255, 68, 68, 0.06)',
  },
  chainPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chainOi: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  chainStrikeBadge: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#161616',
  },
  chainStrikeAtm: {
    backgroundColor: 'rgba(0, 224, 90, 0.2)',
  },
  chainStrikeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  chainStrikeAtmText: {
    color: '#00E05A',
  },
  atmBadgeTag: {
    color: '#000',
    backgroundColor: '#00E05A',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 3,
    marginTop: 2,
  },
  futuresCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2a1f',
  },
  futuresTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  futuresTitle: {
    color: '#00E05A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  futuresSymbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  futuresPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  futuresDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  futuresDetailItem: {
    color: '#888',
    fontSize: 11,
  },
  futuresTradeBtn: {
    backgroundColor: '#00E05A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  futuresTradeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
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
    maxWidth: 350,
    backgroundColor: '#141A14',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 90, 0.3)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#00E05A',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  fnoModalStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  fnoModalStatBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  fnoModalStatLabel: {
    color: '#777',
    fontSize: 10,
    marginBottom: 2,
  },
  fnoModalStatVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  lotStepperCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  lotStepperLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  lotStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lotStepBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  lotCountCenter: {
    alignItems: 'center',
  },
  lotCountText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lotQuantitySub: {
    color: '#00E05A',
    fontSize: 11,
    marginTop: 2,
  },
  marginBreakdownCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: '#888',
    fontSize: 12,
  },
  breakdownVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fnoExecuteBtn: {
    backgroundColor: '#00E05A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00E05A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fnoExecuteBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalSuccessIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  xpRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  xpRewardText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C85315',
    borderWidth: 1,
    borderColor: '#00C85340',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
    overflow: 'hidden',
    width: '100%',
  },
  guestBannerText: {
    flex: 1,
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
  },
});