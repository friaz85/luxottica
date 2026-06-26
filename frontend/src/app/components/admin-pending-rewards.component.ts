import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { ToastService } from '../services/toast.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-pending-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; color: #333; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.4rem 0 0; font-size: 0.95rem; }

    .info-banner { background: linear-gradient(135deg, #fef9c3, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 14px 20px; margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; }
    .info-banner strong { color: #92400e; }
    .info-banner span { color: #78350f; line-height: 1.5; }

    .counter-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; border-radius: 13px; background: linear-gradient(135deg, #CC0000, #ff3333); color: #fff; font-size: 12px; font-weight: 800; padding: 0 8px; margin-left: 8px; vertical-align: middle; }

    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.2rem 1.5rem; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .table-header-title { font-weight: 800; font-size: 1rem; color: var(--admin-primary); display: flex; align-items: center; gap: 8px; }
    .search-box { width: 260px; }
    .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.7rem 1rem; border-radius: 0.5rem; outline: none; font-size: 0.9rem; }
    .search-box input:focus { border-color: var(--admin-accent); }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1rem 1.2rem; text-align: left; font-size: 0.82rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1rem 1.2rem; border-bottom: 1px solid #eee; font-size: 0.9rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .type-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #f1f5f9; color: #475569; }
    .type-pill.monedero    { background: #fef3c7; color: #92400e; }
    .type-pill.tiempo-aire { background: #dbeafe; color: #1e40af; }

    .detail-block { display: flex; flex-direction: column; gap: 2px; }
    .detail-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; }
    .detail-val { font-size: 13px; font-weight: 600; color: #0f172a; }

    .action-btn { padding: 0.55rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; display: inline-flex; align-items: center; gap: 5px; }
    .action-btn.primary { background: var(--admin-primary); color: white; }
    .action-btn.secondary { background: #f3f4f6; color: #374151; }
    .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.12); }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .empty-row td { text-align: center; padding: 60px; color: #94a3b8; }
    .empty-icon { font-size: 3rem; margin-bottom: 10px; }
    .empty-text { font-size: 1rem; font-weight: 700; color: #374151; margin: 0; }
    .empty-sub { font-size: 0.85rem; color: #94a3b8; margin: 4px 0 0; }

    .loading-row td { text-align: center; padding: 60px; }
    .load-spinner { display: inline-block; width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: var(--admin-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .pagination-footer { padding: 1.2rem 1.5rem; background: #fff; border-top: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .pag-info { font-size: 0.85rem; color: #6b7280; }
    .pag-controls { display: flex; gap: 4px; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 5px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
    .pag-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); }
    .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Confirm Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal-backdrop.hidden { display: none; }
    .modal-box { background: #fff; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,.25); }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #e2e8f0; }
    .modal-title { font-weight: 800; font-size: 1rem; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .modal-close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px; line-height: 1; }
    .modal-close-btn:hover { background: #f1f5f9; color: #374151; }
    .modal-body { padding: 22px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #e2e8f0; }
    .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; font-size: 13px; color: #166534; margin-top: 16px; line-height: 1.5; }
    .file-upload-area { margin-top: 6px; }
    .file-input { display: none; }
    .file-label { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 2px dashed #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #475569; background: #f8fafc; transition: 0.2s; }
    .file-label:hover { border-color: var(--admin-primary); background: #f0f4ff; color: var(--admin-primary); }
    .file-selected { color: #166534; font-weight: 700; }

    @media (max-width: 900px) {
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; }
      .search-box { width: 100%; }
      .admin-table { min-width: 800px; }
    }
  `],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">

      <div class="header-row">
        <div>
          <h2 class="title">
            RECOMPENSAS PENDIENTES
            <span class="counter-pill">{{ total() }}</span>
          </h2>
          <p class="subtitle">Monederos pendientes de proceso manual</p>
        </div>
      </div>

      <!-- Info banner -->
      <div class="info-banner">
        <span style="font-size:22px;flex-shrink:0;">⏳</span>
        <div>
          <strong>Solicitudes pendientes de proceso manual</strong><br>
          <span>Estos usuarios ya canjearon una recompensa tipo <strong>Monedero</strong>. Una vez procesado el envío, usa el botón "Marcar como enviado" para actualizar su estatus.</span>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <span class="table-header-title">Solicitudes pendientes</span>
          <div class="search-box">
            <input type="text" [(ngModel)]="search" (input)="onSearch()" placeholder="Buscar usuario, nombre, teléfono...">
          </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Recompensa</th>
                <th>Tipo</th>
                <th>Datos</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr class="loading-row" *ngIf="loading()">
                <td colspan="7"><div class="load-spinner"></div></td>
              </tr>

              <tr *ngFor="let r of items()">
                <td style="font-weight:700;color:#111;">#{{ r.id }}</td>
                <td>
                  <div class="detail-block">
                    <span class="detail-val">{{ r.user_name || '—' }}</span>
                    <span class="detail-lbl">{{ r.user_login || r.email || '—' }}</span>
                  </div>
                </td>
                <td><strong>{{ r.reward_name || '—' }}</strong></td>
                <td>
                  <span class="type-pill"
                    [class.monedero]="r.tipo_recompensa==='monedero'"
                    [class.tiempo-aire]="r.tipo_recompensa==='tiempo_aire'">
                    {{ '💳 Monedero' }}
                  </span>
                </td>
                <td>
                  <div *ngIf="r.tipo_recompensa === 'monedero'" class="detail-block">
                    <span class="detail-lbl">Titular</span>
                    <span class="detail-val">{{ r.nombre_monedero }} {{ r.apellido_paterno }} {{ r.apellido_materno }}</span>
                  </div>
                  <div *ngIf="r.tipo_recompensa === 'tiempo_aire'" class="detail-block">
                    <span class="detail-lbl">Teléfono · Operadora</span>
                    <span class="detail-val">{{ r.telefono_recarga }} · {{ r.nombre_telefonia || '—' }}</span>
                    <span class="detail-lbl" style="margin-top:4px;">Producto a recargar</span>
                    <span class="detail-val" style="font-family:monospace;font-size:15px;font-weight:900;color:#1e40af;letter-spacing:1px;">{{ r.producto || '—' }}</span>
                  </div>
                </td>
                <td style="color:#6b7280;font-size:0.82rem;">{{ fmtDate(r.created_at) }}</td>
                <td>
                  <button class="action-btn primary" (click)="openConfirmModal(r)">
                    ✅ Marcar enviado
                  </button>
                </td>
              </tr>

              <tr class="empty-row" *ngIf="!loading() && !items().length">
                <td colspan="7">
                  <div class="empty-icon">✅</div>
                  <p class="empty-text">¡Sin pendientes!</p>
                  <p class="empty-sub">No hay solicitudes pendientes en este momento.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="!loading() && totalPages() > 1">
          <span class="pag-info">Mostrando {{ pagerFrom() }}–{{ pagerTo() }} de {{ total() }}</span>
          <div class="pag-controls">
            <button class="pag-btn" [disabled]="page() <= 1" (click)="goPage(page()-1)">‹</button>
            <button *ngFor="let p of pageList()" class="pag-btn" [class.active]="p === page()" (click)="goPage(p)">{{ p }}</button>
            <button class="pag-btn" [disabled]="page() >= totalPages()" (click)="goPage(page()+1)">›</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Confirm Modal -->
    <div class="modal-backdrop" [class.hidden]="!showModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <span class="modal-title">✅ Confirmar envío</span>
          <button class="modal-close-btn" (click)="showModal.set(false)">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">Usuario</span>
            <span class="detail-val">{{ currentRow()?.user_name }}</span>
          </div>
          <div class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">Recompensa</span>
            <span class="detail-val">{{ currentRow()?.reward_name }}</span>
          </div>
          <div *ngIf="currentRow()?.tipo_recompensa === 'monedero'" class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">Titular del monedero</span>
            <span class="detail-val">{{ currentRow()?.nombre_monedero }} {{ currentRow()?.apellido_paterno }} {{ currentRow()?.apellido_materno }}</span>
          </div>
          <div *ngIf="currentRow()?.tipo_recompensa === 'tiempo_aire'" class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">Teléfono · Operadora</span>
            <span class="detail-val">{{ currentRow()?.telefono_recarga }} · {{ currentRow()?.nombre_telefonia }}</span>
          </div>
          <div *ngIf="currentRow()?.tipo_recompensa === 'tiempo_aire'" class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">🔑 PRODUCTO A RECARGAR</span>
            <span class="detail-val" style="font-family:monospace;font-size:1.3rem;font-weight:900;color:#1e40af;letter-spacing:2px;background:#dbeafe;padding:6px 12px;border-radius:8px;display:inline-block;margin-top:4px;">{{ currentRow()?.producto || '—' }}</span>
          </div>
          <!-- Adjuntar cupón del monedero -->
          <div class="detail-block" style="margin-bottom:12px;">
            <span class="detail-lbl">📎 Adjuntar cupón del monedero (PDF o imagen)</span>
            <div class="file-upload-area">
              <input type="file" id="monedero-file" accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelected($event)" class="file-input">
              <label for="monedero-file" class="file-label">
                <span *ngIf="!selectedFile()">🗂 Seleccionar archivo (PDF o imagen)</span>
                <span *ngIf="selectedFile()" class="file-selected">✅ {{ selectedFile()!.name }}</span>
              </label>
            </div>
            <small style="color:#888;font-size:0.75rem;">Opcional — el usuario podrá descargarlo desde su Historial</small>
          </div>
          <div class="success-box">
            <strong>¿Qué sucederá?</strong><br>
            El canje pasará a estatus <strong>Completado</strong> y quedará registrado como enviado en el sistema.
          </div>
        </div>
        <div class="modal-foot">
          <button class="action-btn secondary" (click)="showModal.set(false)">Cancelar</button>
          <button class="action-btn primary" [disabled]="saving()" (click)="confirmSend()">
            {{ saving() ? 'Guardando...' : '✅ Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AdminPendingRewardsComponent implements OnInit {
  private http         = inject(HttpClient);
  public layoutService = inject(AdminLayoutService);
  private toast        = inject(ToastService);

  items    = signal<any[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  total    = signal(0);
  page     = signal(1);
  readonly perPage = 20;
  search   = '';
  private searchTimer: any;

  showModal    = signal(false);
  currentRow   = signal<any>(null);
  selectedFile = signal<File | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), per_page: this.perPage };
    if (this.search) params.search = this.search;

    const queryStr = new URLSearchParams(params).toString();
    this.http.get<any>(`${environment.apiUrl}/admin/redemptions/pending?${queryStr}`).subscribe({
      next: d => {
        this.items.set(d.data || []);
        this.total.set(d.pager?.total_items || 0);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.show('Error al cargar datos', 'error'); }
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }
  goPage(p: number) { if (p < 1 || p > this.totalPages()) return; this.page.set(p); this.load(); }
  totalPages() { return Math.ceil(this.total() / this.perPage) || 1; }
  pagerFrom()  { return ((this.page() - 1) * this.perPage) + 1; }
  pagerTo()    { return Math.min(this.page() * this.perPage, this.total()); }
  pageList() {
    const total = this.totalPages();
    const current = this.page();
    const max = 7;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - 3);
    let end   = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  openConfirmModal(row: any) { this.currentRow.set(row); this.selectedFile.set(null); this.showModal.set(true); }

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  confirmSend() {
    const row = this.currentRow();
    if (!row) return;
    this.saving.set(true);
    this.showModal.set(false);

    const formData = new FormData();
    if (this.selectedFile()) {
      formData.append('coupon_file', this.selectedFile()!);
    }
    this.http.post<any>(`${environment.apiUrl}/admin/redemptions/${row.id}/mark-sent`, formData).subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedFile.set(null);
        this.toast.show('Marcado como enviado correctamente.', 'success');
        this.load();
      },
      error: (e: any) => {
        this.saving.set(false);
        this.toast.show(e?.error?.message || 'Error al actualizar el estatus.', 'error');
      }
    });
  }

  fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
