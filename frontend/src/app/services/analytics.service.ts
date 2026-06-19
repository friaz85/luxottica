import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private auth = inject(AuthService);
    private http = inject(HttpClient);

    constructor() { }

    /**
     * Pushes an event and data to the GTM dataLayer
     * @param eventName Name of the event to track
     * @param data Additional data variables
     */
    trackEvent(eventName: string, data: any = {}) {
        if ((window as any).dataLayer) {
            (window as any).dataLayer.push({
                event: eventName,
                ...data
            });
            console.log(`[Analytics] Event tracked: ${eventName}`, data);
        }
    }

    /**
     * Specifically track conversions (Registration or Redemption)
     */
    trackConversion(type: 'registration' | 'redemption', id: string | number, extra: any = {}) {
        this.trackEvent(`${type}_complete`, {
            orderId: id.toString(),
            conversionType: type,
            ...extra
        });
    }

    /**
     * Logs a visit to the backend database
     */
    logVisit(url: string) {
        // Don't log admin pages as consumer visits (optional, user might want to track admin too)
        if (url.startsWith('/admin')) return;

        const payload = {
            url: url,
            user_id: this.auth.user()?.id || null
        };

        this.http.post(`${environment.apiUrl}/analytics/log`, payload).subscribe({
            next: () => console.log('[Analytics] Visit logged:', url),
            error: (err) => console.error('[Analytics] Failed to log visit:', err)
        });
    }
}
