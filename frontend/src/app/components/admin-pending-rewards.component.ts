import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-pending-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .info-pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      background: #f1f5f9; color: #475569;
    }
    .info-pill.monedero    { background: #fef3c7; color: #92400e; }
    .info-pill.tiempo-aire { background: #dbeafe; color: #1e40af; }
    .detail-block { display: flex; flex-direction: column; gap: 2px; }
    .detail-block .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; }
    .detail-block .val { font-size: 13px; font-weight: 600; color: #0f172a; }
    .counter-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 26px; height: 26px; border-radius: 13px;
      background: linear-gradient(135deg, #CC0000, #ff3333);
      color: #fff; font-size: 12px; font-weight: 800; padding: 0 8px; margin-left: 8px;
    }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal-overlay.hidden { display: none; }
    .modal { background: #fff; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,.25); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: #0f172a; }
    .modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; line-height: 1; padding: 4px; border-radius: 6px; }
    .modal-close:hover { background: #f1f5f9; color: #0f172a; }
    .modal-body { padding: 24px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
    .toast-wrap { position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    .toast { pointer-events: all; display: flex; align-items: flex-start; gap: 12px; min-width: 300px; max-width: 400px; padding: 14px 16px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.15); font-size: 13px; font-weight: 500; cursor: pointer; animation: toastIn .3s ease forwards; }
    .toast.success { background: #f0fdf4; border-left: 4px solid #16a34a; color: #14532d; }
    .toast.error   { background: #fff0f0; border-left: 4px solid #dc2626; color: #7f1d1d; }
    .toast .toast-title { font-weight: 800; font-size: 12px; margin-bottom: 2px; }
    @keyframes toastIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    .loading-state { text-align: center; padding: 60px; color: #94a3b8; }
    .spinner { display: inline-block; width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">
        Recompensas Pendientes
        <span class="counter-badge">{{ total() }}</span>
      </h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Monederos y Tiempo Aire</span></div>
    </header>

    <div class="page-content">
      <!-- Info banner -->
      <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">⏳</span>
        <div>
          <strong style="color:#92400e;">Solicitudes pendientes de proceso manual</strong><br>
          <span style="font-size:13px;color:#78350f;">
            Estos usuarios ya canjearon una recompensa tipo <strong>Monedero</strong> o <strong>Tiempo Aire</strong>. 
            Una vez procesado el envío, usa el botón "Marcar como enviado" para actualizar su estatus.
          </span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Solicitudes pendientes
          </span>
          <div class="search-input-wrapper" style="min-width:220px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" [(ngModel)]="search" (input)="onSearch()" class="form-control" placeholder="Buscar usuario, nombre, teléfono...">
          </div>
        </div>

        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando solicitudes...</p>
        </div>

        <div class="table-wrapper" *ngIf="!loading()">
          <table>
            <thead><tr>
              <th>ID</th><th>Usuario</th><th>Recompensa</th><th>Tipo</th><th>Datos</th><th>Fecha</th><th>Acción</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let r of items()">
                <td style="font-weight:700;color:#1e40af;">{{ r.id }}</td>
                <td>
                  <div class="detail-block">
                    <span class="val">{{ r.user_name || '—' }}</span>
                    <span class="lbl" style="font-family:monospace;">{{ r.user_login || r.email || '—' }}</span>
                  </div>
                </td>
                <td><strong>{{ r.reward_name || '—' }}</strong></td>
                <td>
                  <span class="info-pill" [class.monedero]="r.tipo_recompensa==='monedero'" [class.tiempo-aire]="r.tipo_recompensa==='tiempo_aire'">
                    {{ r.tipo_recompensa === 'monedero' ? '💳 Monedero' : '📱 Tiempo Aire' }}
                  </span>
                </td>
                <td>
                  <!-- Monedero: muestra nombre -->
                  <div *ngIf="r.tipo_recompensa === 'monedero'" class="detail-block">
                    <span class="lbl">Titular</span>
                    <span class="val">{{ r.nombre_monedero }} {{ r.apellido_paterno }} {{ r.apellido_materno }}</span>
                  </div>
                  <!-- Tiempo Aire: muestra teléfono + operadora -->
                  <div *ngIf="r.tipo_recompensa === 'tiempo_aire'" class="detail-block">
                    <span class="lbl">Teléfono / Operadora</span>
                    <span class="val">{{ r.telefono_recarga }} · {{ r.nombre_telefonia || '—' }}</span>
                  </div>
                </td>
                <td style="color:#64748b;font-size:12px;">{{ fmtDate(r.created_at) }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" (click)="openConfirmModal(r)">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Marcar enviado
                  </button>
                </td>
              </tr>
              <tr *ngIf="!loading() && !items().length">
                <td colspan="7" style="text-align:center;padding:60px;">
                  <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h3>¡Sin pendientes!</h3><p>No hay solicitudes pendientes en este momento.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" *ngIf="!loading() && totalPages() > 1">
          <span class="pagination-info">Mostrando {{ pagerFrom() }}–{{ pagerTo() }} de {{ total() }}</span>
          <button class="page-btn" [disabled]="page()<=1" (click)="goPage(page()-1)">Anterior</button>
          <button *ngFor="let p of pageList()" class="page-btn" [class.active]="p===page()" (click)="goPage(p)">{{ p }}</button>
          <button class="page-btn" [disabled]="page()>=totalPages()" (click)="goPage(page()+1)">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div class="modal-overlay" [class.hidden]="!showModal()" (click)="showModal.set(false)">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Confirmar envío
          </span>
          <button class="modal-close" (click)="showModal.set(false)">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-block" style="margin-bottom:14px;">
            <span class="lbl">Usuario</span>
            <span class="val">{{ currentRow()?.user_name }}</span>
          </div>
          <div class="detail-block" style="margin-bottom:14px;">
            <span class="lbl">Recompensa</span>
            <span class="val">{{ currentRow()?.reward_name }}</span>
          </div>
          <div *ngIf="currentRow()?.tipo_recompensa === 'monedero'" class="detail-block" style="margin-bottom:14px;">
            <span class="lbl">Titular del monedero</span>
            <span class="val">{{ currentRow()?.nombre_monedero }} {{ currentRow()?.apellido_paterno }} {{ currentRow()?.apellido_materno }}</span>
          </div>
          <div *ngIf="currentRow()?.tipo_recompensa === 'tiempo_aire'" class="detail-block" style="margin-bottom:14px;">
            <span class="lbl">Teléfono · Operadora</span>
            <span class="val">{{ currentRow()?.telefono_recarga }} · {{ currentRow()?.nombre_telefonia }}</span>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;font-size:13px;color:#166534;margin-top:8px;">
            <strong>¿Qué sucederá?</strong><br>
            El canje pasará a estatus <strong>Completado</strong> y quedará registrado como enviado.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showModal.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="saving()" (click)="confirmSend()">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            {{ saving() ? 'Guardando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="toast-wrap">
      <div *ngFor="let t of toasts()" class="toast" [class]="'toast ' + t.type" (click)="dismissToast(t.id)">
        <div style="flex:1">
          <div class="toast-title">{{ t.type === 'success' ? '✅ ¡Listo!' : '❌ Error' }}</div>
          <div>{{ t.msg }}</div>
        </div>
      </div>
    </div>
  `
})
export class AdminPendingRewardsComponent implements OnInit {
  private http = inject(HttpClient);

  items    = signal<any[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  total    = signal(0);
  page     = signal(1);
  readonly perPage = 20;
  search   = '';
  private searchTimer: any;

  showModal  = signal(false);
  currentRow = signal<any>(null);
  toasts     = signal<{id: number; type: string; msg: string}[]>([]);
  private _toastId = 0;

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
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }
  goPage(p: number) { if (p < 1 || p > this.totalPages()) return; this.page.set(p); this.load(); }
  totalPages() { return Math.ceil(this.total() / this.perPage); }
  pagerFrom()  { return ((this.page() - 1) * this.perPage) + 1; }
  pagerTo()    { return Math.min(this.page() * this.perPage, this.total()); }
  pageList() {
    const total = this.totalPages();
    const current = this.page();
    const max = 7;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - 3);
    let end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  openConfirmModal(row: any) { this.currentRow.set(row); this.showModal.set(true); }

  confirmSend() {
    const row = this.currentRow();
    if (!row) return;
    this.saving.set(true);
    this.showModal.set(false);

    this.http.post<any>(`${environment.apiUrl}/admin/redemptions/${row.id}/mark-sent`, {}).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast('Marcado como enviado correctamente.', 'success');
        this.load();
      },
      error: (e: any) => {
        this.saving.set(false);
        this.showToast(e?.error?.message || 'Error al actualizar el estatus.', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    const id = ++this._toastId;
    this.toasts.update(t => [...t, { id, type, msg }]);
    setTimeout(() => this.dismissToast(id), 5000);
  }
  dismissToast(id: number) { this.toasts.update(t => t.filter(x => x.id !== id)); }

  fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
