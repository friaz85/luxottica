import { Component, inject, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AdminLayoutService } from '../services/admin-layout.service';
import { ToastService } from '../services/toast.service';
import { LoaderService } from '../services/loader.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

interface CodeArea {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isPercent?: boolean;
}

@Component({
  selector: 'app-admin-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  template: `
    <app-admin-navbar></app-admin-navbar>
    <div class="admin-page" [class.sidebar-closed]="!layoutService.isSidebarOpen()">
      <div class="header-row">
        <div class="title-section">
           <h2 class="title">GESTIÓN DE RECOMPENSAS</h2>
           <p class="subtitle">Agrega y edita los premios para los usuarios</p>
        </div>
        <div class="header-actions">
          <button class="export-btn secondary" (click)="exportToCSV()">
            <span class="icon">📥</span> <span class="btn-text">Exportar CSV</span>
          </button>
          <button class="export-btn create-reward-btn" (click)="openCreateModal()">
            <span class="icon" style="filter: brightness(0) invert(1);">➕</span> <span class="btn-text">Nueva Recompensa</span>
          </button>
        </div>
      </div>

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
                 placeholder="Buscar recompensa..."
               >
             </div>
           </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Proyecto</th>
                <th>Puntos</th>
                <th>Stock</th>
                <th>Tipo</th>
                <th>Vigencia</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let reward of paginatedRewards()">
                <td>
                  <img [src]="reward.image_url ? environment.uploadsUrl + '/rewards/' + reward.image_url : 'assets/img/Logo_Tec.png'" 
                       (error)="handleImageError($event, reward.image_url)"
                       class="reward-thumb" alt="Premio">
                </td>
                <td>
                  <div class="reward-info-cell">
                    <span class="font-bold reward-title-text">{{ reward.title }}</span>
                  </div>
                </td>
                <td>
                  <div class="project-tag-container">
                    <span class="project-tag" *ngIf="reward.id_proyecto">{{ getProjectName(reward.id_proyecto) }}</span>
                    <span class="project-tag global" *ngIf="!reward.id_proyecto">Global</span>
                  </div>
                </td>
                <td class="font-bold text-blue">{{ (reward.cost || 0) | number }} pts</td>
                <td>
                   <span class="stock-badge" [class.low]="reward.stock <= 5">{{ reward.stock }}</span>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="{
                    'monedero': reward.tipo_recompensa === 'monedero',
                    'tiempo-aire': reward.tipo_recompensa === 'tiempo_aire'
                  }">
                    {{ reward.tipo_recompensa === 'monedero' ? '💳 Monedero' :
                       reward.tipo_recompensa === 'tiempo_aire' ? '📱 Tiempo Aire' : '🎁 Normal' }}
                  </span>
               </td>
                <td>
                   <div *ngIf="reward.vigencias && reward.vigencias.length > 0; else noVigencia" style="font-size: 0.8rem; line-height: 1.3; display: flex; flex-direction: column; gap: 0.25rem;">
                      <div *ngFor="let v of reward.vigencias" class="status-pill future" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                         {{ formatShortDate(v.fecha_inicio) }} al {{ formatShortDate(v.fecha_fin) }}
                      </div>
                   </div>
                   <ng-template #noVigencia>
                      <span class="project-tag global">Sin límite</span>
                   </ng-template>
                </td>
                <td class="text-right">
                  <div class="btn-group">
                    <button class="action-btn duplicate" (click)="duplicateReward(reward)" title="Duplicar">Copiar</button>
                    <button class="action-btn edit" (click)="editReward(reward)">Editar</button>
                    <button class="action-btn delete" (click)="deleteReward(reward.id)">Eliminar</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRewards().length === 0">
                 <td colspan="8" class="text-center py-8 text-gray">No se encontraron recompensas</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer" *ngIf="filteredRewards().length > 0">
          <div class="pagination-inner">
            <span class="page-info">
               Mostrando <b>{{ (currentPage() - 1) * pageSize + 1 }}</b> a <b>{{ Math.min(currentPage() * pageSize, filteredRewards().length) }}</b> de <b>{{ filteredRewards().length }}</b>
            </span>
            <div class="pagination-controls">
              <button class="pag-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">«</button>
              <ng-container *ngFor="let p of pageListRewards()">
                <span *ngIf="p === -1" class="pag-ellipsis">…</span>
                <button *ngIf="p !== -1" class="page-num-btn" [class.active]="currentPage() === p" (click)="setPage(p)">{{ p }}</button>
              </ng-container>
              <button class="pag-btn" [disabled]="currentPage() >= totalPages()" (click)="setPage(currentPage() + 1)">»</button>
            </div>
          </div>
        </div>
      </div>

    <!-- REWARD MODAL -->
    <div class="admin-modal-overlay" *ngIf="showCreateModal" (click)="closeModal($event)">
      <div class="admin-modal xlarge animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <h3>{{ (editingReward && editingReward.id) ? 'Editar' : 'Nueva' }} Recompensa</h3>
          <button class="admin-close-btn" (click)="closeModal($event)">✕</button>
        </div>
        
        <div class="admin-modal-body no-padding">
          <div class="editor-container" *ngIf="editingReward">
            <div class="editor-left">
              <div class="admin-form-group">
                <label>Título de la Recompensa</label>
                <input type="text" [(ngModel)]="editingReward.title" class="admin-input" placeholder="Ej: Audífonos Bluetooth Pro">
              </div>

              <div class="admin-form-group">
                <label>Proyecto Asignado</label>
                <select [(ngModel)]="editingReward.id_proyecto" class="admin-input">
                  <option [ngValue]="null">Todos los proyectos (Global)</option>
                  <option *ngFor="let p of projects()" [ngValue]="p.idProyecto">{{ p.Proyecto }}</option>
                </select>
              </div>

              <div class="admin-form-group">
                <label>Tipo de Recompensa</label>
                <select [(ngModel)]="editingReward.tipo_recompensa" class="admin-input">
                  <option value="normal">🎁 Normal</option>
                  <option value="monedero">💳 Monedero</option>
                  <option value="tiempo_aire">📱 Tiempo Aire</option>
                </select>
              </div>


              <div class="admin-form-group">
                <div class="label-row">
                  <label>Imagen del Producto</label>
                  <img *ngIf="editingReward.image_url && !selectedImage" 
                       [src]="environment.uploadsUrl + '/rewards/' + editingReward.image_url" 
                       class="image-preview-mini" alt="Preview">
                </div>
                <input type="file" (change)="onImageSelected($event)" accept="image/*" class="admin-input">
                <small class="help-text">Formato cuadrado recomendado</small>
              </div>

              <div class="admin-form-group">
                <label>Descripción</label>
                <textarea [(ngModel)]="editingReward.description" class="admin-input" placeholder="Describe la recompensa..." rows="3"></textarea>
              </div>

              <div class="admin-form-group">
                <label>Costo (Puntos)</label>
                <input type="number" [(ngModel)]="editingReward.cost" class="admin-input" placeholder="5000">
              </div>

              <div class="admin-form-group">
                <label>Número de códigos por cupón (1-6)</label>
                <select [(ngModel)]="editingReward.codes_count" class="admin-input">
                  <option [value]="1">1 Código</option>
                  <option [value]="2">2 Códigos</option>
                  <option [value]="3">3 Códigos</option>
                  <option [value]="4">4 Códigos</option>
                  <option [value]="5">5 Códigos</option>
                  <option [value]="6">6 Códigos</option>
                </select>
              </div>

              <div class="digital-section">
                <div class="section-header"><h4>⚙️ Configuración Digital</h4></div>
                <div class="admin-form-group">
                  <label>Plantilla PDF</label>
                  <input type="file" (change)="onPDFSelected($event)" accept=".pdf" class="admin-input">
                  <small class="help-text" *ngIf="editingReward.pdf_template && !selectedPDF">Archivo actual: {{editingReward.pdf_template}}</small>
                </div>
                <div class="code-areas-manager" *ngIf="pdfLoaded()">
                  <div class="areas-header">
                    <div class="header-titles">
                      <label>📍 Áreas de Código</label>
                      <small>Define donde se imprimirá el código en el PDF</small>
                    </div>
                  </div>
                  <div class="areas-list">
                    <div class="area-item" *ngFor="let area of codeAreas(); let i = index">
                      <div class="area-top-row">
                        <div class="area-label-group">
                          <span class="pin-icon">📍</span>
                          <span class="area-number">Código {{i + 1}}</span>
                        </div>
                        <span class="area-coords">📐 {{Math.round(area.x)}}px, {{Math.round(area.y)}}px</span>
                      </div>
                      <div class="area-bottom-row">
                        <div class="font-control">
                          <label>TAMAÑO FUENTE:</label>
                          <input type="number" [(ngModel)]="area.fontSize" min="8" max="72" class="admin-input font-input">
                        </div>
                        <button class="btn-remove-alt" (click)="removeCodeArea(i)" title="Eliminar">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button class="btn-add-area-bottom" (click)="addCodeArea()">
                    <span class="icon-plus">＋</span> Agregar Nueva Área
                  </button>
                </div>

                <div class="inventory-section">
                  <div class="section-header"><h4>📥 Inventario de Códigos</h4></div>
                  
                  <div class="admin-form-group" style="margin-bottom: 1.5rem; background: #fff; padding: 1rem; border-radius: 0.8rem; border: 1px solid #e2e8f0;">
                    <label style="font-weight: 800; font-size: 0.9rem; color: #1e293b; display: block; margin-bottom: 0.5rem;">¿Aplica vigencia específica para esta carga de códigos?</label>
                    <div style="display: flex; gap: 1.5rem; margin-bottom: 0.8rem;">
                      <label class="checkbox-label" style="font-weight: 600 !important; cursor: pointer;">
                        <input type="radio" name="apply_code_vigencia" [value]="false" [(ngModel)]="editingReward.apply_code_vigencia" (change)="editingReward.upload_vigencia_id = null">
                        <span>No, códigos globales (Sin vigencia)</span>
                      </label>
                      <label class="checkbox-label" style="font-weight: 600 !important; cursor: pointer;">
                        <input type="radio" name="apply_code_vigencia" [value]="true" [(ngModel)]="editingReward.apply_code_vigencia">
                        <span>Sí, asignar a una vigencia</span>
                      </label>
                    </div>

                    <div *ngIf="editingReward.apply_code_vigencia" style="margin-top: 0.8rem;">
                      <label style="font-weight: 700; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.4rem;">Seleccionar Vigencia para los Códigos</label>
                      <select [(ngModel)]="editingReward.upload_vigencia_id" class="admin-input">
                        <option [ngValue]="null" disabled selected>-- Elige una vigencia --</option>
                        <option *ngFor="let v of vigencias()" [ngValue]="v.id">
                          Vigencia #{{ v.id }} ({{ formatShortDate(v.fecha_inicio) }} a {{ formatShortDate(v.fecha_fin) }})
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="load-type-selector">
                    <button [class.active]="loadMethod() === 'manual'" (click)="loadMethod.set('manual')">⌨️ Carga Manual</button>
                    <button [class.active]="loadMethod() === 'csv'" (click)="loadMethod.set('csv')">📄 Carga CSV</button>
                  </div>

                  <div class="method-container" *ngIf="loadMethod() === 'manual'">
                    <div class="admin-form-group">
                      <label>Códigos de Salida (Max 8 por entrega)</label>
                      <textarea [(ngModel)]="editingReward.exit_codes" 
                                class="admin-input" rows="4" 
                                placeholder="COD1, COD2, COD3... (Mismo registro / entrega)&#10;NUEVO_COD (Nueva línea = Nueva entrega)"></textarea>
                      <small class="help-text">Usa comas para agrupar códigos. Salto de línea para entregas separadas.</small>
                    </div>
                  </div>

                  <div class="method-container" *ngIf="loadMethod() === 'csv'">
                    <div class="admin-form-group" *ngIf="editingReward.id">
                      <label>Archivo CSV ({{editingReward.codes_count}} columnas)</label>
                      <input type="file" (change)="onCodesCSVSelected($event)" accept=".csv" class="admin-input">
                      <small class="help-text">Cada fila del CSV representa un cupón con {{editingReward.codes_count}} código(s).</small>
                    </div>
                    <div *ngIf="!editingReward.id" class="alert-info">
                       Guarda primero la recompensa para poder subir archivos CSV.
                    </div>
                  </div>
                </div>
              </div>

              <div class="admin-form-group">
                <label>Estado de la Recompensa</label>
                <div class="status-toggle-container">
                  <button type="button" class="status-btn"
                    [ngStyle]="editingReward.active == 1 ? {'background':'#10b981','color':'white','box-shadow':'0 10px 15px -3px rgba(16,185,129,0.4)','transform':'scale(1.02)'} : {}"
                    (click)="editingReward.active = 1">
                    <span class="status-icon">✓</span> ACTIVO
                  </button>
                  <button type="button" class="status-btn"
                    [ngStyle]="editingReward.active == 0 ? {'background':'#ef4444','color':'white','box-shadow':'0 10px 15px -3px rgba(239,68,68,0.4)','transform':'scale(1.02)'} : {}"
                    (click)="editingReward.active = 0">
                    <span class="status-icon">✕</span> INACTIVO
                  </button>
                </div>
              </div>
            </div>

            <div class="editor-right">
              <div class="preview-container">
                <h4>Vista Previa PDF</h4>
                <div class="pdf-preview-wrapper" #pdfPreviewWrapper>
                  <div class="pdf-canvas-container" #pdfContainer>
                    <canvas #pdfCanvas [style.display]="pdfLoaded() ? 'block' : 'none'"></canvas>
                    <div *ngFor="let area of codeAreas(); let i = index" class="code-area-box"
                      [style.left.px]="area.x" [style.top.px]="area.y" [style.width.px]="area.width" [style.height.px]="area.height"
                      (mousedown)="startDrag($event, i)">
                      <div class="demo-text" [style.font-size.pt]="area.fontSize">Código {{i + 1}}</div>
                      <div class="resize-handle" (mousedown)="startResize($event, i)"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-secondary" (click)="closeModal($event)">Cancelar</button>
          <button class="btn-admin btn-admin-primary" (click)="saveReward()" [disabled]="saving()">
             {{ saving() ? '💾 Guardando...' : '💾 Guardar Recompensa' }}
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
    .title-section { flex: 1; min-width: 300px; }
    .title { font-weight: 900; font-size: 2rem; color: var(--admin-primary); margin: 0; }
    .subtitle { color: #666; margin: 0.5rem 0 0 0; }
    
    .header-actions { display: flex; gap: 1rem; flex-shrink: 0; }
    .export-btn { background: var(--admin-primary); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 0.6rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; transition: 0.3s; }
    .export-btn.secondary { background: #666; }
    .export-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
    
    .table-container { background: white; border: 1px solid #ddd; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; }
    .table-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; align-items: center; }
    .filters-row { display: flex; gap: 1.2rem; align-items: center; justify-content: flex-end; width: 100%; flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-label { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-select { background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; font-weight: 700; color: #334155; min-width: 220px; transition: border-color 0.2s; }
    .filter-select:focus { border-color: var(--admin-primary); }
    .search-box { width: 320px; } .search-box input { width: 100%; background: #f9f9f9; border: 1px solid #ddd; padding: 0.8rem 1.2rem; border-radius: 0.5rem; outline: none; }
    
    .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .admin-table th { background: #f8f9fa; color: var(--admin-primary); padding: 1.2rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #eee; }
    .admin-table td { padding: 1.2rem; border-bottom: 1px solid #eee; font-size: 0.95rem; vertical-align: middle; }
    .admin-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .admin-table tbody tr:hover { background-color: #f1f5f9; }

    .reward-thumb { width: 48px; height: 48px; border-radius: 0.5rem; object-fit: cover; border: 1px solid #eee; }
    .stock-badge { background: #10b981; color: white; padding: 0.35rem 0.75rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; width: fit-content; }
    .stock-badge.low { background: #ef4444; }
    .type-badge { background: #f3f4f6; color: #374151; padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; width: fit-content; }
    .type-badge.monedero { background: #fef3c7; color: #92400e; }
    .type-badge.tiempo-aire { background: #dbeafe; color: #1e40af; }
    .project-tag { background: #e0f2fe; color: #0369a1; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; white-space: nowrap; width: fit-content; }
    .project-tag.global { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.6rem; border: none; cursor: pointer; font-weight: 800; font-size: 0.8rem; transition: 0.2s; white-space: nowrap; }
    .action-btn.duplicate { background: #eff6ff; color: #2563eb; }
    .action-btn.edit { background: #f3f4f6; color: #4b5563; }
    .action-btn.delete { background: #fef2f2; color: #dc2626; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

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

    .mobile-only-info { display: none; margin-top: 0.3rem; font-size: 0.8rem; color: #666; font-weight: 700; }

    /* RESPONSIVE OVERRIDES */
    @media (max-width: 900px) { .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; }
      .header-actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; } .search-box { width: 100% !important; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }

    @media (max-width: 600px) {
      .title { font-size: 1.5rem; }
      .reward-thumb { width: 40px; height: 40px; }
      .reward-title-text { font-size: 0.9rem; }
    }

    @media (max-width: 900px) { .search-box { width: 100% !important; }
      .admin-page { margin-left: 0; padding: 5.5rem 1rem 2rem 1rem; }
      .header-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; }
      .header-actions button { flex: 1; justify-content: center; font-size: 0.85rem; padding: 0.7rem; } .search-box { width: 100% !important; }
      .admin-table { min-width: 1000px; } /* Force scroll */
      .pagination-inner { flex-direction: column; text-align: center; }
      .pagination-controls { justify-content: center; width: 100%; }
    }

    .no-padding { padding: 0 !important; }
    .editor-container { display: grid; grid-template-columns: 450px minmax(0, 1fr); gap: 2.5rem; padding: 2.5rem; overflow-y: auto; flex: 1; background: #fff; }
    @media (max-width: 1200px) {
      .editor-container { grid-template-columns: 1fr; padding: 1.5rem; }
      .editor-right { order: -1; } /* PDF Preview first on mobile editor */
    }

    .label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem; }
    .image-preview-mini { width: 45px; height: 45px; border-radius: 0.5rem; object-fit: cover; border: 2px solid var(--admin-primary); }
    .admin-input[type="number"] { text-align: right; }
    .load-type-selector { display: flex; background: #f3f4f6; padding: 0.4rem; border-radius: 0.8rem; margin-bottom: 1.5rem; gap: 0.4rem; }
    .load-type-selector button { flex: 1; padding: 0.6rem; border: none; border-radius: 0.6rem; background: transparent; color: #4b5563; font-weight: 800; cursor: pointer; }
    .load-type-selector button.active { background: #fff; color: var(--admin-primary); }

    .pdf-preview-wrapper { background: #d1d5db; border-radius: 1rem; padding: 1rem; overflow: auto; max-height: 100vh; position: relative; }
    .pdf-canvas-container { position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3); background: white; margin: 0 auto; display: inline-block; }
    .code-area-box { position: absolute; border: 2px solid var(--admin-primary); background: rgba(0, 51, 102, 0.15); cursor: move; }
    .demo-text { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--admin-primary); }

    /* STATUS TOGGLE STYLES - ULTRA CLEAR */
    .status-toggle-container { display: flex; background: #f1f5f9; padding: 0.5rem; border-radius: 1.2rem; gap: 0.5rem; margin-top: 0.5rem; border: 1px solid #e2e8f0; }
    .status-btn { flex: 1; border: none; padding: 1rem; border-radius: 0.8rem; background: transparent; color: #64748b; font-weight: 900; cursor: pointer; font-size: 0.9rem; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.8rem; letter-spacing: 1px; }
    .status-icon { font-size: 1.2rem; }
    
    .status-btn.activo-btn.active { background: #10b981 !important; color: white !important; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4); transform: scale(1.02); }
    .status-btn.inactivo-btn.active { background: #ef4444 !important; color: white !important; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4); transform: scale(1.02); }

    /* CODE AREAS MANAGER STYLES */
    .code-areas-manager { margin-top: 1.5rem; background: #f8fafc; padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .areas-header { margin-bottom: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
    .header-titles label { display: block; color: var(--admin-primary); font-size: 1.3rem; font-weight: 900; margin-bottom: 0.3rem; }
    .header-titles small { color: #64748b; font-size: 0.9rem; }
    
    .btn-add-area-bottom { width: 100%; margin-top: 1.5rem; background: var(--admin-primary); color: white; border: none; padding: 1.2rem; border-radius: 0.8rem; font-size: 1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.8rem; transition: 0.3s; box-shadow: 0 4px 6px rgba(0, 51, 102, 0.2); }
    .btn-add-area-bottom:hover { background: var(--admin-secondary); transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0, 51, 102, 0.3); }
    .icon-plus { font-size: 1.4rem; color: white; font-weight: bold; }

    .areas-list { display: flex; flex-direction: column; gap: 1.2rem; }
    .area-item { background: white; padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; border-left: 4px solid var(--admin-primary); display: flex; flex-direction: column; gap: 1.2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: 0.2s; }
    .area-item:hover { border-left-color: #0066cc; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    
    .area-top-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 1rem; }
    .area-label-group { display: flex; align-items: center; gap: 0.6rem; }
    .pin-icon { font-size: 1.2rem; }
    .area-number { font-weight: 900; color: #1e293b; font-size: 1.1rem; }
    .area-coords { font-size: 0.9rem; color: var(--admin-primary); font-weight: 800; background: #eff6ff; padding: 0.4rem 0.8rem; border-radius: 0.6rem; border: 1px solid #dbeafe; font-family: 'Courier New', Courier, monospace; }
    
    .area-bottom-row { display: flex; justify-content: space-between; align-items: center; }
    .font-control { display: flex; align-items: center; gap: 1rem; }
    .font-control label { font-size: 0.85rem; font-weight: 900; color: #475569; letter-spacing: 0.5px; }
    .font-control input.font-input { width: 90px !important; padding: 0.6rem !important; text-align: center; font-weight: 900; background: #f8fafc; font-size: 1rem; border: 2px solid #e2e8f0 !important; }
    .font-control input.font-input:focus { border-color: var(--admin-primary) !important; background: white; }
    
    .btn-remove-alt { background: #fff1f2; border: 1px solid #ffe4e6; width: 45px; height: 45px; border-radius: 0.8rem; color: #e11d48; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
    .btn-remove-alt:hover { background: #dc2626; color: white; transform: rotate(8deg) scale(1.1); border-color: #dc2626; }

    .inventory-section { margin-top: 2rem; border-top: 1px dashed #e2e8f0; padding-top: 1.5rem; }
    .section-header h4 { margin: 0 0 1rem 0; color: #334155; font-size: 1rem; font-weight: 900; }

    .vigencias-checklist-container { max-height: 150px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 0.6rem; padding: 0.8rem; background: #f8fafc; display: flex; flex-direction: column; gap: 0.6rem; }
    .checklist-item { display: flex; align-items: center; }
    .checkbox-label { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem !important; font-weight: 500 !important; color: #334155; text-transform: none !important; letter-spacing: normal !important; cursor: pointer; }
    .checkbox-label input { width: 16px; height: 16px; cursor: pointer; }
  `]
})
export class AdminRewardFormComponent implements OnInit, AfterViewInit {
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfPreviewWrapper') pdfPreviewWrapper!: ElementRef<HTMLDivElement>;
  rewards = signal<any[]>([]);
  projects = signal<any[]>([]);
  vigencias = signal<any[]>([]);
  searchTerm = signal('');
  currentPage = signal(1);
  pageSize = 10;
  Math = Math;
  showCreateModal = false;
  editingReward: any = null;
  selectedImage: File | null = null;
  selectedPDF: File | null = null;
  saving = signal(false);
  pdfLoaded = signal(false);
  codeAreas = signal<CodeArea[]>([]);
  loadMethod = signal<'manual' | 'csv'>('manual');
  pendingCSVFile: File | null = null;
  selectedProject = signal<string>('');
  environment = environment;

  // Drag state
  draggingIndex: number | null = null;
  resizingIndex: number | null = null;
  dragStartX = 0; dragStartY = 0;
  dragStartAreaX = 0; dragStartAreaY = 0;
  dragStartWidth = 0; dragStartHeight = 0;
  dragStartScrollX = 0; dragStartScrollY = 0;
  lastMouseEvent: MouseEvent | null = null;
  autoScrollInterval: any = null;

  private http = inject(HttpClient);
  public layoutService = inject(AdminLayoutService);
  private toastService = inject(ToastService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadRewards();
    this.loadProjects();
    this.loadVigencias();
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  loadRewards() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/rewards`).subscribe({
      next: (res: any) => {
        this.rewards.set(res);
        this.loader.hide();
      },
      error: (e: any) => {
        console.error('Error loading rewards', e);
        this.loader.hide();
      }
    });
  }

  loadProjects() {
    this.loader.show();
    this.http.get(`${environment.apiUrl}/admin/projects`).subscribe({
      next: (res: any) => {
        this.projects.set(res);
        this.loader.hide();
      },
      error: (e: any) => {
        console.error('Error loading projects', e);
        this.loader.hide();
      }
    });
  }

  getProjectName(id: number) {
    return this.projects().find(p => p.idProyecto == id)?.Proyecto || 'Desconocido';
  }

  loadVigencias() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/vigencias`).subscribe({
      next: (res) => {
        this.vigencias.set(res);
      },
      error: (e) => {
        console.error('Error loading vigencias', e);
      }
    });
  }

  formatShortDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split(' ');
    const dStr = parts[0];
    const subParts = dStr.split('-');
    if (subParts.length === 3) {
      return `${subParts[2]}/${subParts[1]}/${subParts[0].substring(2)}`;
    }
    const d = new Date(dateStr.replace(' ', 'T'));
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString().substring(2)}`;
  }

  isVigenciaSelected(id: number): boolean {
    return this.editingReward && this.editingReward.id_vigencias && this.editingReward.id_vigencias.includes(id);
  }

  toggleVigenciaSelection(id: number) {
    if (!this.editingReward.id_vigencias) {
      this.editingReward.id_vigencias = [];
    }
    const idx = this.editingReward.id_vigencias.indexOf(id);
    if (idx > -1) {
      this.editingReward.id_vigencias.splice(idx, 1);
    } else {
      this.editingReward.id_vigencias.push(id);
    }
  }

  filteredRewards = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const projId = this.selectedProject();
    return this.rewards().filter((r: any) => {
      const matchesSearch = r.title?.toLowerCase().includes(term);
      const matchesProject = !projId || r.id_proyecto == projId;
      return matchesSearch && matchesProject;
    });
  });

  paginatedRewards = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRewards().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredRewards().length / this.pageSize));

  pageListRewards = computed(() => this.smartPages(this.currentPage(), this.totalPages()));

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

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  ngAfterViewInit() {}

  openCreateModal() {
    this.editingReward = { 
      title: '', id_proyecto: null, type: 'digital', tipo_recompensa: 'normal', cost: 0, active: 1, 
      image_url: '', pdf_template: '', codes_count: 1, exit_codes: '', 
      id_vigencias: [], apply_code_vigencia: false, upload_vigencia_id: null 
    };
    this.selectedImage = null;
    this.selectedPDF = null;
    this.pendingCSVFile = null;
    this.pdfLoaded.set(false);
    this.codeAreas.set([]);
    this.loadMethod.set('manual');
    this.showCreateModal = true;
  }

  duplicateReward(reward: any) {
    const clone = JSON.parse(JSON.stringify(reward));
    clone.id = null;
    clone.id_proyecto = null;
    clone.active = 0;
    clone.title = `${clone.title} (Copia)`;
    this.editReward(clone);
  }

  editReward(reward: any) {
    this.editingReward = { 
      ...reward, 
      apply_code_vigencia: false, 
      upload_vigencia_id: null 
    };
    this.editingReward.id_vigencias = reward.vigencias ? reward.vigencias.map((v: any) => v.id) : [];
    this.selectedImage = null;
    this.selectedPDF = null;
    this.pendingCSVFile = null;
    this.pdfLoaded.set(false);
    this.loadMethod.set('manual');
    
    if (reward.coordinates) {
      const areas = reward.coordinates.split(';').filter((c: any) => c).map((c: string, idx: number) => {
        const parts = c.split(',');
        if (parts.length < 4) return null;
        const [x, y, w, h, fs] = parts.map(Number);
        return { id: idx, x, y, width: w, height: h, fontSize: fs || 14, isPercent: true };
      }).filter((a: any) => a !== null);
      this.codeAreas.set(areas);
    } else {
      this.codeAreas.set([]);
    }

    if (reward.pdf_template) this.loadExistingPDF(reward.pdf_template);
    this.showCreateModal = true;
  }

  closeModal(event: Event) {
    event.stopPropagation();
    this.showCreateModal = false;
    this.editingReward = null;
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedImage = file;
  }

  onPDFSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedPDF = file;
      this.loadPDFPreview(file);
    }
  }

  async loadPDFPreview(file: File) {
    const pdfjsLib = (window as any)['pdfjsLib'];
    if (!pdfjsLib) return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    this.cdr.detectChanges();
    setTimeout(async () => {
      const canvas = this.pdfCanvas.nativeElement;
      const viewport = page.getViewport({ scale: 1.0 });
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      this.pdfLoaded.set(true);
      this.recalculatePixels();
    }, 100);
  }

  async loadExistingPDF(filename: string) {
    const url = `${environment.uploadsUrl}/templates/${filename}`;
    const pdfjsLib = (window as any)['pdfjsLib'];
    if (!pdfjsLib) return;
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);
    this.cdr.detectChanges();
    setTimeout(async () => {
      const canvas = this.pdfCanvas.nativeElement;
      const viewport = page.getViewport({ scale: 1.0 });
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      this.pdfLoaded.set(true);
      this.recalculatePixels();
    }, 100);
  }

  recalculatePixels() {
    if (!this.pdfCanvas) return;
    const canvas = this.pdfCanvas.nativeElement;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    this.codeAreas.update(areas => {
      return areas.map(a => {
        if (a.isPercent) {
          return {
            ...a,
            x: (a.x / 100) * w,
            y: (a.y / 100) * h,
            width: (a.width / 100) * w,
            height: (a.height / 100) * h,
            isPercent: false
          };
        }
        return a;
      });
    });
  }

  addCodeArea() {
    if (this.codeAreas().length >= (this.editingReward.codes_count || 1)) {
      this.toastService.show(`Solo se permiten ${this.editingReward.codes_count} áreas`, 'error');
      return;
    }
    this.codeAreas.update(areas => [...areas, { id: Date.now(), x: 50, y: 50, width: 150, height: 40, fontSize: 14 }]);
  }

  removeCodeArea(index: number) {
    this.codeAreas.update(areas => areas.filter((_, i) => i !== index));
  }

  startDrag(e: MouseEvent, index: number) {
    this.draggingIndex = index;
    this.dragStartX = e.clientX; this.dragStartY = e.clientY;
    this.dragStartAreaX = this.codeAreas()[index].x;
    this.dragStartAreaY = this.codeAreas()[index].y;
    if (this.pdfPreviewWrapper) {
      const container = this.pdfPreviewWrapper.nativeElement;
      this.dragStartScrollX = container.scrollLeft; this.dragStartScrollY = container.scrollTop;
    }
  }

  startResize(e: MouseEvent, index: number) {
    e.stopPropagation();
    this.resizingIndex = index;
    this.dragStartX = e.clientX; this.dragStartY = e.clientY;
    this.dragStartWidth = this.codeAreas()[index].width;
    this.dragStartHeight = this.codeAreas()[index].height;
    if (this.pdfPreviewWrapper) {
      const container = this.pdfPreviewWrapper.nativeElement;
      this.dragStartScrollX = container.scrollLeft; this.dragStartScrollY = container.scrollTop;
    }
  }

  onMouseMove(e: MouseEvent) {
    this.lastMouseEvent = e;
    if (this.draggingIndex !== null || this.resizingIndex !== null) {
      this.handleAutoScroll(e);
      this.updateDragPosition();
    }
  }

  updateDragPosition() {
    if (!this.lastMouseEvent) return;
    const e = this.lastMouseEvent;
    const container = this.pdfPreviewWrapper?.nativeElement;
    const dScrollX = container ? (container.scrollLeft - this.dragStartScrollX) : 0;
    const dScrollY = container ? (container.scrollTop - this.dragStartScrollY) : 0;
    const dx = e.clientX - this.dragStartX + dScrollX;
    const dy = e.clientY - this.dragStartY + dScrollY;

    if (this.draggingIndex !== null) {
      this.codeAreas.update(areas => {
        areas[this.draggingIndex!].x = this.dragStartAreaX + dx;
        areas[this.draggingIndex!].y = this.dragStartAreaY + dy;
        return [...areas];
      });
    } else if (this.resizingIndex !== null) {
      this.codeAreas.update(areas => {
        areas[this.resizingIndex!].width = Math.max(50, this.dragStartWidth + dx);
        areas[this.resizingIndex!].height = Math.max(20, this.dragStartHeight + dy);
        return [...areas];
      });
    }
  }

  handleAutoScroll(e: MouseEvent) {
    if (!this.pdfPreviewWrapper) return;
    const container = this.pdfPreviewWrapper.nativeElement;
    const rect = container.getBoundingClientRect();
    const threshold = 60; const speed = 15;
    let scrollX = 0; let scrollY = 0;
    if (e.clientX < rect.left + threshold) scrollX = -speed;
    else if (e.clientX > rect.right - threshold) scrollX = speed;
    if (e.clientY < rect.top + threshold) scrollY = -speed;
    else if (e.clientY > rect.bottom - threshold) scrollY = speed;

    if (scrollX !== 0 || scrollY !== 0) {
      if (!this.autoScrollInterval) {
        this.autoScrollInterval = setInterval(() => {
          container.scrollLeft += scrollX; container.scrollTop += scrollY;
          this.updateDragPosition();
        }, 20);
      }
    } else {
      this.stopAutoScroll();
    }
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) { clearInterval(this.autoScrollInterval); this.autoScrollInterval = null; }
  }

  onMouseUp() { this.draggingIndex = null; this.resizingIndex = null; this.stopAutoScroll(); }

  saveReward() {
    this.saving.set(true);
    const formData = new FormData();
    Object.keys(this.editingReward).forEach(key => {
       const val = this.editingReward[key];
       if (key === 'id_vigencias' || Array.isArray(val)) {
         formData.append(key, JSON.stringify(val));
       } else if (key === 'apply_code_vigencia') {
         formData.append(key, val ? '1' : '0');
       } else {
         formData.append(key, val === null ? '' : val);
       }
    });
    if (this.selectedImage) formData.append('image', this.selectedImage);
    if (this.selectedPDF) formData.append('pdf', this.selectedPDF);
    if (this.pdfCanvas) {
      const canvas = this.pdfCanvas.nativeElement;
      const w = canvas.width; const h = canvas.height;
      if (w > 0 && h > 0) {
        const coords = this.codeAreas().map(a => {
          const px = (a.x / w) * 100; const py = (a.y / h) * 100;
          const pw = (a.width / w) * 100; const ph = (a.height / h) * 100;
          return `${px},${py},${pw},${ph},${a.fontSize}`;
        }).join(';');
        formData.append('coordinates', coords);
        formData.append('code_areas', JSON.stringify(this.codeAreas()));
        if (this.codeAreas().length > 0) formData.append('font_size', this.codeAreas()[0].fontSize.toString());
      }
    }

    const url = this.editingReward.id ? `${environment.apiUrl}/admin/rewards/${this.editingReward.id}/update` : `${environment.apiUrl}/admin/rewards`;
    this.loader.show();
    this.http.post(url, formData).subscribe({
      next: (res: any) => {
        const rewardId = this.editingReward.id || res.id;
        
        if (this.pendingCSVFile) {
          this.processCSVAndUpload(rewardId);
        } else {
          this.toastService.show('RECOMPENSA GUARDADA', 'success');
          this.loadRewards(); 
          this.closeModal(new Event('click')); 
          this.saving.set(false);
          this.loader.hide();
        }
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'ERROR AL GUARDAR', 'error');
        this.saving.set(false);
        this.loader.hide();
      }
    });
  }

  deleteReward(id: number) {
    Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--admin-primary)' }).then(result => {
      if (result.isConfirmed) {
        this.loader.show();
        this.http.delete(`${environment.apiUrl}/admin/rewards/${id}`).subscribe({
          next: () => {
            this.toastService.show('ELIMINADO', 'success'); 
            this.loadRewards();
            this.loader.hide();
          },
          error: () => {
            this.toastService.show('ERROR AL ELIMINAR', 'error');
            this.loader.hide();
          }
        });
      }
    });
  }

  exportToCSV() {
    const headers = ['ID', 'Nombre', 'Puntos', 'Stock', 'Tipo'];
    const rows = this.filteredRewards().map(r => [r.id, `"${r.title}"`, r.cost, r.stock, r.type]);
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "recompensas_tec.csv"; link.click();
  }

  onCodesCSVSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Solo validamos el formato rápido antes de guardar
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim() !== '');
      if (lines.length === 0) {
        this.toastService.show('EL ARCHIVO ESTÁ VACÍO', 'error');
        return;
      }
      this.pendingCSVFile = file;
      this.toastService.show(`ARCHIVO CARGADO: ${lines.length} CUPONES. PRESIONA GUARDAR PARA PROCESAR.`, 'info');
    };
    reader.readAsText(file);
  }

  processCSVAndUpload(rewardId: number) {
    if (!this.pendingCSVFile) return;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim() !== '');
      const codes = lines.map((l: string) => l.split(',').map(c => c.trim()));
      
      const payload: any = { codes };
      if (this.editingReward.apply_code_vigencia && this.editingReward.upload_vigencia_id) {
        payload.id_vigencia = this.editingReward.upload_vigencia_id;
      }

      this.http.post(`${environment.apiUrl}/admin/rewards/${rewardId}/add-codes`, payload).subscribe({
        next: (res: any) => {
          const title = res.success_count > 0 ? 'Códigos Procesados' : 'Proceso Finalizado';
          let html = `
            <div style="text-align: left; font-size: 0.9rem;">
              <p>✅ <b>Nuevos cupones:</b> ${res.success_count}</p>
              <p>⚠️ <b>Duplicados (omitidos):</b> ${res.duplicate_count}</p>
              ${res.duplicate_count > 0 ? `
                <div style="margin-top: 10px;">
                  <b>Códigos repetidos detectados:</b>
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
            confirmButtonColor: 'var(--admin-primary)'
          });

          this.pendingCSVFile = null;
          this.loadRewards();
          this.closeModal(new Event('click'));
          this.saving.set(false);
          this.loader.hide();
        },
        error: (err) => {
          this.toastService.show('RECOMPENSA GUARDADA PERO ERROR AL CARGAR CÓDIGOS', 'warning');
          this.loadRewards();
          this.closeModal(new Event('click'));
          this.saving.set(false);
          this.loader.hide();
        }
      });
    };
    reader.readAsText(this.pendingCSVFile);
  }

  uploadCodes(codes: string[][]) {
    // This method can be kept for other uses or removed if only using the Save flow
    this.loader.show();
    this.http.post(`${environment.apiUrl}/admin/rewards/${this.editingReward.id}/add-codes`, { codes }).subscribe({
      next: () => {
        this.toastService.show('CÓDIGOS CARGADOS', 'success'); 
        this.loadRewards();
        this.loader.hide();
      },
      error: () => {
        this.toastService.show('ERROR AL CARGAR CÓDIGOS', 'error');
        this.loader.hide();
      }
    });
  }

  handleImageError(event: any, imageUrl: string) {
    const fallbackBase = (environment as any).fallbackUrl || 'https://q-tokens.com.mx/embajadores-tec-dev/api/public/uploads';
    if (!event.target.src.includes(fallbackBase) && imageUrl) {
      event.target.src = `${fallbackBase}/rewards/${imageUrl}`;
    } else {
      event.target.src = 'assets/img/Logo_Tec.png';
    }
  }
}
