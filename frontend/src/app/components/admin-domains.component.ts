import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AdminNavbarComponent } from './admin-navbar.component';
import { ToastService } from '../services/toast.service';
import { environment } from '../../environments/environment';
import { AdminLayoutService } from '../services/admin-layout.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-domains',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">DOMINIOS BLOQUEADOS</h2>
           <p class="subtitle">Gestión de dominios de correo electrónico restringidos</p>
        </div>
        <div class="header-actions">
           <div class="add-domain-box">
                <input 
                    type="text" 
                    [(ngModel)]="newDomain" 
                    placeholder="Ej. spam.com"
                >
                <button (click)="addDomain()" [disabled]="loading() || !newDomain.trim()" class="export-btn">
                    <span class="icon">➕</span> <span class="btn-text">Agregar</span>
                </button>
           </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [(ngModel)]="searchQuery" 
               (keyup)="onSearch()" 
               placeholder="Buscar dominio..."
             >
           </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="loading-state py-8">
           <div class="spinner"></div>
           <p>Cargando dominios...</p>
        </div>

        <div class="table-wrapper" *ngIf="!loading()">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Dominio</th>
                <th>Fecha de Agregado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let domain of domains()">
                <td class="font-bold text-gold">{{ domain.domain }}</td>
                <td class="text-sm text-gray">{{ domain.created_at | date:'short' }}</td>
                <td class="text-right">
                  <button class="action-btn delete" (click)="deleteDomain(domain.id)" title="Eliminar este dominio de la lista negra">
                    Tolerar
                  </button>
                </td>
              </tr>
              <tr *ngIf="domains().length === 0">
                 <td colspan="3" class="text-center py-8 text-gray">No se encontraron dominios bloqueados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="!loading() && pager().total_pages > 1">
          <span class="page-info">
             {{ (pager().current_page - 1) * pager().per_page + 1 }} - {{ Math.min(pager().current_page * pager().per_page, pager().total_items) }} DE {{ pager().total_items }}
          </span>
          <div class="pagination-controls">
            <button [disabled]="pager().current_page === 1" (click)="changePage(pager().current_page - 1)">«</button>
            <span class="page-number">{{ pager().current_page }}</span>
            <button [disabled]="pager().current_page >= pager().total_pages" (click)="changePage(pager().current_page + 1)">»</button>
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

    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: #F2E74B; margin: 0; }
    .subtitle { color: #ccc; margin: 0.5rem 0 0 0; }

    .header-actions { display: flex; align-items: center; }
    .add-domain-box { display: flex; gap: 0.5rem; }
    .add-domain-box input {
      background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA;
      color: white; padding: 0.75rem 1rem; border-radius: 0.5rem; outline: none;
    }

    .export-btn { 
      background: #6C1DDA; border: none; color: white; padding: 0.75rem 1.5rem; 
      border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; 
      gap: 0.5rem; font-weight: bold; transition: 0.3s;
    }
    .export-btn .icon { color: #fff; }
    .export-btn:hover:not(:disabled) { background: #F2E74B; color: #1A0B2E; transform: translateY(-2px); }
    .export-btn:hover:not(:disabled) .icon { color: inherit; }
    .export-btn:disabled { opacity: 0.5; padding-right: 1.5rem; cursor: not-allowed; }

    .table-container { background: rgba(255,255,255,0.05); border: 2px solid #6C1DDA; border-radius: 1.5rem; overflow: hidden; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid rgba(108, 29, 218, 0.2); }
    .search-box input {
      width: 100%; max-width: 400px; background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA;
      color: white; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none;
    }

    .table-wrapper { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { background: rgba(108, 29, 218, 0.2); color: #F2E74B; padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid rgba(108, 29, 218, 0.1); font-size: 0.9rem; }
    .admin-table tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }
    .admin-table tbody tr:hover { background: rgba(242, 231, 75, 0.05); }
    
    .text-gold { color: #F2E74B; }
    .font-bold { font-weight: bold; }
    .text-gray { color: #ccc; }
    .text-sm { font-size: 0.85rem; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }

    .action-btn { background: rgba(255,255,255,0.1); border: none; color: white; padding: 0.4rem 0.8rem; border-radius: 0.3rem; cursor: pointer; font-size: 0.8rem; font-weight: bold;}
    .action-btn:hover { background: rgba(255,255,255,0.2); }
    .action-btn.delete { color: #ff5555; border: 1px solid #ff5555; background: transparent; }
    .action-btn.delete:hover { background: rgba(255, 85, 85, 0.1); }

    .loading-state { text-align: center; color: #aaa; }
    .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #F2E74B; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

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
      .header-row { flex-direction: column; align-items: flex-start; }
      .search-box input { max-width: 100%; }
      .btn-text { display: none; }
      .add-domain-box input { width: 140px; }
    }
  `]
})
export class AdminDomainsComponent implements OnInit {
  domains = signal<any[]>([]);
  loading = signal(true);
  searchQuery = '';
  searchTimeout: any;
  newDomain = '';
  Math = Math;

  pager = signal({
    current_page: 1,
    per_page: 20,
    total_pages: 1,
    total_items: 0
  });

  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    // Determine screen size purely based on window width on load
    if (window.innerWidth <= 1100) {
      this.layoutService.closeSidebar();
    } else {
      this.layoutService.openSidebar();
    }

    this.loadDomains();
  }

  loadDomains(page: number = 1) {
    this.loading.set(true);
    let url = `${environment.apiUrl}/admin/blocked-domains?page=${page}&per_page=${this.pager().per_page}`;

    if (this.searchQuery) {
      url += `&search=${encodeURIComponent(this.searchQuery)}`;
    }

    this.http.get(url).subscribe({
      next: (res: any) => {
        this.domains.set(res.data);
        if (res.pager) {
          this.pager.set(res.pager);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Error al cargar dominios', 'error');
        this.loading.set(false);
      }
    });
  }

  onSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadDomains(1);
    }, 500);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.pager().total_pages) {
      this.loadDomains(page);
    }
  }

  addDomain() {
    const domainToAdd = this.newDomain.trim().toLowerCase();
    if (!domainToAdd) return;

    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/admin/blocked-domains`, { domain: domainToAdd }).subscribe({
      next: () => {
        this.toastService.show('Dominio agregado correctamente', 'success');
        this.newDomain = '';
        this.loadDomains(1);
      },
      error: (err) => {
        this.toastService.show(err.error?.message || err.error?.messages?.error || 'Error al agregar el dominio', 'error');
        this.loading.set(false);
      }
    });
  }

  deleteDomain(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Eliminarás este dominio de la lista negra. Los usuarios con este correo podrán seguir usando la plataforma.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff5555',
      cancelButtonColor: '#6C1DDA',
      confirmButtonText: 'Sí, tolerar dominio',
      cancelButtonText: 'Cancelar',
      background: '#2D1B4E',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.http.delete(`${environment.apiUrl}/admin/blocked-domains/${id}`).subscribe({
          next: () => {
            this.toastService.show('Dominio eliminado de la lista negra', 'success');
            this.loadDomains(this.pager().current_page);
          },
          error: () => {
            this.toastService.show('Error al eliminar', 'error');
            this.loading.set(false);
          }
        });
      }
    });
  }
}
