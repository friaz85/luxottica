import { Component, inject, OnInit, signal, computed } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { LoaderService } from '../services/loader.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">GESTIÓN DE USUARIOS</h2>
           <p class="subtitle">Administra los embajadores registrados</p>
        </div>
        <div class="actions">
          <button class="export-btn secondary" (click)="exportToCSV()">
             <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
          <button class="export-btn add-btn" (click)="openUserModal()">
             <span class="icon" style="filter: brightness(0) invert(1);">➕</span> <span class="btn-text">Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [ngModel]="searchTerm()" 
               (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
               placeholder="Buscar por nombre o correo..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th (click)="sort('full_name')">Nombre {{ getSortIcon('full_name') }}</th>
                <th (click)="sort('email')">Correo {{ getSortIcon('email') }}</th>
                <th>Proyecto</th>
                <th class="text-right" (click)="sort('points')">Puntos {{ getSortIcon('points') }}</th>
                <th (click)="sort('is_blocked')">Estado {{ getSortIcon('is_blocked') }}</th>
                <th class="text-right" style="cursor: default;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of paginatedUsers()">
                <td>
                  <div class="user-info-cell">
                    <span class="font-bold">{{ user.full_name }}</span>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <div class="project-tag-container">
                    <span class="project-tag">{{ user.project_name || 'Sin Proyecto' }}</span>
                  </div>
                </td>
                <td class="text-right font-bold text-blue">{{ user.points | number }}</td>
                <td>
                  <span class="status-pill" [class.blocked]="user.is_blocked == 1">
                    {{ user.is_blocked == 1 ? '🔒 Bloqueado' : '✅ Activo' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="btn-group">
                    <button class="action-btn edit" (click)="openUserModal(user)">Editar</button>
                    <button 
                      class="action-btn" 
                      [class.unblock]="user.is_blocked"
                      (click)="openBlockModal(user)"
                    >
                      {{ user.is_blocked == 1 ? 'Desbloquear' : 'Bloquear' }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers().length === 0">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron usuarios</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-footer" *ngIf="filteredUsers().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredUsers().length) }}</b> de <b>{{ filteredUsers().length }}</b>
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

    <!-- USER MODAL -->
    <div class="admin-modal-overlay" *ngIf="showUserModal()" (click)="closeUserModal()">
      <div class="admin-modal medium animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <h3>{{ editingUser() ? 'Editar' : 'Nuevo' }} Usuario</h3>
          <button class="admin-close-btn" (click)="closeUserModal()">✕</button>
        </div>
        
        <form (submit)="saveUser($event)" class="admin-modal-body">
          <div class="admin-form-group">
            <label>Nombre Completo</label>
            <input type="text" [(ngModel)]="userData.full_name" name="full_name" class="admin-input" placeholder="Ej: Juan Pérez" required>
          </div>
          
          <div class="admin-form-group">
            <label>Correo Electrónico</label>
            <input type="email" [(ngModel)]="userData.email" name="email" class="admin-input" placeholder="juan@ejemplo.com" required>
          </div>
          
          <div class="admin-form-group">
            <label>Contraseña {{ editingUser() ? '(Dejar en blanco para no cambiar)' : '' }}</label>
            <input type="password" [(ngModel)]="userData.password" name="password" class="admin-input" [required]="!editingUser()">
          </div>
          
          <div class="admin-form-group">
            <label>Puntos Iniciales</label>
            <input type="number" [(ngModel)]="userData.points" name="points" class="admin-input" required>
          </div>
          
          <div class="admin-form-group">
            <label>Proyecto Asignado</label>
            <select [(ngModel)]="userData.id_proyecto" name="id_proyecto" class="admin-input" required>
              <option [ngValue]="null" disabled>Seleccionar Proyecto...</option>
              <option *ngFor="let p of projects()" [ngValue]="p.idProyecto">{{ p.Proyecto }}</option>
            </select>
          </div>

          <div class="exclusive-codes-section">
            <div class="section-header">
              <label>🎟️ Códigos de Entrada Exclusivos (Hasta 10)</label>
            </div>
            <div class="codes-grid">
              <div *ngFor="let code of userData.entry_codes; let i = index" class="code-row">
                <span class="code-label">Código {{ i + 1 }}</span>
                <span class="pts-label">Puntos</span>
                <input type="text" [(ngModel)]="code.codigo" [name]="'code_' + i" placeholder="COD-{{i+1}}" class="admin-input">
                <input type="number" [(ngModel)]="code.puntos" [name]="'pts_' + i" placeholder="0" class="admin-input">
              </div>
            </div>
          </div>
          
          <div class="admin-modal-footer">
            <button type="button" class="btn-admin btn-admin-secondary" (click)="closeUserModal()">Cancelar</button>
            <button type="submit" class="btn-admin btn-admin-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- BLOCK MODAL -->
    <div class="admin-modal-overlay" *ngIf="selectedUser()" (click)="closeBlockModal($event)">
      <div class="admin-modal small animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <h3>{{ selectedUser().is_blocked == 1 ? 'Desbloquear' : 'Bloquear' }} Usuario</h3>
          <button class="admin-close-btn" (click)="closeBlockModal($event)">✕</button>
        </div>
        
        <div class="admin-modal-body">
          <div class="user-summary">
            <p><strong>Usuario:</strong> {{ selectedUser().full_name }}</p>
            <p><strong>Email:</strong> {{ selectedUser().email }}</p>
          </div>

          <div class="admin-form-group" *ngIf="selectedUser().is_blocked == 0">
            <label>Razón del Bloqueo</label>
            <textarea [(ngModel)]="blockReason" class="admin-input reason-textarea" placeholder="Ej: Actividad sospechosa, etc." rows="3"></textarea>
          </div>

          <div class="warning-box" *ngIf="selectedUser().is_blocked == 0">
            <p>⚠️ El usuario no podrá acceder a su cuenta mientras esté bloqueado.</p>
          </div>

          <div class="info-box" *ngIf="selectedUser().is_blocked == 1">
            <p><strong>Razón registrada:</strong> {{ selectedUser().blocked_reason || 'No especificada' }}</p>
          </div>
        </div>

        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-secondary" (click)="closeBlockModal($event)">Cancelar</button>
          <button class="btn-admin" [class.btn-admin-primary]="selectedUser().is_blocked" [class.btn-admin-danger]="!selectedUser().is_blocked" (click)="toggleUserBlock()">
            {{ selectedUser().is_blocked == 1 ? '🔓 Desbloquear' : '🔒 Bloquear Usuario' }}
          </button>
        </div>
      </div>
    </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #f4f7f9; color: #333; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1.5rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: #003366; margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }

    .actions { display: flex; gap: 1rem; }
    .export-btn { background: #003366; border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn.secondary { background: #666; }
    .export-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
    .search-box { width: 40%; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .admin-table th { background: #f8f9fa; color: #003366; padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .status-pill { padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; white-space: nowrap; width: fit-content; }
    .status-pill.blocked { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    .btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.6rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; white-space: nowrap; }
    .action-btn.edit { background: #f3f4f6; color: #4b5563; }
    .action-btn:not(.edit) { background: #fef2f2; color: #dc2626; }
    .action-btn.unblock { background: #eff6ff; color: #2563eb; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

    .project-tag { background: #e0f2fe; color: #0369a1; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; white-space: nowrap; border: 1px solid #bae6fd; }

    .pagination-footer { padding: 1.5rem 2rem; background: #fff; border-top: 1px solid #eee; }
    .pagination-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .page-numbers { display: flex; gap: 0.3rem; }
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; }
    .page-num-btn { width: 32px; height: 32px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }
    .page-num-btn.active { background: #003366; color: white; border-color: #003366; }

    .mobile-only-info { display: none; margin-top: 0.3rem; font-size: 0.8rem; color: #666; font-weight: 700; }

    @media (max-width: 900px) { .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .actions { width: 100%; }
      .actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }

    .exclusive-codes-section { margin-top: 1.5rem; }
    .section-header label { display: block; margin-bottom: 1rem; color: #003366; font-size: 0.9rem; }
    .codes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
    .code-row { display: grid; grid-template-columns: 1fr 75px; gap: 0.4rem 0.6rem; background: white; padding: 1rem; border-radius: 0.8rem; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .code-label, .pts-label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .pts-label { text-align: right; padding-right: 5px; }
    .code-row input { padding: 0.5rem 0.8rem; font-size: 0.85rem; }
    .code-row input[type="number"] { text-align: right; }

    .user-summary { margin-bottom: 1.5rem; padding: 1rem; background: #f1f5f9; border-radius: 0.8rem; }
    .user-summary p { margin: 0.3rem 0; font-size: 0.9rem; }
    .reason-textarea { min-height: 100px; resize: vertical; }
    .warning-box { padding: 1rem; background: #fef2f2; border-radius: 0.8rem; border: 1px solid #fee2e2; color: #991b1b; margin: 1rem 0; font-size: 0.85rem; }
    .info-box { padding: 1rem; background: #eff6ff; border-radius: 0.8rem; border: 1px solid #dbeafe; color: #1e40af; margin: 1rem 0; font-size: 0.85rem; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<any[]>([]);
  selectedUser = signal<any>(null);
  showUserModal = signal(false);
  editingUser = signal<any>(null);
  projects = signal<any[]>([]);
  userData = { 
    full_name: '', 
    email: '', 
    password: '', 
    points: 0, 
    id_proyecto: null as any,
    entry_codes: new Array(10).fill(null).map(() => ({ codigo: '', puntos: 0 }))
  };
  blockReason = '';
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  Math = Math;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res: any) => {
        this.users.set(res);
        this.loader.hide();
      },
      error: (e: any) => {
        console.error(e);
        this.loader.hide();
      }
    });
    this.loadProjects();
  }

  loadProjects() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/projects`).subscribe({
      next: (res: any) => {
        this.projects.set(res);
        this.loader.hide();
      },
      error: (e: any) => {
        console.error(e);
        this.loader.hide();
      }
    });
  }

  openUserModal(user: any = null) {
    if (user) {
      this.editingUser.set(user);
      this.userData = { 
        full_name: user.full_name, 
        email: user.email, 
        password: '', 
        points: user.points,
        id_proyecto: user.id_proyecto,
        entry_codes: [...(user.entry_codes || [])
          .map((c: any) => ({ codigo: c.codigo, puntos: c.puntos })), 
          ...new Array(10).fill(null).map(() => ({ codigo: '', puntos: 0 }))]
          .slice(0, 10)
      };
    } else {
      this.editingUser.set(null);
      this.userData = { 
        full_name: '', 
        email: '', 
        password: '', 
        points: 0, 
        id_proyecto: null,
        entry_codes: new Array(10).fill(null).map(() => ({ codigo: '', puntos: 0 }))
      };
    }
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.editingUser.set(null);
  }

  saveUser(e: Event) {
    e.preventDefault();
    const url = this.editingUser() 
      ? `${environment.apiUrl}/admin/users/${this.editingUser().id}`
      : `${environment.apiUrl}/admin/users`;
    
    this.loader.show();
    this.http.post(url, this.userData).subscribe({
      next: (res: any) => {
        const title = this.editingUser() ? 'USUARIO ACTUALIZADO' : 'USUARIO CREADO';
        
        let html = `
          <div style="text-align: left; font-size: 0.9rem;">
            <p>✅ <b>Códigos asignados:</b> ${res.code_summary?.success_count || 0}</p>
            <p>⚠️ <b>Duplicados (omitidos):</b> ${res.code_summary?.duplicate_count || 0}</p>
            ${res.code_summary?.duplicate_count > 0 ? `
              <div style="margin-top: 10px;">
                <b>Códigos repetidos detectados:</b>
                <div style="max-height: 100px; overflow-y: auto; background: #f5f5f5; padding: 5px; border-radius: 5px; font-family: monospace; font-size: 0.8rem;">
                  ${res.code_summary.duplicates.join('<br>')}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        Swal.fire({
          title,
          html,
          icon: 'success',
          confirmButtonColor: '#003366'
        });

        this.loadUsers();
        this.closeUserModal();
        this.loader.hide();
      },
      error: () => {
        this.toast.show('ERROR AL GUARDAR', 'error');
        this.loader.hide();
      }
    });
  }

  openBlockModal(user: any) {
    this.selectedUser.set({ ...user });
    this.blockReason = '';
  }

  closeBlockModal(event: Event) {
    event.stopPropagation();
    this.selectedUser.set(null);
  }

  toggleUserBlock() {
    const user = this.selectedUser();
    const isBlocking = !user.is_blocked;

    this.loader.show();
    this.http.post(`${environment.apiUrl}/admin/users/${user.id}/toggle-block`, {
      block: isBlocking,
      reason: this.blockReason
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.selectedUser.set(null);
        this.toast.show(isBlocking ? 'USUARIO BLOQUEADO' : 'USUARIO DESBLOQUEADO', 'success');
        this.loader.hide();
      },
      error: () => {
        this.toast.show('ERROR AL ACTUALIZAR', 'error');
        this.loader.hide();
      }
    });
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '↕️';
    return this.sortDirection() === 'asc' ? '⬆️' : '⬇️';
  }

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let data = this.users().filter((u: any) =>
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );

    const col = this.sortColumn();
    const dir = this.sortDirection();

    if (col) {
      data = [...data].sort((a, b) => {
        let valA = a[col];
        let valB = b[col];
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB ? valB.toLowerCase() : '';
        }
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  });

  paginatedUsers = computed(() => {
    const data = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.pageSize));

  exportToCSV() {
    const headers = ['Nombre', 'Email', 'Puntos', 'Estado'];
    const rows = this.filteredUsers().map((u: any) => [
      `"${u.full_name}"`, u.email, u.points || 0, u.is_blocked == 1 ? 'Bloqueado' : 'Activo'
    ]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "usuarios_tec.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
