import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Configuration manager for the application
 */
export class ConfigManager {
  /**
   * Get environment variable or default value
   */
  public static get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  /**
   * Get environment variable as number
   */
  public static getNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    
    const numValue = Number(value);
    return isNaN(numValue) ? defaultValue : numValue;
  }

  /**
   * Get environment variable as boolean
   */
  public static getBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key]?.toLowerCase();
    if (value === undefined) {
      return defaultValue;
    }
    
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * Ensure required environment variables are set
   */
  public static validateRequiredEnv(keys: string[]): void {
    const missing = keys.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`Missing required environment variables: ${missing.join(', ')}`);
      console.warn('Please set them in .env file or environment');
    }
  }

  /**
   * Create upload directory if it doesn't exist
   */
  public static ensureUploadDir(): string {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const fullPath = path.resolve(process.cwd(), uploadDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    return fullPath;
  }
}

// Validate required environment variables on import
ConfigManager.validateRequiredEnv(['OPENAI_API_KEY']);

// Ensure upload directory exists
ConfigManager.ensureUploadDir();