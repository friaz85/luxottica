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
           <h2 class="title">REPORTE DE CÓDIGOS UTILIZADOS</h2>
           <p class="subtitle">Historial de códigos de entrada redimidos por los usuarios</p>
        </div>
        <div class="actions">
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
               placeholder="Buscar por usuario o correo..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Proyecto</th>
                <th>Código</th>
                <th class="text-right">Puntos</th>
                <th class="text-right">Fecha de Uso</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedData()">
                <td><span class="font-bold">{{ row.user_name }}</span></td>
                <td>{{ row.user_email }}</td>
                <td><span class="project-tag">{{ row.project_name || 'N/A' }}</span></td>
                <td><span class="code-badge">{{ row.codigo }}</span></td>
                <td class="text-right font-bold text-blue">{{ row.puntos | number }}</td>
                <td class="text-right text-gray">{{ row.used_at | date:'medium' }}</td>
              </tr>
              <tr *ngIf="filteredData().length === 0">
                 <td colspan="6" class="text-center py-8 text-gray">No se encontraron registros de uso</td>
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
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; transition: all 0.3s; }
    .admin-page.sidebar-closed { margin-left: 0; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn.secondary { background: #666; }
    .table-container { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; padding: 0.8rem; border-radius: 0.5rem; border: 1px solid #ddd; }
    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; padding: 1.2rem; text-align: left; font-size: 0.8rem; text-transform: uppercase; color: var(--admin-primary); font-weight: 900; border-bottom: 2px solid #eee; white-space: nowrap; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }
    .code-badge { background: #f1f5f9; padding: 0.3rem 0.6rem; border-radius: 0.4rem; font-family: monospace; font-weight: bold; color: #334155; }
    .project-tag { background: #e0f2fe; color: #0369a1; padding: 0.3rem 0.6rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 800; }
    .pagination-footer { padding: 1.5rem; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .pagination-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #ddd; background: white; cursor: pointer; }
    .page-num-btn.active { background: var(--admin-primary); color: white; }
    .pag-btn { padding: 0.4rem 0.8rem; border-radius: 0.4rem; border: 1px solid #ddd; background: white; cursor: pointer; }
    @media (max-width: 1100px) {
      .admin-page { padding: 4rem 1rem 1rem 1rem; }
    }
  `]
})
export class AdminEntryCodesReportComponent implements OnInit {
  reportData = signal<any[]>([]);
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 15;
  Math = Math;

  private http = inject(HttpClient);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/entry-codes/report`).subscribe({
      next: (res: any) => {
        this.reportData.set(res);
        this.loader.hide();
      },
      error: () => this.loader.hide()
    });
  }

  filteredData = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.reportData().filter(r => 
      r.user_name?.toLowerCase().includes(term) || 
      r.user_email?.toLowerCase().includes(term) ||
      r.project_name?.toLowerCase().includes(term)
    );
  });

  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredData().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredData().length / this.pageSize));

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  exportToCSV() {
    const headers = ['Nombre', 'Usuario', 'Proyecto', 'Código', 'Puntos', 'Fecha'];
    const rows = this.filteredData().map(r => [
      `"${r.user_name}"`, r.user_email, `"${r.project_name}"`, `"${r.codigo}"`, r.puntos, r.used_at
    ]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_codigos_entrada_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
