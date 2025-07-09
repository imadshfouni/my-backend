import axios from 'axios';
import schedule from 'node-schedule';
import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../utils/config';

// Forex data types
export interface ForexRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  change: number;
  changePercentage: number;
}

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  timestamp: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  impact?: 'high' | 'medium' | 'low';
}

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
  actual?: string;
}

export class ForexDataService {
  private static instance: ForexDataService;
  private apiKey: string;
  private baseUrl: string;
  private rates: Record<string, ForexRate> = {};
  private news: MarketNews[] = [];
  private economicCalendar: EconomicCalendarEvent[] = [];
  private dataDir: string;
  private popularSymbols: string[] = [
    'EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 
    'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 
    'EUR/JPY', 'GBP/JPY'
  ];
  
  // Singleton pattern
  public static getInstance(): ForexDataService {
    if (!ForexDataService.instance) {
      ForexDataService.instance = new ForexDataService();
    }
    return ForexDataService.instance;
  }
  
  private constructor() {
    this.apiKey = ConfigManager.get('FOREX_API_KEY', 'demo_key');
    this.baseUrl = ConfigManager.get('FOREX_API_URL', 'https://api.forexapi.example.com');
    this.dataDir = path.join(process.cwd(), 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir);
    }
    
    // Load cached data if available
    this.loadCachedData();
    
    // Initialize demo data if no API key is provided
    if (this.apiKey === 'demo_key') {
      console.warn('Using demo forex data. Set FOREX_API_KEY for real data.');
      this.initializeDemoData();
    }
  }
  
  /**
   * Initialize the service and start data fetching schedules
   */
  public initialize(): void {
    // Schedule rate updates every minute
    schedule.scheduleJob('*/1 * * * *', this.updateRates.bind(this));
    
    // Schedule news updates every 15 minutes
    schedule.scheduleJob('*/15 * * * *', this.updateNews.bind(this));
    
    // Schedule economic calendar updates once per day
    schedule.scheduleJob('0 0 * * *', this.updateEconomicCalendar.bind(this));
    
    // Initial data fetch
    this.updateRates();
    this.updateNews();
    this.updateEconomicCalendar();
    
    console.log('ForexDataService initialized');
  }
  
  /**
   * Get latest rates for all tracked symbols
   */
  public getRates(): Record<string, ForexRate> {
    return this.rates;
  }
  
  /**
   * Get rate for specific symbol
   */
  public getRate(symbol: string): ForexRate | null {
    return this.rates[symbol] || null;
  }
  
  /**
   * Get latest market news
   */
  public getNews(limit: number = 10): MarketNews[] {
    return this.news.slice(0, limit);
  }
  
  /**
   * Get economic calendar events
   */
  public getEconomicCalendar(days: number = 7): EconomicCalendarEvent[] {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    return this.economicCalendar.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
  
  /**
   * Update forex rates
   * Fetches latest rates from API or generates demo data
   */
  private async updateRates(): Promise<void> {
    try {
      if (this.apiKey !== 'demo_key') {
        // Real API call
        const response = await axios.get(`${this.baseUrl}/rates`, {
          params: {
            api_key: this.apiKey,
            symbols: this.popularSymbols.join(',')
          }
        });
        
        if (response.data && response.data.rates) {
          this.rates = response.data.rates;
        }
      } else {
        // Generate demo data
        this.updateDemoRates();
      }
      
      // Save updated rates
      this.saveCachedData();
      
    } catch (error) {
      console.error('Error updating forex rates:', error);
    }
  }
  
  /**
   * Update market news
   * Fetches latest news from API or generates demo data
   */
  private async updateNews(): Promise<void> {
    try {
      if (this.apiKey !== 'demo_key') {
        // Real API call
        const response = await axios.get(`${this.baseUrl}/news`, {
          params: {
            api_key: this.apiKey,
            limit: 20
          }
        });
        
        if (response.data && response.data.news) {
          this.news = response.data.news;
        }
      } else {
        // Generate demo data
        this.updateDemoNews();
      }
      
      // Save updated news
      this.saveCachedData();
      
    } catch (error) {
      console.error('Error updating market news:', error);
    }
  }
  
  /**
   * Update economic calendar
   * Fetches upcoming economic events from API or generates demo data
   */
  private async updateEconomicCalendar(): Promise<void> {
    try {
      if (this.apiKey !== 'demo_key') {
        // Real API call
        const response = await axios.get(`${this.baseUrl}/calendar`, {
          params: {
            api_key: this.apiKey,
            days: 14
          }
        });
        
        if (response.data && response.data.events) {
          this.economicCalendar = response.data.events;
        }
      } else {
        // Generate demo data
        this.updateDemoEconomicCalendar();
      }
      
      // Save updated calendar
      this.saveCachedData();
      
    } catch (error) {
      console.error('Error updating economic calendar:', error);
    }
  }
  
  /**
   * Save data to cache files
   */
  private saveCachedData(): void {
    try {
      // Save rates
      fs.writeFileSync(
        path.join(this.dataDir, 'forex_rates.json'),
        JSON.stringify(this.rates, null, 2)
      );
      
      // Save news
      fs.writeFileSync(
        path.join(this.dataDir, 'market_news.json'),
        JSON.stringify(this.news, null, 2)
      );
      
      // Save economic calendar
      fs.writeFileSync(
        path.join(this.dataDir, 'economic_calendar.json'),
        JSON.stringify(this.economicCalendar, null, 2)
      );
      
    } catch (error) {
      console.error('Error saving cached forex data:', error);
    }
  }
  
  /**
   * Load data from cache files
   */
  private loadCachedData(): void {
    try {
      // Load rates
      const ratesPath = path.join(this.dataDir, 'forex_rates.json');
      if (fs.existsSync(ratesPath)) {
        this.rates = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
      }
      
      // Load news
      const newsPath = path.join(this.dataDir, 'market_news.json');
      if (fs.existsSync(newsPath)) {
        this.news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
      }
      
      // Load economic calendar
      const calendarPath = path.join(this.dataDir, 'economic_calendar.json');
      if (fs.existsSync(calendarPath)) {
        this.economicCalendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
      }
      
    } catch (error) {
      console.error('Error loading cached forex data:', error);
    }
  }
  
  /**
   * Initialize demo data
   */
  private initializeDemoData(): void {
    // Initialize rates
    this.popularSymbols.forEach(symbol => {
      const basePrice = this.getBasePrice(symbol);
      this.rates[symbol] = {
        symbol,
        bid: basePrice - 0.0002,
        ask: basePrice + 0.0002,
        timestamp: Date.now(),
        change: 0,
        changePercentage: 0
      };
    });
    
    // Initialize news
    this.updateDemoNews();
    
    // Initialize economic calendar
    this.updateDemoEconomicCalendar();
  }
  
  /**
   * Update demo rates with realistic changes
   */
  private updateDemoRates(): void {
    const now = Date.now();
    
    for (const symbol of this.popularSymbols) {
      const currentRate = this.rates[symbol] || {
        symbol,
        bid: this.getBasePrice(symbol) - 0.0002,
        ask: this.getBasePrice(symbol) + 0.0002,
        timestamp: now,
        change: 0,
        changePercentage: 0
      };
      
      // Calculate random price movement
      const volatility = 0.0005; // 5 pips
      const movement = (Math.random() - 0.5) * volatility * 2;
      
      // Calculate new prices
      const midPrice = (currentRate.bid + currentRate.ask) / 2;
      const newMidPrice = midPrice + movement;
      const newBid = newMidPrice - 0.0002;
      const newAsk = newMidPrice + 0.0002;
      
      // Calculate changes from previous day
      const previousDayPrice = this.getBasePrice(symbol);
      const change = newMidPrice - previousDayPrice;
      const changePercentage = (change / previousDayPrice) * 100;
      
      // Update rate
      this.rates[symbol] = {
        symbol,
        bid: parseFloat(newBid.toFixed(5)),
        ask: parseFloat(newAsk.toFixed(5)),
        timestamp: now,
        change: parseFloat(change.toFixed(5)),
        changePercentage: parseFloat(changePercentage.toFixed(3))
      };
    }
  }
  
  /**
   * Update demo news with realistic looking entries
   */
  private updateDemoNews(): void {
    const now = Date.now();
    const newsItems: MarketNews[] = [
      {
        id: `news-${now}-1`,
        title: 'Fed Signals Possible Rate Cut in Next Meeting',
        summary: 'Federal Reserve officials hinted at a potential interest rate cut in the upcoming meeting, citing improved inflation data and moderate economic growth.',
        url: 'https://example.com/fed-signals-rate-cut',
        source: 'Financial Times',
        timestamp: now - 3600000, // 1 hour ago
        sentiment: 'positive',
        impact: 'high'
      },
      {
        id: `news-${now}-2`,
        title: 'ECB Holds Rates Steady Despite Growth Concerns',
        summary: 'The European Central Bank maintained its key interest rates on Thursday, despite growing concerns about economic slowdown in the eurozone.',
        url: 'https://example.com/ecb-holds-rates',
        source: 'Bloomberg',
        timestamp: now - 7200000, // 2 hours ago
        sentiment: 'neutral',
        impact: 'medium'
      },
      {
        id: `news-${now}-3`,
        title: 'Bank of Japan Considers Policy Adjustment as Yen Weakens',
        summary: 'The Bank of Japan is reviewing its monetary policy stance as the yen continues to depreciate against major currencies, sources say.',
        url: 'https://example.com/boj-policy-review',
        source: 'Reuters',
        timestamp: now - 10800000, // 3 hours ago
        sentiment: 'neutral',
        impact: 'medium'
      },
      {
        id: `news-${now}-4`,
        title: 'US Dollar Strengthens on Robust Employment Data',
        summary: 'The US dollar gained against major currencies after the latest employment report showed stronger than expected job growth in the previous month.',
        url: 'https://example.com/dollar-strengthens',
        source: 'CNBC',
        timestamp: now - 18000000, // 5 hours ago
        sentiment: 'positive',
        impact: 'high'
      },
      {
        id: `news-${now}-5`,
        title: 'Oil Prices Surge Amid Middle East Tensions',
        summary: 'Crude oil prices jumped 3% on renewed geopolitical tensions in the Middle East, potentially affecting currency markets and inflation outlooks.',
        url: 'https://example.com/oil-prices-surge',
        source: 'Wall Street Journal',
        timestamp: now - 86400000, // 1 day ago
        sentiment: 'negative',
        impact: 'high'
      }
    ];
    
    // Merge with existing news, keeping the newest 20 items
    this.news = [...newsItems, ...this.news.slice(0, 15)];
  }
  
  /**
   * Update demo economic calendar with realistic looking events
   */
  private updateDemoEconomicCalendar(): void {
    const today = new Date();
    const events: EconomicCalendarEvent[] = [];
    
    // Generate events for the next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      // Add some events for this date
      if (i % 2 === 0) { // Every other day
        events.push({
          id: `event-${dateString}-1`,
          title: 'US Non-Farm Payrolls',
          country: 'United States',
          date: dateString,
          time: '12:30 GMT',
          impact: 'high',
          forecast: '180K',
          previous: '175K'
        });
        
        events.push({
          id: `event-${dateString}-2`,
          title: 'Unemployment Rate',
          country: 'United States',
          date: dateString,
          time: '12:30 GMT',
          impact: 'high',
          forecast: '3.9%',
          previous: '4.0%'
        });
      }
      
      if (i % 3 === 0) { // Every third day
        events.push({
          id: `event-${dateString}-3`,
          title: 'ECB Interest Rate Decision',
          country: 'Eurozone',
          date: dateString,
          time: '11:45 GMT',
          impact: 'high',
          forecast: '3.75%',
          previous: '3.75%'
        });
      }
      
      if (i % 4 === 0) { // Every fourth day
        events.push({
          id: `event-${dateString}-4`,
          title: 'BoE Monetary Policy Report',
          country: 'United Kingdom',
          date: dateString,
          time: '11:00 GMT',
          impact: 'medium',
          forecast: '5.0%',
          previous: '5.0%'
        });
      }
    }
    
    this.economicCalendar = events;
  }
  
  /**
   * Get base price for a symbol
   * This is used to initialize demo data
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
}