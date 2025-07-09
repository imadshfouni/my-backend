/**
 * Types related to authentication and user management
 */
export interface UserData {
  id: string;
  email: string;
  username: string;
  hashedPassword: string;
  preferences: UserPreferences;
  createdAt: number;
  lastLogin?: number;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  favoriteSymbols?: string[];
  notificationsEnabled?: boolean;
  analysisLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface PublicUserProfile {
  id: string;
  username: string;
  preferences: UserPreferences;
  createdAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUserProfile;
}

export interface UpdateProfileRequest {
  username?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
}