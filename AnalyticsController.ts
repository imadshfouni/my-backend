import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { AnalyticsService } from '../services/AnalyticsService';

export class AnalyticsController {
  private analyticsService: AnalyticsService;
  
  constructor() {
    this.analyticsService = AnalyticsService.getInstance();
  }
  
  /**
   * Get dashboard summary for quick overview
   */
  public getDashboardSummary = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const summary = this.analyticsService.generateDashboardSummary();
      res.json(summary);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get historical price data
   */
  public getHistoricalData = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { symbol, timeframe } = req.params;
      
      if (!symbol) {
        throw new ValidationError('Symbol parameter is required');
      }
      
      if (!timeframe) {
        throw new ValidationError('Timeframe parameter is required');
      }
      
      const data = this.analyticsService.getHistoricalData(symbol, timeframe);
      
      if (!data) {
        throw new ValidationError(`Data for symbol ${symbol} and timeframe ${timeframe} not found`);
      }
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get market sentiment data
   */
  public getSentiment = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        // Return all sentiments if no symbol is specified
        const sentiments = this.analyticsService.getAllSentiments();
        res.json({ sentiments });
        return;
      }
      
      const sentiment = this.analyticsService.getSentiment(symbol);
      
      if (!sentiment) {
        throw new ValidationError(`Sentiment data for symbol ${symbol} not found`);
      }
      
      res.json(sentiment);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get technical indicators
   */
  public getIndicators = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { symbol } = req.params;
      const { indicator } = req.query;
      
      if (!symbol) {
        throw new ValidationError('Symbol parameter is required');
      }
      
      if (indicator && typeof indicator === 'string') {
        // Get specific indicator
        const data = this.analyticsService.getIndicator(symbol, indicator);
        
        if (!data) {
          throw new ValidationError(`Indicator ${indicator} for symbol ${symbol} not found`);
        }
        
        res.json(data);
        return;
      }
      
      // Get all indicators for symbol
      const indicators = this.analyticsService.getAllIndicators(symbol);
      
      if (!indicators) {
        throw new ValidationError(`No indicators found for symbol ${symbol}`);
      }
      
      res.json({ symbol, indicators });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get correlation data
   */
  public getCorrelation = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { symbol1, symbol2 } = req.params;
      
      if (!symbol1 || !symbol2) {
        // Return all correlations if symbols aren't specified
        const correlations = this.analyticsService.getAllCorrelations();
        res.json({ correlations });
        return;
      }
      
      const correlation = this.analyticsService.getCorrelation(symbol1, symbol2);
      
      if (!correlation) {
        throw new ValidationError(`Correlation data for ${symbol1} and ${symbol2} not found`);
      }
      
      res.json(correlation);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get available symbols
   */
  public getSymbols = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const symbols = this.analyticsService.getPopularSymbols();
      res.json({ symbols });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get available timeframes
   */
  public getTimeframes = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const timeframes = this.analyticsService.getTimeframes();
      res.json({ timeframes });
    } catch (error) {
      next(error);
    }
  };
}