import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../services/loader.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-entry-codes-report',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">REPORTE DE CANJES REALIZADOS</h2>
           <p class="subtitle">Historial completo de canjes realizados por los participantes</p>
        </div>
        <div class="actions-row">
          <!-- Filtros rápidos -->
          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="currentPage.set(1)">
              <option value="">Todos los estados</option>
              <option value="completed">Completado</option>
              <option value="pending">Pendiente</option>
            </select>
            <select class="filter-select" [(ngModel)]="filterTipo" (ngModelChange)="currentPage.set(1)">
              <option value="">Todos los tipos</option>
              <option value="normal">Normal</option>
              <option value="monedero">Monedero</option>
              <option value="tiempo_aire">Tiempo Aire</option>
            </select>
          </div>
          <button class="export-btn secondary" (click)="exportToCSV()">
             <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
        </div>
      </div>

      <!-- Totales -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-number">{{ filteredData().length | number }}</span>
          <span class="stat-label">Total Canjes</span>
        </div>
        <div class="stat-card completed">
          <span class="stat-number">{{ countByStatus('completed') | number }}</span>
          <span class="stat-label">Completados</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-number">{{ countByStatus('pending') | number }}</span>
          <span class="stat-label">Pendientes</span>
        </div>
        <div class="stat-card points">
          <span class="stat-number">{{ totalPoints() | number }}</span>
          <span class="stat-label">Puntos Canjeados</span>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [ngModel]="searchTerm()" 
               (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
               placeholder="Buscar por usuario, correo o recompensa..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Participante</th>
                <th>Recompensa</th>
                <th>Tipo</th>
                <th class="text-right">Puntos</th>
                <th>Estado</th>
                <th class="text-right">Fecha Canje</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedData(); let i = index">
                <td class="text-gray text-sm">{{ (currentPage() - 1) * pageSize + i + 1 }}</td>
                <td>
                  <div class="user-cell">
                    <span class="font-bold">{{ row.user_name || 'N/D' }}</span>
                    <span class="user-email">{{ row.user_email }}</span>
                  </div>
                </td>
                <td><span class="reward-name">{{ row.reward_name }}</span></td>
                <td>
                  <span class="tipo-badge" [class]="getTipoClass(row.tipo_recompensa)">
                    {{ getTipoLabel(row.tipo_recompensa) }}
                  </span>
                </td>
                <td class="text-right font-bold text-blue">{{ row.points_cost | number }}</td>
                <td>
                  <span class="status-badge" [class]="getStatusClass(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </span>
                </td>
                <td class="text-right text-gray text-sm">{{ row.created_at | date:'dd/MM/yy HH:mm' }}</td>
              </tr>
              <tr *ngIf="filteredData().length === 0">
                 <td colspan="7" class="empty-state">
                   <span class="empty-icon">📋</span>
                   <span>No se encontraron canjes</span>
                 </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-footer" *ngIf="filteredData().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredData().length) }}</b> de <b>{{ filteredData().length }}</b>
            </span>
            <div class="pagination-controls">
              <button class="pag-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">« Anterior</button>
              <div class="page-numbers">
                <button *ngFor="let p of visiblePages()"
                        class="page-num-btn"
                        [class.active]="currentPage() === p"
                        (click)="setPage(p)">
                  {{ p }}
                </button>
              </div>
              <button class="pag-btn" [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">Siguiente »</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; transition: all 0.3s; }
    .admin-page.sidebar-closed { margin-left: 0; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    .actions-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .filter-group { display: flex; gap: 0.5rem; }
    .filter-select { padding: 0.6rem 1rem; border-radius: 0.5rem; border: 1px solid #ddd; background: white; font-size: 0.85rem; color: #334155; cursor: pointer; }
    .export-btn { background: #475569; border: none; color: white; padding: 0.7rem 1.2rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn:hover { background: #334155; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; border-radius: 1rem; padding: 1.2rem 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border-left: 4px solid var(--admin-primary); display: flex; flex-direction: column; }
    .stat-card.completed { border-left-color: #10b981; }
    .stat-card.pending { border-left-color: #f59e0b; }
    .stat-card.points { border-left-color: #6366f1; }
    .stat-number { font-size: 1.8rem; font-weight: 900; color: var(--admin-primary); line-height: 1; }
    .stat-card.completed .stat-number { color: #10b981; }
    .stat-card.pending .stat-number { color: #f59e0b; }
    .stat-card.points .stat-number { color: #6366f1; }
    .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-top: 0.3rem; }

    /* Table */
    .table-container { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .table-header { padding: 1.2rem 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; }
    .search-box input { width: 100%; padding: 0.7rem 1rem; border-radius: 0.5rem; border: 1px solid #ddd; font-size: 0.9rem; }
    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; padding: 1rem 1.2rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--admin-primary); font-weight: 900; border-bottom: 2px solid #eee; white-space: nowrap; }
    .admin-table td { padding: 1rem 1.2rem; border-bottom: 1px solid #eee; font-size: 0.9rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    /* Cells */
    .user-cell { display: flex; flex-direction: column; gap: 0.2rem; }
    .font-bold { font-weight: 700; }
    .user-email { font-size: 0.78rem; color: #94a3b8; }
    .reward-name { font-weight: 600; color: #1e293b; }
    .text-right { text-align: right; }
    .text-gray { color: #94a3b8; }
    .text-sm { font-size: 0.82rem; }
    .text-blue { color: #2563eb; }

    /* Badges */
    .status-badge { padding: 0.25rem 0.7rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-other { background: #f1f5f9; color: #475569; }

    .tipo-badge { padding: 0.2rem 0.6rem; border-radius: 0.4rem; font-size: 0.72rem; font-weight: 800; display: inline-block; }
    .tipo-normal { background: #e0f2fe; color: #0369a1; }
    .tipo-monedero { background: #f0fdf4; color: #166534; }
    .tipo-tiempo_aire { background: #fdf4ff; color: #7e22ce; }

    /* Empty */
    .empty-state { text-align: center; padding: 3rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .empty-icon { font-size: 2rem; }

    /* Pagination */
    .pagination-footer { padding: 1.2rem 1.5rem; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-info { color: #64748b; font-size: 0.85rem; }
    .pagination-controls { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
    .page-num-btn:hover { border-color: var(--admin-primary); color: var(--admin-primary); }
    .page-num-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); font-weight: 700; }
    .pag-btn { padding: 0.4rem 0.8rem; border-radius: 0.4rem; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
    .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pag-btn:not(:disabled):hover { border-color: var(--admin-primary); color: var(--admin-primary); }

    @media (max-width: 1100px) {
      .admin-page { padding: 4rem 1rem 1rem 1rem; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .search-box { width: 100%; }
    }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .filter-group { flex-direction: column; }
    }
  `]
})
export class AdminEntryCodesReportComponent implements OnInit {
  reportData = signal<any[]>([]);
  searchTerm = signal('');
  filterStatus = '';
  filterTipo = '';
  currentPage = signal(1);
  pageSize = 20;
  Math = Math;

  private http = inject(HttpClient);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    this.loader.show();
    this.http.get<any[]>(`${environment.apiUrl}/admin/redemptions`).subscribe({
      next: (res: any) => {
        // The endpoint returns array directly when no page param
        const data = Array.isArray(res) ? res : (res.data ?? []);
        this.reportData.set(data);
        this.loader.hide();
      },
      error: () => this.loader.hide()
    });
  }

  filteredData = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.reportData().filter(r => {
      const matchesSearch = !term ||
        r.user_name?.toLowerCase().includes(term) ||
        r.user_email?.toLowerCase().includes(term) ||
        r.reward_name?.toLowerCase().includes(term);
      const matchesStatus = !this.filterStatus || r.status === this.filterStatus;
      const matchesTipo = !this.filterTipo || r.tipo_recompensa === this.filterTipo;
      return matchesSearch && matchesStatus && matchesTipo;
    });
  });

  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredData().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredData().length / this.pageSize));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  countByStatus(status: string) {
    return this.filteredData().filter(r => r.status === status).length;
  }

  totalPoints = computed(() =>
    this.filteredData().reduce((sum, r) => sum + (parseInt(r.points_cost) || 0), 0)
  );

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'review': 'En revisión',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    if (status === 'completed') return 'status-badge status-completed';
    if (status === 'pending') return 'status-badge status-pending';
    return 'status-badge status-other';
  }

  getTipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      'normal': 'Normal',
      'monedero': 'Monedero',
      'tiempo_aire': 'Tiempo Aire',
    };
    return map[tipo] ?? tipo;
  }

  getTipoClass(tipo: string): string {
    const map: Record<string, string> = {
      'normal': 'tipo-badge tipo-normal',
      'monedero': 'tipo-badge tipo-monedero',
      'tiempo_aire': 'tipo-badge tipo-tiempo_aire',
    };
    return map[tipo] ?? 'tipo-badge tipo-normal';
  }

  exportToCSV() {
    const headers = ['#', 'Participante', 'Correo', 'Recompensa', 'Tipo', 'Puntos', 'Estado', 'Fecha'];
    const rows = this.filteredData().map((r, i) => [
      i + 1,
      `"${r.user_name ?? ''}"`,
      r.user_email ?? '',
      `"${r.reward_name ?? ''}"`,
      this.getTipoLabel(r.tipo_recompensa),
      r.points_cost ?? 0,
      this.getStatusLabel(r.status),
      r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : ''
    ]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_canjes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
