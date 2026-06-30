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
  selector: 'app-admin-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">INVENTARIO DE CÓDIGOS</h2>
           <p class="subtitle">Visualiza, edita y administra los códigos de salida de las recompensas</p>
        </div>
      </div>

      <div class="table-container">
        <!-- Filtros -->
        <div class="table-header" style="justify-content: flex-start;">
           <div class="filters-row" style="justify-content: flex-start; width: 100%;">
             
             <div class="filter-group">
               <label class="filter-label">Buscar Código (Últimos 5 dig.):</label>
               <input 
                 type="text" 
                 [(ngModel)]="searchQuery" 
                 (ngModelChange)="onFilterChange()"
                 placeholder="Ej: W0401..."
                 class="filter-select"
                 style="width: 180px;"
               >
             </div>

             <div class="filter-group">
               <label class="filter-label">Recompensa:</label>
               <select 
                 [(ngModel)]="selectedRewardId" 
                 (ngModelChange)="onFilterChange()"
                 class="filter-select"
               >
                 <option value="">Todas</option>
                 <option *ngFor="let r of rewards()" [value]="r.id">{{ r.title }}</option>
               </select>
             </div>

             <div class="filter-group">
               <label class="filter-label">Vigencia:</label>
               <select 
                 [(ngModel)]="selectedVigenciaId" 
                 (ngModelChange)="onFilterChange()"
                 class="filter-select"
               >
                 <option value="">Todas</option>
                 <option *ngFor="let v of vigencias()" [value]="v.id">
                   #{{ v.id }} ({{ formatShortDate(v.fecha_inicio) }} a {{ formatShortDate(v.fecha_fin) }})
                 </option>
               </select>
             </div>

             <div class="filter-group">
               <label class="filter-label">Estado:</label>
               <select 
                 [(ngModel)]="selectedStatus" 
                 (ngModelChange)="onFilterChange()"
                 class="filter-select"
               >
                 <option value="">Todos</option>
                 <option value="0">Disponibles</option>
                 <option value="1">Canjeados</option>
               </select>
             </div>

           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('reward_title')">
                  Recompensa <span style="font-size:0.75rem; margin-left:3px;">{{ getSortIcon('reward_title') }}</span>
                </th>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('fecha_fin')">
                  Vigencia de Códigos <span style="font-size:0.75rem; margin-left:3px;">{{ getSortIcon('fecha_fin') }}</span>
                </th>
                <th>Código(s) (Enmascarados)</th>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('is_used')">
                  Estado <span style="font-size:0.75rem; margin-left:3px;">{{ getSortIcon('is_used') }}</span>
                </th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of codes()">
                <td>
                  <span class="font-bold">{{ row.reward_title || 'N/A' }}</span>
                </td>
                <td>
                  <span *ngIf="row.fecha_inicio && row.fecha_fin; else noVig">
                    📅 {{ formatShortDate(row.fecha_inicio) }} al {{ formatShortDate(row.fecha_fin) }}
                  </span>
                  <ng-template #noVig><span class="project-tag global">Sin límite</span></ng-template>
                </td>
                <td>
                  <div class="codes-list-cell">
                    <span *ngFor="let code of getRowCodes(row)" class="code-badge">
                      {{ code }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="status-pill" [class.expired]="row.is_used == 1">
                    {{ row.is_used == 1 ? '🔴 Canjeado' : '✅ Disponible' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="btn-group" *ngIf="row.is_used == 0">
                    <button class="action-btn edit" (click)="openModal(row)">Editar</button>
                    <button class="action-btn delete" (click)="deleteCode(row)">Eliminar</button>
                  </div>
                  <div class="btn-group" *ngIf="row.is_used == 1">
                    <span class="text-gray" style="font-size:0.8rem; font-style:italic;">Sin acciones</span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="codes().length === 0">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron códigos</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginador -->
        <div class="pagination-footer" *ngIf="totalCodes() > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage * pageSize, totalCodes()) }}</b> de <b>{{ totalCodes() }}</b>
            </span>
            <div class="pagination-controls">
              <button class="pag-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">« Anterior</button>
              <div class="page-numbers">
                <button *ngFor="let p of [].constructor(totalPages()); let i = index" 
                        class="page-num-btn" 
                        [class.active]="currentPage === (i + 1)"
                        (click)="setPage(i + 1)">
                  {{ i + 1 }}
                </button>
              </div>
              <button class="pag-btn" [disabled]="currentPage >= totalPages()" (click)="setPage(currentPage + 1)">Siguiente »</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL DE EDICIÓN -->
      <div class="admin-modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="admin-modal small animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
          <div class="admin-modal-header">
            <h3>Editar Código de Recompensa</h3>
            <button class="admin-close-btn" (click)="closeModal()">✕</button>
          </div>
          
          <form (submit)="saveCode($event)" class="admin-modal-body" *ngIf="editingRow">
            <div class="admin-form-group">
              <label>Recompensa</label>
              <input type="text" [value]="editingRow.reward_title" class="admin-input" readonly disabled style="background: #f1f5f9;">
            </div>

            <div class="admin-form-group">
              <label>Asignar Vigencia</label>
              <select [(ngModel)]="editData.id_vigencia" name="id_vigencia" class="admin-input">
                <option [ngValue]="null">-- Sin Vigencia (Global) --</option>
                <option *ngFor="let v of vigencias()" [ngValue]="v.id">
                  Vigencia #{{ v.id }} ({{ formatShortDate(v.fecha_inicio) }} a {{ formatShortDate(v.fecha_fin) }})
                </option>
              </select>
            </div>

            <!-- Mostrar inputs para editar los códigos reales del grupo -->
            <div class="admin-form-group" *ngFor="let codeNum of getEditCodeFields()">
              <label>Código {{ codeNum }}</label>
              <input 
                type="text" 
                [(ngModel)]="editData['code' + codeNum]" 
                name="code{{codeNum}}" 
                class="admin-input" 
                placeholder="Ingresar nuevo código completo"
                required
              >
              <small class="help-text">Código actual enmascarado: {{ editingRow['code' + codeNum] || editingRow['code'] }}</small>
            </div>
            
            <div class="admin-modal-footer">
              <button type="button" class="btn-admin btn-admin-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-admin btn-admin-primary">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: var(--admin-bg, #f4f7f9); color: #333; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }
    
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1.5rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    
    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; align-items: center; }
    .filters-row { display: flex; gap: 1.2rem; align-items: center; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .filter-label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-select { background: #f9f9f9; border: 1px solid #ddd; padding: 0.6rem 1rem; border-radius: 0.5rem; outline: none; font-weight: 700; color: #334155; min-width: 160px; transition: border-color 0.2s; font-size: 0.85rem; }
    .filter-select:focus { border-color: var(--admin-primary); }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .codes-list-cell { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .code-badge { background: #f1f5f9; border: 1px solid #e2e8f0; color: #1e293b; padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-family: monospace; font-size: 0.85rem; font-weight: 700; }
    .project-tag { background: #e0f2fe; color: #0369a1; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; white-space: nowrap; width: fit-content; }
    .project-tag.global { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .status-pill { padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; white-space: nowrap; width: fit-content; }
    .status-pill.expired { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    .btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.6rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; white-space: nowrap; }
    .action-btn.edit { background: #f3f4f6; color: #4b5563; }
    .action-btn.delete { background: #fef2f2; color: #dc2626; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }
    .page-num-btn.active { background: var(--admin-accent); color: var(--admin-primary); border-color: var(--admin-accent); }

    @media (max-width: 900px) {
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .admin-table { min-width: 1000px; }
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }
  `]
})
export class AdminCodesComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  codes = signal<any[]>([]);
  rewards = signal<any[]>([]);
  vigencias = signal<any[]>([]);
  totalCodes = signal(0);
  totalPages = computed(() => {
    return Math.ceil(this.totalCodes() / this.pageSize) || 1;
  });

  // Filters
  searchQuery = '';
  selectedRewardId = '';
  selectedVigenciaId = '';
  selectedStatus = '';

  currentPage = 1;
  pageSize = 20;
  Math = Math;

  // Sorting
  sortBy = 'is_used';
  sortOrder = 'asc';

  // Modal
  showModal = false;
  editingRow: any = null;
  editData: any = {};

  ngOnInit() {
    this.loadCodes();
    this.loadRewards();
    this.loadVigencias();
  }

  loadCodes() {
    this.loader.show();
    let url = `${environment.apiUrl}/admin/codes?page=${this.currentPage}&limit=${this.pageSize}&sort_by=${this.sortBy}&sort_order=${this.sortOrder}`;
    
    if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;
    if (this.selectedRewardId) url += `&reward_id=${this.selectedRewardId}`;
    if (this.selectedVigenciaId) url += `&id_vigencia=${this.selectedVigenciaId}`;
    if (this.selectedStatus) url += `&is_used=${this.selectedStatus}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.codes.set(res.data || []);
        this.totalCodes.set(res.total || 0);
        this.loader.hide();
      },
      error: (err) => {
        this.toast.show('Error al cargar códigos de salida', 'error');
        this.loader.hide();
      }
    });
  }

  loadRewards() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/rewards`).subscribe({
      next: (res) => this.rewards.set(res || []),
      error: (err) => console.error('Error loading rewards list', err)
    });
  }

  loadVigencias() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/vigencias`).subscribe({
      next: (res) => this.vigencias.set(res || []),
      error: (err) => console.error('Error loading vigencias list', err)
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadCodes();
  }

  setPage(page: number) {
    this.currentPage = page;
    this.loadCodes();
  }

  toggleSort(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.currentPage = 1;
    this.loadCodes();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) {
      return '↕';
    }
    return this.sortOrder === 'asc' ? '▲' : '▼';
  }

  getRowCodes(row: any): string[] {
    const list: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const codeVal = row[`code${i}`];
      if (codeVal) {
        list.push(codeVal);
      }
    }
    if (list.length === 0 && row.code) {
      list.push(row.code);
    }
    return list;
  }

  getEditCodeFields(): number[] {
    const list: number[] = [];
    if (!this.editingRow) return [1];
    // Find how many code fields actually exist in the current row
    for (let i = 1; i <= 8; i++) {
      if (this.editingRow[`code${i}`]) {
        list.push(i);
      }
    }
    if (list.length === 0) {
      list.push(1);
    }
    return list;
  }

  openModal(row: any) {
    this.editingRow = row;
    this.editData = {
      id_vigencia: row.id_vigencia
    };
    // Initialize fields
    for (let i = 1; i <= 8; i++) {
      if (row[`code${i}`]) {
        this.editData[`code${i}`] = ''; // blank to prompt them to type new code
      }
    }
    if (!row.code1 && row.code) {
      this.editData['code1'] = '';
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingRow = null;
    this.editData = {};
  }

  saveCode(e: Event) {
    e.preventDefault();
    this.loader.show();

    const formData = new FormData();
    if (this.editData.id_vigencia !== undefined) {
      formData.append('id_vigencia', this.editData.id_vigencia === null ? '' : this.editData.id_vigencia.toString());
    }

    // Only append code fields that were modified/input by the user
    for (let i = 1; i <= 8; i++) {
      const key = `code${i}`;
      if (this.editData[key]) {
        formData.append(key, this.editData[key]);
      }
    }

    this.http.post(`${environment.apiUrl}/admin/codes/${this.editingRow.id}`, formData).subscribe({
      next: () => {
        this.toast.show('Código actualizado con éxito', 'success');
        this.closeModal();
        this.loadCodes();
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: err.error?.message || 'Ocurrió un error al actualizar el código.',
          confirmButtonColor: '#6C1DDA'
        });
        this.loader.hide();
      }
    });
  }

  deleteCode(row: any) {
    Swal.fire({
      title: '¿Eliminar Código?',
      text: 'Esta acción no se puede deshacer y el stock de la recompensa se actualizará automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6C1DDA'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loader.show();
        this.http.delete(`${environment.apiUrl}/admin/codes/${row.id}`).subscribe({
          next: () => {
            this.toast.show('Código eliminado', 'success');
            this.loadCodes();
          },
          error: (err: any) => {
            this.toast.show(err.error?.message || 'Error al eliminar el código', 'error');
            this.loader.hide();
          }
        });
      }
    });
  }

  formatShortDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split(' ');
    const dStr = parts[0];
    const subParts = dStr.split('-');
    if (subParts.length === 3) {
      return `${subParts[2]}/${subParts[1]}/${subParts[0]}`;
    }
    return dateStr;
  }
}
