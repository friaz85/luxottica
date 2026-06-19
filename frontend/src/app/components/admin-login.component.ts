import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-login-container footer-safe-area">
      <div class="login-card">
        <div class="logo-section">
          <img src="assets/img/Logo_Luxottica.png" alt="Luxottica" class="logo animate-pulse">
          <h1>Admin Control</h1>
        </div>
        
        <form (submit)="onSubmit($event)">
          <div class="form-group">
            <label>Usuario</label>
            <input type="text" [(ngModel)]="username" name="username" required placeholder="User">
          </div>
          
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••">
          </div>
          
          <div class="error-msg" *ngIf="error()">{{error()}}</div>
          
          <button type="submit" [disabled]="loading()" class="login-btn">
            <span *ngIf="!loading()">Acceder</span>
            <span *ngIf="loading()" class="spinner"></span>
          </button>
        </form>
      </div>
      <footer class="user-footer">
        <p>© 2026 Todos los derechos reservados Quantum TM HMM Rewards S. de R.L. de C.V.</p>
        <p class="contact-info">Informes en la República Mexicana vía <a href="https://wa.me/525574479668" target="_blank" style="color: inherit; text-decoration: underline;">WhatsApp al número 5574479668</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .admin-login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: url('../../assets/img/Background.png');
      background-size: cover;
      background-position: center;
      position: relative;
      overflow: hidden;
    }

    .admin-login-container::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(18, 18, 18, 0.95) 100%);
      z-index: 1;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 4rem 3rem;
      border-radius: 2rem;
      width: 100%;
      max-width: 450px;
      z-index: 10;
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.7);
      animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .logo-section {
      text-align: center;
      margin-bottom: 3rem;
    }

    .logo {
      height: 60px;
      object-fit: contain;
      margin-bottom: 1.5rem;
      filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.15));
    }

    h1 {
      color: var(--admin-primary);
      text-transform: uppercase;
      font-weight: 900;
      letter-spacing: 3px;
      margin: 0;
      font-size: 1.8rem;
    }

    .form-group {
      margin-bottom: 2rem;
    }

    label {
      display: block;
      color: var(--admin-primary);
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    input {
      width: 100%;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      padding: 1rem 1.2rem;
      border-radius: 1rem;
      color: #333;
      transition: all 0.3s;
      font-size: 1rem;
      font-weight: 600;
    }

    input:focus {
      outline: none;
      border-color: var(--admin-accent);
      background: white;
      box-shadow: 0 0 0 4px rgba(197, 168, 128, 0.2);
    }

    .login-btn {
      width: 100%;
      background: var(--admin-primary);
      color: white;
      border: 1px solid var(--admin-accent);
      padding: 1.2rem;
      border-radius: 1rem;
      font-weight: 900;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-transform: uppercase;
      font-size: 1.1rem;
      letter-spacing: 2px;
      margin-top: 1rem;
    }

    .login-btn:hover {
      background: var(--admin-accent);
      color: var(--admin-primary);
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(197, 168, 128, 0.3);
    }

    .login-btn:active {
      transform: translateY(-2px);
    }

    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .error-msg {
      color: #ef4444;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
      text-align: center;
      font-weight: 700;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 0.5rem;
    }

    @keyframes animate-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.15)); }
      50% { transform: scale(1.03); filter: drop-shadow(0 0 25px rgba(197, 168, 128, 0.2)); }
    }
    .animate-pulse { animation: animate-pulse 3s infinite ease-in-out; }
  `]
})
export class AdminLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit(e: Event) {
    e.preventDefault();
    this.loading.set(true);
    this.error.set('');

    this.auth.adminLogin({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        const msg = (err.error?.message || 'ERROR DE CONEXIÓN').toUpperCase();
        this.error.set(msg);
        this.toast.show(msg, 'error');
        this.loading.set(false);
      }
    });
  }
}
