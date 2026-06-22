import { Component, inject, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminNavbarComponent } from './admin-navbar.component';
import { Chart, registerables } from 'chart.js';
import { AdminLayoutService } from '../services/admin-layout.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="dashboard-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">DASHBOARD DE RENDIMIENTO</h2>
           <p class="subtitle">Luxottica | Portal Administrativo</p>
        </div>
        
        <div class="actions-group">
          <div class="date-filter">
            <div class="date-input">
              <label>Desde</label>
              <input type="date" [(ngModel)]="startDate" (change)="loadStats()">
            </div>
            <div class="date-input">
              <label>Hasta</label>
              <input type="date" [(ngModel)]="endDate" (change)="loadStats()">
            </div>
          </div>
          <button class="export-btn" (click)="resetFilters()">
             <span class="icon">🔄</span> <span class="btn-text">Restablecer</span>
          </button>
        </div>
      </div>

      <!-- KPI CARDS SKELETON -->
      <div class="kpi-grid" *ngIf="loading()">
        <div class="kpi-card skeleton-card" *ngFor="let i of [1,2,3]">
          <div class="skeleton-icon"></div>
          <div class="skeleton-info">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line value"></div>
          </div>
        </div>
      </div>

      <!-- KPI CARDS DATA -->
      <div class="kpi-grid" *ngIf="!loading()">
         <div class="kpi-card users">
            <div class="kpi-icon">👥</div>
            <div class="kpi-info">
              <h3>Usuarios</h3>
              <span class="value">{{ (stats()?.cards?.users || stats()?.cards?.hist_users || 0) | number }}</span>
              <small *ngIf="stats()?.cards?.hist_users" style="display:block; font-size:0.7rem; color:#999">Total histórico: {{ stats().cards.hist_users | number }}</small>
            </div>
         </div>
         <div class="kpi-card redemptions">
            <div class="kpi-icon">🎟️</div>
            <div class="kpi-info">
              <h3>Canjes Totales</h3>
              <span class="value">{{ (stats()?.cards?.redemptions || stats()?.cards?.hist_redemptions || 0) | number }}</span>
              <small *ngIf="stats()?.cards?.hist_redemptions" style="display:block; font-size:0.7rem; color:#999">Total histórico: {{ stats().cards.hist_redemptions | number }}</small>
            </div>
         </div>
         <div class="kpi-card points">
            <div class="kpi-icon">💰</div>
            <div class="kpi-info">
              <h3>Puntos Canjeados</h3>
              <span class="value">{{ (stats()?.cards?.points || stats()?.cards?.hist_points || 0) | number }}</span>
              <small *ngIf="stats()?.cards?.hist_points" style="display:block; font-size:0.7rem; color:#999">Total histórico: {{ stats().cards.hist_points | number }}</small>
            </div>
         </div>
      </div>

      <div class="charts-row">
        <!-- Main Activity Chart -->
        <div class="dashboard-panel chart-panel">
          <div class="chart-header">
            <h3>📊 Actividad (7 días)</h3>
            <div class="chart-toggles" *ngIf="!loading()">
              <button [class.active]="showRedemptions" (click)="toggleMetric('redemptions')" title="Cantidad de canjes">🎁 Recompensas</button>
              <button [class.active]="showCodes" (click)="toggleMetric('codes')" title="Cantidad de códigos">🎫 Códigos</button>
              <button [class.active]="showRedemptionsPoints" (click)="toggleMetric('redemptionsPoints')" title="Puntos en recompensas">💰 Pts Canjeados</button>
              <button [class.active]="showCodesPoints" (click)="toggleMetric('codesPoints')" title="Puntos en códigos">📥 Pts Registrados</button>
            </div>
          </div>
          <div class="canvas-wrapper" [class.loading-shimmer]="loading()">
            <canvas #activityChartCanvas></canvas>
          </div>
        </div>

        <!-- Top Rewards Chart -->
        <div class="dashboard-panel">
          <div class="panel-header">
             <h3>🏆 Top Recompensas</h3>
          </div>
          <div class="canvas-wrapper doughnut" [class.loading-shimmer]="loading()">
             <canvas #rewardsChartCanvas></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Activity Table -->
      <div class="dashboard-panel table-panel full-width">
        <div class="panel-header">
           <h3>⏱️ Últimos Movimientos</h3>
        </div>
        <div class="table-wrapper" [class.loading-shimmer]="loading()">
          <table class="simple-table" *ngIf="!loading()">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Actividad</th>
                <th class="text-right">Fecha</th>
              </tr>
            </thead>
            <tbody>
               <tr *ngFor="let act of paginatedRecent()">
                 <td class="font-bold">{{ act.user }}</td>
                 <td>{{ act.reward }}</td>
                 <td class="text-right text-sm text-gray">{{ act.created_at | date:'short' }}</td>
               </tr>
               <tr *ngIf="!stats()?.recent?.length">
                  <td colspan="3" class="text-center">Sin actividad reciente</td>
               </tr>
            </tbody>
          </table>
          <!-- Skeleton table while loading -->
          <div class="skeleton-table" *ngIf="loading()">
            <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>
        </div>

        <!-- Pagination Activity -->
        <div class="pagination-footer mt-4" *ngIf="stats()?.recent?.length > 0 && !loading()">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPageActivity() - 1) * pageSizeActivity + 1 }}</b> a <b>{{ Math.min(currentPageActivity() * pageSizeActivity, stats()?.recent?.length) }}</b> de <b>{{ stats()?.recent?.length }}</b>
            </span>
            <div class="pagination-controls">
              <button class="pag-btn" [disabled]="currentPageActivity() === 1" (click)="setPageActivity(currentPageActivity() - 1)">«</button>
              <ng-container *ngFor="let p of pageListActivity()">
                <span *ngIf="p === -1" class="pag-ellipsis">…</span>
                <button *ngIf="p !== -1" class="page-num-btn" [class.active]="currentPageActivity() === p" (click)="setPageActivity(p)">{{ p }}</button>
              </ng-container>
              <button class="pag-btn" [disabled]="currentPageActivity() >= totalPagesActivity()" (click)="setPageActivity(currentPageActivity() + 1)">»</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================== -->
      <!-- USER REPORT TABLE             -->
      <!-- ============================== -->
      <div class="dashboard-panel table-panel full-width" style="margin-top:2rem;">
        <div class="panel-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <h3>👥 Reporte de Usuarios por Proyecto</h3>
          <div style="display:flex;gap:0.8rem;align-items:center;flex-wrap:wrap;">
            <select [(ngModel)]="reportProject" (change)="loadUserReport()" style="background:#f9f9f9;border:1px solid #ddd;padding:0.5rem 0.8rem;border-radius:0.5rem;font-size:0.9rem;outline:none;">
              <option value="">— Todos los proyectos —</option>
              <option *ngFor="let p of projects()" [value]="p.idProyecto">{{ p.Proyecto }}</option>
            </select>
            <input type="text" [(ngModel)]="reportSearch" (input)="onReportSearch()" placeholder="Buscar usuario..." style="background:#f9f9f9;border:1px solid #ddd;padding:0.5rem 0.8rem;border-radius:0.5rem;font-size:0.9rem;outline:none;min-width:200px;">
            <button class="export-btn" (click)="exportReportCsv()" style="padding:0.5rem 1rem;font-size:0.85rem;">
              <span class="icon">📥</span> Exportar CSV
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="simple-table" *ngIf="!reportLoading()">
            <thead><tr>
              <th>Usuario</th><th>Nombre</th><th>Contraseña</th><th>Depto</th>
              <th class="text-right">Asignados</th>
              <th class="text-right">Utilizados</th>
              <th class="text-right">Restantes</th>
              <th>Proyecto</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let u of filteredReport()">
                <td style="font-family:monospace;font-size:0.85rem;">{{ u.user_login }}</td>
                <td class="font-bold">{{ u.full_name }}</td>
                <td>
                  <span style="font-family:monospace;font-size:0.82rem;background:#f1f5f9;padding:2px 8px;border-radius:6px;">{{ u.password_display || '—' }}</span>
                </td>
                <td style="font-size:0.82rem;color:#64748b;">{{ u.depto_id || '—' }}</td>
                <td class="text-right font-bold" style="color:#0f172a;">{{ u.points | number }}</td>
                <td class="text-right" style="color:#dc2626;font-weight:700;">{{ u.points_used | number }}</td>
                <td class="text-right" style="color:#16a34a;font-weight:700;">{{ u.points_remaining | number }}</td>
                <td style="font-size:0.82rem;">{{ u.project_name || '—' }}</td>
              </tr>
              <tr *ngIf="!reportLoading() && !filteredReport().length">
                <td colspan="8" class="text-center" style="padding:40px;color:#94a3b8;">Sin usuarios registrados para este filtro</td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="reportLoading()" style="text-align:center;padding:40px;">
            <div style="display:inline-block;width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:var(--admin-primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
          </div>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid #eee;font-size:0.82rem;color:#94a3b8;" *ngIf="!reportLoading()">
          Total: <strong>{{ filteredReport().length }}</strong> usuarios
        </div>
      </div>

    </div>
  `,
  styles: [`
    .dashboard-page { 
      padding: 5rem 2rem 2rem 2rem; 
      margin-left: 260px;
      background: #f4f7f9; 
      min-height: 100vh; 
      color: #333; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .dashboard-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1.5rem; }
    .title { font-weight: 900; font-size: 2.5rem; margin: 0; color: var(--admin-primary); }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; font-size: 0.95rem; }

    .actions-group { display: flex; align-items: center; gap: 1rem; }
    
    .date-filter { 
      display: flex; gap: 1rem; background: white; padding: 0.5rem 1rem; 
      border-radius: 0.5rem; border: 1px solid #ddd; align-items: flex-end;
    }
    .date-input { display: flex; flex-direction: column; }
    .date-input label { font-size: 0.7rem; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 0.2rem; }
    .date-input input { background: transparent; border: none; color: #333; outline: none; padding: 0.2rem 0; cursor: pointer; }

    .export-btn { 
      background: var(--admin-primary); border: none; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem;
      cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: 0.3s; font-weight: bold;
    }
    .export-btn:hover { background: var(--admin-secondary); transform: translateY(-2px); }

    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .kpi-card { 
      background: white; border-radius: 1rem; border: 1px solid #eee;
      padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .kpi-icon { font-size: 2.5rem; }
    .kpi-info h3 { margin: 0; font-size: 0.85rem; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .kpi-info .value { font-size: 2rem; font-weight: 900; color: var(--admin-primary); line-height: 1.2; }

    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .panel { background: white; border-radius: 1.5rem; padding: 1.5rem; border: 1px solid #eee; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    
    .chart-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem; }
    .chart-header h3 { margin: 0; font-size: 1.2rem; color: var(--admin-primary); font-weight: 900; }
    .chart-toggles { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .chart-toggles button {
      background: #f5f5f5; border: 1px solid #ddd; color: #666;
      padding: 0.4rem 0.8rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem; font-weight: bold;
      transition: 0.3s;
    }
    .chart-toggles button.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); }

    .canvas-wrapper { min-height: 300px; position: relative; }
    .simple-table { width: 100%; border-collapse: collapse; }
    .simple-table th { color: var(--admin-primary); font-size: 0.75rem; text-transform: uppercase; padding: 1rem; text-align: left; font-weight: 900; border-bottom: 2px solid #eee; }
    .simple-table td { padding: 1.2rem; border-bottom: 1px solid #eee; vertical-align: middle; }
    .simple-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .simple-table tbody tr:hover { background-color: #f1f5f9; }

    .table-wrapper { width: 100%; overflow-x: auto; max-height: 500px; overflow-y: auto; -webkit-overflow-scrolling: touch; }

    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 2rem; }
    .dashboard-panel { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .table-panel.full-width { margin-top: 2rem; }
    .chart-header, .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .chart-header h3, .panel-header h3 { font-size: 1.2rem; font-weight: 900; color: var(--admin-primary); margin: 0; }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.75rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.15s; min-width: 36px; }
    .pag-btn:hover:not([disabled]) { background: #f3f4f6; }
    .pag-btn[disabled] { opacity: 0.4; cursor: default; }
    .page-num-btn { width: 34px; height: 34px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.15s; }
    .page-num-btn:hover:not(.active) { background: #f3f4f6; border-color: #9ca3af; }
    .page-num-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .pag-ellipsis { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; color: #9ca3af; font-weight: 700; letter-spacing: 1px; }
    .pagination-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .mt-4 { margin-top: 1rem; }

    /* Skeleton Loading Styles */
    .skeleton-card { background: white; border: 1px solid #eee; overflow: hidden; position: relative; }
    .skeleton-icon { width: 50px; height: 50px; border-radius: 50%; background: #f0f0f0; }
    .skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-line { height: 1rem; background: #f0f0f0; border-radius: 4px; }
    .skeleton-line.title { width: 50%; }
    .skeleton-line.value { height: 2rem; width: 80%; }

    .loading-shimmer { background: #f6f7f8; background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%); background-repeat: no-repeat; background-size: 800px 100%; display: inline-block; position: relative; animation: shimmer 1.5s infinite linear; }
    @keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }

    .skeleton-table { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-row { height: 3rem; background: #f0f0f0; border-radius: 4px; animation: pulse 1.5s infinite ease-in-out; }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

    .canvas-wrapper.loading-shimmer { width: 100%; height: 300px; border-radius: 1rem; }

    @media (max-width: 1100px) {
      .dashboard-page { margin-left: 0; padding: 5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 2rem; }
      .actions-group { width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
      .date-filter { width: auto; flex-direction: row; gap: 0.5rem; }
      .charts-row { grid-template-columns: 1fr; }
    }

    /* Tablet: 2 columns */
    @media (max-width: 1100px) and (min-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    }

    /* Mobile: Stacked */
    @media (max-width: 767px) {
      .kpi-grid { grid-template-columns: 1fr; gap: 1rem; }
      .kpi-card { padding: 1.5rem; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats        = signal<any>(null);
  loading      = signal(true);
  startDate    = '';
  endDate      = '';

  // User report
  reportUsers  = signal<any[]>([]);
  reportLoading = signal(false);
  reportProject = '';
  reportSearch  = '';
  projects      = signal<any[]>([]);
  private reportSearchTimer: any;

  filteredReport = computed(() => {
    const term = this.reportSearch.toLowerCase();
    if (!term) return this.reportUsers();
    return this.reportUsers().filter(u =>
      (u.user_login || '').toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.depto_id || '').toLowerCase().includes(term)
    );
  });

  showRedemptions = true;
  showCodes = true;
  showRedemptionsPoints = false;
  showCodesPoints = false;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  public layoutService = inject(AdminLayoutService);

  currentPageActivity = signal(1);
  pageSizeActivity = 10;
  Math = Math;

  paginatedRecent = computed(() => {
    const data = this.stats()?.recent;
    if (!data) return [];
    const start = (this.currentPageActivity() - 1) * this.pageSizeActivity;
    return data.slice(start, start + this.pageSizeActivity);
  });

  totalPagesActivity = computed(() => {
    const data = this.stats()?.recent;
    if (!data) return 0;
    return Math.ceil(data.length / this.pageSizeActivity);
  });

  pageListActivity = computed(() => this.smartPages(this.currentPageActivity(), this.totalPagesActivity()));

  smartPages(current: number, total: number): number[] {
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    const add = (p: number) => { if (!pages.includes(p) && p >= 1 && p <= total) pages.push(p); };
    const dots = () => { if (pages[pages.length - 1] !== -1) pages.push(-1); };
    add(1);
    if (current > 4) dots();
    for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) add(p);
    if (current < total - 3) dots();
    add(total);
    return pages;
  }

  setPageActivity(page: number) {
    if (page >= 1 && page <= this.totalPagesActivity()) {
      this.currentPageActivity.set(page);
    }
  }

  @ViewChild('activityChartCanvas') activityChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rewardsChartCanvas') rewardsChartCanvas!: ElementRef<HTMLCanvasElement>;

  activityChart: Chart | null = null;
  rewardsChart: Chart | null = null;

  ngOnInit() {
    this.resetFilters(false);
    this.loadProjects();
    this.loadUserReport();
  }

  resetFilters(fetchData: boolean = true) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    if (fetchData) this.loadStats();
    else setTimeout(() => this.loadStats(), 0);
  }

  ngAfterViewInit() {
    if (this.stats()) this.initCharts();
  }

  loadProjects() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/projects`).subscribe({
      next: rows => this.projects.set(rows || []),
      error: () => {}
    });
  }

  loadUserReport() {
    this.reportLoading.set(true);
    let url = `${environment.apiUrl}/admin/users/report`;
    if (this.reportProject) url += `?id_proyecto=${this.reportProject}`;
    this.http.get<any[]>(url).subscribe({
      next: data => { this.reportUsers.set(data || []); this.reportLoading.set(false); },
      error: () => this.reportLoading.set(false)
    });
  }

  onReportSearch() {
    clearTimeout(this.reportSearchTimer);
    this.reportSearchTimer = setTimeout(() => {}, 0); // triggers computed signal
  }

  exportReportCsv() {
    let url = `${environment.apiUrl}/admin/users/report?export=csv`;
    if (this.reportProject) url += `&id_proyecto=${this.reportProject}`;
    window.open(url, '_blank');
  }

  loadStats() {
    this.loading.set(true);
    let url = `${environment.apiUrl}/admin/dashboard`;
    if (this.startDate && this.endDate) {
      url += `?start_date=${this.startDate}&end_date=${this.endDate}`;
    }
    this.http.get(url).subscribe({
      next: (res: any) => {
        console.log('Dashboard Data:', res);
        this.stats.set(res);
        this.loading.set(false);
        this.cdr.detectChanges();
        this.initCharts();
      },
      error: (e) => {
        console.error('Error loading stats', e);
        this.toast.show('Error al cargar métricas', 'error');
        this.loading.set(false);
      }
    });
  }

  toggleMetric(metric: string) {
    if (metric === 'redemptions') this.showRedemptions = !this.showRedemptions;
    if (metric === 'codes') this.showCodes = !this.showCodes;
    if (metric === 'redemptionsPoints') this.showRedemptionsPoints = !this.showRedemptionsPoints;
    if (metric === 'codesPoints') this.showCodesPoints = !this.showCodesPoints;
    this.initCharts();
  }

  initCharts() {
    if (!this.activityChartCanvas || !this.stats()) return;
    this.cdr.detectChanges();
    
    // Destroy existing
    if (this.activityChart) this.activityChart.destroy();
    if (this.rewardsChart) this.rewardsChart.destroy();

    const stats = this.stats();
    const labels = stats.chart.map((d: any) => d.date);
    const datasets = [];

    if (this.showRedemptions) {
      datasets.push({
        label: 'Recompensas (Cant)',
        data: stats.chart.map((d: any) => d.redemptions_count),
        borderColor: 'var(--admin-primary)',
        backgroundColor: 'rgba(0, 51, 102, 0.1)',
        fill: true,
        tension: 0.4
      });
    }

    if (this.showCodes) {
      datasets.push({
        label: 'Códigos (Cant)',
        data: stats.chart.map((d: any) => d.codes_count),
        borderColor: '#00cc66',
        backgroundColor: 'rgba(0, 204, 102, 0.1)',
        fill: true,
        tension: 0.4
      });
    }

    if (this.showRedemptionsPoints) {
      datasets.push({
        label: 'Pts Canjeados',
        data: stats.chart.map((d: any) => d.redemptions_points),
        borderColor: '#ffcc00',
        backgroundColor: 'rgba(255, 204, 0, 0.1)',
        fill: true,
        tension: 0.4
      });
    }

    if (this.showCodesPoints) {
      datasets.push({
        label: 'Pts Registrados',
        data: stats.chart.map((d: any) => d.codes_points),
        borderColor: '#ff6600',
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        fill: true,
        tension: 0.4
      });
    }

    this.activityChart = new Chart(this.activityChartCanvas.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    const rewardLabels = stats.top_rewards.map((r: any) => `${r.title} (${r.count})`);
    const rewardData = stats.top_rewards.map((r: any) => r.count);

    this.rewardsChart = new Chart(this.rewardsChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: rewardLabels,
        datasets: [{
          data: rewardData,
          backgroundColor: ['var(--admin-primary)', '#0066cc', '#0099ff', '#00cc66', '#ffcc00']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              font: {
                weight: 'bold'
              }
            }
          } 
        }
      }
    });
  }
}
