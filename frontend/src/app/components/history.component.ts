import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserNavbarComponent } from './user-navbar.component';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, UserNavbarComponent],
  template: `
    <user-navbar></user-navbar>

    <div class="landing footer-safe-area">
      <div class="hero">
        <div class="history-card">
          <!-- Scoreboard de puntos -->
          <div class="scoreboard">
            <span class="label">TIENES</span>
            <span class="value">{{ userPoints() | number:'1.0-0' }}</span>
            <span class="unit">PUNTOS</span>
          </div>

          <h1 class="history-title">MI HISTORIAL DE CANJES</h1>

          <div style="text-align:right;margin-bottom:1.2rem;">
            <a routerLink="/rewards" class="home-btn">&#8592; Ir a Inicio</a>
          </div>

          <div class="table-container custom-scroll">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>RECOMPENSA</th>
                  <th>TIPO</th>
                  <th>PUNTOS</th>
                  <th>FECHA</th>
                  <th>ESTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                <!-- Skeleton rows while loading -->
                <ng-container *ngIf="loading()">
                  <tr *ngFor="let i of [1,2,3,4]" class="skeleton-row">
                    <td><div class="sk sk-wide"></div></td>
                    <td><div class="sk sk-short"></div></td>
                    <td><div class="sk sk-short"></div></td>
                    <td><div class="sk sk-med"></div></td>
                    <td><div class="sk sk-short"></div></td>
                    <td><div class="sk sk-btn"></div></td>
                  </tr>
                </ng-container>

                <!-- Real rows -->
                <ng-container *ngIf="!loading()">
                  <tr *ngFor="let r of rewards()">
                    <td class="reward-cell">
                      <div class="reward-mini">
                        <img
                          [src]="r.image_url ? environment.uploadsUrl + '/rewards/' + r.image_url : 'assets/img/Logo_Tec.png'"
                          (error)="handleImageError($event, r.image_url)"
                          alt="Recompensa">
                        <span>{{ r.title || r.reward_title }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="type-pill" [class.monedero]="r.tipo_recompensa==='monedero'" [class.ta]="r.tipo_recompensa==='tiempo_aire'">
                        {{ r.tipo_recompensa === 'monedero' ? '💳 Monedero' : r.tipo_recompensa === 'tiempo_aire' ? '📱 Tiempo Aire' : '🎁 Digital' }}
                      </span>
                    </td>
                    <td class="points-cell">-{{ r.cost | number }} pts</td>
                    <td class="date-cell">{{ r.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <span class="status-badge" [class]="r.status">
                        {{ getStatusText(r.status) }}
                      </span>
                    </td>
                    <td>
                      <!-- Cupón descargable (no monedero, no tiempo_aire) -->
                      <button
                        *ngIf="r.pdf_path && r.status === 'completed' && r.tipo_recompensa !== 'monedero' && r.tipo_recompensa !== 'tiempo_aire'"
                        (click)="reprintCoupon(r)"
                        class="reprint-btn">
                        ⬇ DESCARGAR
                      </button>
                      <!-- Monedero completado (descargable) -->
                      <button
                        *ngIf="r.tipo_recompensa === 'monedero' && r.status === 'completed' && r.pdf_path"
                        (click)="reprintCoupon(r)"
                        class="reprint-btn monedero-btn">
                        ⬇ DESCARGAR
                      </button>
                      <!-- Monedero pendiente -->
                      <span *ngIf="r.tipo_recompensa === 'monedero' && r.status === 'pending'" class="pending-label">
                        ⏳ En proceso
                      </span>
                      <!-- Tiempo Aire -->
                      <span *ngIf="r.tipo_recompensa === 'tiempo_aire'" class="no-action">
                        {{ r.status_recarga === 'success' ? '✅ Recargado' : r.status_recarga === 'failed' ? '❌ Fallida' : '📱 Procesado' }}
                      </span>
                      <!-- Sin acción -->
                      <span *ngIf="!r.pdf_path && r.tipo_recompensa !== 'monedero' && r.tipo_recompensa !== 'tiempo_aire'" class="no-action">—</span>
                    </td>
                  </tr>
                  <tr *ngIf="rewards().length === 0">
                    <td colspan="6" class="empty-cell">
                      <div style="font-size:3rem;margin-bottom:1rem;">🎁</div>
                      <div>No has canjeado recompensas aún.</div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .landing {
      min-height: 100vh;
      width: 100vw;
      background: url('../../assets/img/fondo web.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow-x: hidden;
      padding-top: 160px;
      padding-bottom: 3rem;
    }

    @media (max-width: 768px) {
      .landing {
        background-image: url('../../assets/img/fondo mobile.jpg');
      }
    }

    .hero {
      padding: 1rem 2rem 2rem 2rem;
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
    }

    .history-card {
      background: rgba(255, 255, 255, 0.97);
      border-radius: 2rem;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      text-align: center;
    }

    .scoreboard {
      background: #000000;
      color: white;
      padding: 0.9rem 2rem;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      box-shadow: 0 5px 15px rgba(0,0,0,0.25);
    }
    .scoreboard .label { font-weight: 700; opacity: 0.7; font-size:0.85rem; }
    .scoreboard .value { font-size: 2rem; font-weight: 900; }
    .scoreboard .unit  { font-weight: 800; font-size: 0.85rem; opacity:0.7; }

    .history-title {
      color: #111;
      font-size: 2rem;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 2rem;
      letter-spacing: 1px;
    }

    /* Skeleton */
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .skeleton-row td { padding: 1.2rem 1rem; border-bottom: 1px solid #eee; }
    .sk {
      height: 16px; border-radius: 6px;
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite;
    }
    .sk-wide  { width: 70%; }
    .sk-med   { width: 50%; margin: 0 auto; }
    .sk-short { width: 30%; margin: 0 auto; }
    .sk-btn   { width: 90px; height: 28px; border-radius: 6px; margin: 0 auto; }

    /* Table */
    .table-container {
      width: 100%;
      overflow-x: auto;
      background: #fafafa;
      border-radius: 1rem;
      padding: 0.5rem;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.04);
    }
    .glass-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .glass-table th {
      padding: 1rem;
      color: #111;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 0.78rem;
      border-bottom: 2px solid #eee;
      letter-spacing: 0.5px;
    }
    .glass-table td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
      vertical-align: middle;
    }

    .reward-mini {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .reward-mini img {
      width: 42px;
      height: 42px;
      object-fit: contain;
      border-radius: 0.4rem;
      border: 1px solid #eee;
    }
    .reward-mini span { font-weight: 600; }

    .type-pill {
      padding: 0.3rem 0.8rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 700;
      background: #f0f0f0;
      color: #555;
      white-space: nowrap;
      display: inline-block;
    }
    .type-pill.monedero { background: #fff3e0; color: #e65100; }
    .type-pill.ta       { background: #e8f5e9; color: #2e7d32; }

    .points-cell { font-weight: 800; color: #cc0000; white-space: nowrap; }
    .date-cell   { font-size: 0.82rem; color: #555; white-space: nowrap; }

    .status-badge {
      padding: 0.3rem 0.9rem;
      border-radius: 2rem;
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .status-badge.completed { background: #e6fffa; color: #2c7a7b; }
    .status-badge.pending   { background: #fff8e1; color: #f59e0b; }
    .status-badge.shipped   { background: #e0f2f1; color: #00796b; }

    .reprint-btn {
      background: #000;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s;
      white-space: nowrap;
    }
    .reprint-btn:hover { background: #333; transform: translateY(-2px); }
    .reprint-btn.monedero-btn { background: #CC0000; }
    .reprint-btn.monedero-btn:hover { background: #aa0000; }

    .home-btn {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 0.5rem 1.2rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      transition: 0.2s;
    }
    .home-btn:hover { background: #333; transform: translateY(-1px); }

    .pending-label { color: #f59e0b; font-weight: 700; font-size: 0.82rem; }
    .no-action     { color: #999; font-size: 0.82rem; }

    .empty-cell {
      text-align: center;
      padding: 4rem;
      color: #999;
    }

    @media (max-width: 768px) {
      .landing { padding-top: 140px; }
      .hero { padding: 1rem; }
      .history-card { padding: 1.5rem 1rem; }
      .history-title { font-size: 1.5rem; }
      .glass-table th, .glass-table td { padding: 0.6rem 0.5rem; font-size: 0.78rem; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  rewards    = signal<any[]>([]);
  userPoints = signal(0);
  loading    = signal(true);

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  environment  = environment;

  ngOnInit() {
    this.loadHistory();
    this.loadPoints();
  }

  loadPoints() {
    this.auth.getProfile().subscribe({
      next: (profile: any) => {
        const user = profile.user || profile;
        this.userPoints.set(parseInt(user.points || 0));
      },
      error: () => {}
    });
  }

  loadHistory() {
    this.loading.set(true);
    this.http.get(`${environment.apiUrl}/user/history`).subscribe({
      next: (res: any) => {
        this.rewards.set(Array.isArray(res) ? res : []);
        this.loading.set(false);
      },
      error: () => { this.rewards.set([]); this.loading.set(false); }
    });
  }

  reprintCoupon(reward: any) {
    if (reward.pdf_path) {
      const ext  = reward.pdf_path.split('.').pop()?.toLowerCase();
      const path = ['jpg','jpeg','png','gif'].includes(ext || '') ? 'templates' : 'redeemed';
      window.open(`${environment.uploadsUrl}/${path}/${reward.pdf_path}`, '_blank');
    }
  }

  getStatusText(status: string): string {
    const map: any = {
      'completed':  'Completado',
      'pending':    'Pendiente',
      'processing': 'En Proceso',
      'shipped':    'Enviado',
      'delivered':  'Entregado'
    };
    return map[status] || status;
  }

  handleImageError(event: any, imageUrl: string) {
    const fallback = (environment as any).fallbackUrl || environment.uploadsUrl;
    if (!event.target.src.includes(fallback) && imageUrl) {
      event.target.src = `${fallback}/rewards/${imageUrl}`;
    } else {
      event.target.src = 'assets/img/Logo_Tec.png';
    }
  }
}
