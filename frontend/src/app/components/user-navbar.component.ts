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
          </div>
          <div class="right-info">
            <span class="info-item">
              <a href="https://wa.me/525574479668" target="_blank" style="color: #ffffff; text-decoration: none; display: flex; align-items: center; gap: 0.4rem;">
                <img src="assets/img/icon_wa.png" alt="WA" style="width: 16px; height: 16px;" (error)="$event.target.style.display='none'"> 
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
