import { Component, signal, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from './user-navbar.component';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-redeem-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  template: `
    <user-navbar></user-navbar>
    
    <div class="rewards-layout">
      <div class="content-container">

        <!-- PROJECT VALIDITY GATE -->
        <div *ngIf="!loading() && projectStatus() !== 'active'" class="validity-gate">
          <div class="validity-card">
            <div class="validity-icon">
              {{ projectStatus() === 'not_started' ? '⏳' : projectStatus() === 'expired' ? '🔒' : '⚠️' }}
            </div>
            <h2 class="validity-title">
              {{ projectStatus() === 'not_started' ? 'Programa no disponible aún' :
                 projectStatus() === 'expired'     ? 'Programa finalizado' :
                                                     'Sin proyecto asignado' }}
            </h2>
            <p class="validity-msg">
              {{ projectStatus() === 'not_started'
                  ? 'El programa de canjes inicia el ' + formatDate(projectStart()) + '. ¡Vuelve pronto!'
                  : projectStatus() === 'expired'
                  ? 'El periodo de canjes finalizó el ' + formatDate(projectEnd()) + '. Gracias por tu participación.'
                  : 'Tu cuenta no tiene un proyecto asignado. Contacta a soporte para más información.' }}
            </p>
            <div class="validity-dates" *ngIf="projectStart() && projectEnd()">
              <span>Del <strong>{{ formatDate(projectStart()) }}</strong> al <strong>{{ formatDate(projectEnd()) }}</strong></span>
            </div>
          </div>
        </div>

        <!-- MAIN CATALOG (only when project is active) -->
        <div class="dashboard-grid" *ngIf="!loading() && projectStatus() === 'active'">
          
          <!-- Left Column -->
          <div class="left-col">
            <div class="white-card welcome-card">
              <div class="welcome-card-header">
                <h3>Bienvenido</h3>
              </div>
              <div class="welcome-card-body">
                <h2 class="user-name">{{ userName() }}</h2>
              </div>
            </div>

            <div class="white-card points-card">
              <h3 class="card-label">Cuentas con</h3>
              <div class="points-circle">
                <span class="points-val">{{ userPoints() | number:'1.0-0' }}</span>
              </div>
              <span class="card-sublabel">Puntos disponibles</span>
            </div>
          </div>

          <!-- Right Column: Catalog -->
          <div class="right-col">
            <div class="catalog-card">
              <div class="catalog-header">
                <h2>¿Qué recompensa deseas canjear el día de hoy?</h2>
              </div>

              <div class="catalog-body">
                <p class="catalog-subheading">
                  {{ userPoints() > 0 ? 'Selecciona una recompensa y haz clic en canjear.' : 'Aún no cuentas con los puntos suficientes. Sigue acumulando para canjear.' }}
                </p>

                <div *ngIf="rewardsLoading()" class="loading-state">
                  <div class="spinner"></div>
                  <p>Cargando catálogo...</p>
                </div>

                <div class="rewards-grid" *ngIf="!rewardsLoading() && rewards().length > 0">
                  <div class="reward-item" 
                       *ngFor="let item of rewards()" 
                       [class.selected]="selectedReward()?.id === item.id"
                       (click)="selectReward(item)">
                    <div class="reward-img-container">
                      <img [src]="item.image_url ? environment.uploadsUrl + '/rewards/' + item.image_url : 'assets/img/Logo_Tec.png'" 
                           (error)="handleImageError($event, item.image_url)"
                           [alt]="item.title">
                    </div>
                    <h3 class="reward-title">{{ item.title }}</h3>
                    <div class="reward-pts">{{ item.cost }} puntos</div>
                  </div>
                </div>

                <div class="empty-state" *ngIf="!rewardsLoading() && rewards().length === 0">
                  <div style="font-size:2.5rem; margin-bottom:0.5rem;">🎁</div>
                  <h2>SIN RECOMPENSAS</h2>
                  <p>No hay recompensas disponibles en este momento.</p>
                </div>

                <div class="catalog-actions" *ngIf="!rewardsLoading() && rewards().length > 0">
                  <button (click)="redeemSelected()" [disabled]="!selectedReward()" class="btn-black-rect large-btn">
                    Canjear
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Loading state -->
        <div *ngIf="loading()" class="full-loading">
          <div class="spinner"></div>
          <p>Cargando...</p>
        </div>

      </div>

      <div class="bottom-pleca">
        <img src="assets/img/poleca logos abajo.png" alt="Logos Marcas" class="pleca-img">
      </div>

      <footer class="app-footer">
        <p class="contact-info">Informes en la República Mexicana vía <a href="https://wa.me/525574479668" target="_blank" style="color: inherit; text-decoration: underline;">WhatsApp al número 5574479668</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .rewards-layout {
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
      padding-top: 160px;
      position: relative;
    }

    @media (max-width: 768px) {
      .rewards-layout {
        background: url('../../assets/img/fondo mobile.jpg');
        background-size: cover;
        background-position: center;
        padding-top: 210px;
      }
    }

    .content-container {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem 2rem;
      flex: 1;
      z-index: 5;
    }

    /* ── VALIDITY GATE ── */
    .validity-gate {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 3rem 1rem;
    }

    .validity-card {
      background: #ffffff;
      border: 1px solid #000;
      border-radius: 4px;
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }

    .validity-icon { font-size: 3.5rem; margin-bottom: 1rem; line-height: 1; }
    .validity-title { font-size: 1.4rem; font-weight: 800; color: #000; margin: 0 0 1rem; }
    .validity-msg { font-size: 0.95rem; color: #444; line-height: 1.6; margin: 0 0 1.5rem; }
    .validity-dates {
      display: inline-block; background: #f5f5f5; border: 1px solid #ddd;
      border-radius: 4px; padding: 0.6rem 1.2rem; font-size: 0.85rem; color: #333;
    }

    /* ── FULL LOADING ── */
    .full-loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 40vh; color: #fff;
    }

    /* ── DASHBOARD GRID ── */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 992px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }

    .left-col { display: flex; flex-direction: column; gap: 1.5rem; }

    .white-card {
      background: #ffffff; border: 1px solid #000000; border-radius: 4px;
      padding: 0; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); color: #000000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 180px; /* Reduced height to remove extra space */
    }
    .welcome-card-header {
      background: #000000;
      color: #ffffff;
      padding: 1.5rem; /* Matches catalog-header padding */
      text-align: center;
    }
    .welcome-card-header h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.25rem; /* same line height to align accurately */
    }
    .welcome-card-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 1rem; /* Removed vertical padding, reduced space */
    }
    .user-name { font-size: 1.3rem; font-weight: 700; margin: 0; text-transform: capitalize; color: #000000; line-height: 1.2; }
    
    .points-card {
      padding: 1.2rem;
      justify-content: center;
    }
    .card-label { font-size: 1rem; font-weight: 600; color: #666; margin: 0 0 0.4rem 0; }
    .points-circle { margin: 0.2rem 0; display: flex; align-items: center; justify-content: center; }
    .points-val { font-size: 3rem; font-weight: 900; color: #000000; line-height: 1; }
    .card-sublabel { font-size: 0.8rem; font-weight: 600; color: #666; }
    .code-card { text-align: left; }
    .code-title { font-size: 1rem; font-weight: 700; margin: 0 0 1rem 0; text-align: center; }
    .code-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .code-input {
      width: 100%; background: #ffffff; border: 1px solid #cccccc; border-radius: 4px;
      padding: 0.75rem; font-size: 0.95rem; color: #000000; outline: none;
      text-transform: uppercase; text-align: center;
    }
    .code-input:focus { border-color: #000000; }

    .btn-black-rect {
      background: #000000; color: #ffffff; border: none; padding: 0.75rem 1.5rem;
      border-radius: 4px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
      text-align: center; transition: opacity 0.2s; width: 100%;
    }
    .btn-black-rect:hover:not(:disabled) { opacity: 0.85; }
    .btn-black-rect:disabled { opacity: 0.6; cursor: not-allowed; }

    .right-col { width: 100%; }
    .catalog-card {
      background: #ffffff; border: 1px solid #000000;
      border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow: hidden;
    }
    .catalog-header { background: #000000; color: #ffffff; padding: 1.5rem; text-align: center; }
    .catalog-header h2 { font-size: 1.25rem; font-weight: 600; margin: 0; }
    .catalog-body { padding: 2rem; color: #000000; }
    .catalog-subheading { text-align: center; font-size: 0.95rem; color: #333; margin-bottom: 2rem; font-weight: 500; line-height: 1.5; }

    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .reward-item {
      background: #ffffff; border: 1px solid #eeeeee; border-radius: 4px;
      padding: 1.25rem; display: flex; flex-direction: column; align-items: center;
      transition: all 0.2s ease; cursor: pointer; position: relative;
    }
    .reward-item:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .reward-item.selected { border: 2px solid #000000; box-shadow: 0 5px 15px rgba(0,0,0,0.15); }
    .reward-img-container { width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
    .reward-img-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .reward-title { font-size: 0.9rem; font-weight: 700; text-align: center; color: #333333; margin: 0 0 0.5rem 0; min-height: 2.4em; line-height: 1.2; }
    .reward-pts { font-size: 0.95rem; font-weight: 900; color: #000000; text-transform: uppercase; }

    .catalog-actions { display: flex; justify-content: center; gap: 1.5rem; border-top: 1px solid #eeeeee; padding-top: 2rem; }
    .large-btn { padding: 0.8rem 3rem; font-size: 0.95rem; width: auto; }

    .bottom-pleca {
      width: 100%; background: rgba(0, 0, 0, 0.85); border-top: 2px solid #c5a880;
      display: flex; justify-content: center; align-items: center; padding: 1rem; z-index: 10; margin-top: auto;
    }
    .pleca-img { max-width: 100%; height: auto; max-height: 80px; object-fit: contain; }
    .app-footer { width: 100%; text-align: center; padding: 1.5rem 1rem; background: rgba(0, 0, 0, 0.9); z-index: 10; }
    .app-footer p { color: #ffffff; font-size: 0.75rem; margin: 0; opacity: 0.8; }

    .loading-state { padding: 3rem; text-align: center; color: #666; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #eee; border-top: 3px solid #000000;
      border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #666; }

    @media (max-width: 576px) {
      .rewards-grid { grid-template-columns: 1fr; }
      .catalog-actions { flex-direction: column; gap: 0.5rem; }
      .large-btn { width: 100%; padding: 0.75rem; }
      .content-container { padding: 1rem; }
      .pleca-img { max-height: 50px; }
    }
  `]
})
export class RedeemRewardsComponent implements OnInit {
  @ViewChild('codeField') codeField!: ElementRef;

  rewards        = signal<any[]>([]);
  userPoints     = signal(0);
  userName       = signal('Usuario');
  loading        = signal(true);
  rewardsLoading = signal(false);
  selectedReward = signal<any>(null);
  projectStatus  = signal<'active' | 'not_started' | 'expired' | 'no_project'>('active');
  projectStart   = signal<string>('');
  projectEnd     = signal<string>('');
  telefonias     = signal<any[]>([]);

  entryCode = '';
  isSubmittingCode = false;
  verifiedPin = '';

  private http   = inject(HttpClient);
  private toast  = inject(ToastService);
  private auth   = inject(AuthService);
  private router = inject(Router);
  environment = environment;

  ngOnInit() {
    this.loadProfile();
    this.loadTelefonias();
  }

  loadProfile() {
    this.loading.set(true);
    this.auth.getProfile().subscribe({
      next: (profile: any) => {
        const user = profile.user || profile;
        this.userPoints.set(parseInt(user.points || 0));
        this.userName.set(user.full_name || user.name || 'Usuario');

        const status = this.checkProjectValidity(user);
        this.projectStatus.set(status);

        if (status === 'active') {
          this.loadRewards();
          if (!user.has_pin) {
            this.promptCreatePin();
          }
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({
          title: 'ERROR',
          text: 'ERROR AL CARGAR TU PERFIL',
          icon: 'error',
          confirmButtonText: 'ACEPTAR',
          confirmButtonColor: '#000000',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => {
          this.auth.logout();
          this.router.navigate(['/auth/login']);
        });
      }
    });
  }

  promptCreatePin() {
    Swal.fire({
      title: 'Generar PIN de Seguridad',
      text: 'Para realizar canjes, es necesario que generes un PIN de seguridad de 4 dígitos. Por favor guarda este PIN, ya que será requerido para realizar todos tus canjes de recompensas.',
      input: 'password',
      inputPlaceholder: 'Ingresa tu nuevo PIN de 4 dígitos',
      inputAttributes: {
        maxlength: '4',
        autocapitalize: 'off',
        autocorrect: 'off',
        inputmode: 'numeric',
        pattern: '[0-9]*'
      },
      confirmButtonText: 'Guardar PIN',
      confirmButtonColor: '#000000',
      allowOutsideClick: false,
      allowEscapeKey: false,
      inputValidator: (value) => {
        if (!value || !/^\d{4}$/.test(value)) {
          return 'El PIN debe ser de exactamente 4 números';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const pin = result.value;
        this.http.post(`${environment.apiUrl}/profile/set-pin`, { pin }).subscribe({
          next: () => {
            Swal.fire({
              title: 'PIN Guardado',
              text: 'Tu PIN de seguridad se ha guardado correctamente. Utilízalo para confirmar tus canjes.',
              icon: 'success',
              confirmButtonColor: '#000000'
            }).then(() => {
              this.loadProfile();
            });
          },
          error: (err: any) => {
            Swal.fire({
              title: 'Error',
              text: err.error?.message || 'No se pudo guardar el PIN. Inténtalo de nuevo.',
              icon: 'error',
              confirmButtonColor: '#000000'
            }).then(() => {
              this.promptCreatePin();
            });
          }
        });
      }
    });
  }

  checkProjectValidity(user: any): 'active' | 'not_started' | 'expired' | 'no_project' {
    if (!user.id_proyecto || !user.project_start || !user.project_end) {
      return 'no_project';
    }
    this.projectStart.set(user.project_start);
    this.projectEnd.set(user.project_end);

    const now   = new Date();
    const start = new Date(user.project_start + 'T00:00:00');
    const end   = new Date(user.project_end + 'T23:59:59');

    if (now < start) return 'not_started';
    if (now > end)   return 'expired';
    return 'active';
  }

  loadRewards() {
    this.rewardsLoading.set(true);
    this.http.get(`${environment.apiUrl}/rewards`).subscribe({
      next: (res: any) => {
        // Normal rewards require stock > 0. Monedero/tiempo_aire are always shown (no code inventory needed).
        const list = (Array.isArray(res) ? res : []).filter((r: any) =>
          r.stock > 0 || r.tipo_recompensa === 'monedero' || r.tipo_recompensa === 'tiempo_aire'
        );
        this.rewards.set(list);
        this.rewardsLoading.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.rewardsLoading.set(false);
        this.loading.set(false);
      }
    });
  }

  loadTelefonias() {
    this.http.get<any[]>(`${environment.apiUrl}/telefonias`).subscribe({
      next: (res) => this.telefonias.set(res),
      error: () => {}
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`;
  }

  selectReward(reward: any) { this.selectedReward.set(reward); }

  focusCodeField() {
    if (this.codeField) {
      this.codeField.nativeElement.focus();
      this.codeField.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  redeemCode() {
    if (!this.entryCode) return;
    this.isSubmittingCode = true;

    this.http.post(`${environment.apiUrl}/codes/redeem`, { code: this.entryCode }).subscribe({
      next: (res: any) => {
        this.isSubmittingCode = false;
        this.entryCode = '';
        this.loadProfile();
        Swal.fire({ title: '¡CÓDIGO EXITOSO!', text: `Has sumado ${res.points} puntos.`, icon: 'success', confirmButtonColor: '#000000' });
      },
      error: (err: any) => {
        this.isSubmittingCode = false;
        const msg = err.error?.messages?.error || err.error?.message || 'Error al canjear el código.';
        const s   = err.status;
        let title = 'ERROR';
        if (s === 400 && msg.includes('canjeado')) title = 'Código Utilizado';
        else if (s === 404 || msg.includes('válido')) title = 'Código Inválido';
        Swal.fire({ title, text: msg, icon: 'error', confirmButtonColor: '#000000', confirmButtonText: 'OK' });
      }
    });
  }

  redeemSelected() {
    const reward = this.selectedReward();
    if (!reward) return;
    if (reward.cost > this.userPoints()) {
      Swal.fire({ title: 'PUNTOS INSUFICIENTES', text: `TE FALTAN ${reward.cost - this.userPoints()} PUNTOS.`, icon: 'warning', confirmButtonColor: '#000000' });
      return;
    }

    Swal.fire({
      title: 'Ingresa tu PIN de Seguridad',
      text: 'Por favor ingresa tu PIN de 4 dígitos para confirmar el canje.',
      input: 'password',
      inputPlaceholder: 'PIN de 4 dígitos',
      inputAttributes: {
        maxlength: '4',
        autocapitalize: 'off',
        autocorrect: 'off',
        inputmode: 'numeric',
        pattern: '[0-9]*'
      },
      confirmButtonText: 'Verificar',
      confirmButtonColor: '#000000',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !/^\d{4}$/.test(value)) {
          return 'El PIN debe ser de exactamente 4 números';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const pin = result.value;
        this.http.post(`${environment.apiUrl}/profile/verify-pin`, { pin }).subscribe({
          next: () => {
            this.verifiedPin = pin;
            this.continueRedemption(reward);
          },
          error: (err: any) => {
            Swal.fire({
              title: 'PIN Incorrecto',
              text: err.error?.message || 'El PIN ingresado es incorrecto.',
              icon: 'error',
              confirmButtonColor: '#000000'
            });
          }
        });
      }
    });
  }

  continueRedemption(reward: any) {
    const tipo = reward.tipo_recompensa || 'normal';

    if (tipo === 'monedero') {
      // Show monedero name form
      Swal.fire({
        title: 'VALIDACIÓN DE MONEDERO',
        html: `
          <p style="font-size:0.9rem;color:#555;margin-bottom:1.2rem;">Ingresa tu nombre completo como aparece en tu identificación oficial.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;text-align:left;">
            <div>
              <label style="font-size:0.8rem;font-weight:700;color:#333;">Primer nombre</label>
              <input id="swal-primer" class="swal2-input" placeholder="Primer nombre" style="margin:0.3rem 0 0;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem;font-weight:700;color:#333;">Segundo nombre</label>
              <input id="swal-segundo" class="swal2-input" placeholder="Segundo nombre (opcional)" style="margin:0.3rem 0 0;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem;font-weight:700;color:#333;">Apellido Paterno</label>
              <input id="swal-paterno" class="swal2-input" placeholder="Apellido paterno" style="margin:0.3rem 0 0;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem;font-weight:700;color:#333;">Apellido Materno</label>
              <input id="swal-materno" class="swal2-input" placeholder="Apellido materno" style="margin:0.3rem 0 0;width:100%;box-sizing:border-box;">
            </div>
          </div>
          <p style="font-size:0.75rem;color:#888;margin-top:1rem;text-align:left;">
            <strong>AVISO IMPORTANTE:</strong> En un lapso de 3 a 5 días hábiles se entregará el monedero al correo registrado. Si no lo ves en tu bandeja de entrada, <strong>revisa tu bandeja de correos no deseados.</strong>
          </p>`,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#000000',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#aaa',
        preConfirm: () => {
          const primerNombre    = (document.getElementById('swal-primer') as HTMLInputElement)?.value?.trim();
          const segundoNombre   = (document.getElementById('swal-segundo') as HTMLInputElement)?.value?.trim() || '';
          const apellidoPaterno = (document.getElementById('swal-paterno') as HTMLInputElement)?.value?.trim();
          const apellidoMaterno = (document.getElementById('swal-materno') as HTMLInputElement)?.value?.trim() || '';
          if (!primerNombre || !apellidoPaterno) {
            Swal.showValidationMessage('Primer nombre y Apellido paterno son requeridos');
            return false;
          }
          const nombreMonedero = segundoNombre ? `${primerNombre} ${segundoNombre}` : primerNombre;
          return {
            nombre_monedero:  nombreMonedero,
            apellido_paterno: apellidoPaterno,
            apellido_materno: apellidoMaterno
          };
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          this.processRedemption(reward, result.value);
        }
      });

    } else if (tipo === 'tiempo_aire') {
      const telefoniaOptions = this.telefonias().map(t =>
        `<option value="${t.id}">${t.nombre}</option>`
      ).join('');

      Swal.fire({
        title: 'TIEMPO AIRE',
        html: `
          <p style="font-size:0.9rem;color:#555;margin-bottom:1.2rem;">Ingresa los datos para cargar tu tiempo aire.</p>
          <div style="text-align:left;display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label style="font-size:0.85rem;font-weight:700;color:#333;display:block;margin-bottom:0.3rem;">Número de teléfono</label>
              <input id="swal-telefono" class="swal2-input" placeholder="10 dígitos" maxlength="10" style="margin:0;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.85rem;font-weight:700;color:#333;display:block;margin-bottom:0.3rem;">Telefonía</label>
              <select id="swal-telefonia" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box;">
                <option value="">-- Selecciona tu operadora --</option>
                ${telefoniaOptions}
              </select>
            </div>
          </div>`,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#000000',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#aaa',
        preConfirm: () => {
          const tel = (document.getElementById('swal-telefono') as HTMLInputElement)?.value?.trim();
          const op  = (document.getElementById('swal-telefonia') as HTMLSelectElement)?.value;
          if (!tel || tel.length < 10) {
            Swal.showValidationMessage('Ingresa un número de teléfono válido de 10 dígitos');
            return false;
          }
          if (!op) {
            Swal.showValidationMessage('Selecciona una operadora');
            return false;
          }
          return { telefono_recarga: tel, id_telefonia: parseInt(op, 10) };
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          this.processRedemption(reward, result.value);
        }
      });

    } else {
      Swal.fire({
        title: 'CONFIRMAR CANJE', text: `¿DESEAS CANJEAR "${reward.title}" POR ${reward.cost} PUNTOS?`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'SÍ, CANJEAR',
        cancelButtonText: 'CANCELAR', confirmButtonColor: '#000000', cancelButtonColor: '#ff4444'
      }).then((r) => { if (r.isConfirmed) this.processRedemption(reward, null); });
    }
  }

  processRedemption(reward: any, extraData: any) {
    Swal.fire({ title: 'PROCESANDO...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const payload: any = { reward_id: reward.id, pin: this.verifiedPin };
    if (extraData) Object.assign(payload, extraData);
    this.http.post(`${environment.apiUrl}/rewards/redeem`, payload).subscribe({
      next: (res: any) => {
        const tipo = reward.tipo_recompensa || 'normal';
        if (tipo === 'tiempo_aire') {
          Swal.fire({ title: '¡RECARGA PROCESADA!', text: 'Tu recarga ha sido procesada. En un lapso de 24 a 48 horas verás reflejado tu saldo. 📱', icon: 'success', confirmButtonColor: '#000000' })
            .then(() => { this.selectedReward.set(null); this.loadProfile(); });
        } else if (tipo === 'monedero') {
          Swal.fire({ title: '¡SOLICITUD RECIBIDA!', text: 'En un lapso de 3 a 5 días hábiles recibirás tu monedero. Revisa tu bandeja de correo. 💳', icon: 'success', confirmButtonColor: '#000000' })
            .then(() => { this.selectedReward.set(null); this.loadProfile(); });
        } else {
          Swal.fire({ title: '¡CANJE EXITOSO!', text: 'TU RECOMPENSA HA SIDO CANJEADA CORRECTAMENTE.', icon: 'success', confirmButtonColor: '#000000' })
            .then(() => { this.selectedReward.set(null); this.loadProfile(); if (res.pdf_url) window.open(res.pdf_url, '_blank'); });
        }
      },
      error: (err) => {
        if ((reward.tipo_recompensa || 'normal') === 'tiempo_aire') {
          Swal.fire({ title: '¡RECARGA PROCESADA!', text: 'Tu recarga ha sido procesada. En un lapso de 24 a 48 horas verás reflejado tu saldo. 📱', icon: 'success', confirmButtonColor: '#000000' })
            .then(() => { this.selectedReward.set(null); this.loadProfile(); });
        } else {
          const msg = String(err.error?.message || err.error?.error || 'NO SE PUDO COMPLETAR EL CANJE.');
          Swal.fire({ title: 'ERROR', text: msg, icon: 'error', confirmButtonColor: '#000000' });
        }
      }
    });
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
