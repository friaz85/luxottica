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
  selector: 'app-admin-vigencias',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">GESTIÓN DE VIGENCIAS</h2>
           <p class="subtitle">Administra los rangos de fechas válidos para las recompensas</p>
        </div>
        <div class="actions">
          <button class="export-btn add-btn" (click)="openModal()">
             <span class="icon" style="filter: brightness(0) invert(1);">➕</span> <span class="btn-text">Nueva Vigencia</span>
          </button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of paginatedVigencias()">
                <td>
                  <span class="font-bold">#{{ v.id }}</span>
                </td>
                <td>{{ formatDateTime(v.fecha_inicio) }}</td>
                <td>{{ formatDateTime(v.fecha_fin) }}</td>
                <td>
                  <span class="status-pill" [class.expired]="isExpired(v.fecha_fin)" [class.future]="isFuture(v.fecha_inicio)">
                    {{ getStatusText(v) }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="btn-group">
                    <button class="action-btn edit" (click)="openModal(v)">Editar</button>
                    <button class="action-btn delete" (click)="deleteVigencia(v)">Eliminar</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="vigencias().length === 0">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron vigencias</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="vigencias().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, vigencias().length) }}</b> de <b>{{ vigencias().length }}</b>
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

      <!-- VIGENCIA MODAL -->
      <div class="admin-modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="admin-modal small animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
          <div class="admin-modal-header">
            <h3>{{ editingVigencia() ? 'Editar' : 'Nueva' }} Vigencia</h3>
            <button class="admin-close-btn" (click)="closeModal()">✕</button>
          </div>
          
          <form (submit)="saveVigencia($event)" class="admin-modal-body">
            <div class="admin-form-group">
              <label>Fecha de Inicio</label>
              <input type="date" [(ngModel)]="vigenciaData.fecha_inicio" name="fecha_inicio" class="admin-input" required>
            </div>
            
            <div class="admin-form-group">
              <label>Fecha de Fin</label>
              <input type="date" [(ngModel)]="vigenciaData.fecha_fin" name="fecha_fin" class="admin-input" required>
            </div>
            
            <div class="admin-modal-footer">
              <button type="button" class="btn-admin btn-admin-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-admin btn-admin-primary">{{ editingVigencia() ? 'Actualizar' : 'Guardar' }}</button>
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

    .actions { display: flex; gap: 1rem; }
    .export-btn { background: var(--admin-primary); border: 1px solid var(--admin-accent); color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn:hover { transform: translateY(-2px); background: var(--admin-accent); color: var(--admin-primary); }
    
    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .status-pill { padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; white-space: nowrap; width: fit-content; }
    .status-pill.expired { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .status-pill.future { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }

    .btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.6rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; white-space: nowrap; }
    .action-btn.edit { background: #f3f4f6; color: #4b5563; }
    .action-btn.delete { background: #fef2f2; color: #dc2626; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }
    .page-num-btn.active { background: var(--admin-accent); color: var(--admin-primary); border-color: var(--admin-accent); }

    @media (max-width: 900px) {
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .actions { width: 100%; }
      .actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; }
      .admin-table { min-width: 1000px; }
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }
  `]
})
export class AdminVigenciasComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  vigencias = signal<any[]>([]);
  showModal = signal(false);
  editingVigencia = signal<any>(null);
  vigenciaData = { fecha_inicio: '', fecha_fin: '' };
  currentPage = signal(1);
  pageSize = 10;
  Math = Math;

  ngOnInit() {
    this.loadVigencias();
  }

  loadVigencias() {
    this.loader.show();
    this.http.get<any[]>(`${environment.apiUrl}/admin/vigencias`).subscribe({
      next: (res) => {
        this.vigencias.set(res);
        this.loader.hide();
      },
      error: (err) => {
        this.toast.show('Error al cargar vigencias', 'error');
        this.loader.hide();
      }
    });
  }

  openModal(vigencia?: any) {
    if (vigencia) {
      this.editingVigencia.set(vigencia);
      this.vigenciaData = {
        fecha_inicio: this.formatForInput(vigencia.fecha_inicio),
        fecha_fin: this.formatForInput(vigencia.fecha_fin)
      };
    } else {
      this.editingVigencia.set(null);
      this.vigenciaData = { fecha_inicio: '', fecha_fin: '' };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveVigencia(e: Event) {
    e.preventDefault();
    if (new Date(this.vigenciaData.fecha_inicio) >= new Date(this.vigenciaData.fecha_fin)) {
      Swal.fire({
        title: 'Error de Fechas',
        text: 'La fecha de fin debe ser posterior a la fecha de inicio',
        icon: 'error',
        confirmButtonColor: '#000000'
      });
      return;
    }

    this.loader.show();
    const body = {
      fecha_inicio: this.vigenciaData.fecha_inicio.replace('T', ' '),
      fecha_fin: this.vigenciaData.fecha_fin.replace('T', ' ')
    };

    if (this.editingVigencia()) {
      const id = this.editingVigencia().id;
      this.http.post(`${environment.apiUrl}/admin/vigencias/${id}`, body).subscribe({
        next: () => {
          this.toast.show('Vigencia actualizada', 'success');
          this.closeModal();
          this.loadVigencias();
        },
        error: (err) => {
          this.toast.show('Error al actualizar vigencia', 'error');
          this.loader.hide();
        }
      });
    } else {
      this.http.post(`${environment.apiUrl}/admin/vigencias`, body).subscribe({
        next: () => {
          this.toast.show('Vigencia guardada', 'success');
          this.closeModal();
          this.loadVigencias();
        },
        error: (err) => {
          this.toast.show('Error al guardar vigencia', 'error');
          this.loader.hide();
        }
      });
    }
  }

  deleteVigencia(v: any) {
    Swal.fire({
      title: '¿Eliminar Vigencia?',
      text: `Esta acción no se puede deshacer. Se desvinculará de cualquier recompensa asignada.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#000000'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loader.show();
        this.http.delete(`${environment.apiUrl}/admin/vigencias/${v.id}`).subscribe({
          next: () => {
            this.toast.show('Vigencia eliminada', 'success');
            this.loadVigencias();
          },
          error: (err) => {
            this.toast.show('Error al eliminar vigencia', 'error');
            this.loader.hide();
          }
        });
      }
    });
  }

  paginatedVigencias = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.vigencias().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => {
    return Math.ceil(this.vigencias().length / this.pageSize) || 1;
  });

  setPage(page: number) {
    this.currentPage.set(page);
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  isFuture(dateStr: string): boolean {
    return new Date(dateStr) > new Date();
  }

  getStatusText(v: any): string {
    const now = new Date();
    const start = new Date(v.fecha_inicio);
    const end = new Date(v.fecha_fin);
    if (now > end) return '🔴 Finalizado';
    if (now < start) return '📅 Programado';
    return '✅ Activo';
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split(' ');
    const dStr = parts[0];
    const subParts = dStr.split('-');
    if (subParts.length === 3) {
      return `${subParts[2]}/${subParts[1]}/${subParts[0]}`;
    }
    const d = new Date(dateStr);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  formatForInput(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split(' ');
    return parts[0];
  }
}
