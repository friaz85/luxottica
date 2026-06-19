import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserNavbarComponent } from './user-navbar.component';
import { ToastService } from '../services/toast.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-redeem-code',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  template: `
    <user-navbar></user-navbar>
    <div class="redeem-page footer-safe-area">
      <div class="card">
        <h2 class="title">CANJEAR CÓDIGO</h2>
        <p class="subtitle">Ingresa tu código de participación para obtener puntos.</p>
        
        <div class="input-group">
          <input 
            type="text" 
            [(ngModel)]="code" 
            placeholder="EJ: TEC-XXXX-XXXX" 
            class="code-input"
            [disabled]="loading()"
            (keyup.enter)="onSubmit()"
          >
          <button (click)="onSubmit()" class="redeem-btn" [disabled]="loading() || !code">
            {{ loading() ? 'PROCESANDO...' : 'CANJEAR' }}
          </button>
        </div>

        <div class="info-box">
          <p>⚠️ Recuerda que cada código solo puede ser utilizado una vez.</p>
        </div>
      </div>
      <footer class="user-footer">
        <p>© 2026 Todos los derechos reservados Quantum TM HMM Rewards S. de R.L. de C.V.</p>
        <p class="contact-info">Informes en la República Mexicana vía <a href="https://wa.me/525574479668" target="_blank" style="color: inherit; text-decoration: underline;">WhatsApp al número 5574479668</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .redeem-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: url('../../assets/img/Background.png');
      background-size: cover;
      background-position: center;
      padding: 2rem;
      position: relative;
    }
    .card {
      background: rgba(255, 255, 255, 0.98);
      padding: 3rem;
      border-radius: 2rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 500px;
      text-align: center;
    }
    .title { color: #003366; font-weight: 900; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2.5rem; font-weight: 500; }
    
    .input-group { display: flex; flex-direction: column; gap: 1rem; }
    .code-input {
      background: #f5f5f5;
      border: 2px solid #ddd;
      padding: 1.2rem;
      border-radius: 1rem;
      font-size: 1.2rem;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      transition: 0.3s;
    }
    .code-input:focus { border-color: #003366; background: white; }
    
    .redeem-btn {
      background: #003366;
      color: white;
      border: none;
      padding: 1.2rem;
      border-radius: 1rem;
      font-weight: 900;
      font-size: 1.1rem;
      cursor: pointer;
      transition: 0.3s;
    }
    .redeem-btn:hover:not(:disabled) { background: #002244; transform: translateY(-3px); }
    .redeem-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .info-box {
      margin-top: 2rem;
      padding: 1rem;
      background: rgba(0, 51, 102, 0.05);
      border-radius: 1rem;
      font-size: 0.9rem;
      color: #666;
      font-weight: 600;
    }
  `]
})
export class RedeemCodeComponent {
  code = '';
  loading = signal(false);

  private http = inject(HttpClient);
  private toast = inject(ToastService);

  onSubmit() {
    if (!this.code) return;
    
    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/codes/redeem`, { code: this.code }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.toast.show(res.message || 'CÓDIGO CANJEADO CON ÉXITO', 'success');
        this.code = '';
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'ERROR AL CANJEAR CÓDIGO';
        this.toast.show(msg, 'error');
      }
    });
  }
}
