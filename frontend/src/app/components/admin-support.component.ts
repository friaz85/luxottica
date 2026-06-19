import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">SOPORTE TÉCNICO</h2>
           <p class="subtitle">Gestiona los tickets de ayuda de los usuarios</p>
        </div>
        <div class="stats-row">
          <div class="stat-card open">
            <span class="stat-number">{{ stats().open }}</span>
            <span class="stat-label">Abiertos</span>
          </div>
          <div class="stat-card progress">
            <span class="stat-number">{{ stats().in_progress }}</span>
            <span class="stat-label">En Proceso</span>
          </div>
          <div class="stat-card resolved">
            <span class="stat-number">{{ stats().resolved }}</span>
            <span class="stat-label">Resueltos</span>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [ngModel]="searchTerm()" 
               (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
               placeholder="Buscar por ticket, email o asunto..."
             >
           </div>
           <div class="filter-buttons">
             <button 
               *ngFor="let status of statusFilters" 
               [class.active]="statusFilter() === status.value"
               (click)="statusFilter.set(status.value); currentPage.set(1)"
               class="filter-btn"
             >
               {{ status.label }}
             </button>
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Usuario</th>
                <th>Asunto</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th class="text-right">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ticket of paginatedTickets()" (click)="selectTicket(ticket)" class="clickable-row">
                <td class="font-bold ticket-number">{{ ticket.ticket_number }}</td>
                <td>
                  <div>{{ ticket.user_name || 'Anónimo' }}</div>
                  <small class="text-gray">{{ ticket.user_email }}</small>
                </td>
                <td>{{ ticket.subject }}</td>
                <td>
                  <span class="category-badge">{{ getCategoryLabel(ticket.category) }}</span>
                </td>
                <td>
                  <span class="status-pill" [class]="ticket.status">{{ getStatusLabel(ticket.status) }}</span>
                </td>
                <td class="text-right text-sm text-gray">{{ ticket.created_at | date:'short' }}</td>
              </tr>
              <tr *ngIf="filteredTickets().length === 0">
                 <td colspan="6" class="text-center py-8 text-gray">No se encontraron tickets</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="filteredTickets().length > 0">
          <span class="page-info">
             {{ (currentPage() - 1) * pageSize + 1 }} - {{ Math.min(currentPage() * pageSize, filteredTickets().length) }} DE {{ filteredTickets().length }}
          </span>
          <div class="pagination-controls">
            <button [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
            <span class="page-number">{{ currentPage() }}</span>
            <button [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
          </div>
        </div>
      </div>

      <!-- Ticket Detail Modal -->
      <div class="modal-overlay" *ngIf="selectedTicket()" (click)="closeTicketModal($event)">
        <div class="ticket-modal" (click)="$event.stopPropagation()">
           <div class="modal-header">
             <div>
               <h3>Ticket #{{ selectedTicket().ticket_number }}</h3>
               <span class="status-pill" [class]="selectedTicket().status">{{ getStatusLabel(selectedTicket().status) }}</span>
             </div>
             <button class="close-btn" (click)="closeTicketModal($event)">✕</button>
           </div>
           
           <div class="modal-body" *ngIf="selectedTicket()">
              <!-- User Info -->
              <div class="info-section">
                <h4>Información del Usuario</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <label>Nombre</label>
                    <span>{{ selectedTicket().user_name || 'Anónimo' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Email</label>
                    <span>{{ selectedTicket().user_email }}</span>
                  </div>
                  <div class="info-item">
                    <label>Teléfono</label>
                    <span>{{ selectedTicket().user_phone || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Fecha</label>
                    <span>{{ selectedTicket().created_at | date:'medium' }}</span>
                  </div>
                </div>
              </div>

              <hr class="divider">

              <!-- Ticket Details -->
              <div class="info-section">
                <h4>Detalles del Ticket</h4>
                <div class="info-item full">
                  <label>Asunto</label>
                  <span class="subject-text">{{ selectedTicket().subject }}</span>
                </div>
                <div class="info-item full mt-3">
                  <label>Mensaje</label>
                  <div class="message-box">{{ selectedTicket().message }}</div>
                </div>
              </div>

              <hr class="divider">

              <!-- Admin Controls -->
              <div class="form-group">
                <label>Estado</label>
                <select [(ngModel)]="selectedTicket().status" class="status-select">
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Proceso</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>

              <div class="form-group mt-3">
                <label>Categoría</label>
                <select [(ngModel)]="selectedTicket().category" class="status-select">
                  <option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</option>
                </select>
              </div>

              <div class="form-group mt-3">
                <label>Notas Internas</label>
                <textarea 
                  [(ngModel)]="selectedTicket().admin_notes" 
                  placeholder="Notas visibles solo para administradores..."
                  rows="3"
                  class="notes-textarea"
                ></textarea>
              </div>
           </div>

           <div class="modal-footer">
             <button class="btn-cancel" (click)="closeTicketModal($event)">Cerrar</button>
             <button class="btn-save" (click)="updateTicket()">
                <span class="icon">💾</span> {{ savingTicket() ? 'Guardando...' : 'Guardar Cambios' }}
             </button>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { 
      padding: 5rem 2rem 2rem 2rem; 
      margin-left: 260px;
      min-height: 100vh;
      background: #0d0221d6;
      color: white; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .admin-page.sidebar-closed { margin-left: 0; padding-top: 5rem; }

    .header-row { margin-bottom: 2rem; }
    .title { font-weight: 900; font-size: 2rem; color: #F2E74B; margin: 0; }
    .subtitle { color: #ccc; margin: 0.5rem 0 1.5rem 0; }

    .stats-row { display: flex; gap: 1rem; margin-top: 1rem; }
    .stat-card { 
      background: rgba(108, 29, 218, 0.1); 
      border: 1px solid #6C1DDA; 
      border-radius: 0.8rem; 
      padding: 1rem 1.5rem; 
      display: flex; 
      flex-direction: column; 
      align-items: center;
      min-width: 100px;
    }
    .stat-card.open { border-color: #ffaa00; }
    .stat-card.progress { border-color: #6C1DDA; }
    .stat-card.resolved { border-color: #00cc66; }
    .stat-number { font-size: 2rem; font-weight: 900; color: #F2E74B; }
    .stat-label { font-size: 0.75rem; color: #ccc; text-transform: uppercase; margin-top: 0.25rem; }

    .table-container { background: rgba(255,255,255,0.05); border: 2px solid #6C1DDA; border-radius: 1.5rem; overflow: hidden; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid rgba(108, 29, 218, 0.2); }
    .search-box { margin-bottom: 1rem; }
    .search-box input {
      width: 100%; max-width: 400px; background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA;
      color: white; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none;
    }

    .filter-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-btn {
      background: rgba(108, 29, 218, 0.2); border: 1px solid #6C1DDA; color: white;
      padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;
      transition: 0.2s;
    }
    .filter-btn:hover { background: rgba(108, 29, 218, 0.4); }
    .filter-btn.active { background: #6C1DDA; border-color: #F2E74B; }

    .table-wrapper { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { background: rgba(108, 29, 218, 0.2); color: #F2E74B; padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid rgba(108, 29, 218, 0.1); font-size: 0.9rem; }
    .admin-table tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }
    .admin-table tr:hover { background: rgba(242, 231, 75, 0.05); }
    .clickable-row { cursor: pointer; transition: 0.2s; }
    .clickable-row:hover { background: rgba(242, 231, 75, 0.1) !important; }

    .ticket-number { color: #F2E74B; font-family: monospace; }
    
    .category-badge {
      padding: 0.3rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem;
      font-weight: bold; text-transform: uppercase;
      border: 1px solid #6C1DDA;
      color: #F2E74B;
      background: rgba(108, 29, 218, 0.1);
    }

    .status-pill { 
      padding: 0.3rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; 
      font-weight: bold; text-transform: uppercase; 
    }
    .status-pill.open { background: #ffaa00; color: #1A0B2E; }
    .status-pill.in_progress { background: #6C1DDA; color: white; }
    .status-pill.resolved { background: #00cc66; color: white; }
    .status-pill.closed { background: #666; color: white; }

    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .ticket-modal { background: #1A0B2E; border: 2px solid #6C1DDA; border-radius: 1.5rem; padding: 2.5rem; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .modal-header h3 { margin: 0; color: #F2E74B; margin-bottom: 0.5rem; }
    .close-btn { background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; transition: 0.2s; }
    .close-btn:hover { color: #F2E74B; transform: rotate(90deg); }

    .info-section { margin-bottom: 1.5rem; }
    .info-section h4 { color: #F2E74B; font-size: 0.9rem; text-transform: uppercase; margin: 0 0 1rem 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.3rem; }
    .info-item label { color: #F2E74B; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .info-item span { color: white; font-size: 0.95rem; }
    .info-item.full { grid-column: span 2; }
    .subject-text { font-weight: bold; font-size: 1.1rem !important; }
    .message-box { 
      background: rgba(0,0,0,0.3); 
      border: 1px solid rgba(108, 29, 218, 0.3); 
      padding: 1rem; 
      border-radius: 0.5rem; 
      color: white; 
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .divider { border: 0; border-top: 1px solid rgba(108, 29, 218, 0.2); margin: 2rem 0; }

    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { color: #F2E74B; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .status-select, .notes-textarea { 
      width: 100%; background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA; color: white; 
      padding: 1rem; border-radius: 0.6rem; outline: none; font-size: 0.95rem; font-family: inherit;
    }
    .notes-textarea { resize: vertical; min-height: 80px; }
    .mt-3 { margin-top: 0.75rem; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2.5rem; }
    .btn-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ccc; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
    .btn-save { background: #F2E74B; border: none; color: #1A0B2E; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; transition: 0.3s; }
    .btn-save:hover { background: #6C1DDA; color: white; }

    .pagination-footer { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(108, 29, 218, 0.2); }
    .page-info { font-weight: 900; color: white; font-size: 0.85rem; text-transform: uppercase; }
    .pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
    .pagination-controls button { 
      width: 35px; height: 35px; border-radius: 50%; background: #3A1A5E; border: none; color: #F2E74B; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem; transition: 0.3s; 
    }
    .pagination-controls button:not(:disabled):hover { background: #6C1DDA; color: white; transform: scale(1.1); }
    .pagination-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-number { font-weight: 900; color: #F2E74B; font-size: 1.1rem; margin: 0 0.5rem; }

    @media (max-width: 1100px) {
      .admin-page { margin-left: 0; padding: 5rem 1rem 2rem 1rem; }
      .stats-row { flex-wrap: wrap; }
      .search-box input { max-width: 100%; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminSupportComponent implements OnInit {
  tickets = signal<any[]>([]);
  stats = signal<any>({ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  selectedTicket = signal<any>(null);
  searchTerm = signal('');
  statusFilter = signal('all');
  currentPage = signal(1);
  pageSize = 10;
  dataVersion = signal(0);

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
  savingTicket = signal(false);
  Math = Math;

  statusFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Abiertos' },
    { value: 'in_progress', label: 'En Proceso' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'closed', label: 'Cerrados' }
  ];

  categories = [
    { value: 'general', label: 'General' },
    { value: 'puntos', label: 'Puntos' },
    { value: 'canje', label: 'Canje de Premios' },
    { value: 'tecnico', label: 'Problema Técnico' },
    { value: 'otro', label: 'Otro' }
  ];

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadTickets();
    this.loadStats();
  }

  loadTickets() {
    this.http.get(`${environment.apiUrl}/admin/support`).subscribe({
      next: (res: any) => this.tickets.set(res),
      error: (e: any) => console.error(e)
    });
  }

  loadStats() {
    this.http.get(`${environment.apiUrl}/admin/support/stats`).subscribe({
      next: (res: any) => this.stats.set(res),
      error: (e: any) => console.error(e)
    });
  }

  filteredTickets = computed(() => {
    this.dataVersion();
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    return this.tickets().filter((t: any) => {
      const matchesSearch =
        t.ticket_number?.toLowerCase().includes(term) ||
        t.user_email?.toLowerCase().includes(term) ||
        t.user_name?.toLowerCase().includes(term) ||
        t.subject?.toLowerCase().includes(term);

      const matchesStatus = status === 'all' || t.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  paginatedTickets = computed(() => {
    const data = this.filteredTickets();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredTickets().length / this.pageSize));

  selectTicket(ticket: any) {
    this.selectedTicket.set({ ...ticket });
  }

  closeTicketModal(event: Event) {
    event.stopPropagation();
    this.selectedTicket.set(null);
  }

  updateTicket() {
    this.savingTicket.set(true);
    const updated = this.selectedTicket();

    this.http.post(`${environment.apiUrl}/admin/support/${updated.id}/update`, {
      status: updated.status,
      category: updated.category,
      priority: updated.priority,
      admin_notes: updated.admin_notes
    }).subscribe({
      next: () => {
        this.tickets.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.savingTicket.set(false);
        this.selectedTicket.set(null);
        this.loadStats(); // Refresh stats
        this.toast.show('¡TICKET ACTUALIZADO EXITOSAMENTE!', 'success');
      },
      error: (err) => {
        console.error('Error al actualizar ticket:', err);
        this.toast.show('ERROR AL ACTUALIZAR TICKET.', 'error');
        this.savingTicket.set(false);
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'open': 'Abierto',
      'in_progress': 'En Proceso',
      'resolved': 'Resueltos',
      'closed': 'Cerrado'
    };
    return labels[status] || status;
  }

  getCategoryLabel(val: string): string {
    return this.categories.find(c => c.value === val)?.label || val;
  }
}
