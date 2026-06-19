import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-promo-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
          <h2 class="title">CÓDIGOS REGISTRADOS</h2>
          <p class="subtitle">Solo se muestran los códigos que ya han sido utilizados por los usuarios</p>
        </div>
        <button class="export-btn" (click)="loadCodes()">
          <span class="icon">🔄</span> <span class="btn-text">Refrescar</span>
        </button>
      </div>

      <div class="table-container">
        <div class="table-header">
          <div class="search-box">
             <input 
              type="text" 
              [ngModel]="searchTerm()" 
              (ngModelChange)="onSearchChange($event)"
              placeholder="🔍 Buscar por código o usuario..."
            >
          </div>
          <div class="filter-buttons">
            <button 
              [class.active]="filterStatus() === 'used'"
              (click)="filterStatus.set('used'); currentPage.set(1)"
            >Solo Usados</button>
            <button 
              [class.active]="filterStatus() === 'available'"
              (click)="filterStatus.set('available'); currentPage.set(1)"
            >Disponibles (Carga lenta)</button>
          </div>
        </div>

        <div class="table-wrapper">
          <div class="loading-overlay" *ngIf="loading()">
            <div class="spinner"></div>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Puntos</th>
                <th>Usuario</th>
                <th>IP</th>
                <th class="text-right">Fecha de Uso</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let code of codes()">
                <td class="font-bold code-display">{{ code.code }}</td>
                <td><span class="points-badge">{{ code.points }} pts</span></td>
                <td>
                   <div class="user-cell">
                      <span>{{ code.user_name || 'Anónimo' }}</span>
                      <small class="text-gray block">{{ code.user_email }}</small>
                   </div>
                </td>
                <td class="text-sm opacity-70">{{ code.used_ip || '-' }}</td>
                <td class="text-right text-sm text-gold">{{ code.used_at | date:'short' }}</td>
              </tr>
              <tr *ngIf="codes().length === 0 && !loading()">
                <td colspan="5" style="text-align: center; padding: 3rem;">No se encontraron registros</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="totalRecords() > 0">
          <span class="page-info">
             MOSTRANDO {{ (currentPage() - 1) * pageSize + 1 }} - {{ Math.min(currentPage() * pageSize, totalRecords()) }} DE {{ totalRecords().toLocaleString() }}
          </span>
          <div class="pagination-controls">
            <button [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
            <span class="page-number">{{ currentPage() }}</span>
            <button [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .admin-page { 
      padding: 5rem 2rem 2rem 2rem; 
      background: #0d0221d6; 
      min-height: 100vh; 
      color: white; 
      margin-left: 260px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; gap: 2rem; flex-wrap: wrap; }
    .title { color: #F2E74B; font-size: 2.2rem; font-weight: 900; margin: 0; letter-spacing: -1px; }
    .subtitle { color: rgba(255,255,255,0.6); margin: 0.5rem 0 0 0; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: rgba(108, 29, 218, 0.1); border: 2px solid #6C1DDA; border-radius: 1.5rem; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; transition: 0.3s; }
    .stat-icon { font-size: 2.2rem; background: rgba(0,0,0,0.3); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 1rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { color: rgba(255,255,255,0.6); font-size: 0.85rem; text-transform: uppercase; font-weight: bold; }
    .stat-value { color: #F2E74B; font-size: 1.8rem; font-weight: 900; }

    .table-container { background: rgba(255,255,255,0.05); border-radius: 1.5rem; border: 2px solid #6C1DDA; overflow: hidden; position: relative; }
    .loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10; }
    .spinner { width: 40px; height: 40px; border: 4px solid #F2E74B; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; border-bottom: 1px solid rgba(108, 29, 218, 0.2); }
    .search-box input { background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA; color: white; padding: 0.8rem 1.2rem; border-radius: 0.5rem; width: 350px; outline: none; transition: 0.3s; }
    .search-box input:focus { border-color: #F2E74B; }
    .filter-buttons { display: flex; gap: 0.5rem; }
    .filter-buttons button { background: rgba(255,255,255,0.05); border: 1px solid #6C1DDA; color: #ccc; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; transition: 0.2s; }
    .filter-buttons button.active { background: #6C1DDA; color: white; border-color: #F2E74B; }

    .table-wrapper { overflow-x: auto; min-height: 400px; position: relative; }
    .admin-table { width: 100%; border-collapse: collapse; }
    thead { background: rgba(108, 29, 218, 0.2); }
    th { padding: 1.2rem; text-align: left; font-weight: 900; color: #F2E74B; font-size: 0.85rem; text-transform: uppercase; }
    td { padding: 1.2rem; border-bottom: 1px solid rgba(108, 29, 218, 0.1); font-size: 0.9rem; }
    tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }
    tbody tr:hover { background: rgba(108, 29, 218, 0.15); }
    .font-bold { font-weight: 800; color: #F2E74B; }
    .code-display { font-family: monospace; letter-spacing: 1px; }
    .points-badge { background: rgba(0, 204, 102, 0.1); color: #00cc66; border: 1px solid #00cc66; padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-weight: 900; }
    
    .user-cell { display: flex; flex-direction: column; }
    .block { display: block; }
    .text-gray { color: #888; font-size: 0.75rem; }
    .text-gold { color: #F2E74B; font-weight: bold; }

    .pagination-footer { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(108, 29, 218, 0.2); }
    .page-info { font-weight: 900; color: #F2E74B; font-size: 0.85rem; text-transform: uppercase; }
    .pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
    .pagination-controls button { 
      width: 38px; height: 38px; border-radius: 50%; background: #3A1A5E; border: none; color: #F2E74B; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; transition: 0.3s; 
    }
    .pagination-controls button:not(:disabled):hover { background: #6C1DDA; color: white; transform: scale(1.1); }
    .pagination-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-number { font-weight: 900; color: #F2E74B; font-size: 1.2rem; margin: 0 0.5rem; }

    .export-btn { background: #6C1DDA; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn:hover { background: #F2E74B; color: #1A0B2E; transform: translateY(-2px); }

    @media (max-width: 1100px) {
      .admin-page { margin-left: 0; padding: 5rem 1rem 2rem 1rem; }
      .admin-table { min-width: 900px; } /* Force scroll */
      .search-box input { width: 100%; }
    }
  `]
})
export class AdminPromoCodesComponent implements OnInit {
  codes = signal<any[]>([]);
  searchTerm = signal('');
  filterStatus = signal<'available' | 'used'>('used');
  currentPage = signal(1);
  pageSize = 50;
  totalRecords = signal(0);
  totalAvailable = signal(0);
  totalUsed = signal(0);
  loading = signal(false);

  Math = Math;
  Number = Number;

  constructor() {
    effect(() => {
      this.loadCodes();
    }, { allowSignalWrites: true });
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onSearchChange(val: string) {
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  private http = inject(HttpClient);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() { }

  loadCodes() {
    this.loading.set(true);
    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize,
      status: this.filterStatus()
    };
    if (this.searchTerm()) {
      params.search = this.searchTerm();
    }

    this.http.get(`${environment.apiUrl}/admin/promo-codes`, { params }).subscribe({
      next: (res: any) => {
        this.codes.set(res.data || []);
        this.totalRecords.set(res.total || 0);
        this.totalAvailable.set(res.total_available || 0);
        this.totalUsed.set(res.total_used || 0);
        this.loading.set(false);
      },
      error: () => {
        this.codes.set([]);
        this.loading.set(false);
      }
    });
  }

  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize));
}
