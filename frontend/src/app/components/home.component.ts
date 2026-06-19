import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from './user-navbar.component';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, UserNavbarComponent, FormsModule],
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
          
          <div class="hero-right home-card">
            <h1 class="welcome-title">¡HOLA {{ userName }}!</h1>
            
            <div class="points-display">
                <span class="label">TIENES</span>
                <div class="points-value">
                    <span class="value">{{ userPoints() | number:'1.0-0' }}</span>
                    <span class="unit">PUNTOS</span>
                </div>
            </div>

            <div class="redeem-section">
                <h3 class="section-title">¿TIENES UN CÓDIGO?</h3>
                <div class="redeem-form">
                    <input type="text" [(ngModel)]="entryCode" placeholder="INGRESA TU CÓDIGO AQUÍ" class="redeem-input">
                    <button (click)="redeemCode()" [disabled]="!entryCode || isSubmitting" class="redeem-btn">
                      {{ isSubmitting ? 'CANJEANDO...' : 'CANJEAR' }}
                    </button>
                </div>
                <p class="redeem-hint">Ingresa tus códigos asignados para sumar puntos.</p>
            </div>

            <div class="actions">
                <button (click)="goToRewards()" class="rewards-btn">
                   VER RECOMPENSAS
                </button>
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
      padding: 1rem 2rem; 
      z-index: 10;
      position: relative;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-flex {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4rem;
    }

    .hero-left { flex: 1; display: flex; justify-content: center; }
    
    .tec-logo { 
      width: auto;
      height: auto;
      max-height: 40vh;
      max-width: 100%;
      object-fit: contain;
    }

    .home-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 2rem;
      padding: 1.5rem 2rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      text-align: center;
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .welcome-title {
        color: var(--admin-primary);
        font-size: clamp(1.6rem, 5vw, 2.2rem);
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 1rem;
        letter-spacing: 1px;
    }

    .points-display {
        background: var(--admin-primary);
        color: white;
        padding: 0.75rem;
        border-radius: 1.2rem;
        width: 100%;
        max-width: 280px;
        margin-bottom: 0.8rem;
        box-shadow: 0 10px 20px rgba(0, 51, 102, 0.2);
    }

    .points-display .label {
        display: block;
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
        opacity: 0.8;
    }

    .points-value {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 1.8rem;
    }

    .points-value .value {
        font-weight: 900;
        line-height: 1;
    }

    .points-value .unit {
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: 2px;
    }

    .actions { width: 100%; }

    .rewards-btn {
        background: var(--admin-primary);
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 1rem;
        font-size: 1.2rem;
        font-weight: 900;
        cursor: pointer;
        text-transform: uppercase;
        width: 100%;
        transition: 0.3s;
        box-shadow: 0 10px 20px rgba(0, 51, 102, 0.2);
    }
    
    .rewards-btn:hover {
        transform: translateY(-3px);
        background: var(--admin-secondary);
        box-shadow: 0 15px 30px rgba(0, 51, 102, 0.4);
    }

    .redeem-section {
        width: 100%;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 1.2rem;
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
    }

    .section-title {
        color: var(--admin-primary);
        font-weight: 900;
        font-size: 1.1rem;
        margin-bottom: 1rem;
        letter-spacing: 1px;
    }

    .redeem-form {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .redeem-input {
        flex: 1;
        background: white;
        border: 2px solid #cbd5e1;
        border-radius: 0.75rem;
        padding: 0.8rem 1rem;
        font-weight: 800;
        text-align: center;
        text-transform: uppercase;
        color: var(--admin-primary);
        outline: none;
        transition: 0.3s;
    }

    .redeem-input:focus {
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 4px rgba(0, 51, 102, 0.1);
    }

    .redeem-btn {
        background: #00cc66;
        color: white;
        border: none;
        border-radius: 0.75rem;
        padding: 0 1.5rem;
        font-weight: 900;
        cursor: pointer;
        transition: 0.3s;
    }

    .redeem-btn:hover:not(:disabled) {
        background: #00aa55;
        transform: translateY(-2px);
    }

    .redeem-btn:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
    }

    .redeem-hint {
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 600;
    }

    @media (max-width: 992px) {
        .hero-flex {
            flex-direction: column;
            gap: 2rem;
        }
        .tec-logo { max-width: 180px; }
        .home-card {
            width: 100%;
            padding: 2rem;
        }
    }
  `]
})
export class HomeComponent implements OnInit {
  userPoints = signal(0);
  userName = 'EMBAJADOR';
  entryCode = '';
  isSubmitting = false;

  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  ngOnInit() {
    this.router.navigate(['/rewards']);
  }

  loadUserPoints() {
    this.auth.getProfile().subscribe({
      next: (profile: any) => {
        const user = profile.user || profile;
        this.userPoints.set(parseInt(user.points || 0));
      },
      error: () => {
        this.userPoints.set(0);
      }
    });
  }

  goToRewards() {
    this.router.navigate(['/rewards']);
  }

  redeemCode() {
    if (!this.entryCode) return;
    this.isSubmitting = true;

    this.http.post(`${environment.apiUrl}/codes/redeem`, { code: this.entryCode }).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.entryCode = '';
        this.loadUserPoints();
        import('sweetalert2').then(Swal => {
          Swal.default.fire({
            title: '¡CÓDIGO EXITOSO!',
            text: `Has sumado ${res.points} puntos.`,
            icon: 'success',
            confirmButtonColor: 'var(--admin-primary)'
          });
        });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const msg = err.error?.messages?.error || err.error?.message || 'Error al canjear el código.';
        const status = err.status;
        let title = 'ERROR';
        
        if (status === 400 && msg.includes('canjeado')) {
          title = 'Código Utilizado';
        } else if (status === 404 || msg.includes('válido')) {
          title = 'Código Invalido';
        }

        import('sweetalert2').then(Swal => {
          Swal.default.fire({
            title: title,
            text: msg,
            icon: 'error',
            confirmButtonColor: 'var(--admin-primary)',
            confirmButtonText: 'OK'
          });
        });
      }
    });
  }
}
