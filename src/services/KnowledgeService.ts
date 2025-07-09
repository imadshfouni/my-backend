import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { ConfigManager } from '../utils/config';

/**
 * Knowledge document structure
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source?: string;
  lastUpdated: number;
}

/**
 * Search result interface
 */
export interface SearchResult {
  document: KnowledgeDocument;
  relevanceScore: number;
}

/**
 * Knowledge service for managing forex knowledge base
 * Implements a simple RAG (Retrieval-Augmented Generation) pattern
 */
export class KnowledgeService {
  private static instance: KnowledgeService;
  private openai: OpenAI;
  private documents: KnowledgeDocument[] = [];
  private dataDir: string;
  private documentsFile: string;
  private lastIndexed: number = 0;
  
  // Singleton pattern
  public static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }
  
  private constructor() {
    // Initialize OpenAI client
    const apiKey = ConfigManager.get('OPENAI_API_KEY', '');
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-development'
    });
    
    // Initialize data directory
    this.dataDir = path.join(process.cwd(), 'data');
    this.documentsFile = path.join(this.dataDir, 'knowledge_documents.json');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir);
    }
    
    // Load documents from file
    this.loadDocuments();
    
    // Initialize with demo documents if none exist
    if (this.documents.length === 0) {
      this.initializeDemoDocuments();
      this.saveDocuments();
    }
  }
  
  /**
   * Load documents from file
   */
  private loadDocuments(): void {
    try {
      if (fs.existsSync(this.documentsFile)) {
        const data = fs.readFileSync(this.documentsFile, 'utf8');
        this.documents = JSON.parse(data);
        console.log(`Loaded ${this.documents.length} knowledge documents`);
      }
    } catch (error) {
      console.error('Error loading knowledge documents:', error);
    }
  }
  
  /**
   * Save documents to file
   */
  private saveDocuments(): void {
    try {
      fs.writeFileSync(this.documentsFile, JSON.stringify(this.documents, null, 2));
    } catch (error) {
      console.error('Error saving knowledge documents:', error);
    }
  }
  
  /**
   * Initialize with demo documents
   */
  private initializeDemoDocuments(): void {
    this.documents = [
      {
        id: 'doc_001',
        title: 'Introduction to Forex Trading',
        content: "Forex (foreign exchange) trading is the buying and selling of currencies on the foreign exchange market with the aim of making a profit. The forex market is the largest and most liquid financial market in the world, with trillions of dollars being traded daily. Unlike stocks or commodities, forex trading doesn't take place on exchanges but directly between two parties in an over-the-counter (OTC) market.",
        category: 'Basics',
        tags: ['introduction', 'forex basics', 'beginner'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_002',
        title: 'Currency Pairs Explained',
        content: "In forex trading, currencies are quoted in pairs, such as EUR/USD or USD/JPY. The first currency (EUR in EUR/USD) is called the base currency, while the second currency (USD in EUR/USD) is called the quote or counter currency. The price shows how much of the quote currency is needed to buy one unit of the base currency. Major pairs include EUR/USD, USD/JPY, GBP/USD, and USD/CHF. Minor pairs or crosses don't involve the USD, such as EUR/GBP or AUD/NZD.",
        category: 'Basics',
        tags: ['currency pairs', 'major pairs', 'minor pairs', 'crosses'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_003',
        title: 'Understanding Pip Value',
        content: "A pip is the smallest price movement in a trading pair. For most currency pairs, a pip is a movement in the fourth decimal place (0.0001). For pairs involving the Japanese yen, a pip is the second decimal place (0.01). Pip value varies depending on the lot size and currency pair. For a standard lot (100,000 units), each pip is typically worth about $10 for USD pairs. Understanding pip value is crucial for calculating potential profits and losses and managing risk effectively.",
        category: 'Trading Mechanics',
        tags: ['pip', 'lot size', 'risk management'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_004',
        title: 'Technical Analysis Fundamentals',
        content: "Technical analysis is a trading discipline that evaluates investments and identifies trading opportunities by analyzing statistical trends gathered from trading activity, such as price movement and volume. Unlike fundamental analysis, which attempts to evaluate a security's value based on business results, technical analysis focuses on patterns of price movements, trading signals, and various analytical charting tools. Common indicators include Moving Averages (MA), Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD), and Bollinger Bands.",
        category: 'Analysis',
        tags: ['technical analysis', 'indicators', 'chart patterns'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_005',
        title: 'Fundamental Analysis in Forex',
        content: "Fundamental analysis in forex involves analyzing economic indicators and geopolitical events to predict currency price movements. Key indicators include interest rates, GDP growth, employment data (like NFP), inflation rates, and central bank policies. Economic calendars help traders track upcoming announcements that might impact markets. Strong economic data typically strengthens a currency, while weak data can lead to depreciation. Central bank meetings and policy statements are particularly significant events that can cause major market movements.",
        category: 'Analysis',
        tags: ['fundamental analysis', 'economic indicators', 'central banks'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_006',
        title: 'Risk Management Strategies',
        content: "Effective risk management is crucial for long-term success in forex trading. Key strategies include: 1) Position Sizing - never risk more than 1-2% of your account on a single trade; 2) Stop-Loss Orders - always use stop-loss orders to limit potential losses; 3) Take-Profit Levels - set realistic profit targets based on market analysis; 4) Risk-Reward Ratio - aim for trades with a positive risk-reward ratio (at least 1:2); 5) Diversification - avoid overexposure to correlated currency pairs; 6) Volatility Awareness - adjust position sizes during high-volatility periods. Consistent application of these principles helps preserve capital during losing streaks and maximize gains during winning periods.",
        category: 'Strategy',
        tags: ['risk management', 'stop loss', 'position sizing'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_007',
        title: 'Common Chart Patterns',
        content: "Chart patterns are specific formations on price charts that can signal potential trend continuations or reversals. Common bullish reversal patterns include the Double Bottom, Inverse Head and Shoulders, and Bullish Engulfing. Common bearish reversal patterns include the Double Top, Head and Shoulders, and Bearish Engulfing. Continuation patterns signal that a trend is likely to continue after a brief consolidation period and include Flags, Pennants, and Triangles. These patterns work across all timeframes but tend to be more reliable on longer timeframes.",
        category: 'Analysis',
        tags: ['chart patterns', 'technical analysis', 'price action'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_008',
        title: 'Trading Psychology',
        content: "Trading psychology refers to the emotions and mental state that influence trading decisions. Common psychological challenges include fear (leading to missed opportunities or premature exits), greed (leading to overtrading or holding positions too long), revenge trading (trying to recover losses with risky trades), and confirmation bias (focusing only on information that confirms existing beliefs). Successful traders develop emotional discipline through techniques like maintaining trading journals, following strict trading plans, taking breaks after losses, and regular self-assessment of trading behaviors.",
        category: 'Psychology',
        tags: ['trading psychology', 'emotions', 'discipline'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_009',
        title: 'Economic Indicators and Their Impact',
        content: "Economic indicators are statistical data points that provide insights into a country's economic performance. High-impact indicators include: 1) Non-Farm Payrolls (NFP) - measures US employment outside the farming sector; 2) Gross Domestic Product (GDP) - the total value of goods and services produced; 3) Consumer Price Index (CPI) - measures inflation; 4) Interest Rate Decisions - set by central banks; 5) Purchasing Managers Index (PMI) - indicates business conditions in manufacturing and service sectors; 6) Retail Sales - measures consumer spending. Better-than-expected data typically strengthens a currency, while worse-than-expected data typically weakens it.",
        category: 'Fundamentals',
        tags: ['economic indicators', 'fundamental analysis', 'news trading'],
        lastUpdated: Date.now()
      },
      {
        id: 'doc_010',
        title: 'Developing a Trading Plan',
        content: "A trading plan is a systematic method for identifying and trading opportunities in the markets that suit your skills, personality, and schedule. A comprehensive trading plan should include: 1) Markets to trade (which currency pairs); 2) Time frames for analysis and trading; 3) Trading strategy with specific entry and exit rules; 4) Risk management rules; 5) Position sizing formula; 6) Trading hours and routine; 7) Journal and review process. Trading without a plan often leads to inconsistent results and emotional decision-making. Your plan should be written down and followed consistently but reviewed and refined periodically based on performance data.",
        category: 'Strategy',
        tags: ['trading plan', 'strategy', 'discipline'],
        lastUpdated: Date.now()
      }
    ];
  }
  
  /**
   * Add a new document to the knowledge base
   */
  public addDocument(document: Omit<KnowledgeDocument, 'id' | 'lastUpdated'>): KnowledgeDocument {
    const newDocument: KnowledgeDocument = {
      ...document,
      id: `doc_${Date.now().toString(36)}`,
      lastUpdated: Date.now()
    };
    
    this.documents.push(newDocument);
    this.saveDocuments();
    
    return newDocument;
  }
  
  /**
   * Update an existing document
   */
  public updateDocument(id: string, updates: Partial<Omit<KnowledgeDocument, 'id'>>): KnowledgeDocument | null {
    const index = this.documents.findIndex(doc => doc.id === id);
    
    if (index === -1) {
      return null;
    }
    
    this.documents[index] = {
      ...this.documents[index],
      ...updates,
      lastUpdated: Date.now()
    };
    
    this.saveDocuments();
    
    return this.documents[index];
  }
  
  /**
   * Delete a document
   */
  public deleteDocument(id: string): boolean {
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(doc => doc.id !== id);
    
    if (this.documents.length !== initialLength) {
      this.saveDocuments();
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all documents
   */
  public getAllDocuments(): KnowledgeDocument[] {
    return [...this.documents];
  }
  
  /**
   * Get document by ID
   */
  public getDocumentById(id: string): KnowledgeDocument | null {
    const document = this.documents.find(doc => doc.id === id);
    return document || null;
  }
  
  /**
   * Search documents by query
   * Uses simple keyword matching for demo purposes
   * In production, would use embeddings and vector similarity search
   */
  public searchDocuments(query: string, limit: number = 5): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const results: SearchResult[] = this.documents.map(document => {
      // Calculate relevance score based on keyword matches
      const content = document.content.toLowerCase();
      const title = document.title.toLowerCase();
      const tags = document.tags.join(' ').toLowerCase();
      
      let relevanceScore = 0;
      
      for (const term of queryTerms) {
        // Title matches have higher weight
        if (title.includes(term)) {
          relevanceScore += 3;
        }
        
        // Content matches
        if (content.includes(term)) {
          relevanceScore += 1;
        }
        
        // Tag matches
        if (tags.includes(term)) {
          relevanceScore += 2;
        }
      }
      
      return {
        document,
        relevanceScore
      };
    });
    
    // Sort by relevance and limit results
    return results
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }
  
  /**
   * Get a RAG-enhanced answer using OpenAI API
   */
  public async getEnhancedAnswer(query: string): Promise<string> {
    try {
      // Search for relevant documents
      const searchResults = this.searchDocuments(query, 3);
      
      if (searchResults.length === 0) {
        // No relevant documents found, use standard response
        return this.generateStandardAnswer(query);
      }
      
      // Build context from search results
      let context = "I'll answer based on the following information:\n\n";
      
      searchResults.forEach((result, index) => {
        context += `Document ${index + 1} (${result.document.title}):\n${result.document.content}\n\n`;
      });
      
      // Call OpenAI API with context and query
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are ForexAdvisor, an expert in forex trading providing accurate information based on the knowledge provided. Focus only on answering using the provided context documents. If the context doesn't contain relevant information to fully answer the question, acknowledge what you can answer from the context and clearly state what information is missing. Do not make up information."
          },
          {
            role: "user",
            content: `${context}\n\nBased on this information, please answer the following question: ${query}`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });
      
      return response.choices[0].message.content || "I couldn't generate a response based on the available knowledge.";
      
    } catch (error) {
      console.error("Error generating enhanced answer:", error);
      return "I'm sorry, I encountered an error while processing your question.";
    }
  }
  
  /**
   * Generate a standard answer for queries with no relevant documents
   */
  private async generateStandardAnswer(query: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are ForexAdvisor, an expert in forex trading. The user's query doesn't match any specific documents in your knowledge base. Provide a helpful response based on general forex knowledge, but mention that this is general information. If the query is outside the forex domain, politely redirect to forex topics."
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      });
      
      return response.choices[0].message.content || "I don't have specific information on that topic in my knowledge base.";
    } catch (error) {
      console.error("Error generating standard answer:", error);
      return "I'm sorry, I encountered an error while processing your question.";
    }
  }
  
  /**
   * Get categories from knowledge base
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    
    this.documents.forEach(doc => {
      categories.add(doc.category);
    });
    
    return Array.from(categories).sort();
  }
  
  /**
   * Get all tags from knowledge base
   */
  public getAllTags(): string[] {
    const tags = new Set<string>();
    
    this.documents.forEach(doc => {
      doc.tags.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags).sort();
  }
  
  /**
   * Get documents by category
   */
  public getDocumentsByCategory(category: string): KnowledgeDocument[] {
    return this.documents.filter(doc => doc.category === category);
  }
  
  /**
   * Get documents by tag
   */
  public getDocumentsByTag(tag: string): KnowledgeDocument[] {
    return this.documents.filter(doc => doc.tags.includes(tag));
  }
}