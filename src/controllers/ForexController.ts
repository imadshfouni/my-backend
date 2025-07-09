import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { ForexDataService } from '../services/ForexDataService';

export class ForexController {
  private forexService: ForexDataService;
  
  constructor() {
    this.forexService = ForexDataService.getInstance();
  }
  
  /**
   * Get all forex rates
   */
  public getRates = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rates = this.forexService.getRates();
      res.json({ rates, timestamp: Date.now() });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get rate for a specific symbol
   */
  public getRate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        throw new ValidationError('Symbol parameter is required');
      }
      
      const rate = this.forexService.getRate(symbol);
      
      if (!rate) {
        throw new ValidationError(`Rate for symbol ${symbol} not found`);
      }
      
      res.json(rate);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get market news
   */
  public getNews = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const news = this.forexService.getNews(limit);
      res.json({ news, timestamp: Date.now() });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get economic calendar
   */
  public getEconomicCalendar = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const events = this.forexService.getEconomicCalendar(days);
      res.json({ events, timestamp: Date.now() });
    } catch (error) {
      next(error);
    }
  };
}