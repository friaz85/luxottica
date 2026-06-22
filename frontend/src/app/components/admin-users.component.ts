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
import * as XLSX from 'xlsx';

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
           <p class="subtitle">Administra los usuarios registrados en la plataforma</p>
        </div>
        <div class="actions">
          <button class="export-btn secondary" (click)="exportToCSV()">
             <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
          <button class="export-btn add-btn" (click)="openBulkModal()">
             <span class="icon" style="filter: brightness(0) invert(1);">📤</span> <span class="btn-text">Carga Masiva</span>
          </button>
        </div>
      </div>

      <!-- TABS -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">
          👥 Usuarios
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'logs'" (click)="activeTab.set('logs'); loadUploadLogs()">
          📂 Historial de Cargas
          <span class="tab-badge" *ngIf="uploadLogs().length > 0">{{ uploadLogs().length }}</span>
        </button>
      </div>

      <!-- TAB: USUARIOS -->
      <div *ngIf="activeTab() === 'users'">
        <div class="table-container">
          <div class="table-header">
             <div class="filters-row">
               <div class="filter-group">
                 <label class="filter-label">Proyecto:</label>
                 <select 
                   [ngModel]="selectedProject()" 
                   (ngModelChange)="selectedProject.set($event); currentPage.set(1)"
                   class="filter-select"
                 >
                   <option value="">Todos los proyectos</option>
                   <option *ngFor="let p of projects()" [value]="p.idProyecto">{{ p.Proyecto }}</option>
                 </select>
               </div>
               <div class="search-box">
                 <input 
                   type="text" 
                   [ngModel]="searchTerm()" 
                   (ngModelChange)="searchTerm.set($event); currentPage.set(1)"
                   placeholder="Buscar por nombre o correo..."
                 >
               </div>
             </div>
          </div>

          <div class="table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th (click)="sort('full_name')">Nombre {{ getSortIcon('full_name') }}</th>
                  <th (click)="sort('email')">Usuario {{ getSortIcon('email') }}</th>
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
                      <small *ngIf="user.depto_id" style="color:#94a3b8; display:block; font-size:0.75rem;">{{ user.depto_id }}</small>
                    </div>
                  </td>
                  <td style="font-family:monospace; font-size:0.88rem;">{{ user.email }}</td>
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
                   <td colspan="6" class="text-center py-8 text-gray">No se encontraron usuarios</td>
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
                <button class="pag-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
                <ng-container *ngFor="let p of pageListUsers()">
                  <span *ngIf="p === -1" class="pag-ellipsis">…</span>
                  <button *ngIf="p !== -1" class="page-num-btn" [class.active]="currentPage() === p" (click)="setPage(p)">{{ p }}</button>
                </ng-container>
                <button class="pag-btn" [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: HISTORIAL DE CARGAS -->
      <div *ngIf="activeTab() === 'logs'">
        <div class="table-container">
          <div class="table-header" style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-weight:800; color:#334155;">Historial de Cargas Masivas</span>
            <button class="export-btn secondary" style="padding:0.6rem 1rem; font-size:0.85rem;" (click)="loadUploadLogs()">🔄 Actualizar</button>
          </div>
          <div class="table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha y Hora</th>
                  <th>Proyecto</th>
                  <th class="text-right">Total Filas</th>
                  <th class="text-right">✅ Creados</th>
                  <th class="text-right">❌ Errores</th>
                  <th class="text-right">Archivo</th>
                  <th class="text-right">Reporte</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of uploadLogs()">
                  <td class="text-gray" style="font-size:0.8rem;">#{{ log.id }}</td>
                  <td>{{ formatLogDate(log.uploaded_at) }}</td>
                  <td>
                    <span class="project-tag">{{ log.project_name }}</span>
                  </td>
                  <td class="text-right font-bold">{{ log.total_rows }}</td>
                  <td class="text-right" style="color:#16a34a; font-weight:800;">{{ log.success_count }}</td>
                  <td class="text-right" style="color:#dc2626; font-weight:800;">{{ log.error_count }}</td>
                  <td class="text-right">
                    <button *ngIf="log.original_file" class="action-btn" style="background:#f0fdf4; color:#16a34a;" (click)="downloadOriginalFile(log.id)" title="Descargar archivo original subido">
                      📄 Original
                    </button>
                    <span *ngIf="!log.original_file" style="font-size:0.75rem; color:#94a3b8;">—</span>
                  </td>
                  <td class="text-right">
                    <button class="action-btn edit" style="background:#eff6ff; color:#2563eb;" (click)="downloadLogReport(log.id, log.project_name)">
                      ⬇️ Reporte
                    </button>
                  </td>
                </tr>
                <tr *ngIf="uploadLogs().length === 0">
                   <td colspan="8" class="text-center py-8 text-gray">No hay cargas registradas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    <!-- BULK UPLOAD MODAL -->
    <div class="admin-modal-overlay" *ngIf="showBulkModal()" (click)="closeBulkModal()">
      <div class="admin-modal xlarge animate__animated animate__zoomIn bulk-modal" (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <div style="display:flex; align-items:center; gap:0.8rem;">
            <span style="font-size:1.5rem;">📤</span>
            <div>
              <h3 style="margin:0;">Carga Masiva de Usuarios</h3>
              <p style="margin:0; font-size:0.8rem; color:#64748b;">Sube un CSV o XLSX con la lista de usuarios</p>
            </div>
          </div>
          <button class="admin-close-btn" (click)="closeBulkModal()">✕</button>
        </div>
        
        <div class="admin-modal-body bulk-body">

          <!-- STEP 1: Config -->
          <div class="bulk-step" *ngIf="bulkStep() === 1">
            <div class="step-indicator">
              <div class="step active"><span>1</span><label>Configurar</label></div>
              <div class="step-line"></div>
              <div class="step"><span>2</span><label>Previsualizar</label></div>
              <div class="step-line"></div>
              <div class="step"><span>3</span><label>Resultado</label></div>
            </div>

            <div class="admin-form-group" style="margin-top:1.5rem;">
              <label style="font-weight:800; font-size:0.95rem;">1. Proyecto a asignar <span style="color:#ef4444;">*</span></label>
              <select [(ngModel)]="bulkIdProyecto" class="admin-input">
                <option [ngValue]="null" disabled>-- Selecciona un proyecto --</option>
                <option *ngFor="let p of projects()" [ngValue]="p.idProyecto">{{ p.Proyecto }}</option>
              </select>
            </div>

            <div class="admin-form-group">
              <label style="font-weight:800; font-size:0.95rem;">2. Archivo CSV o XLSX</label>
              <div class="drop-zone" 
                   [class.drag-over]="isDragging"
                   (dragover)="$event.preventDefault(); isDragging=true"
                   (dragleave)="isDragging=false"
                   (drop)="onFileDrop($event)"
                   (click)="fileInput.click()">
                <input #fileInput type="file" accept=".csv,.xlsx,.xls" style="display:none" (change)="onFileSelected($event)">
                <div *ngIf="!bulkFile" style="text-align:center;">
                  <div style="font-size:3rem; margin-bottom:0.5rem;">📄</div>
                  <p style="font-weight:700; color:#334155; margin:0;">Arrastra tu archivo aquí</p>
                  <p style="font-size:0.85rem; color:#64748b; margin:0.3rem 0 0;">o haz clic para seleccionar</p>
                  <p style="font-size:0.75rem; color:#94a3b8; margin:0.5rem 0 0;">Formatos soportados: CSV, XLSX, XLS</p>
                </div>
                <div *ngIf="bulkFile" style="text-align:center;">
                  <div style="font-size:2.5rem; margin-bottom:0.5rem;">✅</div>
                  <p style="font-weight:800; color:#16a34a; margin:0;">{{ bulkFile.name }}</p>
                  <p style="font-size:0.8rem; color:#64748b; margin:0.3rem 0 0;">{{ bulkRows().length }} filas detectadas</p>
                </div>
              </div>
            </div>

            <div class="format-hint">
              <strong>📋 Columnas del archivo XLSX:</strong>
              <div class="format-table">
                <span class="col-tag">ID</span>
                <span class="col-tag">Descripcion_Depto</span>
                <span class="col-tag">Depto_ID</span>
                <span class="col-tag col-tag-points">$$</span>
                <span class="col-tag col-tag-ignore">ESTATUS ✗</span>
              </div>
              <p style="font-size:0.78rem; color:#64748b; margin:0.5rem 0 0;">Hoja: <strong>ASOCIADOS GANADORES</strong>. El campo <code>ESTATUS</code> es ignorado. Las contraseñas se generan automáticamente.</p>
            </div>
          </div>

          <!-- STEP 2: Preview -->
          <div class="bulk-step" *ngIf="bulkStep() === 2">
            <div class="step-indicator">
              <div class="step done"><span>✓</span><label>Configurar</label></div>
              <div class="step-line active"></div>
              <div class="step active"><span>2</span><label>Previsualizar</label></div>
              <div class="step-line"></div>
              <div class="step"><span>3</span><label>Resultado</label></div>
            </div>

            <div class="preview-header">
              <div>
                <h4 style="margin:0; color:#1e293b;">Vista previa — {{ bulkRows().length }} usuarios a procesar</h4>
                <p style="margin:0.2rem 0 0; font-size:0.83rem; color:#64748b;">Proyecto: <strong>{{ getProjectName(bulkIdProyecto) }}</strong></p>
              </div>
              <span class="rows-badge">{{ bulkRows().length }} filas</span>
            </div>

            <div class="preview-table-wrapper">
              <table class="admin-table preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario (ID)</th>
                    <th>Nombre</th>
                    <th>Depto ID</th>
                    <th class="text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of bulkRows().slice(0, 50); let i = index">
                    <td style="color:#94a3b8; font-size:0.8rem;">{{ i + 1 }}</td>
                    <td style="font-family:monospace; font-size:0.85rem; font-weight:700;">{{ row.user }}</td>
                    <td>{{ row.full_name }}</td>
                    <td style="font-size:0.8rem; color:#64748b;">{{ row.depto_id || '—' }}</td>
                    <td class="text-right font-bold text-blue">{{ row.points | number }}</td>
                  </tr>
                  <tr *ngIf="bulkRows().length > 50">
                    <td colspan="5" class="text-center" style="color:#64748b; font-style:italic; font-size:0.85rem;">
                      ... y {{ bulkRows().length - 50 }} filas más
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- STEP 3: Result -->
          <div class="bulk-step" *ngIf="bulkStep() === 3">
            <div class="step-indicator">
              <div class="step done"><span>✓</span><label>Configurar</label></div>
              <div class="step-line active"></div>
              <div class="step done"><span>✓</span><label>Previsualizar</label></div>
              <div class="step-line active"></div>
              <div class="step active"><span>3</span><label>Resultado</label></div>
            </div>

            <div class="result-summary" *ngIf="bulkResult()">
              <div class="result-card success">
                <div class="result-number">{{ bulkResult().success_count }}</div>
                <div class="result-label">✅ Usuarios Creados</div>
              </div>
              <div class="result-card error" *ngIf="bulkResult().error_count > 0">
                <div class="result-number">{{ bulkResult().error_count }}</div>
                <div class="result-label">❌ Con Errores</div>
              </div>
              <div class="result-card project">
                <div class="result-number" style="font-size:1rem;">{{ bulkResult().project_name }}</div>
                <div class="result-label">📁 Proyecto</div>
              </div>
            </div>

            <div class="download-section">
              <div class="download-card" (click)="downloadBulkReport()">
                <span style="font-size:2rem;">⬇️</span>
                <div>
                  <strong>Descargar Reporte con Contraseñas</strong>
                  <p style="margin:0; font-size:0.8rem; color:#64748b;">CSV con usuario, nombre, depto ID, puntos y contraseña generada</p>
                </div>
              </div>
            </div>

            <div *ngIf="bulkResult()?.error_count > 0" class="error-details">
              <strong style="color:#dc2626;">Registros con error:</strong>
              <div class="error-list">
                <div *ngFor="let u of getErrorUsers()" class="error-row">
                  <span>{{ u.full_name }} ({{ u.email }})</span>
                  <span class="error-msg">{{ u.message }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="admin-modal-footer" style="justify-content:space-between;">
          <button class="btn-admin btn-admin-secondary" (click)="closeBulkModal()">Cerrar</button>
          <div style="display:flex; gap:0.8rem;">
            <button *ngIf="bulkStep() === 2" class="btn-admin btn-admin-secondary" (click)="bulkStep.set(1)">
              ← Volver
            </button>
            <button *ngIf="bulkStep() === 1" class="btn-admin btn-admin-primary" 
                    [disabled]="!bulkFile || !bulkIdProyecto || bulkRows().length === 0"
                    (click)="bulkStep.set(2)">
              Vista Previa →
            </button>
            <button *ngIf="bulkStep() === 2" class="btn-admin btn-admin-primary"
                    [disabled]="uploading()"
                    (click)="processBulkUpload()">
              {{ uploading() ? '⏳ Procesando...' : '🚀 Procesar Carga' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- INDIVIDUAL USER MODAL -->
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
            <label>Usuario</label>
            <input type="text" [(ngModel)]="userData.email" name="email" class="admin-input" placeholder="Ej: 10125" required>
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

    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; gap: 1.5rem; flex-wrap: wrap; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }

    .actions { display: flex; gap: 0.8rem; }
    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn.secondary { background: #666; }
    .export-btn.add-btn { background: var(--admin-primary); }
    .export-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

    /* TABS */
    .tabs-bar { display: flex; gap: 0; background: white; border-radius: 0.8rem; padding: 0.4rem; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; width: fit-content; }
    .tab-btn { padding: 0.65rem 1.5rem; border: none; border-radius: 0.6rem; background: transparent; color: #64748b; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
    .tab-btn.active { background: var(--admin-primary); color: white; box-shadow: 0 4px 10px rgba(0,51,102,0.3); }
    .tab-badge { background: rgba(255,255,255,0.3); color: white; border-radius: 1rem; padding: 0.1rem 0.5rem; font-size: 0.75rem; font-weight: 900; }
    .tab-btn:not(.active) .tab-badge { background: #e0f2fe; color: #0369a1; }

    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; align-items: center; }
    .filters-row { display: flex; gap: 1.2rem; align-items: center; justify-content: flex-end; width: 100%; flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-label { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-select { background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; font-weight: 700; color: #334155; min-width: 220px; transition: border-color 0.2s; }
    .filter-select:focus { border-color: var(--admin-primary); }
    .search-box { width: 320px; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }

    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; cursor: pointer; }
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
    .pag-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.4rem 0.75rem; border-radius: 0.4rem; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.15s; min-width: 36px; }
    .pag-btn:hover:not([disabled]) { background: #f3f4f6; }
    .pag-btn[disabled] { opacity: 0.4; cursor: default; }
    .page-num-btn { width: 34px; height: 34px; border-radius: 0.4rem; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.15s; }
    .page-num-btn:hover:not(.active) { background: #f3f4f6; border-color: #9ca3af; }
    .page-num-btn.active { background: var(--admin-primary); color: white; border-color: var(--admin-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .pag-ellipsis { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; color: #9ca3af; font-weight: 700; letter-spacing: 1px; }
    .pagination-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

    @media (max-width: 900px) {
      .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .actions { width: 100%; flex-wrap: wrap; }
      .actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; }
      .admin-table { min-width: 1000px; }
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }

    /* BULK MODAL */
    .bulk-modal { max-height: 90vh; display: flex; flex-direction: column; }
    .bulk-body { overflow-y: auto; flex: 1; padding: 2rem; }

    /* Step Indicator */
    .step-indicator { display: flex; align-items: center; margin-bottom: 2rem; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
    .step span { width: 36px; height: 36px; border-radius: 50%; background: #e2e8f0; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; transition: 0.3s; }
    .step label { font-size: 0.72rem; color: #94a3b8; font-weight: 700; white-space: nowrap; }
    .step.active span { background: var(--admin-primary); color: white; box-shadow: 0 4px 12px rgba(0,51,102,0.35); }
    .step.done span { background: #10b981; color: white; }
    .step.active label, .step.done label { color: var(--admin-primary); font-weight: 900; }
    .step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 0.5rem; margin-bottom: 1.2rem; transition: 0.3s; }
    .step-line.active { background: #10b981; }

    /* Drop Zone */
    .drop-zone { border: 2.5px dashed #cbd5e1; border-radius: 1rem; padding: 2.5rem; cursor: pointer; transition: 0.3s; background: #f8fafc; }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--admin-primary); background: #eff6ff; transform: scale(1.01); }

    /* Format hint */
    .format-hint { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.8rem; padding: 1rem 1.2rem; }
    .format-hint strong { color: #15803d; font-size: 0.85rem; }
    .format-table { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .col-tag { background: white; border: 1.5px solid #86efac; color: #15803d; padding: 0.3rem 0.8rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 800; font-family: 'Courier New', monospace; }
    .col-tag-points { border-color: #93c5fd; color: #1d4ed8; background: #eff6ff; }
    .col-tag-ignore { border-color: #fca5a5; color: #dc2626; background: #fef2f2; text-decoration: line-through; opacity: 0.8; }

    /* Preview */
    .preview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding: 1rem 1.2rem; background: #f8fafc; border-radius: 0.8rem; border: 1px solid #e2e8f0; }
    .rows-badge { background: var(--admin-primary); color: white; padding: 0.4rem 1rem; border-radius: 2rem; font-weight: 900; font-size: 0.85rem; white-space: nowrap; }
    .preview-table-wrapper { max-height: 350px; overflow-y: auto; border-radius: 0.8rem; border: 1px solid #e2e8f0; }
    .preview-table { min-width: 600px; }
    .preview-table th { position: sticky; top: 0; z-index: 1; }

    /* Result */
    .result-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .result-card { background: white; border-radius: 1rem; padding: 1.5rem; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .result-card.success { border-color: #86efac; background: #f0fdf4; }
    .result-card.error { border-color: #fca5a5; background: #fef2f2; }
    .result-card.project { border-color: #bae6fd; background: #f0f9ff; }
    .result-number { font-size: 2.5rem; font-weight: 900; color: var(--admin-primary); line-height: 1; }
    .result-card.success .result-number { color: #16a34a; }
    .result-card.error .result-number { color: #dc2626; }
    .result-label { font-size: 0.8rem; font-weight: 700; color: #64748b; margin-top: 0.5rem; }
    .download-section { margin: 1.5rem 0; }
    .download-card { display: flex; align-items: center; gap: 1.2rem; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 1.2rem 1.8rem; border-radius: 1rem; cursor: pointer; transition: 0.3s; }
    .download-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(79,70,229,0.35); }
    .download-card strong { font-size: 1rem; }
    .error-details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.8rem; padding: 1rem 1.2rem; }
    .error-list { max-height: 150px; overflow-y: auto; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .error-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px dashed #fca5a5; font-size: 0.83rem; }
    .error-msg { background: #fee2e2; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }

    /* Individual user modal */
    .exclusive-codes-section { margin-top: 1.5rem; }
    .section-header label { display: block; margin-bottom: 1rem; color: var(--admin-primary); font-size: 0.9rem; }
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

    .text-center { text-align: center; } .text-right { text-align: right; }
    .text-blue { color: #2563eb; } .text-gray { color: #94a3b8; }
    .font-bold { font-weight: 800; } .py-8 { padding: 2rem 0; }
    .admin-form-group { margin-bottom: 1.2rem; }
    .admin-form-group label { display: block; font-size: 0.82rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<any[]>([]);
  selectedUser = signal<any>(null);
  showUserModal = signal(false);
  editingUser = signal<any>(null);
  projects = signal<any[]>([]);
  uploadLogs = signal<any[]>([]);
  activeTab = signal<'users' | 'logs'>('users');
  selectedProject = signal<string>('');

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

  // Bulk upload state
  showBulkModal = signal(false);
  bulkStep = signal(1);
  bulkFile: File | null = null;
  bulkRows = signal<any[]>([]);
  bulkIdProyecto: number | null = null;
  bulkResult = signal<any>(null);
  uploading = signal(false);
  isDragging = false;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private loader = inject(LoaderService);
  public layoutService = inject(AdminLayoutService);

  ngOnInit() {
    this.loadUsers();
    this.loadProjects();
  }

  loadUsers() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res: any) => { this.users.set(res); this.loader.hide(); },
      error: (e: any) => { console.error(e); this.loader.hide(); }
    });
  }

  loadProjects() {
    this.http.get(`${environment.apiUrl}/admin/projects`).subscribe({
      next: (res: any) => this.projects.set(res),
      error: (e: any) => console.error(e)
    });
  }

  loadUploadLogs() {
    this.loader.show();
    this.http.get<any[]>(`${environment.apiUrl}/admin/users/upload-logs`).subscribe({
      next: (res) => { this.uploadLogs.set(res); this.loader.hide(); },
      error: () => this.loader.hide()
    });
  }

  getProjectName(id: number | null): string {
    return this.projects().find(p => p.idProyecto == id)?.Proyecto || 'Sin proyecto';
  }

  formatLogDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ─── BULK UPLOAD ───────────────────────────────────────────
  openBulkModal() {
    this.bulkStep.set(1);
    this.bulkFile = null;
    this.bulkRows.set([]);
    this.bulkIdProyecto = null;
    this.bulkResult.set(null);
    this.uploading.set(false);
    this.showBulkModal.set(true);
  }

  closeBulkModal() {
    this.showBulkModal.set(false);
    if (this.bulkResult()) this.loadUsers();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    this.bulkFile = file;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const rows = this.parseCSV(e.target.result);
        this.bulkRows.set(rows);
      };
      reader.readAsText(file, 'UTF-8');
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        // Use 'ASOCIADOS GANADORES' sheet if exists, otherwise first sheet
        const sheetName = wb.SheetNames.includes('ASOCIADOS GANADORES')
          ? 'ASOCIADOS GANADORES'
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const rows = json.map((row: any) => ({
          // New Luxottica format: ID, Descripcion_Depto, Depto_ID, $$
          // Legacy format: email/full_name/points
          user:      (row['ID'] || row['user'] || row['email'] || row['Email'] || '').toString().trim(),
          full_name: (row['Descripcion_Depto'] || row['nombre'] || row['full_name'] || row['Nombre'] || '').toString().trim(),
          depto_id:  (row['Depto_ID'] || row['depto_id'] || '').toString().trim(),
          points:    parseInt((row['$$'] || row['puntos'] || row['points'] || row['Puntos'] || '0').toString(), 10) || 0
        })).filter((r: any) => r.user);
        this.bulkRows.set(rows);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  parseCSV(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    const nameIdx   = headers.findIndex(h => h.includes('descripcion_depto') || h.includes('nombre') || h.includes('name') || h.includes('full'));
    const userIdx   = headers.findIndex(h => h === 'id' || h.includes('user') || h.includes('email') || h.includes('correo'));
    const deptoIdx  = headers.findIndex(h => h === 'depto_id' || h.includes('depto'));
    const pointsIdx = headers.findIndex(h => h === '$$' || h.includes('punto') || h.includes('point'));

    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/["']/g, ''));
      return {
        user:     (cols[userIdx >= 0 ? userIdx : 0] || '').trim(),
        full_name: cols[nameIdx >= 0 ? nameIdx : 1] || '',
        depto_id:  deptoIdx >= 0 ? (cols[deptoIdx] || '') : '',
        points:   parseInt(cols[pointsIdx >= 0 ? pointsIdx : 2] || '0', 10) || 0
      };
    }).filter(r => r.user);
  }

  processBulkUpload() {
    if (!this.bulkIdProyecto || this.bulkRows().length === 0) return;
    this.uploading.set(true);
    this.loader.show();

    // Send as multipart/form-data so the backend can save the original file
    const formData = new FormData();
    formData.append('id_proyecto', String(this.bulkIdProyecto));
    formData.append('users', JSON.stringify(this.bulkRows()));
    if (this.bulkFile) {
      formData.append('file', this.bulkFile, this.bulkFile.name);
    }

    this.http.post(`${environment.apiUrl}/admin/users/bulk-upload`, formData).subscribe({
      next: (res: any) => {
        this.bulkResult.set(res);
        this.bulkStep.set(3);
        this.uploading.set(false);
        this.loader.hide();
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Error al procesar la carga', 'error');
        this.uploading.set(false);
        this.loader.hide();
      }
    });
  }

  getErrorUsers(): any[] {
    return (this.bulkResult()?.users || []).filter((u: any) => u.status === 'error');
  }

  downloadBulkReport() {
    const users = this.bulkResult()?.users || [];
    this.generateAndDownloadCSV(users, `reporte_usuarios_${Date.now()}.csv`);
  }

  downloadLogReport(logId: number, projectName: string) {
    this.loader.show();
    this.http.get<any>(`${environment.apiUrl}/admin/users/upload-logs/${logId}`).subscribe({
      next: (log) => {
        this.generateAndDownloadCSV(log.log_data, `reporte_usuarios_${projectName}_${logId}.csv`);
        this.loader.hide();
      },
      error: () => {
        this.toast.show('Error al descargar el reporte', 'error');
        this.loader.hide();
      }
    });
  }

  downloadOriginalFile(logId: number) {
    // Redirect to backend endpoint which streams the file as download
    const token = localStorage.getItem('admin_token') || '';
    const url = `${environment.apiUrl}/admin/users/upload-logs/${logId}/original-file`;
    // Use fetch with auth header to trigger browser download
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(async res => {
        if (!res.ok) {
          this.toast.show('Archivo original no disponible en el servidor', 'error');
          return;
        }
        const cd = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `archivo_carga_${logId}`;
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(() => this.toast.show('Error al descargar el archivo original', 'error'));
  }

  generateAndDownloadCSV(users: any[], filename: string) {
    const headers = ['Nombre', 'Email', 'Puntos', 'Contraseña', 'Estado', 'Mensaje'];
    const rows = users.map((u: any) => [
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      u.email,
      u.points,
      u.password || '',
      u.status === 'success' ? 'Creado' : 'Error',
      `"${(u.message || '').replace(/"/g, '""')}"`
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── INDIVIDUAL USER ────────────────────────────────────────
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
        full_name: '', email: '', password: '', points: 0, 
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
        this.toast.show(this.editingUser() ? 'USUARIO ACTUALIZADO' : 'USUARIO CREADO', 'success');
        this.loadUsers();
        this.closeUserModal();
        this.loader.hide();
      },
      error: () => { this.toast.show('ERROR AL GUARDAR', 'error'); this.loader.hide(); }
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
      block: isBlocking, reason: this.blockReason
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.selectedUser.set(null);
        this.toast.show(isBlocking ? 'USUARIO BLOQUEADO' : 'USUARIO DESBLOQUEADO', 'success');
        this.loader.hide();
      },
      error: () => { this.toast.show('ERROR AL ACTUALIZAR', 'error'); this.loader.hide(); }
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
    const projId = this.selectedProject();
    let data = this.users().filter((u: any) => {
      const matchesSearch = u.full_name?.toLowerCase().includes(term) ||
                            u.email?.toLowerCase().includes(term);
      const matchesProject = !projId || u.id_proyecto == projId;
      return matchesSearch && matchesProject;
    });
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (col) {
      data = [...data].sort((a, b) => {
        let valA = a[col]; let valB = b[col];
        if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB ? valB.toLowerCase() : ''; }
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  });

  pageListUsers = computed(() => this.smartPages(this.currentPage(), this.totalPages()));

  /** Generates smart page list with ellipsis: [1, -1, 5, 6, 7, 8, 9, -1, 75] where -1 = ellipsis */
  smartPages(current: number, total: number): number[] {
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    const addPage = (p: number) => { if (!pages.includes(p) && p >= 1 && p <= total) pages.push(p); };
    const addEllipsis = () => { if (pages[pages.length - 1] !== -1) pages.push(-1); };
    addPage(1);
    if (current > 4) addEllipsis();
    for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) addPage(p);
    if (current < total - 3) addEllipsis();
    addPage(total);
    return pages;
  }

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
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'usuarios_luxottica.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
