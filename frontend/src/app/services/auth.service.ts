import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router);

  // State management with Signals
  private _user = signal<any>(null);
  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());
  isAdmin = computed(() => {
    const role = this._user()?.role;
    return role === 'system_admin' || role === 'quantum' || role === 'admin';
  });

  constructor() {
    this.checkSession();
  }

  private checkSession() {
    const data = localStorage.getItem('emb_session');
    if (data) {
      try {
        const session = JSON.parse(data);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const diff = now - (session.timestamp || 0);

        if (session.user && session.token && diff < thirtyDays) {
          this._user.set(session.user);
        } else {
          this.logout();
        }
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res: any) => this.saveSession(res))
    );
  }

  adminLogin(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/auth/login`, credentials).pipe(
      tap((res: any) => this.saveSession(res))
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`);
  }

  private saveSession(res: any) {
    if (!res.token || !res.user) return;
    const sessionData = {
      user: res.user,
      token: res.token,
      timestamp: Date.now()
    };
    localStorage.setItem('emb_session', JSON.stringify(sessionData));
    localStorage.setItem('emb_token', res.token);
    this._user.set(res.user);
  }

  logout() {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    localStorage.removeItem('emb_session');
    localStorage.removeItem('emb_token');
    this._user.set(null);
    this.router.navigate([isAdminPath ? '/admin/login' : '/auth/login']);
  }

  getRole(): string {
    return this._user()?.role || 'guest';
  }

  getToken() {
    return localStorage.getItem('emb_token');
  }
}

export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = localStorage.getItem('emb_token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isBlocked = error.error?.message?.toLowerCase().includes('bloqueada');
      const isExpired = error.error?.message?.includes('Sesion expirada');
      if (error.status === 401 && (isExpired || isBlocked)) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
