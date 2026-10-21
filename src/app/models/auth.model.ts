// Auth response from API
export interface AuthResponse {
    userId: number;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    accessToken: string; //local storage.
    refreshToken: string; // in cookies instead of ls
    expiresAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: string[];
}

// Login request
export interface LoginRequest {
    email: string;
    password: string;
}

// Register request
export interface RegisterRequest {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

// Google login request
export interface GoogleLoginRequest {
    idToken: string;
}

// Refresh token request
export interface RefreshTokenRequest {
    refreshToken: string;
}
