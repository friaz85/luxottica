import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UserNavbarComponent } from './user-navbar.component';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, UserNavbarComponent],
  template: `
    <user-navbar></user-navbar>
    
    <div class="landing footer-safe-area">
      <div class="hero">
        <div class="hero-flex">
          
          <div class="hero-left">
            <div class="logo-wrapper">
              <img src="assets/img/Logo_Tec.png?v=5" alt="TEC" class="tec-logo">
            </div>
          </div>
          
          <div class="hero-right history-card">
            <div class="scoreboard">
                <span class="label">TIENES</span>
                <span class="value">{{ userPoints() | number:'1.0-0' }}</span>
                <span class="unit">PUNTOS</span>
            </div>
            <h1 class="history-title">MI HISTORIAL</h1>
            
            <div class="table-container custom-scroll">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>RECOMPENSA</th>
                    <th>COSTO</th>
                    <th>FECHA</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Skeleton rows while loading -->
                  <ng-container *ngIf="loading()">
                    <tr *ngFor="let i of [1,2,3,4]" class="skeleton-row">
                      <td><div class="sk sk-wide"></div></td>
                      <td><div class="sk sk-short"></div></td>
                      <td><div class="sk sk-med"></div></td>
                      <td><div class="sk sk-btn"></div></td>
                    </tr>
                  </ng-container>
                  <!-- Real rows -->
                  <ng-container *ngIf="!loading()">
                  <tr *ngFor="let reward of rewards()">
                    <td class="reward-cell">
                      <div class="reward-mini">
                        <img [src]="reward.image_url ? environment.uploadsUrl + '/rewards/' + reward.image_url : 'assets/img/Logo_Tec.png'" 
                             (error)="handleImageError($event, reward.image_url)"
                             alt="Img">
                        <span>{{ reward.title || reward.reward_title }}</span>
                      </div>
                    </td>
                    <td class="points-cell">-{{ reward.cost }}</td>
                    <td>{{ reward.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <button 
                        *ngIf="reward.pdf_path && reward.status === 'completed'" 
                        (click)="reprintCoupon(reward)"
                        class="reprint-btn">
                        DESCARGAR
                      </button>
                      <span *ngIf="!reward.pdf_path || reward.status !== 'completed'" class="no-action">-</span>
                    </td>
                  </tr>
                  <tr *ngIf="rewards().length === 0">
                    <td colspan="5" class="empty-cell">No has canjeado recompensas aún.</td>
                  </tr>
                  </ng-container>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      <footer class="user-footer">
        <p>© 2026 Todos los derechos reservados Quantum TM HMM Rewards S. de R.L. de C.V.</p>
        <p class="contact-info">Informes en la República Mexicana vía <a href="https://wa.me/525574479668" target="_blank" style="color: inherit; text-decoration: underline;">WhatsApp al número 5574479668</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .landing { 
      min-height: 100vh; 
      width: 100vw;
      background: url('../../assets/img/Background.png');
      background-size: cover;
      background-position: center;
      display: flex; 
      align-items: center; 
      justify-content: center; 
      overflow-x: hidden;
      padding-top: 80px;
      position: relative;
    }

    .hero { 
      padding: 1rem 2rem 4rem 2rem; 
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      z-index: 10;
    }

    .hero-flex {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 3rem;
    }

    .hero-left { flex: 0 0 300px; display: flex; justify-content: center; position: sticky; top: 100px; }
    
    .tec-logo { 
      width: 100%;
      height: auto;
      max-height: 30vh;
      object-fit: contain;
    }

    .history-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 2rem;
      padding: 3rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      text-align: center;
      flex: 1;
      width: 100%;
      min-height: 600px;
    }

    .scoreboard {
        background: #003366;
        color: white;
        padding: 1rem 2rem;
        border-radius: 1rem;
        display: inline-flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        box-shadow: 0 5px 15px rgba(0, 51, 102, 0.2);
    }
    .scoreboard .label { font-weight: 700; opacity: 0.8; }
    .scoreboard .value { font-size: 2rem; font-weight: 900; }
    .scoreboard .unit { font-weight: 800; font-size: 0.9rem; }

    /* Skeleton loading */
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .skeleton-row td { padding: 1.2rem 1rem; border-bottom: 1px solid #eee; }
    .sk {
      height: 18px;
      border-radius: 6px;
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite;
    }
    .sk-wide  { width: 70%; }
    .sk-med   { width: 50%; margin: 0 auto; }
    .sk-short { width: 30%; margin: 0 auto; }
    .sk-btn   { width: 80px; height: 28px; border-radius: 6px; margin: 0 auto; }

    .history-title {
        color: #003366;
        font-size: 2.5rem;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 2rem;
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
      background: #fdfdfd;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
    }

    .glass-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    
    .glass-table th {
      padding: 1rem;
      color: #003366;
      font-weight: 800;
      text-transform: uppercase;
      border-bottom: 2px solid #eee;
    }

    .glass-table td {
      padding: 1.2rem 1rem;
      border-bottom: 1px solid #eee;
      color: #333;
    }

    .reward-mini {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .reward-mini img {
      width: 45px;
      height: 45px;
      object-fit: contain;
    }

    .points-cell { font-weight: 800; color: #cc0000; }

    .status-badge {
      padding: 0.4rem 1rem;
      border-radius: 2rem;
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
    }
    .status-badge.completed { background: #e6fffa; color: #2c7a7b; }
    .status-badge.pending { background: #fffaf0; color: #9c4221; }

    .reprint-btn {
      background: #003366;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s;
    }
    .reprint-btn:hover { background: #002244; transform: translateY(-2px); }

    .no-action { color: #999; font-style: italic; }
    .empty-cell { text-align: center; padding: 4rem; color: #999; }

    @media (max-width: 992px) {
        .hero { padding: 1rem 1rem 3rem 1rem; }
        .hero-flex { flex-direction: column; align-items: center; gap: 2rem; }
        .hero-left { position: static; flex: unset; width: auto; }
        .tec-logo { max-width: 180px; }
        .history-card { padding: 2rem 1rem; }
        .history-title { font-size: 2rem; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  rewards = signal<any[]>([]);
  userPoints = signal(0);
  loading = signal(true);

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  environment = environment;

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
    const user = this.auth.user();
    if (!user) return;
    const userId = user.id || user.uid;
    this.loading.set(true);
    this.http.get(`${environment.apiUrl}/user/rewards/${userId}`).subscribe({
      next: (res: any) => {
        this.rewards.set(Array.isArray(res) ? res : []);
        this.loading.set(false);
      },
      error: () => { this.rewards.set([]); this.loading.set(false); }
    });
  }

  reprintCoupon(reward: any) {
    if (reward.pdf_path) {
      const ext = reward.pdf_path.split('.').pop()?.toLowerCase();
      let path = 'redeemed';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
        path = 'templates';
      }
      const fileUrl = `${environment.uploadsUrl}/${path}/${reward.pdf_path}`;
      window.open(fileUrl, '_blank');
    }
  }

  getStatusText(status: string): string {
    const statusMap: any = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'processing': 'En Proceso',
      'shipped': 'Enviado',
      'delivered': 'Entregado'
    };
    return statusMap[status] || status;
  }

  handleImageError(event: any, imageUrl: string) {
    const fallbackBase = (environment as any).fallbackUrl || 'https://q-tokens.com.mx/embajadores-tec-dev/api/public/uploads';
    if (!event.target.src.includes(fallbackBase) && imageUrl) {
      event.target.src = `${fallbackBase}/rewards/${imageUrl}`;
    } else {
      event.target.src = 'assets/img/Logo_Tec.png';
    }
  }
}
