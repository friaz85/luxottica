import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

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
    this.initInactivityTimer();
  }

  private checkSession() {
    if (typeof window === 'undefined') return;
    const isAdminPath = window.location.pathname.startsWith('/admin');
    const sessionKey = isAdminPath ? 'admin_session' : 'client_session';
    const data = localStorage.getItem(sessionKey);
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
      tap((res: any) => this.saveSession(res, false))
    );
  }

  adminLogin(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/auth/login`, credentials).pipe(
      tap((res: any) => this.saveSession(res, true))
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`);
  }

  private saveSession(res: any, isAdmin: boolean) {
    if (!res.token || !res.user) return;
    const sessionData = {
      user: res.user,
      token: res.token,
      timestamp: Date.now()
    };
    const sessionKey = isAdmin ? 'admin_session' : 'client_session';
    const tokenKey = isAdmin ? 'admin_token' : 'client_token';
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    localStorage.setItem(tokenKey, res.token);
    this._user.set(res.user);
  }

  logout() {
    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const sessionKey = isAdminPath ? 'admin_session' : 'client_session';
    const tokenKey = isAdminPath ? 'admin_token' : 'client_token';
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(tokenKey);
    if (!isAdminPath) {
      localStorage.removeItem('last_activity');
    }
    this._user.set(null);
    this.router.navigate([isAdminPath ? '/admin/login' : '/auth/login']);
  }

  getRole(): string {
    return this._user()?.role || 'guest';
  }

  getToken() {
    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    return localStorage.getItem(isAdminPath ? 'admin_token' : 'client_token');
  }

  private initInactivityTimer() {
    if (typeof window === 'undefined') return;

    const events = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'];
    let lastUpdate = 0;

    const updateActivity = () => {
      const now = Date.now();
      // Throttle localStorage updates to every 5 seconds to reduce writes
      if (now - lastUpdate > 5000) {
        localStorage.setItem('last_activity', now.toString());
        lastUpdate = now;
      }
    };

    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    setInterval(() => {
      if (this.isLoggedIn() && !this.isAdmin()) {
        const lastActivityStr = localStorage.getItem('last_activity');
        const now = Date.now();
        if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (now - lastActivity > 5 * 60 * 1000) {
            this.logout();
            Swal.fire({
              title: 'Sesión expirada',
              text: 'Tu sesión se ha cerrado automáticamente después de 5 minutos de inactividad.',
              icon: 'warning',
              confirmButtonColor: '#000000'
            });
          }
        } else {
          localStorage.setItem('last_activity', now.toString());
        }
      }
    }, 5000);
  }
}

export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const token = localStorage.getItem(isAdminPath ? 'admin_token' : 'client_token');
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
      if (error.status === 401 && (isExpired || isBlocked || isAdminPath)) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
