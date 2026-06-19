import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { LoaderService } from '../services/loader.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-entry-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">CÓDIGOS DE ENTRADA</h2>
           <p class="subtitle">Gestiona los códigos que los usuarios ingresan para obtener puntos o recompensas</p>
        </div>
        <div class="actions">
          <button class="export-btn secondary" (click)="exportToCSV()" style="margin-right: 1rem;">
             <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
          <button class="add-btn" (click)="openImportModal()">
             <span class="icon">➕</span> <span class="btn-text">Importar Códigos</span>
          </button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [(ngModel)]="searchQuery" 
               (keyup.enter)="loadCodes(1)"
               placeholder="Buscar código y presionar Enter..."
             >
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
                <th>Proyecto</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of codes()">
                <td class="font-bold code-text">{{ c.codigo }}</td>
                <td>{{ c.project_name || 'N/A' }}</td>
                <td><span class="points-badge">{{ c.puntos }} pts</span></td>
                <td>
                  <span class="status-badge" [class.used]="c.is_used">
                    {{ c.is_used ? '🔴 Usado por ' + (c.used_by_name || 'Usuario') : '🟢 Disponible' }}
                  </span>
                </td>
                <td class="text-right">
                  <button class="action-btn delete" (click)="deleteCode(c)" [disabled]="c.is_used">Eliminar</button>
                </td>
              </tr>
              <tr *ngIf="codes().length === 0 && !loading()">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron códigos</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="totalRecords() > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, totalRecords()) }}</b> de <b>{{ totalRecords() }}</b>
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

      <!-- Import Modal -->
      <div class="modal-overlay" *ngIf="showImportModal()" (click)="closeImportModal()">
        <div class="import-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Importar Códigos de Entrada</h3>
            <button class="close-btn" (click)="closeImportModal()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>Proyecto Destino</label>
              <select [(ngModel)]="importData.id_proyecto" name="id_proyecto">
                <option [ngValue]="null">Seleccionar proyecto...</option>
                <option *ngFor="let p of projects()" [ngValue]="p.idProyecto">{{ p.Proyecto }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Puntos a otorgar</label>
              <input type="number" [(ngModel)]="importData.puntos" name="puntos">
            </div>

            <div class="form-group">
              <label>Códigos (Uno por línea o separados por coma)</label>
              <textarea [(ngModel)]="importData.rawCodes" rows="8" placeholder="TEC-001&#10;TEC-002&#10;..."></textarea>
              <small class="help-text">Si pegas una lista separada por comas, el sistema los separará automáticamente.</small>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeImportModal()" [disabled]="importing()">Cancelar</button>
            <button class="btn-action save" (click)="processImport()" [disabled]="importing() || !importData.id_proyecto || !importData.rawCodes">
              {{ importing() ? 'Procesando...' : 'Comenzar Importación' }}
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
    .title { font-weight: 900; font-size: 2rem; color: #003366; margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    .add-btn { background: #003366; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .add-btn:hover { background: #002244; transform: translateY(-2px); }
    .add-btn .icon { filter: brightness(0) invert(1); }
    
    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; }
    .loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); z-index: 10; display: flex; align-items: center; justify-content: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #003366; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; color: #333; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { background: #f8f9fa; color: #003366; padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }
    .code-text { font-family: monospace; letter-spacing: 1px; color: #003366; }
    
    .points-badge { background: #e6f7ff; color: #1890ff; padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-weight: bold; font-size: 0.8rem; }
    .status-badge { padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: bold; background: #f0f0f0; color: #666; }
    .status-badge.used { background: #fff1f0; color: #cf1322; }
    
    .action-btn.delete { background: transparent; color: #ff4d4f; border: 1px solid #ff4d4f; padding: 0.4rem 0.8rem; border-radius: 0.4rem; cursor: pointer; transition: 0.2s; }
    .action-btn.delete:hover:not(:disabled) { background: #ff4d4f; color: white; }
    .action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .pagination-footer { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; }
    .page-info { font-weight: bold; color: #666; font-size: 0.85rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; }
    .pagination-controls button { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #ddd; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .pagination-controls button:hover:not(:disabled) { background: #003366; color: white; border-color: #003366; }
    .page-number { font-weight: bold; padding: 0 0.5rem; color: #003366; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .import-modal { background: white; border-radius: 1.5rem; padding: 2rem; width: 100%; max-width: 600px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { margin: 0; color: #003366; font-weight: 900; }
    .close-btn { background: transparent; border: none; color: #999; font-size: 1.5rem; cursor: pointer; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; flex: 1; }
    .form-row { display: flex; gap: 1rem; }
    .form-group label { color: #333; font-size: 0.85rem; font-weight: bold; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 0.8rem; border-radius: 0.5rem; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
    .btn-cancel { background: #eee; border: none; color: #666; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
    .btn-action.save { background: #003366; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
  `]
})
export class AdminEntryCodesComponent implements OnInit {
  codes = signal<any[]>([]);
  projects = signal<any[]>([]);
  rewards = signal<any[]>([]);
  loading = signal(false);
  importing = signal(false);
  showImportModal = signal(false);
  searchQuery = '';
  currentPage = signal(1);
  pageSize = 50;
  totalRecords = signal(0);
  Math = Math;

  importData = { id_proyecto: null, id_recompensa: null, puntos: 100, rawCodes: '' };

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadCodes();
    this.loadProjects();
    this.loadRewards();
  }

  loadCodes(page: number = 1) {
    this.loading.set(true);
    this.currentPage.set(page);
    const params: any = { page, limit: this.pageSize };
    if (this.searchQuery) params.search = this.searchQuery;

    this.http.get(`${environment.apiUrl}/admin/entry-codes`, { params }).subscribe({
      next: (res: any) => {
        this.codes.set(res.data);
        this.totalRecords.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Error al cargar códigos', 'error');
        this.loading.set(false);
      }
    });
  }

  loadProjects() {
    this.http.get(`${environment.apiUrl}/admin/projects`).subscribe({
      next: (res: any) => this.projects.set(res)
    });
  }

  loadRewards() {
    this.http.get(`${environment.apiUrl}/admin/rewards`).subscribe({
      next: (res: any) => this.rewards.set(res)
    });
  }

  setPage(page: number) {
    this.loadCodes(page);
  }

  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize));

  openImportModal() {
    this.importData = { id_proyecto: null, id_recompensa: null, puntos: 100, rawCodes: '' };
    this.showImportModal.set(true);
  }

  closeImportModal() {
    if (!this.importing()) this.showImportModal.set(false);
  }

  processImport() {
    this.importing.set(true);
    const codes = this.importData.rawCodes.split(/[,\n]/).map(c => c.trim()).filter(c => c.length > 0);
    
    const payload = {
      id_proyecto: this.importData.id_proyecto,
      id_recompensa: this.importData.id_recompensa,
      puntos: this.importData.puntos,
      codes: codes
    };

    this.http.post(`${environment.apiUrl}/admin/entry-codes/import`, payload).subscribe({
      next: (res: any) => {
        const title = res.success_count > 0 ? 'Importación Exitosa' : 'Proceso Finalizado';
        let html = `
          <div style="text-align: left; font-size: 0.9rem;">
            <p>✅ <b>Insertados:</b> ${res.success_count}</p>
            <p>⚠️ <b>Duplicados:</b> ${res.duplicate_count}</p>
            ${res.duplicate_count > 0 ? `
              <div style="margin-top: 10px;">
                <b>Códigos repetidos:</b>
                <div style="max-height: 100px; overflow-y: auto; background: #f5f5f5; padding: 5px; border-radius: 5px; font-family: monospace; font-size: 0.8rem;">
                  ${res.duplicates.join('<br>')}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        Swal.fire({
          title,
          html,
          icon: res.success_count > 0 ? 'success' : 'info',
          confirmButtonColor: '#003366'
        });

        this.loadCodes(1);
        this.importing.set(false);
        this.closeImportModal();
      },
      error: () => {
        this.toast.show('Error en la importación', 'error');
        this.importing.set(false);
      }
    });
  }

  deleteCode(c: any) {
    Swal.fire({
      title: '¿Eliminar código?',
      text: `Se eliminará "${c.codigo}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.delete(`${environment.apiUrl}/admin/entry-codes/${c.id}`).subscribe({
          next: () => {
            this.toast.show('CÓDIGO ELIMINADO', 'success');
            this.loadCodes(this.currentPage());
          },
          error: () => this.toast.show('ERROR AL ELIMINAR', 'error')
        });
      }
    });
  }
  
  exportToCSV() {
    this.loader.show();
    // Fetch all records for export
    const params: any = { page: 1, limit: 100000 }; // Large limit for export
    if (this.searchQuery) params.search = this.searchQuery;

    this.http.get(`${environment.apiUrl}/admin/entry-codes`, { params }).subscribe({
      next: (res: any) => {
        const headers = ['Código', 'Proyecto', 'Puntos', 'Estado', 'Usuario'];
        const rows = res.data.map((c: any) => [
          `"${c.codigo}"`,
          `"${c.project_name || 'N/A'}"`,
          c.puntos,
          c.is_used ? 'Usado' : 'Disponible',
          `"${c.used_by_name || ''}"`
        ]);
        
        const csvContent = "\ufeff" + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `codigos_entrada_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        this.loader.hide();
      },
      error: () => {
        this.toast.show('Error al exportar', 'error');
        this.loader.hide();
      }
    });
  }
}
