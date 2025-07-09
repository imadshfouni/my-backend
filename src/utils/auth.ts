import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ConfigManager } from './config';
import { JWTPayload } from './authTypes';
import { UserData, PublicUserProfile } from './authTypes';
import fs from 'fs';
import path from 'path';

// In-memory user storage (would be replaced by a database in production)
let users: Record<string, UserData> = {};
const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// Ensure the data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Load users from file if it exists
if (fs.existsSync(USERS_FILE_PATH)) {
  try {
    const userData = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    users = JSON.parse(userData);
    console.log(`Loaded ${Object.keys(users).length} users from storage`);
  } catch (error) {
    console.error('Failed to load users from file:', error);
  }
}

// Save users to file
const saveUsers = () => {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Failed to save users to file:', error);
  }
};

// Generate JWT token
export const generateToken = (userId: string, email: string): string => {
  const jwtSecret = ConfigManager.get('JWT_SECRET', 'forex_advisor_jwt_secret');
  const expiresIn = ConfigManager.get('JWT_EXPIRES_IN', '7d');
  
  // Using any to bypass type checking for jwt.sign
  // @ts-ignore
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const jwtSecret = ConfigManager.get('JWT_SECRET', 'forex_advisor_jwt_secret');
    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Get public user profile (strips sensitive information)
export const getPublicProfile = (user: UserData): PublicUserProfile => {
  const { id, username, preferences, createdAt } = user;
  return { id, username, preferences, createdAt };
};

// Find user by email
export const findUserByEmail = (email: string): UserData | undefined => {
  return Object.values(users).find(user => user.email === email);
};

// Find user by ID
export const findUserById = (userId: string): UserData | undefined => {
  return users[userId];
};

// Create a new user
export const createUser = async (email: string, username: string, password: string): Promise<UserData> => {
  const id = Date.now().toString();
  const hashedPassword = await hashPassword(password);
  const createdAt = Date.now();
  
  const newUser: UserData = {
    id,
    email,
    username,
    hashedPassword,
    preferences: {
      theme: 'light',
      favoriteSymbols: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      notificationsEnabled: true,
      analysisLevel: 'intermediate'
    },
    createdAt
  };
  
  users[id] = newUser;
  saveUsers();
  
  return newUser;
};

// Update user
export const updateUser = (userId: string, updates: Partial<UserData>): UserData | null => {
  if (!users[userId]) return null;
  
  // Don't allow updating sensitive fields directly
  const { hashedPassword, email, id, ...allowedUpdates } = updates;
  
  users[userId] = {
    ...users[userId],
    ...allowedUpdates
  };
  
  saveUsers();
  return users[userId];
};

// Update user password
export const updatePassword = async (userId: string, newPassword: string): Promise<boolean> => {
  if (!users[userId]) return false;
  
  users[userId].hashedPassword = await hashPassword(newPassword);
  saveUsers();
  
  return true;
};

// Delete user
export const deleteUser = (userId: string): boolean => {
  if (!users[userId]) return false;
  
  delete users[userId];
  saveUsers();
  
  return true;
};