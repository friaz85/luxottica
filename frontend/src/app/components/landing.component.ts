import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing footer-safe-area">
      <div class="hero">
        <div class="hero-flex">
          <div class="hero-left">
            <div class="logo-wrapper">
              <img src="assets/img/Logo_Tec.png?v=5" alt="TEC" class="tec-logo animate__animated animate__zoomIn">
            </div>
          </div>
          
          <div class="hero-right welcome-card">
            <h1 class="title">BIENVENIDO</h1>
            <p class="desc">Portal de Luxottica</p>
            <div class="actions">
              <a routerLink="/auth/login" class="tec-btn primary">INICIAR SESIÓN</a>
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
    .hero-right {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .welcome-card {
      background: rgba(255, 255, 255, 0.95);
      padding: 4rem 3rem;
      border-radius: 2rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      max-width: 500px;
    }

    .tec-logo { 
      width: auto;
      height: auto;
      max-height: 40vh;
      max-width: 100%;
      object-fit: contain;
    }

    .title {
      color: var(--admin-primary);
      font-size: clamp(2.5rem, 8vw, 4rem);
      font-weight: 900;
      margin-bottom: 0.5rem;
    }

    .desc { 
      color: #666; 
      font-size: 1.2rem; 
      margin-bottom: 2.5rem; 
      font-weight: 500;
    }

    .actions { width: 100%; }

    .tec-btn { 
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.2rem 2.5rem; 
      border-radius: 1rem; 
      font-weight: 900; 
      text-decoration: none; 
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      font-size: 1.3rem; 
      text-align: center;
    }

    .primary { 
      background: var(--admin-primary); 
      color: white; 
      box-shadow: 0 10px 20px rgba(0, 51, 102, 0.2); 
    }

    .primary:hover { 
      transform: translateY(-5px); 
      background: var(--admin-secondary);
      box-shadow: 0 15px 30px rgba(0, 51, 102, 0.4); 
    }

    @media (max-width: 992px) {
      .hero-flex {
        flex-direction: column;
        gap: 2rem;
      }
      .tec-logo { max-width: 180px; }
      .welcome-card {
        padding: 3rem 2rem;
        width: 100%;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }
}
