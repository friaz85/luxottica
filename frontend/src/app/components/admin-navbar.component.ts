import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminLayoutService } from '../services/admin-layout.service';
import { LoaderComponent } from './loader.component';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LoaderComponent],
  template: `
    <app-loader></app-loader>
    <!-- Floating Open Button (visible when closed) -->
    <button *ngIf="!layoutService.isSidebarOpen()" class="sidebar-toggle floating" (click)="layoutService.openSidebar()">
      <span class="icon">☰</span>
    </button>

    <!-- Overlay for mobile when sidebar is open -->
    <div class="sidebar-overlay" *ngIf="layoutService.isSidebarOpen() && isMobile" (click)="layoutService.closeSidebar()"></div>

    <div class="admin-sidebar shadow-lg" [class.closed]="!layoutService.isSidebarOpen()">
      <div class="logo-section">
        <!-- Close Button inside sidebar -->
        <button class="sidebar-toggle internal" (click)="layoutService.closeSidebar()">
          <span class="icon">✕</span>
        </button>
        <div class="logo-wrapper">
          <img src="assets/img/Logo_Luxottica.png" alt="Luxottica" class="admin-logo">
        </div>
        <small>Portal Administrativo</small>
      </div>
      <nav class="nav-links">
        <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">📊</span> Dashboard
        </a>
        
        <a routerLink="/admin/projects" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">📁</span> Proyectos
        </a>
        <a routerLink="/admin/users" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">👥</span> Usuarios
        </a>
        <a routerLink="/admin/rewards" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">🎁</span> Recompensas
        </a>
        <a routerLink="/admin/vigencias" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">📅</span> Vigencias
        </a>
        <a routerLink="/admin/redemptions" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">📋</span> Canjes
        </a>
        <a routerLink="/admin/pending-rewards" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">⏳</span> Pendientes
        </a>
        <a routerLink="/admin/entry-codes-report" routerLinkActive="active" class="nav-item" (click)="onNavItemClick()">
          <span class="icon">📈</span> Reporte de Códigos
        </a>
      </nav>

      <div class="user-footer">
        <button (click)="logout()" class="action-btn logout-btn">
          <span class="icon">🚪</span> Cerrar Sesión
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-toggle {
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 101;
    }
    
    .sidebar-toggle.floating {
      position: fixed;
      left: 15px;
      top: 3px;
      background: var(--admin-primary);
      border: 1px solid var(--admin-accent);
      box-shadow: 0 4px 10px rgba(197, 168, 128, 0.4);
    }
    .sidebar-toggle.floating:hover { transform: scale(1.1); background: var(--admin-accent); color: var(--admin-primary); }

    .sidebar-toggle.internal {
      position: absolute;
      right: 15px;
      top: 15px;
      background: rgba(255,255,255,0.1);
      font-size: 0.9rem;
    }
    .sidebar-toggle.internal:hover { background: rgba(255,255,255,0.2); }

    .sidebar-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 99;
    }

    .admin-sidebar { 
      width: 260px; 
      height: 100vh; 
      background: #000000; 
      border-right: 1px solid #222222; 
      display: flex; 
      flex-direction: column; 
      position: fixed; 
      left: 0; 
      top: 0; 
      box-shadow: 4px 0 20px rgba(0,0,0,0.5);
      z-index: 100;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .admin-sidebar.closed { left: -260px; }

    .logo-section { padding: 1.5rem 1rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center; position: relative; }
    .logo-wrapper { margin-bottom: 0.3rem; display: flex; justify-content: center; }
    .admin-logo { height: 48px; filter: invert(1) drop-shadow(0 0 10px rgba(255,255,255,0.1)); }
    .highlight { color: #ffffff; text-decoration: underline; }
    small { color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; }
    
    .nav-links { 
      flex: 1;
      min-height: 0;
      padding: 0.8rem 0.8rem;
      display: flex; 
      flex-direction: column; 
      gap: 0.2rem;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(197,168,128,0.3) transparent;
    }
    .nav-links::-webkit-scrollbar { width: 4px; }
    .nav-links::-webkit-scrollbar-track { background: transparent; }
    .nav-links::-webkit-scrollbar-thumb { background: rgba(197,168,128,0.3); border-radius: 4px; }

    .nav-item { 
      display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; 
      color: #aaa; text-decoration: none; border-radius: 0.5rem; 
      font-weight: 500; font-size: 0.9rem; transition: all 0.2s; flex-shrink: 0;
    }
    .nav-item:hover { background: rgba(197, 168, 128, 0.08); color: var(--admin-accent); transform: translateX(5px); }
    .nav-item.active { background: var(--admin-accent); color: #000000; box-shadow: 0 4px 15px rgba(197, 168, 128, 0.25); font-weight: 700; }
    .icon { font-size: 1.2rem; }

    .user-footer { padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
    .action-btn { 
      background: transparent; border: 1px solid rgba(255,255,255,0.1); 
      color: #888; padding: 0.6rem; border-radius: 0.4rem; cursor: pointer; 
      display: flex; align-items: center; justify-content: center; gap: 0.5rem; 
      font-size: 0.8rem; transition: all 0.2s;
    }
    .action-btn:hover { background: rgba(255,255,255,0.05); color: white; border-color: white; }
    .logout-btn:hover { background: rgba(255, 50, 50, 0.1); color: #ff5555; border-color: #ff5555; }

    @media (max-width: 1100px) {
      .sidebar-toggle.floating { top: 3px; left: 10px; }
    }
  `]
})
export class AdminNavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  public layoutService = inject(AdminLayoutService);

  isMobile = window.innerWidth <= 1100;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isMobile = window.innerWidth <= 1100;
    if (this.isMobile && this.layoutService.isSidebarOpen()) {
      this.layoutService.closeSidebar();
    } else if (!this.isMobile && !this.layoutService.isSidebarOpen()) {
      this.layoutService.openSidebar();
    }
  }

  constructor() {
    if (this.isMobile) {
      this.layoutService.closeSidebar();
    }
  }

  onNavItemClick() {
    if (this.isMobile) {
      this.layoutService.closeSidebar();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  getRole() {
    return this.auth.user()?.role;
  }
}
