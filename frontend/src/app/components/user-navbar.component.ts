import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { WhatsappBubbleComponent } from './whatsapp-bubble.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'user-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WhatsappBubbleComponent],
  template: `
    <header class="app-header">
      <!-- Thin Top Navigation Bar -->
      <nav class="top-nav">
        <div class="top-nav-content">
          <div class="left-links">
            <a (click)="logout()" class="nav-link cursor-pointer">Salir</a>
            <span class="separator">|</span>
            <a routerLink="/rewards" class="nav-link">Inicio</a>
            <span class="separator">|</span>
            <a routerLink="/history" class="nav-link">Historial</a>
          </div>
          <div class="right-info">
            <span class="info-item">
              <a href="https://wa.me/525574479668" target="_blank" style="color: #ffffff; text-decoration: none; display: flex; align-items: center; gap: 0.4rem;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 14px; height: 14px; fill: #ffffff;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> 
                Ayuda: 5574479668
              </a>
            </span>
            <span class="info-item">
              <i class="mail-icon">✉️</i> atencionaclientes@quantummx.com
            </span>
          </div>
        </div>
      </nav>

      <!-- Gold separator line -->
      <div class="gold-separator"></div>

      <!-- Top Logos Pleca -->
      <div class="logo-pleca-container">
        <img src="assets/img/pleca logos arriba.png" alt="Logos" class="pleca-logos">
      </div>
    </header>
    <app-whatsapp-bubble></app-whatsapp-bubble>
  `,
  styles: [`
    .app-header {
      width: 100%;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: #000000;
    }

    .top-nav {
      background: #000000;
      height: 40px;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .top-nav-content {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #ffffff;
    }

    .left-links {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .nav-link {
      color: #ffffff;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .nav-link:hover {
      opacity: 0.8;
    }

    .cursor-pointer {
      cursor: pointer;
    }

    .separator {
      color: #ffffff;
      opacity: 0.5;
    }

    .right-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .gold-separator {
      height: 2px;
      background: #c5a880; /* Elegant gold tone */
      width: 100%;
    }

    .logo-pleca-container {
      background: rgba(0, 0, 0, 0.85);
      border-bottom: 1px solid #222222;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.75rem 1rem;
    }

    .pleca-logos {
      max-width: 100%;
      height: auto;
      max-height: 90px;
      object-fit: contain;
    }

    @media (max-width: 768px) {
      .top-nav-content {
        flex-direction: column;
        padding: 0.5rem;
        height: auto;
        gap: 0.5rem;
        text-align: center;
      }
      .top-nav {
        height: auto;
        padding: 0.5rem 0;
      }
      .right-info {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `]
})
export class UserNavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  showProfile() {
    this.auth.getProfile().subscribe({
      next: (profile: any) => {
        const user = profile.user || profile;
        Swal.fire({
          title: '<strong>Mi Perfil</strong>',
          icon: 'info',
          html: `
            <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
              <p><strong>Nombre:</strong> ${user.full_name || 'No especificado'}</p>
              <p><strong>Correo electrónico:</strong> ${user.email}</p>
              <p><strong>Puntos disponibles:</strong> ${user.points || 0}</p>
              <p><strong>Teléfono:</strong> ${user.phone || 'No especificado'}</p>
            </div>
          `,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#000000'
        });
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar la información del perfil.', 'error');
      }
    });
  }

  changePassword() {
    Swal.fire({
      title: 'Cambiar Contraseña',
      text: 'Por motivos de seguridad, para cambiar tu contraseña por favor ponte en contacto con soporte técnico vía WhatsApp al 5574479668 o escribe a atencionaclientes@quantummx.com.',
      icon: 'info',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#000000'
    });
  }
}
