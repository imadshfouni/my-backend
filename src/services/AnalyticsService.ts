import { ForexDataService } from './ForexDataService';
import fs from 'fs';
import path from 'path';

/**
 * Price data point interface
 */
export interface PriceDataPoint {
  timestamp: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume?: number;
}

/**
 * Historical price data interface
 */
export interface HistoricalPriceData {
  symbol: string;
  timeframe: string;
  data: PriceDataPoint[];
  lastUpdated: number;
}

/**
 * Market sentiment data
 */
export interface MarketSentiment {
  symbol: string;
  bullishPercentage: number;
  bearishPercentage: number;
  neutralPercentage: number;
  source: string;
  lastUpdated: number;
}

/**
 * Technical indicator result
 */
export interface TechnicalIndicatorResult {
  symbol: string;
  indicator: string;
  value: number | string;
  signal?: 'buy' | 'sell' | 'neutral';
  parameters?: Record<string, any>;
  timestamp: number;
}

/**
 * Market correlation data
 */
export interface MarketCorrelation {
  symbolPair: [string, string];
  correlation: number;
  period: string;
  timestamp: number;
}

/**
 * Analytics service for forex market data analysis
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private forexService: ForexDataService;
  private dataDir: string;
  private historicalDataCache: Record<string, HistoricalPriceData> = {};
  private sentimentCache: Record<string, MarketSentiment> = {};
  private indicatorCache: Record<string, Record<string, TechnicalIndicatorResult>> = {};
  private correlationCache: Record<string, MarketCorrelation> = {};
  
  // Popular forex pairs
  private popularPairs = [
    'EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 
    'AUD/USD', 'USD/CAD', 'NZD/USD'
  ];
  
  // Supported timeframes
  private timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M'];
  
  // Singleton pattern
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  private constructor() {
    this.forexService = ForexDataService.getInstance();
    this.dataDir = path.join(process.cwd(), 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir);
    }
    
    // Load cached data
    this.loadCachedData();
    
    // Initialize with demo data if needed
    if (Object.keys(this.historicalDataCache).length === 0) {
      this.initializeDemoData();
      this.saveCachedData();
    }
  }
  
  /**
   * Load cached data from files
   */
  private loadCachedData(): void {
    try {
      // Load historical price data
      const historicalDataPath = path.join(this.dataDir, 'historical_price_data.json');
      if (fs.existsSync(historicalDataPath)) {
        this.historicalDataCache = JSON.parse(fs.readFileSync(historicalDataPath, 'utf8'));
      }
      
      // Load sentiment data
      const sentimentPath = path.join(this.dataDir, 'market_sentiment.json');
      if (fs.existsSync(sentimentPath)) {
        this.sentimentCache = JSON.parse(fs.readFileSync(sentimentPath, 'utf8'));
      }
      
      // Load indicator results
      const indicatorsPath = path.join(this.dataDir, 'technical_indicators.json');
      if (fs.existsSync(indicatorsPath)) {
        this.indicatorCache = JSON.parse(fs.readFileSync(indicatorsPath, 'utf8'));
      }
      
      // Load correlations
      const correlationsPath = path.join(this.dataDir, 'market_correlations.json');
      if (fs.existsSync(correlationsPath)) {
        this.correlationCache = JSON.parse(fs.readFileSync(correlationsPath, 'utf8'));
      }
      
    } catch (error) {
      console.error('Error loading analytics cached data:', error);
    }
  }
  
  /**
   * Save cached data to files
   */
  private saveCachedData(): void {
    try {
      // Save historical price data
      fs.writeFileSync(
        path.join(this.dataDir, 'historical_price_data.json'),
        JSON.stringify(this.historicalDataCache, null, 2)
      );
      
      // Save sentiment data
      fs.writeFileSync(
        path.join(this.dataDir, 'market_sentiment.json'),
        JSON.stringify(this.sentimentCache, null, 2)
      );
      
      // Save indicator results
      fs.writeFileSync(
        path.join(this.dataDir, 'technical_indicators.json'),
        JSON.stringify(this.indicatorCache, null, 2)
      );
      
      // Save correlations
      fs.writeFileSync(
        path.join(this.dataDir, 'market_correlations.json'),
        JSON.stringify(this.correlationCache, null, 2)
      );
      
    } catch (error) {
      console.error('Error saving analytics cached data:', error);
    }
  }
  
  /**
   * Initialize with demo data
   */
  private initializeDemoData(): void {
    // Generate historical data for popular pairs
    this.popularPairs.forEach(symbol => {
      this.generateDemoHistoricalData(symbol, 'D'); // Daily timeframe
      this.generateDemoHistoricalData(symbol, '4h'); // 4-hour timeframe
      this.generateDemoHistoricalData(symbol, '1h'); // 1-hour timeframe
    });
    
    // Generate sentiment data
    this.popularPairs.forEach(symbol => {
      this.sentimentCache[symbol] = this.generateDemoSentiment(symbol);
    });
    
    // Generate technical indicators
    this.popularPairs.forEach(symbol => {
      this.indicatorCache[symbol] = {
        'MA_20': this.generateDemoIndicator(symbol, 'MA_20'),
        'MA_50': this.generateDemoIndicator(symbol, 'MA_50'),
        'MA_200': this.generateDemoIndicator(symbol, 'MA_200'),
        'RSI_14': this.generateDemoIndicator(symbol, 'RSI_14'),
        'MACD': this.generateDemoIndicator(symbol, 'MACD'),
        'Bollinger_20_2': this.generateDemoIndicator(symbol, 'Bollinger_20_2')
      };
    });
    
    // Generate correlations
    for (let i = 0; i < this.popularPairs.length; i++) {
      for (let j = i + 1; j < this.popularPairs.length; j++) {
        const key = `${this.popularPairs[i]}_${this.popularPairs[j]}`;
        this.correlationCache[key] = this.generateDemoCorrelation(this.popularPairs[i], this.popularPairs[j]);
      }
    }
  }
  
  /**
   * Generate demo historical data for a symbol and timeframe
   */
  private generateDemoHistoricalData(symbol: string, timeframe: string): void {
    const now = Date.now();
    const data: PriceDataPoint[] = [];
    
    // Get base price for this symbol from ForexDataService
    const rate = this.forexService.getRate(symbol);
    const basePrice = rate ? ((rate.bid + rate.ask) / 2) : this.getBasePrice(symbol);
    
    // Determine time interval based on timeframe
    let interval: number;
    let numPoints: number;
    
    switch (timeframe) {
      case '1m':
        interval = 60 * 1000; // 1 minute in ms
        numPoints = 60 * 24; // 24 hours of data
        break;
      case '5m':
        interval = 5 * 60 * 1000; // 5 minutes in ms
        numPoints = 12 * 24; // 24 hours of data
        break;
      case '15m':
        interval = 15 * 60 * 1000; // 15 minutes in ms
        numPoints = 4 * 24; // 24 hours of data
        break;
      case '30m':
        interval = 30 * 60 * 1000; // 30 minutes in ms
        numPoints = 2 * 24; // 24 hours of data
        break;
      case '1h':
        interval = 60 * 60 * 1000; // 1 hour in ms
        numPoints = 24 * 7; // 1 week of data
        break;
      case '4h':
        interval = 4 * 60 * 60 * 1000; // 4 hours in ms
        numPoints = 6 * 7; // 1 week of data
        break;
      case 'D':
        interval = 24 * 60 * 60 * 1000; // 1 day in ms
        numPoints = 30; // 1 month of data
        break;
      case 'W':
        interval = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
        numPoints = 12; // 12 weeks of data
        break;
      case 'M':
        interval = 30 * 24 * 60 * 60 * 1000; // Approximately 1 month in ms
        numPoints = 12; // 1 year of data
        break;
      default:
        interval = 24 * 60 * 60 * 1000; // Default to daily
        numPoints = 30;
    }
    
    // Generate realistic price data with trends and volatility
    let currentPrice = basePrice;
    let trend = 0;
    let trendStrength = 0;
    let trendDuration = 0;
    let trendMaxDuration = Math.floor(numPoints / 4);
    
    for (let i = numPoints; i > 0; i--) {
      const timestamp = now - (i * interval);
      
      // Update trend occasionally
      if (trendDuration >= trendMaxDuration || Math.random() < 0.1) {
        trend = (Math.random() - 0.5) * 0.02; // -1% to 1% trend
        trendStrength = Math.random() * 0.8 + 0.2; // 0.2 to 1.0 strength
        trendDuration = 0;
        trendMaxDuration = Math.floor(Math.random() * numPoints / 3) + 3; // 3 to numPoints/3 duration
      }
      
      // Apply trend with some volatility
      const volatility = this.getVolatility(symbol) * 0.002; // 0.2% base volatility scaled by pair
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = trend * trendStrength;
      
      currentPrice = currentPrice * (1 + trendFactor + randomFactor);
      
      // Calculate price ranges for this candle
      const open = currentPrice;
      const range = currentPrice * volatility * (0.5 + Math.random() * 0.5);
      const close = currentPrice * (1 + (Math.random() - 0.5) * volatility * 0.5);
      
      const high = Math.max(open, close) + Math.random() * range;
      const low = Math.min(open, close) - Math.random() * range;
      
      // Volume is more for popular pairs and during high volatility
      const volumeFactor = this.getVolumeFactor(symbol) * (1 + Math.abs(randomFactor) * 10);
      const volume = Math.round(1000 * volumeFactor);
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume
      });
      
      // Update for next iteration
      currentPrice = close;
      trendDuration++;
    }
    
    // Store in cache
    const cacheKey = `${symbol}_${timeframe}`;
    this.historicalDataCache[cacheKey] = {
      symbol,
      timeframe,
      data,
      lastUpdated: now
    };
  }
  
  /**
   * Generate demo sentiment data
   */
  private generateDemoSentiment(symbol: string): MarketSentiment {
    // Random sentiment but weighted by recent price action from historical data
    const dailyData = this.historicalDataCache[`${symbol}_D`];
    
    let bullishBias = 0.5; // Neutral starting point
    
    if (dailyData) {
      const recentPrices = dailyData.data.slice(-5); // Last 5 days
      
      if (recentPrices.length >= 2) {
        const firstPrice = recentPrices[0].close;
        const lastPrice = recentPrices[recentPrices.length - 1].close;
        
        const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        // Adjust bullish bias based on recent price change
        bullishBias += (percentChange / 10); // Each 1% change shifts sentiment by 0.1
      }
    }
    
    // Constrain to a reasonable range
    bullishBias = Math.max(0.2, Math.min(0.8, bullishBias));
    
    // Add some randomness
    let bullishPercentage = Math.round((bullishBias + (Math.random() - 0.5) * 0.2) * 100);
    let bearishPercentage = Math.round((1 - bullishBias + (Math.random() - 0.5) * 0.1) * 100);
    
    // Ensure total doesn't exceed 100%
    let neutralPercentage = 100 - bullishPercentage - bearishPercentage;
    if (neutralPercentage < 0) {
      // Adjust proportionally if total exceeds 100%
      const total = bullishPercentage + bearishPercentage;
      const bullishRatio = bullishPercentage / total;
      
      neutralPercentage = 0;
      bullishPercentage = Math.round(bullishRatio * 100);
      bearishPercentage = 100 - bullishPercentage;
    }
    
    return {
      symbol,
      bullishPercentage,
      bearishPercentage,
      neutralPercentage,
      source: 'Forex Advisor Analytics',
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Generate demo technical indicator
   */
  private generateDemoIndicator(symbol: string, indicator: string): TechnicalIndicatorResult {
    // Get latest price
    const rate = this.forexService.getRate(symbol);
    const price = rate ? ((rate.bid + rate.ask) / 2) : this.getBasePrice(symbol);
    
    let value: number | string;
    let signal: 'buy' | 'sell' | 'neutral';
    const parameters: Record<string, any> = {};
    
    switch (indicator) {
      case 'MA_20': {
        // 20-period Moving Average
        const variance = (Math.random() - 0.5) * 0.01 * price;
        value = price + variance;
        signal = variance < 0 ? 'buy' : 'sell';
        parameters.period = 20;
        break;
      }
      case 'MA_50': {
        // 50-period Moving Average
        const variance = (Math.random() - 0.5) * 0.02 * price;
        value = price + variance;
        signal = variance < 0 ? 'buy' : 'sell';
        parameters.period = 50;
        break;
      }
      case 'MA_200': {
        // 200-period Moving Average
        const variance = (Math.random() - 0.5) * 0.03 * price;
        value = price + variance;
        signal = variance < 0 ? 'buy' : 'sell';
        parameters.period = 200;
        break;
      }
      case 'RSI_14': {
        // 14-period Relative Strength Index
        value = Math.round(Math.random() * 50 + 25); // 25-75 range
        signal = value < 30 ? 'buy' : (value > 70 ? 'sell' : 'neutral');
        parameters.period = 14;
        parameters.overbought = 70;
        parameters.oversold = 30;
        break;
      }
      case 'MACD': {
        // MACD with standard parameters (12,26,9)
        const macdLine = (Math.random() - 0.5) * 0.002 * price;
        const signalLine = macdLine + (Math.random() - 0.5) * 0.001 * price;
        const histogram = macdLine - signalLine;
        
        value = `MACD: ${macdLine.toFixed(5)}, Signal: ${signalLine.toFixed(5)}, Hist: ${histogram.toFixed(5)}`;
        signal = histogram > 0 ? 'buy' : (histogram < 0 ? 'sell' : 'neutral');
        parameters.fastPeriod = 12;
        parameters.slowPeriod = 26;
        parameters.signalPeriod = 9;
        break;
      }
      case 'Bollinger_20_2': {
        // Bollinger Bands with 20 period and 2 standard deviations
        const middle = price;
        const deviation = price * 0.001 * this.getVolatility(symbol);
        const upper = middle + 2 * deviation;
        const lower = middle - 2 * deviation;
        
        value = `Middle: ${middle.toFixed(5)}, Upper: ${upper.toFixed(5)}, Lower: ${lower.toFixed(5)}`;
        signal = price > upper ? 'sell' : (price < lower ? 'buy' : 'neutral');
        parameters.period = 20;
        parameters.deviations = 2;
        break;
      }
      default: {
        // Generic indicator
        value = price;
        signal = 'neutral';
      }
    }
    
    return {
      symbol,
      indicator,
      value,
      signal,
      parameters,
      timestamp: Date.now()
    };
  }
  
  /**
   * Generate demo correlation data
   */
  private generateDemoCorrelation(symbol1: string, symbol2: string): MarketCorrelation {
    // Some pairs are naturally more correlated than others
    let baseCorrelation = 0;
    
    // EUR and GBP pairs tend to be positively correlated
    if ((symbol1.includes('EUR') && symbol2.includes('GBP')) || 
        (symbol1.includes('GBP') && symbol2.includes('EUR'))) {
      baseCorrelation = 0.7;
    }
    // USD/CHF and EUR/USD are often negatively correlated
    else if ((symbol1 === 'USD/CHF' && symbol2 === 'EUR/USD') || 
             (symbol1 === 'EUR/USD' && symbol2 === 'USD/CHF')) {
      baseCorrelation = -0.8;
    }
    // AUD and NZD pairs are often positively correlated
    else if ((symbol1.includes('AUD') && symbol2.includes('NZD')) || 
             (symbol1.includes('NZD') && symbol2.includes('AUD'))) {
      baseCorrelation = 0.85;
    }
    // EUR/JPY correlation with both EUR/USD and USD/JPY
    else if ((symbol1 === 'EUR/JPY' && (symbol2 === 'EUR/USD' || symbol2 === 'USD/JPY')) || 
             ((symbol1 === 'EUR/USD' || symbol1 === 'USD/JPY') && symbol2 === 'EUR/JPY')) {
      baseCorrelation = 0.5;
    }
    // Default random correlation for other pairs
    else {
      baseCorrelation = (Math.random() * 1.8) - 0.9; // -0.9 to 0.9
    }
    
    // Add some randomness
    const correlation = Math.max(-1, Math.min(1, baseCorrelation + (Math.random() - 0.5) * 0.2));
    
    return {
      symbolPair: [symbol1, symbol2],
      correlation: parseFloat(correlation.toFixed(2)),
      period: '30D', // 30 day correlation
      timestamp: Date.now()
    };
  }
  
  /**
   * Get historical price data
   */
  public getHistoricalData(symbol: string, timeframe: string): HistoricalPriceData | null {
    const cacheKey = `${symbol}_${timeframe}`;
    return this.historicalDataCache[cacheKey] || null;
  }
  
  /**
   * Get sentiment data for a symbol
   */
  public getSentiment(symbol: string): MarketSentiment | null {
    return this.sentimentCache[symbol] || null;
  }
  
  /**
   * Get all sentiment data
   */
  public getAllSentiments(): MarketSentiment[] {
    return Object.values(this.sentimentCache);
  }
  
  /**
   * Get technical indicator for a symbol
   */
  public getIndicator(symbol: string, indicator: string): TechnicalIndicatorResult | null {
    return this.indicatorCache[symbol]?.[indicator] || null;
  }
  
  /**
   * Get all technical indicators for a symbol
   */
  public getAllIndicators(symbol: string): TechnicalIndicatorResult[] | null {
    if (!this.indicatorCache[symbol]) {
      return null;
    }
    
    return Object.values(this.indicatorCache[symbol]);
  }
  
  /**
   * Get correlation between two symbols
   */
  public getCorrelation(symbol1: string, symbol2: string): MarketCorrelation | null {
    const key1 = `${symbol1}_${symbol2}`;
    const key2 = `${symbol2}_${symbol1}`;
    
    return this.correlationCache[key1] || this.correlationCache[key2] || null;
  }
  
  /**
   * Get all correlations
   */
  public getAllCorrelations(): MarketCorrelation[] {
    return Object.values(this.correlationCache);
  }
  
  /**
   * Get popular symbols
   */
  public getPopularSymbols(): string[] {
    return [...this.popularPairs];
  }
  
  /**
   * Get available timeframes
   */
  public getTimeframes(): string[] {
    return [...this.timeframes];
  }
  
  /**
   * Calculate simple moving average
   */
  public calculateSMA(data: PriceDataPoint[], period: number): number | null {
    if (data.length < period) {
      return null;
    }
    
    const prices = data.slice(-period).map(d => d.close);
    const sum = prices.reduce((total, price) => total + price, 0);
    return sum / period;
  }
  
  /**
   * Calculate relative strength index
   */
  public calculateRSI(data: PriceDataPoint[], period: number = 14): number | null {
    if (data.length <= period) {
      return null;
    }
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i-1].close;
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using smoothed method
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;
      
      if (change >= 0) {
        avgGain = ((avgGain * (period - 1)) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = ((avgLoss * (period - 1)) - change) / period;
      }
    }
    
    // Calculate RS and RSI
    if (avgLoss === 0) {
      return 100; // No losses means RSI = 100
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return parseFloat(rsi.toFixed(2));
  }
  
  /**
   * Helper functions for generating realistic demo data
   */
  
  private getBasePrice(symbol: string): number {
    switch (symbol) {
      case 'EUR/USD': return 1.10752;
      case 'USD/JPY': return 148.056;
      case 'GBP/USD': return 1.27841;
      case 'USD/CHF': return 0.89645;
      case 'AUD/USD': return 0.65847;
      case 'USD/CAD': return 1.36524;
      case 'NZD/USD': return 0.61286;
      case 'EUR/GBP': return 0.86635;
      case 'EUR/JPY': return 164.073;
      case 'GBP/JPY': return 189.375;
      default: return 1.0000;
    }
  }
  
  private getVolatility(symbol: string): number {
    switch (symbol) {
      case 'EUR/USD': return 0.8;  // Less volatile
      case 'USD/JPY': return 1.0;
      case 'GBP/USD': return 1.2;  // More volatile
      case 'USD/CHF': return 0.9;
      case 'AUD/USD': return 1.1;
      case 'USD/CAD': return 0.9;
      case 'NZD/USD': return 1.2;
      case 'EUR/GBP': return 0.7;  // Less volatile
      case 'EUR/JPY': return 1.3;  // More volatile
      case 'GBP/JPY': return 1.5;  // Most volatile
      default: return 1.0;
    }
  }
  
  private getVolumeFactor(symbol: string): number {
    switch (symbol) {
      case 'EUR/USD': return 2.0;  // Highest volume
      case 'USD/JPY': return 1.5;
      case 'GBP/USD': return 1.2;
      case 'USD/CHF': return 0.9;
      case 'AUD/USD': return 0.8;
      case 'USD/CAD': return 0.7;
      case 'NZD/USD': return 0.5;  // Lower volume
      case 'EUR/GBP': return 0.8;
      case 'EUR/JPY': return 0.7;
      case 'GBP/JPY': return 0.6;
      default: return 1.0;
    }
  }
  
  /**
   * Generate dashboard data summary for quick overview
   */
  public generateDashboardSummary(): any {
    const now = Date.now();
    const currentRates = this.forexService.getRates();
    const topMovers = Object.values(currentRates)
      .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
      .slice(0, 5);
    
    // Get some recent market news
    const marketNews = this.forexService.getNews(5);
    
    // Get upcoming economic events
    const economicEvents = this.forexService.getEconomicCalendar(7);
    
    // Count buy/sell signals across all pairs
    let buySignals = 0;
    let sellSignals = 0;
    let neutralSignals = 0;
    
    Object.values(this.indicatorCache).forEach(indicators => {
      Object.values(indicators).forEach(indicator => {
        if (indicator.signal === 'buy') buySignals++;
        else if (indicator.signal === 'sell') sellSignals++;
        else neutralSignals++;
      });
    });
    
    return {
      timestamp: now,
      marketOverview: {
        topMovers,
        signalsSummary: {
          buy: buySignals,
          sell: sellSignals,
          neutral: neutralSignals
        }
      },
      recentNews: marketNews,
      upcomingEvents: economicEvents.slice(0, 5)
    };
  }
}