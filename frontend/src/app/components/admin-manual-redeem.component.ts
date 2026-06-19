import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-manual-redeem',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div>
           <h2 class="title">CANJE ESPECIAL</h2>
           <p class="subtitle">Usuarios con 3-5 puntos inactivos hace > 1 mes</p>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
           <div class="search-box">
             <input 
               type="text" 
               [ngModel]="searchTerm()" 
               (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
               placeholder="Buscar por correo..."
             >
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th (click)="sort('full_name')" style="cursor: pointer;">Nombre {{ getSortIcon('full_name') }}</th>
                <th (click)="sort('email')" style="cursor: pointer;">Correo {{ getSortIcon('email') }}</th>
                <th (click)="sort('points')" class="text-right" style="cursor: pointer;">Puntos Actuales {{ getSortIcon('points') }}</th>
                <th class="text-right">Último Login</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of paginatedUsers()">
                <td class="font-bold">{{ user.full_name }}</td>
                <td>{{ user.email }}</td>
                <td class="text-right font-bold text-yellow">{{ user.points | number }}</td>
                <td class="text-right">{{ user.ultimo_login | date:'dd/MM/yyyy' }}</td>
                <td class="text-right">
                  <div class="action-group">
                    <button 
                      class="action-btn" 
                      (click)="confirmRedeem(user, 23, 'BOLETO DE CINE 2X1')"
                      [disabled]="loadingIds.has(user.id) || user.points < 3 || (rewardsStock()[23] <= 0)"
                    >
                      {{ loadingIds.has(user.id) ? '...' : (rewardsStock()[23] <= 0 ? 'Sin Stock' : 'Cine 2x1') }}
                    </button>
                    <button 
                      *ngIf="user.points >= 5"
                      class="action-btn vix-btn" 
                      (click)="confirmRedeem(user, 25, 'VIX')"
                      [disabled]="loadingIds.has(user.id) || (rewardsStock()[25] <= 0)"
                    >
                      {{ loadingIds.has(user.id) ? '...' : (rewardsStock()[25] <= 0 ? 'Sin Stock' : 'VIX') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers().length === 0">
                 <td colspan="5" class="text-center py-8 text-gray">No se encontraron usuarios que cumplan el criterio</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-footer" *ngIf="filteredUsers().length > 0">
          <span class="page-info">
             {{ (currentPage() - 1) * pageSize + 1 }} - {{ Math.min(currentPage() * pageSize, filteredUsers().length) }} DE {{ filteredUsers().length }}
          </span>
          <div class="pagination-controls">
            <button [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
            <span class="page-number">{{ currentPage() }}</span>
            <button [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div class="modal-overlay" *ngIf="selectedUser()" (click)="selectedUser.set(null)">
        <div class="block-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Confirmar Canje Manual</h3>
            <button class="close-btn" (click)="selectedUser.set(null)">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="user-info">
              <p><strong>Usuario:</strong> {{ selectedUser().full_name }}</p>
              <p><strong>Email:</strong> {{ selectedUser().email }}</p>
              <p><strong>Premio:</strong> {{ selectedReward()?.name }} (ID {{ selectedReward()?.id }})</p>
            </div>
            <p class="warning-text">Se descontarán los puntos correspondientes y se generará el PDF en el servidor.</p>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" [disabled]="isProcessing()" (click)="selectedUser.set(null)">Cancelar</button>
            <button class="btn-action" [disabled]="isProcessing()" (click)="executeRedeem()">
              <span *ngIf="!isProcessing()">Confirmar Canje</span>
              <span *ngIf="isProcessing()">Procesando...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 5rem 2rem 2rem; margin-left: 260px; min-height: 100vh; background: #0d0221d6; color: white; transition: all 0.3s; }
    .admin-page.sidebar-closed { margin-left: 0; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .title { font-weight: 900; font-size: 2rem; color: #F2E74B; margin: 0; }
    .subtitle { color: #ccc; margin: 0.5rem 0 0; }
    .table-container { background: rgba(255,255,255,0.05); border: 2px solid #6C1DDA; border-radius: 1.5rem; overflow: hidden; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid rgba(108, 29, 218, 0.2); }
    .search-box { width: 40%; } .search-box input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid #6C1DDA; color: white; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { background: rgba(108, 29, 218, 0.2); color: #F2E74B; padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid rgba(108, 29, 218, 0.1); font-size: 0.9rem; }
    .admin-table tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }
    .admin-table tbody tr:hover { background: rgba(242, 231, 75, 0.05); }
    .text-right { text-align: right; }
    .text-yellow { color: #F2E74B; }
    .font-bold { font-weight: bold; }
    .action-btn { background: #6C1DDA; border: none; color: white; padding: 0.5rem 0.8rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; transition: 0.2s; font-size: 0.8rem; }
    .action-btn:hover:not(:disabled) { background: #F2E74B; color: #1A0B2E; }
    .action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .action-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .vix-btn { background: #ff5900; }

    .pagination-footer { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
    .pagination-controls button { width: 35px; height: 35px; border-radius: 50%; background: #3A1A5E; border: none; color: #F2E74B; cursor: pointer; }
    .pagination-controls button:disabled { opacity: 0.3; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .block-modal { background: #1A0B2E; border: 2px solid #6C1DDA; border-radius: 1.5rem; padding: 2rem; width: 100%; max-width: 500px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { margin: 0; color: #F2E74B; }
    .close-btn { background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
    .user-info { background: rgba(108, 29, 218, 0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }
    .warning-text { color: #ffaa00; font-size: 0.9rem; font-style: italic; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; }
    .btn-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ccc; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
    .btn-action { background: #6C1DDA; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
    .btn-action:hover { background: #F2E74B; color: #1A0B2E; }
  `]
})
export class AdminManualRedeemComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  public layoutService = inject(AdminLayoutService);

  users = signal<any[]>([]);
  rewardsStock = signal<any>({});
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  selectedUser = signal<any>(null);
  selectedReward = signal<{id: number, name: string} | null>(null);
  loadingIds = new Set<number>();
  isProcessing = signal(false);
  Math = Math;

  // Sorting
  sortColumn = signal<string>('ultimo_login');
  sortDirection = signal<'asc' | 'desc'>('asc');

  ngOnInit() {
    if (this.auth.getRole() !== 'system_admin') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.loadUsers();
  }

  loadUsers() {
    this.http.get(`${environment.apiUrl}/admin/special-redeem-users`).subscribe({
      next: (res: any) => {
        this.users.set(res.users || []);
        this.rewardsStock.set(res.stock || {});
      },error: (e) => this.toast.show('Error al cargar usuarios', 'error')
    });
  }

  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc'); // Default DESC for new columns
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '↕️';
    return this.sortDirection() === 'asc' ? '⬆️' : '⬇️';
  }

  confirmRedeem(user: any, rewardId: number, rewardName: string) {
    this.selectedUser.set(user);
    this.selectedReward.set({ id: rewardId, name: rewardName });
  }

  executeRedeem() {
    const user = this.selectedUser();
    if (!user || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.loadingIds.add(user.id);

    const reward = this.selectedReward();
    this.http.post(`${environment.apiUrl}/admin/manual-redeem`, { 
      user_id: user.id,
      reward_id: reward?.id
    }).subscribe({
      next: (res: any) => {
        this.toast.show('¡Canje realizado exitosamente!', 'success');
        this.loadUsers(); // Refresh list
        this.isProcessing.set(false);
        this.loadingIds.delete(user.id);
        this.selectedUser.set(null);
        this.selectedReward.set(null);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Error al procesar canje', 'error');
        this.isProcessing.set(false);
        this.loadingIds.delete(user.id);
        this.selectedUser.set(null);
        this.selectedReward.set(null);
      }
    });
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let data = this.users().filter(u => 
      u.email.toLowerCase().includes(term) || 
      u.full_name.toLowerCase().includes(term)
    );

    // Apply Sorting
    const col = this.sortColumn();
    const dir = this.sortDirection();

    if (col) {
      data = [...data].sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (col === 'points') {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else if (typeof valA === 'string') {
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
}
