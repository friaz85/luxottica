import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { LoaderService } from '../services/loader.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-redemptions',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">CANJES REALIZADOS</h2>
           <p class="subtitle">Seguimiento de canjes realizados por los usuarios</p>
        </div>
        <div class="header-actions">
          <button class="export-btn secondary" (click)="exportToCSV()">
            <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
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
                <th>Usuario</th>
                <th>Recompensa</th>
                <th>Tipo</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th class="text-right">Fecha Canje</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let redemption of paginatedRedemptions()">
                <td>
                  <div class="redemption-info-cell">
                    <span class="font-bold">{{ redemption.user_name }}</span>
                    <small class="block text-gray">{{ redemption.user_email }}</small>
                  </div>
                </td>
                <td>
                  <div class="reward-tag-container">
                    <span class="reward-tag">{{ redemption.reward_name }}</span>
                  </div>
                </td>
                <td>
                  <span class="type-pill" [class.digital]="redemption.reward_type === 'digital'">
                    {{ redemption.reward_type === 'digital' ? 'Digital' : 'Física' }}
                  </span>
                </td>
                <td class="text-gold font-bold">{{ redemption.points_cost | number }} pts</td>
                <td>
                  <span class="status-pill" [class]="redemption.status">
                    {{ getStatusLabel(redemption.status) }}
                  </span>
                </td>
                <td class="text-right text-sm text-gray">{{ redemption.created_at | date:'dd/MM/yy HH:mm' }}</td>
              </tr>
              <tr *ngIf="filteredRedemptions().length === 0">
                 <td colspan="6" class="text-center py-8 text-gray">No se encontraron recompensas canjeadas</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="filteredRedemptions().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredRedemptions().length) }}</b> de <b>{{ filteredRedemptions().length }}</b>
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
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; color: #333; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1.5rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }

    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn.secondary { background: #666; }
    .export-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .reward-tag { background: #f3f4f6; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 700; white-space: nowrap; border: 1px solid #e5e7eb; }
    
    .type-pill { padding: 0.3rem 0.6rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .type-pill.digital { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    
    .status-pill { padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; white-space: nowrap; width: fit-content; }
    .status-pill.pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .status-pill.completed { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-pill.shipped { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .status-pill.cancelled { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }
    .page-num-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); }

    .text-gold { color: #d4b106; }
    .mobile-only-info { display: none; margin-top: 0.3rem; font-size: 0.8rem; color: #666; font-weight: 700; }

    @media (max-width: 900px) { .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; }
      .export-btn { width: 100%; justify-content: center; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .pagination-footer { flex-direction: column; gap: 1rem; text-align: center; }
    }
  `]
})
export class AdminRedemptionsComponent implements OnInit {
  redemptions = signal<any[]>([]);
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  Math = Math;
  dataVersion = signal(0);

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  private http = inject(HttpClient);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadRedemptions();
  }

  loadRedemptions() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/redemptions`).subscribe({
      next: (res: any) => {
        // Endpoint returns array directly when no page param is given
        const data = Array.isArray(res) ? res : (res.data ?? []);
        this.redemptions.set(data);
        this.dataVersion.update(v => v + 1);
        this.loader.hide();
      },
      error: (e: any) => {
        console.error('API redemptions error:', e.status, e.error);
        this.redemptions.set([]);
        this.loader.hide();
      }
    });
  }


  filteredRedemptions = computed(() => {
    this.dataVersion(); // Register dependency
    const term = this.searchTerm().toLowerCase();
    return this.redemptions().filter((r: any) =>
      r.user_name?.toLowerCase().includes(term) ||
      r.user_email?.toLowerCase().includes(term) ||
      r.reward_name?.toLowerCase().includes(term)
    );
  });

  paginatedRedemptions = computed(() => {
    const data = this.filteredRedemptions();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredRedemptions().length / this.pageSize));

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pendiente',
      'completed': 'Completado',
      'shipped': 'Enviado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  }

  exportToCSV() {
    const headers = ['ID', 'Nombre', 'Usuario', 'Recompensa', 'Tipo', 'Puntos', 'Estado', 'Fecha'];
    const rows = this.filteredRedemptions().map((r: any) => [
      r.id,
      `"${r.user_name}"`,
      r.user_email,
      `"${r.reward_name}"`,
      r.reward_type === 'digital' ? 'Digital' : 'Física',
      r.points_cost,
      this.getStatusLabel(r.status),
      new Date(r.created_at).toLocaleString('es-MX')
    ]);

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "recompensas_canjeadas_takis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
