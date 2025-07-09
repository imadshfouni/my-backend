import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { 
  createUser, 
  findUserByEmail, 
  findUserById,
  comparePassword, 
  generateToken, 
  getPublicProfile, 
  updateUser,
  updatePassword as changeUserPassword
} from '../utils/auth';
import { LoginRequest, RegisterRequest, UpdateProfileRequest, UpdatePasswordRequest } from '../utils/authTypes';

export class AuthController {
  
  /**
   * Register a new user
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, username, password } = req.body as RegisterRequest;
      
      // Validation
      if (!email || !username || !password) {
        throw new ValidationError('Email, username and password are required');
      }
      
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }
      
      // Check if user already exists
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        throw new ValidationError('Email is already registered');
      }
      
      // Create new user
      const user = await createUser(email, username, password);
      
      // Generate token
      const token = generateToken(user.id, user.email);
      
      // Return token and user profile
      res.status(201).json({
        token,
        user: getPublicProfile(user)
      });
      
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Login user
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as LoginRequest;
      
      // Validation
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }
      
      // Find user
      const user = findUserByEmail(email);
      if (!user) {
        throw new ValidationError('Invalid email or password');
      }
      
      // Check password
      const isPasswordValid = await comparePassword(password, user.hashedPassword);
      if (!isPasswordValid) {
        throw new ValidationError('Invalid email or password');
      }
      
      // Update last login time
      user.lastLogin = Date.now();
      updateUser(user.id, { lastLogin: user.lastLogin });
      
      // Generate token
      const token = generateToken(user.id, user.email);
      
      // Return token and user profile
      res.json({
        token,
        user: getPublicProfile(user)
      });
      
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get current user profile
   */
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        throw new ValidationError('Authentication required');
      }
      
      const user = findUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      res.json({
        user: getPublicProfile(user)
      });
      
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update user profile
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { username, preferences } = req.body as UpdateProfileRequest;
      
      if (!userId) {
        throw new ValidationError('Authentication required');
      }
      
      const user = findUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Update user
      const updates: any = {};
      
      if (username) {
        updates.username = username;
      }
      
      if (preferences) {
        updates.preferences = {
          ...user.preferences,
          ...preferences
        };
      }
      
      const updatedUser = updateUser(userId, updates);
      
      res.json({
        user: getPublicProfile(updatedUser!)
      });
      
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update user password
   */
  public updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body as UpdatePasswordRequest;
      
      if (!userId) {
        throw new ValidationError('Authentication required');
      }
      
      // Find user
      const user = findUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Validate current password
      const isPasswordValid = await comparePassword(currentPassword, user.hashedPassword);
      if (!isPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }
      
      // Validate new password
      if (newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }
      
      // Update password
      await changeUserPassword(userId, newPassword);
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
      
    } catch (error) {
      next(error);
    }
  };
}