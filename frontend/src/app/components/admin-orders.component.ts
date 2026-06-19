import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">GESTIÓN DE CANJES</h2>
           <p class="subtitle">Monitorea y actualiza el estado de las recompensas</p>
        </div>
        <button class="export-btn" (click)="exportToCSV()">
           <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
        </button>
      </div>

      <!-- Order Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-label">Total Canjes</span>
            <span class="stat-value">{{ orders().length }}</span>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <span class="stat-label">Pendientes</span>
            <span class="stat-value">{{ pendingStats() }}</span>
          </div>
        </div>
        <div class="stat-card delivered">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-label">Entregados</span>
            <span class="stat-value">{{ deliveredStats() }}</span>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [ngModel]="searchTerm()" 
               (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
               placeholder="Buscar por usuario o recompensa..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Recompensa</th>
                <th>Estado</th>
                <th class="text-right">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of paginatedOrders()" (click)="selectOrder(order)" class="clickable-row">
                <td class="font-bold">{{ order.user_email }}</td>
                <td>{{ order.reward_title }}</td>
                <td>
                  <span class="status-pill" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
                </td>
                <td class="text-right text-sm text-gray">{{ order.created_at | date:'short' }}</td>
              </tr>
              <tr *ngIf="filteredOrders().length === 0">
                 <td colspan="4" class="text-center py-8 text-gray">No se encontraron canjes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="filteredOrders().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredOrders().length) }}</b> de <b>{{ filteredOrders().length }}</b>
            </span>
            <div class="pagination-controls">
              <button class="pag-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">« Anterior</button>
              <div class="page-numbers">
                <button *ngFor="let p of [].constructor(totalPages()); let i = index" 
                        class="page-num-btn" 
                        [class.active]="currentPage() === (i + 1)"
                        (click)="setPage(i + 1)">
                  {{ i + 1 }}
                </button>
              </div>
              <button class="pag-btn" [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">Siguiente »</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Detail Modal -->
      <div class="modal-overlay" *ngIf="selectedOrder()" (click)="closeOrderModal($event)">
        <div class="order-modal" (click)="$event.stopPropagation()">
           <div class="modal-header">
             <h3>Detalle de Canje #{{ selectedOrder().id }}</h3>
             <button class="close-btn" (click)="closeOrderModal($event)">✕</button>
           </div>
           
           <div class="modal-body" *ngIf="selectedOrder()">
              <div class="info-grid">
                <div class="info-item">
                  <label>Embajador</label>
                  <span>{{ selectedOrder().user_name }}</span>
                </div>
                <div class="info-item">
                  <label>Email</label>
                  <span>{{ selectedOrder().user_email }}</span>
                </div>
              </div>

              <div class="info-grid mt-4">
                <div class="info-item">
                  <label>Recompensa</label>
                  <span class="reward-text">{{ selectedOrder().reward_title }}</span>
                </div>
                <div class="info-item">
                  <label>Fecha</label>
                  <span>{{ selectedOrder().created_at | date:'medium' }}</span>
                </div>
              </div>

              <hr class="divider">

              <div class="form-group mt-4">
                <label>Estado del Canje</label>
                <select [(ngModel)]="selectedOrder().status" class="status-select">
                  <option value="pending">Pendiente</option>
                  <option value="delivered">Entregado / Enviado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div class="form-group mt-4">
                <label>Comentarios / Notas Internas</label>
                <textarea 
                  [(ngModel)]="selectedOrder().admin_notes" 
                  placeholder="Agrega notas sobre el canje..."
                  rows="4"
                  class="notes-textarea"
                ></textarea>
              </div>
           </div>

           <div class="modal-footer">
             <button class="btn-cancel" (click)="closeOrderModal($event)">Cerrar</button>
             <button class="btn-save" (click)="updateOrderStatus()">
                <span class="icon">💾</span> {{ savingOrder() ? 'Guardando...' : 'Guardar Cambios' }}
             </button>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; color: #333; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; border: 1px solid #eee; border-radius: 1.5rem; padding: 1.5rem; display: flex; align-items: center; gap: 1.2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .stat-icon { font-size: 2.5rem; }
    .stat-label { color: #666; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; }
    .stat-value { color: var(--admin-primary); font-size: 2.2rem; font-weight: 900; }

    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; color: #333; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .clickable-row { cursor: pointer; transition: 0.2s; }
    .clickable-row:hover { background: #f1f5f9; }
    
    .status-pill { padding: 0.3rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .status-pill.delivered { background: #f6ffed; color: #52c41a; }
    .status-pill.pending { background: #fff7e6; color: #fa8c16; }
    .status-pill.cancelled { background: #fff1f0; color: #f5222d; }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }
    .page-num-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); }
    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .order-modal { background: white; border-radius: 1.5rem; padding: 2.5rem; width: 100%; max-width: 600px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { margin: 0; color: var(--admin-primary); font-weight: 900; }
    .close-btn { background: transparent; border: none; color: #999; font-size: 1.5rem; cursor: pointer; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .info-item label { display: block; color: #666; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem; }
    .info-item span { color: var(--admin-primary); font-weight: 600; }
    .reward-text { color: var(--admin-primary); font-weight: 900; font-size: 1.1rem; }
    .divider { border: 0; border-top: 1px solid #eee; margin: 1.5rem 0; }
    .status-select, .notes-textarea { width: 100%; background: #f5f5f5; border: 1px solid #ddd; padding: 0.8rem; border-radius: 0.5rem; outline: none; font-family: inherit; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    .btn-cancel { background: #eee; border: none; color: #666; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
    .btn-save { background: var(--admin-primary); border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 1100px) { 
      .admin-page { margin-left: 0; padding: 5rem 1rem 2rem 1rem; } 
      .stats-grid { grid-template-columns: 1fr; } 
      .admin-table { min-width: 900px; } /* Force scroll */
    }
  `]
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<any[]>([]);
  selectedOrder = signal<any>(null);
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  savingOrder = signal(false);
  Math = Math;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.http.get(`${environment.apiUrl}/admin/orders`).subscribe({
      next: (res: any) => this.orders.set(res || []),
      error: () => this.orders.set([])
    });
  }

  getStatusLabel(status: string) {
    const labels: any = { 'pending': 'PENDIENTE', 'delivered': 'ENTREGADO', 'cancelled': 'CANCELADO' };
    return labels[status] || status.toUpperCase();
  }

  filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.orders().filter(o => 
      o.user_email?.toLowerCase().includes(term) || 
      o.reward_title?.toLowerCase().includes(term)
    );
  });

  paginatedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredOrders().length / this.pageSize));

  pendingStats = computed(() => this.orders().filter(o => o.status === 'pending').length);
  deliveredStats = computed(() => this.orders().filter(o => o.status === 'delivered').length);

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  selectOrder(order: any) {
    this.selectedOrder.set({ ...order });
  }

  closeOrderModal(event: Event) {
    event.stopPropagation();
    this.selectedOrder.set(null);
  }

  updateOrderStatus() {
    this.savingOrder.set(true);
    const updated = this.selectedOrder();
    this.http.post(`${environment.apiUrl}/admin/orders/${updated.id}/update`, {
      status: updated.status,
      admin_notes: updated.admin_notes
    }).subscribe({
      next: () => {
        this.loadOrders();
        this.savingOrder.set(false);
        this.selectedOrder.set(null);
        this.toast.show('CANJE ACTUALIZADO', 'success');
      },
      error: () => {
        this.toast.show('ERROR AL ACTUALIZAR', 'error');
        this.savingOrder.set(false);
      }
    });
  }

  exportToCSV() {
    const headers = ['ID', 'Email', 'Recompensa', 'Estado', 'Fecha'];
    const rows = this.filteredOrders().map(o => [o.id, o.user_email, `"${o.reward_title}"`, o.status, o.created_at]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "canjes_tec.csv";
    link.click();
  }
}
