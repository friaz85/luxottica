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
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">GESTIÓN DE PROYECTOS (RALLY)</h2>
           <p class="subtitle">Administra los grupos y vigencias de participación</p>
        </div>
        <div class="actions">
          <button class="export-btn secondary" (click)="exportToCSV()" style="margin-right: 1rem;">
             <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
          <button class="export-btn add-btn" (click)="openProjectModal()">
             <span class="icon" style="filter: brightness(0) invert(1);">➕</span> <span class="btn-text">Nuevo Proyecto</span>
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
               placeholder="Buscar proyecto..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Nombre del Proyecto</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of paginatedProjects()">
                <td>
                  <div class="project-info-cell">
                    <span class="font-bold">{{ p.Proyecto }}</span>
                  </div>
                </td>
                <td>{{ p.Fecha_Inicio | date:'dd/MM/yyyy' }}</td>
                <td>{{ p.Fecha_Fin | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="status-pill" 
                        [class.expired]="isExpired(p.Fecha_Fin) || p.activo == 0" 
                        [class.desactivado]="p.activo == 0"
                        [class.pending]="isFuture(p.Fecha_Inicio) && p.activo != 0">
                    {{ p.activo == 0 ? '❌ Desactivado' : (isExpired(p.Fecha_Fin) ? '🔴 Finalizado' : (isFuture(p.Fecha_Inicio) ? '⏳ Por iniciar' : '✅ Activo')) }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="btn-group">
                    <button class="action-btn edit" (click)="openProjectModal(p)">Editar</button>
                    <button class="action-btn delete" (click)="deleteProject(p)">Desactivar</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredProjects().length === 0">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron proyectos</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="filteredProjects().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredProjects().length) }}</b> de <b>{{ filteredProjects().length }}</b>
            </span>
              <div class="pagination-controls">
                <button class="pag-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
                <ng-container *ngFor="let p of pageListProjects()">
                  <span *ngIf="p === -1" class="pag-ellipsis">…</span>
                  <button *ngIf="p !== -1" class="page-num-btn" [class.active]="currentPage() === p" (click)="setPage(p)">{{ p }}</button>
                </ng-container>
                <button class="pag-btn" [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
              </div>
          </div>
        </div>
      </div>

      <!-- PROJECT MODAL -->
    <div class="admin-modal-overlay" *ngIf="showProjectModal()" (click)="closeProjectModal()">
      <div class="admin-modal small animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <h3>{{ editingProject() ? 'Editar' : 'Nuevo' }} Proyecto</h3>
          <button class="admin-close-btn" (click)="closeProjectModal()">✕</button>
        </div>
        
        <form (submit)="saveProject($event)" class="admin-modal-body">
          <div class="admin-form-group">
            <label>Nombre del Proyecto</label>
            <input type="text" [(ngModel)]="projectData.Proyecto" name="Proyecto" class="admin-input" placeholder="Ej: Verano 2026" required>
          </div>
          
          <div class="admin-form-group">
            <label>Fecha de Inicio</label>
            <input type="date" [(ngModel)]="projectData.Fecha_Inicio" name="Fecha_Inicio" class="admin-input" required>
          </div>
          
          <div class="admin-form-group">
            <label>Fecha de Fin</label>
            <input type="date" [(ngModel)]="projectData.Fecha_Fin" name="Fecha_Fin" class="admin-input" required>
          </div>
          
          <div class="admin-modal-footer">
            <button type="button" class="btn-admin btn-admin-secondary" (click)="closeProjectModal()">Cancelar</button>
            <button type="submit" class="btn-admin btn-admin-primary">{{ editingProject() ? 'Actualizar' : 'Guardar' }}</button>
          </div>
        </form>
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

    .actions { display: flex; gap: 1rem; }
    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
    
    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .status-pill { padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; white-space: nowrap; width: fit-content; }
    .status-pill.expired { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
    .status-pill.desactivado { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status-pill.pending { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }

    .btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.6rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; white-space: nowrap; }
    .action-btn.edit { background: #f3f4f6; color: #4b5563; }
    .action-btn.delete { background: #fef2f2; color: #dc2626; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

    .mobile-only-info { display: none; margin-top: 0.3rem; font-size: 0.8rem; color: #666; font-weight: 700; }

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

    @media (max-width: 900px) { .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .actions { width: 100%; }
      .actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }
  `]
})
export class AdminProjectsComponent implements OnInit {
  projects = signal<any[]>([]);
  showProjectModal = signal(false);
  editingProject = signal<any>(null);
  projectData = { Proyecto: '', Fecha_Inicio: '', Fecha_Fin: '' };
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  Math = Math;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/projects`).subscribe({
      next: (res: any) => {
        this.projects.set(res);
        this.loader.hide();
      },
      error: () => {
        this.toast.show('Error al cargar proyectos', 'error');
        this.loader.hide();
      }
    });
  }

  openProjectModal(project: any = null) {
    if (project) {
      this.editingProject.set(project);
      this.projectData = { ...project };
    } else {
      this.editingProject.set(null);
      this.projectData = { Proyecto: '', Fecha_Inicio: '', Fecha_Fin: '' };
    }
    this.showProjectModal.set(true);
  }

  closeProjectModal() {
    this.showProjectModal.set(false);
  }

  saveProject(e: Event) {
    e.preventDefault();
    const url = this.editingProject()
      ? `${environment.apiUrl}/admin/projects/${this.editingProject().idProyecto}`
      : `${environment.apiUrl}/admin/projects`;

    this.loader.show();
    this.http.post(url, this.projectData).subscribe({
      next: () => {
        this.toast.show(this.editingProject() ? 'PROYECTO ACTUALIZADO' : 'PROYECTO CREADO', 'success');
        this.loadProjects();
        this.closeProjectModal();
        this.loader.hide();
      },
      error: () => {
        this.toast.show('ERROR AL GUARDAR', 'error');
        this.loader.hide();
      }
    });
  }

  deleteProject(p: any) {
    Swal.fire({
      title: '¿Desactivar Proyecto?',
      text: `Se desactivará "${p.Proyecto}". Ten en cuenta que esto afectará el acceso de los usuarios vinculados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff3333',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.loader.show();
        this.http.delete(`${environment.apiUrl}/admin/projects/${p.idProyecto}`).subscribe({
          next: () => {
            this.toast.show('PROYECTO DESACTIVADO', 'success');
            this.loadProjects();
            this.loader.hide();
          },
          error: () => {
            this.toast.show('ERROR AL DESACTIVAR', 'error');
            this.loader.hide();
          }
        });
      }
    });
  }

  isExpired(date: string) {
    const end = new Date(date.replace(/-/g, '/'));
    const today = new Date();
    today.setHours(0,0,0,0);
    return today > end;
  }

  isFuture(date: string) {
    const start = new Date(date.replace(/-/g, '/'));
    const today = new Date();
    today.setHours(0,0,0,0);
    return start > today;
  }

  filteredProjects = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.projects().filter(p => p.Proyecto.toLowerCase().includes(term));
  });

  paginatedProjects = computed(() => {
    const data = this.filteredProjects();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredProjects().length / this.pageSize));
  pageListProjects = computed(() => this.smartPages(this.currentPage(), this.totalPages()));

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


  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  exportToCSV() {
    const headers = ['ID', 'Proyecto', 'Fecha Inicio', 'Fecha Fin', 'Estado'];
    const rows = this.filteredProjects().map(p => [
      p.idProyecto,
      `"${p.Proyecto}"`,
      p.Fecha_Inicio,
      p.Fecha_Fin,
      this.isExpired(p.Fecha_Fin) ? 'Finalizado' : 'Activo'
    ]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proyectos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
