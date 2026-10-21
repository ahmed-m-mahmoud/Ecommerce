import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { User } from '../../models/user.model';
import {
    AuthResponse,
    ApiResponse,
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest
} from '../../models/auth.model';
import { environment } from '../../../environments/environment';

const USER_DATA_KEY = 'userData';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly apiUrl = `${environment.apiUrl}/auth`;

    user = new BehaviorSubject<User | null>(null);
    user$: Observable<User> = this.user.asObservable();

    /** Signals when autoLogin has finished running (guards wait on this) */
    authReady$ = new BehaviorSubject<boolean>(false);

    private tokenExpirationTimer: any;
    private refreshTokenTimer: any;

    isLoggedIn$: Observable<boolean>;
    isLoggedOut$: Observable<boolean>;

    constructor(
        private http: HttpClient,
        private router: Router,
    ) {
        this.isLoggedIn$ = this.user$.pipe(map((user) => !!user));
        this.isLoggedOut$ = this.isLoggedIn$.pipe(
            map((loggedIn) => !loggedIn)
        );
        // NOTE: We no longer load from localStorage here.
        // autoLogin() is called from AppComponent.ngOnInit and handles everything.
    }

    signUp(email: string, password: string, firstName?: string, lastName?: string): Observable<ApiResponse<AuthResponse>> {
        const request: RegisterRequest = { email, password, firstName, lastName };

        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request)
            .pipe(
                tap(response => {
                    if (response.success && response.data) {
                        this.handleAuthentication(response.data);
                    }
                }),
                catchError(this.handleError)
            );
    }

    login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
        const request: LoginRequest = { email, password };

        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request)
            .pipe(
                tap(response => {
                    if (response.success && response.data) {
                        this.handleAuthentication(response.data);
                    }
                }),
                catchError(this.handleError)
            );
    }

    googleLogin(idToken: string): Observable<ApiResponse<AuthResponse>> {
        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/google`, { idToken })
            .pipe(
                tap(response => {
                    if (response.success && response.data) {
                        this.handleAuthentication(response.data);
                    }
                }),
                catchError(this.handleError)
            );
    }

    refreshToken(redirectOnFailure: boolean = true): Observable<ApiResponse<AuthResponse>> {
        const user = this.user.value;
        if (!user || !user.refreshToken) {
            this.logout(redirectOnFailure);
            return throwError(() => new Error('No refresh token available'));
        }

        const request: RefreshTokenRequest = { refreshToken: user.refreshToken };

        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh-token`, request)
            .pipe(
                tap(response => {
                    if (response.success && response.data) {
                        this.handleAuthentication(response.data);
                    }
                }),
                catchError(error => {
                    this.logout(redirectOnFailure);
                    return throwError(() => error);
                })
            );
    }

    forgotPassword(email: string): Observable<ApiResponse<boolean>> {
        return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/forgot-password`, { email });
    }

    resetPassword(request: any): Observable<ApiResponse<boolean>> {
        return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/reset-password`, request);
    }

    logout(redirect: boolean = true): void {
        const user = this.user.value;

        if (user) {
            this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
                error: () => { } // Ignore logout errors
            });
        }

        this.user.next(null);
        if (redirect) {
            this.router.navigate(['/auth/login']);
        }

            localStorage.removeItem(USER_DATA_KEY);

        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer);
            this.tokenExpirationTimer = null;
        }

        if (this.refreshTokenTimer) {
            clearTimeout(this.refreshTokenTimer);
            this.refreshTokenTimer = null;
        }
    }

    autoLogin(): void {
        const userDataStr = localStorage.getItem(USER_DATA_KEY);
        if (!userDataStr) {
            this.authReady$.next(true);
            return;
        }

        const userData = JSON.parse(userDataStr);
        const expirationDate = new Date(userData._expirationDate);

        const loadedUser = new User(
            userData.id,
            userData.email,
            userData._accessToken,
            userData._refreshToken,
            expirationDate,
            userData.displayName,
            userData.firstName,
            userData.lastName,
            userData.photoUrl
        );

        if (loadedUser.token) {
            // Access token still valid
            this.user.next(loadedUser);
            this.setupAutoLogout(expirationDate);
            this.setupTokenRefresh(expirationDate);
            this.authReady$.next(true);
        } else if (loadedUser.refreshToken) {
            // Access token expired but refresh token exists — try silent refresh
            // Temporarily set user so interceptor can read the refresh token
            this.user.next(loadedUser);
            this.refreshToken(false).subscribe({
                next: () => {
                    this.authReady$.next(true);
                },
                error: () => {
                    this.logout(false);
                    this.authReady$.next(true);
                }
            });
        } else {
            // No valid tokens — clear stale data
            localStorage.removeItem(USER_DATA_KEY);
            this.authReady$.next(true);
        }
    }

    isAuthenticated(): boolean {
        const user = this.user.value;
        return !!user && !!user.token;
    }

    getCurrentUser(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/me`);
    }

    private handleAuthentication(authData: AuthResponse): void {
        let expirationDate = new Date(authData.expiresAt);
        if (isNaN(expirationDate.getTime())) {
            console.warn('Invalid expiration date from API, defaulting to 1 hour');
            expirationDate = new Date(new Date().getTime() + 3600000);
        }

        const user = new User(
            authData.userId,
            authData.email,
            authData.accessToken,
            authData.refreshToken,
            expirationDate,
            authData.displayName,
            authData.firstName,
            authData.lastName,
            authData.photoUrl
        );

        this.user.next(user); 
        this.setupAutoLogout(expirationDate);
        this.setupTokenRefresh(expirationDate);

            localStorage.setItem(USER_DATA_KEY, JSON.stringify({
                id: user.id,
                email: user.email,
                _accessToken: user.accessToken,
                _refreshToken: user.refreshToken,
                _expirationDate: expirationDate.toISOString(),
                displayName: user.displayName,
                firstName: user.firstName,
                lastName: user.lastName,
                photoUrl: user.photoUrl
            }));
    }

    private setupAutoLogout(expirationDate: Date): void {
        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer);
        }

        const expirationDuration = expirationDate.getTime() - new Date().getTime();

        if (expirationDuration > 0) {
            this.tokenExpirationTimer = setTimeout(() => {
                // Try silent refresh instead of immediate logout
                this.refreshToken(true).subscribe({
                    error: () => this.logout()
                });
            }, expirationDuration);
        }
    }

    private setupTokenRefresh(expirationDate: Date): void {
        if (this.refreshTokenTimer) {
            clearTimeout(this.refreshTokenTimer);
        }

        const timeUntilRefresh = expirationDate.getTime() - new Date().getTime() - TOKEN_REFRESH_THRESHOLD;

        if (timeUntilRefresh > 0) {
            this.refreshTokenTimer = setTimeout(() => {
                this.refreshToken().subscribe();
            }, timeUntilRefresh);
        }
    }

    private handleError(errorRes: HttpErrorResponse): Observable<never> {
        let errorMessage = 'An unknown error occurred!';

        if (errorRes.error?.message) {
            errorMessage = errorRes.error.message;
        } else if (errorRes.error?.errors && errorRes.error.errors.length > 0) {
            errorMessage = errorRes.error.errors.join(', ');
        }

        return throwError(() => new Error(errorMessage));
    }
}
