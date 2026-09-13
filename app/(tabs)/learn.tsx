import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavHeader from '@/components/NavHeader';
import { supabase } from '@/lib/supabase';

export const LESSONS = [
  {
    id: '1',
    title: 'What is the Stock Market?',
    emoji: '📈',
    duration: '6 min',
    xp: 60,
    content: `A stock market is an organized, regulated marketplace where buyers and sellers exchange shares of publicly listed companies.\n\n🏛️ WHAT IS A SHARE?\nWhen a company wants to expand without taking heavy bank debt, it issues shares to the public through an IPO (Initial Public Offering). When you purchase even a single share of Tata Motors or Infosys, you legally become a part-owner (shareholder) of that business!\n\n🇮🇳 THE TWO MAIN INDIAN STOCK EXCHANGES:\n• BSE (Bombay Stock Exchange): Established in 1875 at Dalal Street, Mumbai. It is the oldest stock exchange in all of Asia and home to the SENSEX.\n• NSE (National Stock Exchange): Founded in 1992, pioneering fully automated screen-based electronic trading in India, home to the benchmark NIFTY 50.\n\n🛡️ MARKET REGULATOR (SEBI):\nThe Securities and Exchange Board of India (SEBI) is the statutory watchdog that monitors exchanges, prevents insider trading, enforces strict transparency, and protects retail investors.\n\n⏰ INDIAN TRADING HOURS:\n• Normal Trading: 09:15 AM to 03:30 PM (Monday to Friday)\n• Pre-market Window: 09:00 AM to 09:08 AM (Order placement & price discovery)\n\n💡 PRO TIP FOR BEGINNERS:\nAlways trade money you do not need for daily expenses. Stock prices fluctuate daily based on supply, demand, corporate earnings, and global news!`,
    quiz: [
      {
        question: 'What legal status do you acquire when purchasing equity shares of a listed company?',
        options: ['A debt lender', 'A part-owner / shareholder', 'A bank guarantor', 'A corporate employee'],
        correct: 1,
      },
      {
        question: 'Which is the oldest stock exchange in Asia, established in 1875 at Dalal Street?',
        options: ['National Stock Exchange (NSE)', 'Tokyo Stock Exchange', 'Bombay Stock Exchange (BSE)', 'Shanghai Stock Exchange'],
        correct: 2,
      },
      {
        question: 'Which statutory regulatory body oversees stock exchanges and protects investors in India?',
        options: ['Reserve Bank of India (RBI)', 'SEBI', 'Ministry of Corporate Affairs', 'NITI Aayog'],
        correct: 1,
      },
      {
        question: 'What are the normal live market trading hours for Indian stock exchanges (NSE/BSE)?',
        options: ['10:00 AM to 04:30 PM', '09:15 AM to 03:30 PM', '09:00 AM to 05:00 PM', '24 Hours non-stop'],
        correct: 1,
      },
    ],
  },
  {
    id: '2',
    title: 'Bull vs Bear Market Cycles',
    emoji: '🐂',
    duration: '6 min',
    xp: 60,
    content: `Market sentiment moves like a pendulum between greed and fear. Understanding market phases is critical for preserving your capital.\n\n🐂 BULL MARKET (TEJI):\n• Characterized by rising stock prices, strong GDP growth, corporate profit expansion, and high investor optimism.\n• Symbol Origin: A bull strikes upwards with its horns, driving prices up!\n• Bull markets can last for multiple years with brief healthy pullbacks.\n\n🐻 BEAR MARKET (MANDI):\n• Characterized by widespread pessimism, economic slowdown, and a sustained decline of 20% or more from recent all-time highs.\n• Symbol Origin: A bear swipes downwards with its heavy paws, knocking prices down!\n\n🔄 THE 4 PHASES OF A COMPLETE MARKET CYCLE:\n1. Accumulation Phase: Smart institutional money quietly accumulates shares at bargain valuations while retail sentiment is fearful.\n2. Mark-Up Phase: Price breaks out, media turns bullish, and retail investors enter, driving strong rallies.\n3. Distribution Phase: Institutions begin gradually locking in profits as market reaches peak euphoria.\n4. Mark-Down Phase: Heavy selling pressure causes sharp cascades and panic liquidation.\n\n💡 PRO RULE:\n"Be fearful when others are greedy, and greedy when others are fearful." — Warren Buffett. The biggest fortunes are built by accumulating quality assets during bear market panics!`,
    quiz: [
      {
        question: 'What price decline from recent peak highs officially defines a Bear Market?',
        options: ['5% to 8%', '10% correction', '20% or greater', '50% crash'],
        correct: 2,
      },
      {
        question: 'In which cycle phase do smart institutions quietly accumulate shares while the public is fearful?',
        options: ['Distribution Phase', 'Accumulation Phase', 'Euphoria Phase', 'Liquidation Phase'],
        correct: 1,
      },
      {
        question: 'Why is a rising market historically symbolized by a Bull?',
        options: ['Bulls run fast horizontally', 'A bull strikes upwards with its horns', 'Bulls sleep during the day', 'Because Wall Street had a dairy farm'],
        correct: 1,
      },
      {
        question: 'What is the recommended disciplined mindset during heavy market drawdowns?',
        options: ['Panic sell everything at the bottom', 'Double down on high-risk penny stocks', 'Systematically accumulate fundamentally sound companies at deep discounts', 'Stop investing forever'],
        correct: 2,
      },
    ],
  },
  {
    id: '3',
    title: 'Reading Stock Quotes & Candlesticks',
    emoji: '💹',
    duration: '7 min',
    xp: 70,
    content: `To trade effectively, you must be able to read real-time price quotes and visual candlestick charts.\n\n📋 KEY QUOTE METRICS:\n• LTP (Last Traded Price): The exact price at which the most recent transaction executed.\n• Previous Close: The final settling price from the preceding trading day. All daily % gain/loss figures are calculated from this baseline!\n• Day's Range (High/Low): The peak highest and lowest price printed between 9:15 AM and 3:30 PM.\n• 52-Week High/Low: The 1-year price extremes, showing long-term momentum.\n• Volume: Total quantity of shares bought and sold today. High volume confirms strong institutional participation.\n\n🕯️ JAPANESE CANDLESTICK BASICS (OHLC):\nEvery candle summarizes 4 prices: Open, High, Low, and Close.\n• Green (Bullish) Candle: Close > Open. Buyers pushed prices up during this timeframe.\n• Red (Bearish) Candle: Close < Open. Sellers forced prices down.\n• Wicks / Shadows: The thin upper and lower lines showing the rejection extremes reached before closing.\n\n🏢 MARKET CAP CATEGORIES IN INDIA:\n• Large Cap: Top 1 to 100 companies (>₹50,000 Cr, e.g. Reliance, TCS, HDFC Bank). Stable, high liquidity.\n• Mid Cap: 101st to 250th companies (₹15,000 Cr - ₹50,000 Cr). High growth potential.\n• Small Cap: 251st onwards (<₹15,000 Cr). Rapid expansion but higher volatility.\n\n💡 PRO TIP:\nA price breakout on low volume is often a "bull trap". Always look for volume expansion to validate real moves!`,
    quiz: [
      {
        question: 'What does a Green candlestick body communicate to a chart reader?',
        options: ['Closing price was lower than opening price', 'Closing price was higher than opening price', 'No trades occurred', 'Market was halted'],
        correct: 1,
      },
      {
        question: 'What does the upper tip of a candlestick shadow (wick) indicate?',
        options: ['The day opening price', 'The highest price reached during that period', 'The average price', 'The dividend payout'],
        correct: 1,
      },
      {
        question: 'Companies ranked from 1 to 100 by market capitalization in India are classified as:',
        options: ['Small Cap Stocks', 'Mid Cap Stocks', 'Large Cap Stocks', 'Micro Cap Stocks'],
        correct: 2,
      },
      {
        question: 'Why is high trading volume important when a stock breaks out above resistance?',
        options: ['It lowers brokerage fees', 'It proves strong institutional participation and validates the move', 'It guarantees 100% profit', 'It shuts down exchange volatility'],
        correct: 1,
      },
    ],
  },
  {
    id: '4',
    title: 'Fundamental Valuation: PE, PB & ROE',
    emoji: '🔢',
    duration: '8 min',
    xp: 80,
    content: `A stock's price alone tells you nothing about whether it is cheap or expensive. You must evaluate price relative to earnings and assets.\n\n📊 PRICE-TO-EARNINGS (P/E) RATIO:\n• Formula: P/E = Current Stock Price ÷ Earnings Per Share (EPS)\n• Meaning: How many rupees you are paying for every ₹1 of company net profit.\n• Example: Stock Price = ₹1,200, Annual EPS = ₹60 → P/E = 20.\n• Interpretation: A lower P/E relative to sector peers may mean the stock is undervalued, while a high P/E implies investors expect explosive future growth.\n\n📚 PRICE-TO-BOOK (P/B) RATIO:\n• Formula: Stock Price ÷ Book Value Per Share (Net Assets)\n• Crucial for capital-heavy sectors like Banks (SBI, HDFC Bank), NBFCs, and manufacturing companies.\n• A P/B below 1.0 means the stock is trading below the liquidation value of its physical assets.\n\n🎯 RETURN ON EQUITY (ROE):\n• Formula: Net Profit ÷ Total Shareholders' Equity\n• Measures management's efficiency in generating profits from shareholder money.\n• Warren Buffett Benchmark: Consistently seek companies with ROE > 15-20% over 5+ years.\n\n⚖️ DEBT-TO-EQUITY (D/E):\n• Measures how much borrowed debt the company carries compared to equity.\n• D/E < 1.0 indicates a conservative, safe balance sheet that can weather economic recessions.\n\n💡 PRO RULE:\nNever evaluate a P/E in isolation. Compare an IT stock's P/E against the Nifty IT index average, not against a capital-heavy steel manufacturer!`,
    quiz: [
      {
        question: 'If a stock trades at ₹1,500 and its annual Earnings Per Share (EPS) is ₹75, what is its P/E ratio?',
        options: ['10', '15', '20', '25'],
        correct: 2,
      },
      {
        question: 'Which fundamental valuation ratio is considered indispensable for evaluating Banks & Financial Institutions?',
        options: ['P/E Ratio only', 'Price-to-Book (P/B) Ratio', 'EV/EBITDA', 'Dividend Yield only'],
        correct: 1,
      },
      {
        question: 'What does a persistent Return on Equity (ROE) above 18% signify?',
        options: ['The company has dangerous bank debt', 'Management is exceptionally efficient at generating profit from shareholder equity', 'The stock is about to crash', 'The company pays zero taxes'],
        correct: 1,
      },
      {
        question: 'What does a Debt-to-Equity (D/E) ratio below 0.5 generally indicate?',
        options: ['Excessive borrowing risk', 'A conservative, financially resilient balance sheet with low debt burden', 'Negative book value', 'Poor creditworthiness'],
        correct: 1,
      },
    ],
  },
  {
    id: '5',
    title: 'Diversification & Portfolio Risk',
    emoji: '🧺',
    duration: '7 min',
    xp: 70,
    content: `"Don't put all your eggs in one basket" is the foundational axiom of investing.\n\n🛡️ WHAT IS DIVERSIFICATION?\nDiversification is the technique of allocating capital across diverse industries, company sizes, and asset categories so that poor performance in one area does not wipe out your total wealth.\n\n🔀 THE 3 PILLARS OF DIVERSIFICATION:\n1. Sector Allocation: Spread capital across non-correlated sectors (e.g. Banking, IT, Pharma, FMCG, Energy). When interest rate hikes hurt real estate, consumer staple FMCG stocks often remain stable!\n2. Market Cap Mix: Blend resilient Large-Caps (portfolio stability) with high-upside Mid/Small-Caps (wealth compounding).\n3. Multi-Asset Hedging: Maintain allocations in Equities, Gold (inflation hedge), and Fixed-Income/Cash (drawdown liquidity).\n\n⚠️ SYSTEMATIC VS UNSYSTEMATIC RISK:\n• Unsystematic Risk: Risk unique to a single company or sector (e.g. regulatory ban on a specific pharma drug, management fraud). This risk CAN be eliminated through diversification.\n• Systematic Risk: Macro risk affecting the whole market (pandemics, global wars, interest rate shocks). This cannot be eliminated by stock diversification alone.\n\n🚫 OVER-DIVERSIFICATION WARNING:\nOwning 80+ stocks is "diworsification". It dilutes your top winners, increases transaction friction, and makes portfolio tracking impossible. An optimal concentrated portfolio contains 15 to 25 thoroughly researched businesses.\n\n💡 PRO TIP:\nRebalance your portfolio twice a year to trim bloated winners and top up promising, undervalued sectors!`,
    quiz: [
      {
        question: 'What type of risk can be eliminated almost entirely through proper stock diversification?',
        options: ['Systematic / Macroeconomic risk', 'Unsystematic / Company-specific risk', 'Currency devaluation risk', 'Inflation risk'],
        correct: 1,
      },
      {
        question: 'Why should an investor combine defensive sectors like FMCG and Pharma with cyclical sectors like Auto and Banking?',
        options: ['To double broker commissions', 'Defensive sectors provide resilient revenue stability when cyclical sectors face downturns', 'To avoid paying capital gains tax', 'Because SEBI mandates it'],
        correct: 1,
      },
      {
        question: 'What is the primary drawback of excessive over-diversification (holding 70+ random stocks)?',
        options: ['It increases company debt', 'It dilutes top winning returns and mimics index performance with higher costs', 'It triggers automatic account suspension', 'It makes dividends disappear'],
        correct: 1,
      },
      {
        question: 'What is generally considered an ideal, manageable number of stocks for an individual investor portfolio?',
        options: ['1 to 2 stocks', '15 to 25 well-researched stocks', '150 to 200 stocks', 'All 500 Nifty stocks'],
        correct: 1,
      },
    ],
  },
  {
    id: '6',
    title: 'Sensex & Nifty 50 Index Masterclass',
    emoji: '📊',
    duration: '7 min',
    xp: 70,
    content: `When news headlines say "The Indian stock market gained 500 points today", they are talking about benchmark market indices.\n\n📈 WHAT IS A STOCK INDEX?\nAn index is a curated statistical basket representing a defined section of the market. It acts as the economic barometer of the country.\n\n🏛️ SENSEX (BSE SENSITIVE INDEX):\n• Created: 1986 by BSE, with base year 1978-79 and base value of 100 points.\n• Composition: 30 of the largest, most actively traded, financially sound blue-chip companies listed on BSE.\n\n🚀 NIFTY 50 (NSE FIFTY):\n• Created: 1996 by NSE, with base year 1995 and base value of 1,000 points.\n• Composition: 50 premier companies across 13 major economic sectors.\n• Coverage: Represents over 60% of the free-float market capitalization of the entire Indian equity universe.\n\n⚖️ FREE-FLOAT MARKET CAP WEIGHTAGE:\nBoth Nifty and Sensex do NOT give equal weight to every stock. They use Free-Float Market Capitalization:\n• Shares held by founders/promoters, trusts, and governments that cannot be traded publicly are excluded.\n• Only shares actively available for public trading determine weightage. Heavyweights like Reliance, HDFC Bank, and ICICI Bank carry the largest influence.\n\n🔄 SEMI-ANNUAL REBALANCING:\nIndices are not static! Every 6 months (March and September), lagging companies are evicted and replaced with rising industry titans.\n\n💡 PRO TIP:\nIndex funds and ETFs (like Nifty BeES) allow you to invest in all top 50 Indian companies with zero individual stock picking risk!`,
    quiz: [
      {
        question: 'How are stock weightages determined inside both the Nifty 50 and Sensex benchmarks?',
        options: ['By share price alone', 'By Free-Float Market Capitalization', 'Alphabetical order', 'By number of retail employees'],
        correct: 1,
      },
      {
        question: 'How many top constituent companies comprise the BSE SENSEX index?',
        options: ['30 Companies', '50 Companies', '100 Companies', '500 Companies'],
        correct: 0,
      },
      {
        question: 'What initial base value was assigned to the Nifty 50 index when launched in 1996?',
        options: ['100 points', '500 points', '1,000 points', '10,000 points'],
        correct: 2,
      },
      {
        question: 'How frequently does the index committee rebalance Nifty 50 constituents to replace laggards?',
        options: ['Every Monday', 'Every month', 'Semi-annually (Twice a year)', 'Once every 10 years'],
        correct: 2,
      },
    ],
  },
  {
    id: '7',
    title: 'Order Types: Market, Limit, SL & GTT',
    emoji: '🛒',
    duration: '8 min',
    xp: 80,
    content: `Executing orders with precision separates profitable traders from amateurs. Knowing which order to use prevents costly mistakes.\n\n⚡ 1. MARKET ORDER:\n• Execution: Immediate at the best prevailing price in the order book.\n• Advantage: 100% guarantee of execution.\n• Risk: In fast-moving or illiquid markets, you may experience "slippage" (buying higher or selling lower than expected).\n\n🎯 2. LIMIT ORDER:\n• Execution: You specify the exact price. Buy Limit executes ONLY at your price or lower; Sell Limit executes at your price or higher.\n• Advantage: Full price control; zero slippage.\n• Risk: If the market turns 10 paise before your limit, your trade will remain unfulfilled.\n\n🛡️ 3. STOP-LOSS (SL) ORDER:\n• Execution: Sits dormant until your trigger price is reached, then fires an order to cap your loss.\n• Golden Purpose: Protects your capital against unforeseen flash crashes while you are away from the screen.\n• Rule: Never enter an intraday trade without a pre-calculated stop loss!\n\n⏳ 4. GTT (GOOD TILL TRIGGERED):\n• Sits valid on the exchange for up to 1 year until your buying dip or target profit price triggers.\n\n📦 PRODUCT CODES (CNC VS MIS):\n• CNC (Cash & Carry): Delivery trades. You pay 100% cash and hold shares indefinitely in your Demat.\n• MIS (Margin Intraday Square-off): Intraday leverage trades. Unclosed positions are forcibly squared off by the broker system at 3:20 PM!\n\n💡 PRO TIP:\nDuring major news events (Union Budget, RBI Policy), avoid Market orders due to erratic bid-ask spreads. Use Limit orders!`,
    quiz: [
      {
        question: 'Which order type guarantees immediate execution but does NOT guarantee a specific fixed price?',
        options: ['Limit Order', 'Stop-Loss Order', 'Market Order', 'Good Till Triggered (GTT)'],
        correct: 2,
      },
      {
        question: 'If a stock trades at ₹650 and you want to buy ONLY if it drops to ₹620, which order should you place?',
        options: ['Market Order', 'Buy Limit Order at ₹620', 'Stop-Loss Market Order', 'MIS Market Sell'],
        correct: 1,
      },
      {
        question: 'What is the non-negotiable risk management purpose of a Stop-Loss (SL) order?',
        options: ['To guarantee 100% profit', 'To pre-define and strictly cap your maximum acceptable downside loss', 'To double your trading leverage', 'To eliminate broker taxes'],
        correct: 1,
      },
      {
        question: 'What happens to an open MIS (Intraday) position if you do not close it before 3:20 PM?',
        options: ['It converts into delivery automatically', 'The broker auto-squares off the position at prevailing market price', 'The shares are transferred to your Demat', 'The exchange cancels the trade without profit or loss'],
        correct: 1,
      },
    ],
  },
  {
    id: '8',
    title: 'Futures & Options (F&O) Derivatives',
    emoji: '⚡',
    duration: '9 min',
    xp: 90,
    content: `Derivatives are financial instruments that derive their value from an underlying asset, like the NIFTY 50 index or Reliance stock.\n\n📞 CALL OPTIONS (CE — CALL EUROPEAN):\n• Gives the buyer the right, but NOT the obligation, to buy the underlying asset at a pre-set Strike Price before expiry.\n• Buyer View: Bullish. Buy CE when you expect prices to rally aggressively!\n\n📉 PUT OPTIONS (PE — PUT EUROPEAN):\n• Gives the buyer the right, but NOT the obligation, to sell the underlying asset at the Strike Price.\n• Buyer View: Bearish. Buy PE when you anticipate prices will crash!\n\n🔑 CRITICAL F&O VOCABULARY:\n• Strike Price: The benchmark contract price you choose to trade.\n• Premium: The upfront cash price paid by the option buyer to the option seller.\n• Expiry Day: Indian index options expire weekly on Thursdays. On expiry, any Out-of-the-Money (OTM) options drop to ₹0!\n• Lot Size: F&O trades in standardized bundles (e.g. Nifty lot size = 25 or 75 units).\n\n⏳ THETA (TIME DECAY) — THE OPTION BUYER'S ENEMY:\nEvery day that passes reduces an option's extrinsic time value. Even if the market moves sideways, option buyers lose money due to continuous Theta decay!\n\n⚠️ CRITICAL WARNING:\nAccording to SEBI data, 9 out of 10 retail F&O traders lose money due to leverage and emotional gambling. Master virtual paper trading on GrowPlay before risking any real money!`,
    quiz: [
      {
        question: 'What option contract should a trader buy if they strongly predict the Nifty index will rally upward today?',
        options: ['Put Option (PE)', 'Call Option (CE)', 'Cash Delivery', 'Sovereign Gold Bond'],
        correct: 1,
      },
      {
        question: 'What is the cash amount paid by an option buyer to enter an option contract called?',
        options: ['Margin collateral', 'Strike Value', 'Option Premium', 'Stamp Duty'],
        correct: 2,
      },
      {
        question: 'Which Option Greek causes options to steadily lose value every day purely due to the passage of time?',
        options: ['Delta', 'Gamma', 'Vega', 'Theta (Time Decay)'],
        correct: 3,
      },
      {
        question: 'What happens to Out-of-the-Money (OTM) option contracts when 3:30 PM arrives on expiry day?',
        options: ['They carry forward to next month', 'Their premium value expires completely worthless at ₹0', 'They double in value automatically', 'The broker pays interest on the premium'],
        correct: 1,
      },
    ],
  },
  {
    id: '9',
    title: 'Technical Analysis: Support & Resistance',
    emoji: '📈',
    duration: '9 min',
    xp: 90,
    content: `Technical analysis is the study of historical price action, chart patterns, and trading volumes to forecast high-probability future moves.\n\n🛡️ SUPPORT LEVEL (THE PRICE FLOOR):\n• A price level where buying pressure is repeatedly strong enough to overcome selling pressure.\n• Also called the "Demand Zone". When price drops to a proven support, buyers step in to defend it.\n\n🧱 RESISTANCE LEVEL (THE PRICE CEILING):\n• A price level where selling pressure repeatedly halts upward rallies.\n• Also called the "Supply Zone". Institutions and profit-takers offload inventory here.\n\n🔄 THE ROLE REVERSAL PRINCIPLE:\nWhen a strong Resistance level is definitively broken upward on expanding volume, it flips and transforms into new Support for future retests!\n\n🌊 TREND IDENTIFICATION:\n• Uptrend: A clear sequence of Higher Highs (HH) and Higher Lows (HL). "The trend is your friend — trade with it!"\n• Downtrend: A sequence of Lower Highs (LH) and Lower Lows (LL).\n• Sideways / Consolidation: Price oscillates between horizontal support and resistance bounds.\n\n📊 ESSENTIAL TECHNICAL INDICATORS:\n• 50 & 200 EMA (Exponential Moving Average): The 200 EMA is the institutional benchmark for long-term trend health.\n• RSI (Relative Strength Index): Momentum oscillator (0 to 100). Above 70 indicates Overbought (potential pullback); Below 30 indicates Oversold (potential bounce).\n\n💡 PRO RULE:\nNever trade indicators alone. Always align your indicator signal with key Support/Resistance zones and candlestick patterns!`,
    quiz: [
      {
        question: 'What chart price zone acts as a floor where heavy buying demand repeatedly prevents further price falls?',
        options: ['Resistance Zone', 'Support / Demand Zone', 'Overbought Ceiling', 'Stop-Loss Cluster'],
        correct: 1,
      },
      {
        question: 'When a major Resistance ceiling is shattered upward on high volume, what does it typically become on a retest?',
        options: ['A dead zone', 'New Support Level', 'An immediate sell trigger', 'A gap-down level'],
        correct: 1,
      },
      {
        question: 'How is a healthy, sustainable Bullish Uptrend technically defined on a price chart?',
        options: ['A series of Lower Highs and Lower Lows', 'A flat horizontal line with zero volume', 'A consecutive series of Higher Highs and Higher Lows', 'A single green candle followed by three red candles'],
        correct: 2,
      },
      {
        question: 'On a 14-period RSI indicator, what does a reading above 70 traditionally signal?',
        options: ['Deep oversold conditions', 'Overbought momentum where a consolidation or pullback may occur', 'The exchange is closing', 'The stock has zero debt'],
        correct: 1,
      },
    ],
  },
  {
    id: '10',
    title: 'Trading Psychology & Risk Management',
    emoji: '🧠',
    duration: '9 min',
    xp: 90,
    content: `You can master the best technical strategy in the world, but without emotional discipline and money management, you will inevitably blow up your account.\n\n🛡️ THE 1% RISK RULE:\nNever risk losing more than 1% to 2% of your total trading capital on any single setup.\n• Example: With ₹10,00,000 capital, your maximum loss on a trade must be capped at ₹10,000.\n• If a stock costs ₹500 and your Stop Loss is ₹490 (₹10 risk/share), you can buy at most 1,000 shares (1,000 × ₹10 = ₹10,000 risk).\n\n⚖️ RISK-TO-REWARD RATIO (R:R):\nAlways demand at least a 1:2 Risk-to-Reward ratio.\n• If you risk ₹1,000 on a trade, your profit target must be at least ₹2,000.\n• Math Reality: With a 1:2 R:R, you can lose 60 out of 100 trades and STILL be profitable!\n\n💀 THE 3 DEADLIEST PSYCHOLOGICAL TRAPS:\n1. FOMO (Fear Of Missing Out): Jumping into a stock after it has already rallied 10% in the day, buying right into institutional profit-taking.\n2. Revenge Trading: Doubling your position size immediately after taking a loss to "win your money back right now". This is the #1 cause of blown accounts!\n3. Overtrading: Taking 20 random trades a day out of boredom instead of waiting patiently for high-probability setups.\n\n📖 THE PROFESSIONAL TRADER'S HABIT:\nMaintain a Trading Journal. Record entry price, exit price, technical reason for the trade, and your emotional state. Review it every weekend to eliminate recurring mistakes.\n\n💡 GOLDEN AXIOM:\n"Trading is the hardest way to make easy money." Treat it as a disciplined business, not a casino!`,
    quiz: [
      {
        question: 'Under the standard 1% Risk Management Rule, if your account balance is ₹10,00,000, what is your maximum acceptable risk per trade?',
        options: ['₹1,000', '₹10,000 (1%)', '₹50,000 (5%)', '₹1,00,000 (10%)'],
        correct: 1,
      },
      {
        question: 'With a disciplined 1:2 Risk-to-Reward ratio, what win rate do you need to remain consistently profitable over time?',
        options: ['100% win rate', 'At least 90%', 'Around 40% to 50% is sufficient', 'Win rate does not matter'],
        correct: 2,
      },
      {
        question: 'What dangerous psychological trap occurs when a trader doubles their position size in anger right after taking a loss?',
        options: ['Value investing', 'Revenge Trading', 'Hedging', 'Dollar-cost averaging'],
        correct: 1,
      },
      {
        question: 'What disciplined practice do elite market professionals maintain every week to systematically eliminate mistakes?',
        options: ['Following anonymous Telegram tips', 'Maintaining and reviewing a detailed Trading Journal', 'Trading with maximum leverage on margin', 'Never using a stop-loss'],
        correct: 1,
      },
    ],
  },
];

export default function Learn() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadProgress();
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      loadProfile();
    }, [])
  );

  const loadProgress = async () => {
    const saved = await AsyncStorage.getItem('completed_lessons');
    if (saved) setCompletedLessons(JSON.parse(saved));
  };

  const loadProfile = async () => {
    const savedXP = await AsyncStorage.getItem('total_xp');
    if (savedXP) setXp(parseInt(savedXP));
    const { data } = await supabase.auth.getUser();
    setUser(data?.user ?? null);
    if (data?.user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('xp, username')
        .eq('id', data.user.id)
        .single();
      if (p) {
        setXp(p.xp);
        setProfile(p);
      }
    } else {
      setProfile(null);
    }
  };

  const handleStartLesson = (lessonId: string) => {
    if (!user) {
      Alert.alert(
        'Login Required to Learn 🎓',
        'You are browsing as Guest. Sign up or login to unlock interactive lessons, complete quizzes, and earn XP to rank up your league!',
        [
          { text: 'Browse Only', style: 'cancel' },
          { text: 'Login / Sign Up 🚀', onPress: () => router.push('/auth' as any) },
        ]
      );
      return;
    }
    router.push(`/lesson/${lessonId}` as any);
  };

  const totalXP = LESSONS.reduce((sum, l) => sum + l.xp, 0);

  return (
    <SafeAreaView style={styles.container}>

      {/* Navbar */}
      <NavHeader />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Guest Banner if unauthenticated */}
        {!user && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/auth' as any)}
          >
            <Ionicons name="school-outline" size={18} color="#00C853" />
            <Text style={styles.guestBannerText}>Guest Mode: Login to unlock lessons & earn XP!</Text>
            <Ionicons name="chevron-forward" size={16} color="#00C853" />
          </TouchableOpacity>
        )}

        {/* Module Header */}
        <View style={styles.moduleHeader}>
          <Text style={styles.moduleLabel}>MODULE 1</Text>
          <View style={styles.moduleTitleRow}>
            <Text style={styles.moduleTitle} numberOfLines={1}>Beginner Lessons</Text>
            <Text style={styles.moduleProgress} numberOfLines={1}>
              {completedLessons.length}/{LESSONS.length} Completed
            </Text>
          </View>
          <View style={styles.moduleProgressBar}>
            <View style={[styles.moduleProgressFill, {
              width: `${(completedLessons.length / LESSONS.length) * 100}%`
            }]} />
          </View>
        </View>

        {/* Path */}
        <View style={styles.pathContainer}>
          {LESSONS.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const isLocked = index > 0 && !completedLessons.includes(LESSONS[index - 1].id);
            const isCurrent = !isCompleted && !isLocked;

            return (
              <View key={lesson.id} style={styles.pathItem}>

                {/* Line Top */}
                {index > 0 && (
                  <View style={[styles.pathLine, { backgroundColor: isCompleted || isCurrent ? '#00C853' : '#1a1a1a' }]} />
                )}

                {/* Circle Center */}
                <View style={styles.circleWrapper}>
                  {isCurrent && <View style={styles.currentGlow} />}
                  {isCurrent && (
                    <View style={styles.startLabel}>
                      <Text style={styles.startText}>START</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.circle,
                      isCompleted && styles.circleCompleted,
                      isCurrent && styles.circleCurrent,
                      isLocked && styles.circleLocked,
                    ]}
                    onPress={() => !isLocked && handleStartLesson(lesson.id)}
                    disabled={isLocked}
                  >
                    {isCompleted && <Ionicons name="checkmark" size={22} color="#000" />}
                    {isCurrent && <Ionicons name="play" size={22} color="#000" />}
                    {isLocked && <Ionicons name="lock-closed" size={20} color="#555" />}
                  </TouchableOpacity>
                </View>

                {/* Line Middle */}
                <View style={[styles.pathLineShort, { backgroundColor: isCompleted || isCurrent ? '#00C853' : '#1a1a1a' }]} />

                {/* Lesson Card Full Width */}
                <TouchableOpacity
                  style={[
                    styles.lessonCard,
                    isCompleted && styles.lessonCardCompleted,
                    isCurrent && styles.lessonCardCurrent,
                    isLocked && styles.lessonCardLocked,
                  ]}
                  onPress={() => !isLocked && handleStartLesson(lesson.id)}
                  disabled={isLocked}
                >
                  <Text style={[styles.lessonTitle, isLocked && styles.lockedText]}>
                    {lesson.title}
                  </Text>
                  {isCurrent && <Text style={styles.lessonSubtitle}>Tap to start</Text>}
                  <View style={styles.xpRow}>
                    {isCurrent && <Ionicons name="trophy-outline" size={12} color="#00C853" />}
                    <Text style={[styles.lessonXP, isLocked && { color: '#555' }]}>+ {lesson.xp} XP</Text>
                  </View>
                </TouchableOpacity>

              </View>
            );
          })}

          {/* Bottom padding */}
          <View style={{ height: 32 }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
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
  moduleHeader: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1a2a1a',
  },
  moduleLabel: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    minWidth: 0,
  },
  moduleProgress: {
    color: '#888',
    fontSize: 12,
    flexShrink: 0,
  },
  moduleProgressBar: {
    height: 6,
    backgroundColor: '#1a2a1a',
    borderRadius: 3,
  },
  moduleProgressFill: {
    height: 6,
    backgroundColor: '#00C853',
    borderRadius: 3,
  },
  pathContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pathItem: {
    alignItems: 'center',
    width: '100%',
  },
  pathLine: {
    width: 2,
    height: 24,
  },
  pathLineShort: {
    width: 2,
    height: 16,
},
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  circleWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  },
  currentGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00C853',
    opacity: 0.15,
  },
  startLabel: {
    position: 'absolute',
    top: -22,
    backgroundColor: '#00C853',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  startText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  circleCurrent: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  lessonCard: {
    width: '80%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lessonTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
    textAlign: 'center',
  },
  circleCompleted: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  circleLocked: {
    backgroundColor: '#111',
    borderColor: '#1a1a1a',
  },
  lessonCardCompleted: {
    borderColor: '#00C853',
    backgroundColor: '#0d1a0d',
  },
  lessonCardCurrent: {
    borderColor: '#00C853',
    backgroundColor: '#0d1a0d',
  },
  lessonCardLocked: {
    opacity: 0.4,
  },
  lessonSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  lockedText: {
    color: '#555',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonXP: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
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
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
    overflow: 'hidden',
  },
  guestBannerText: {
    flex: 1,
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
  },
});