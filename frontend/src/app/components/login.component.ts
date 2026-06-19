import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-layout">
      <!-- Top Logos Banner -->
      <div class="top-pleca">
        <img src="assets/img/pleca logos arriba.png" alt="Logos Marcas" class="pleca-img">
      </div>

      <!-- Main Login Container -->
      <div class="login-container">
        <div class="login-card">
          <h2 class="form-title">Inicia Sesión para continuar.</h2>
          
          <form (submit)="onSubmit()" class="login-form">
            <div class="field">
              <label>Correo electrónico</label>
              <input type="email" [(ngModel)]="email" name="email" required class="input-flat" placeholder="Ingresa correo electrónico">
            </div>

            <div class="field">
              <label>Contraseña</label>
              <input type="password" [(ngModel)]="password" name="password" required class="input-flat" placeholder="Ingresa tu contraseña">
              <div class="forgot-password">
                <a (click)="forgotPassword()" class="forgot-link">¿No recuerdas tu contraseña?</a>
              </div>
            </div>

            <div class="field privacy-field">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="privacyAccepted" name="privacyAccepted" required>
                <span class="checkmark"></span>
                <span class="label-text">Acepto y he leído <a href="https://qrewards.com.mx/AVISO_DE_PRIVACIDAD%202026.pdf" target="_blank">aviso de privacidad</a></span>
              </label>
            </div>

            <div class="buttons-row">
              <button type="submit" class="btn-black" [disabled]="loading()">
                {{ loading() ? 'Iniciando...' : 'Iniciar sesión' }}
              </button>
              <button type="button" class="btn-black" (click)="registerNewUser()">
                Regístrate
              </button>
            </div>
          </form>

          <div class="new-user-link">
            <a (click)="registerNewUser()">Da click aquí si eres usuario nuevo</a>
          </div>
        </div>
      </div>

      <!-- Bottom Logos Banner -->
      <div class="bottom-pleca">
        <img src="assets/img/poleca logos abajo.png" alt="Logos Marcas" class="pleca-img">
      </div>

      <!-- Footer Text -->
      <footer class="app-footer">
        <p>C 2020 Todos los derechos reservados Quantum TM Hollywood Movie Magic S de RL de CV. Desarrollado con ♥ por QuantumDevelopment</p>
        <p class="contact-info">Informes en la República Mexicana: 55 5249.3752 <a href="mailto:atencionaclientes@quantummx.com">atencionaclientes@quantummx.com</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .login-layout {
      min-height: 100vh;
      width: 100vw;
      background: url('../../assets/img/fondo web.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      overflow-x: hidden;
      position: relative;
      padding: 0;
      color: #fff;
    }

    @media (max-width: 768px) {
      .login-layout {
        background: url('../../assets/img/fondo mobile.jpg');
        background-size: cover;
        background-position: center;
      }
    }

    .top-pleca {
      width: 100%;
      background: rgba(0, 0, 0, 0.85);
      border-bottom: 2px solid #c5a880; /* Elegant gold border */
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      z-index: 10;
    }

    .bottom-pleca {
      width: 100%;
      background: rgba(0, 0, 0, 0.85);
      border-top: 2px solid #c5a880; /* Elegant gold border */
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      z-index: 10;
      margin-top: auto;
    }

    .pleca-img {
      max-width: 100%;
      height: auto;
      max-height: 80px;
      object-fit: contain;
    }

    .login-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 2rem 1rem;
      z-index: 5;
    }

    .login-card {
      background: #ffffff;
      border-radius: 4px;
      width: 100%;
      max-width: 480px;
      padding: 2.5rem 2rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      text-align: center;
      border: 1px solid #eee;
    }

    .form-title {
      color: #000000;
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0 0 1.5rem 0;
      text-align: center;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }

    .field {
      text-align: left;
    }
    
    .field label {
      display: block;
      color: #333333;
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 0.4rem;
    }

    .input-flat {
      width: 100%;
      background: #ffffff;
      border: 1px solid #cccccc;
      border-radius: 4px;
      padding: 0.75rem;
      font-size: 0.95rem;
      color: #000000;
      outline: none;
      transition: 0.2s;
    }
    
    .input-flat:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    }

    .forgot-password {
      margin-top: 0.3rem;
      text-align: center;
    }

    .forgot-link {
      color: #666666;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.2s;
    }

    .forgot-link:hover {
      color: #000000;
      text-decoration: underline;
    }

    .privacy-field {
      margin: 0.2rem 0;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 28px;
      cursor: pointer;
      font-size: 0.8rem;
      user-select: none;
      color: #333333;
      font-weight: 500;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 1px;
      left: 0;
      height: 18px;
      width: 18px;
      background-color: #ffffff;
      border-radius: 3px;
      border: 1px solid #cccccc;
    }

    .checkbox-container:hover input ~ .checkmark {
      background-color: #f5f5f5;
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: #000000;
      border-color: #000000;
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 6px;
      top: 2px;
      width: 4px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .label-text a {
      color: #000000;
      text-decoration: underline;
      font-weight: 700;
    }

    .buttons-row {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .btn-black {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      flex: 1;
      transition: opacity 0.2s;
    }

    .btn-black:hover:not(:disabled) {
      opacity: 0.85;
    }

    .btn-black:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .new-user-link {
      margin-top: 1rem;
    }

    .new-user-link a {
      color: #0056b3;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .new-user-link a:hover {
      color: #003d80;
    }

    .app-footer {
      width: 100%;
      text-align: center;
      padding: 1.5rem 1rem;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10;
    }

    .app-footer p {
      color: #ffffff;
      font-size: 0.75rem;
      margin: 0;
      opacity: 0.8;
      line-height: 1.6;
    }

    .app-footer .contact-info {
      margin-top: 0.25rem;
    }

    .app-footer a {
      color: #ffffff;
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 1.5rem 1.25rem;
      }
      .buttons-row {
        flex-direction: column;
        gap: 0.5rem;
      }
      .pleca-img {
        max-height: 50px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = signal(false);
  privacyAccepted = signal(false);
  
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/rewards']);
    }
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.toast.show('Todos los campos son obligatorios.', 'info');
      return;
    }

    if (!this.privacyAccepted()) {
      this.toast.show('Debes aceptar el aviso de privacidad para continuar.', 'info');
      return;
    }

    this.loading.set(true);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.toast.show('Bienvenido.', 'success');
        this.router.navigate(['/rewards']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.messages?.error || err.error?.message || 'Error. Verifica tus credenciales.';
        this.toast.show(msg, 'error');
      }
    });
  }

  forgotPassword() {
    Swal.fire({
      title: '¿Olvidaste tu contraseña?',
      text: 'Por favor contacta a soporte técnico vía WhatsApp al número 55 5249.3752 o por correo a atencionaclientes@quantummx.com para restablecer tu contraseña.',
      icon: 'info',
      confirmButtonColor: '#000000'
    });
  }

  registerNewUser() {
    Swal.fire({
      title: 'Usuario Nuevo',
      text: 'Para registrarte y obtener tus credenciales, por favor contacta a soporte vía WhatsApp al número 55 5249.3752 o escribe a atencionaclientes@quantummx.com',
      icon: 'info',
      confirmButtonColor: '#000000'
    });
  }
}
