import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-overlay" *ngIf="loaderService.isLoading()">
      <div class="loader-content">
        <div class="spinner"></div>
        <p class="loader-text">Procesando...</p>
      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    .loader-content {
      text-align: center;
      background: white;
      padding: 2.5rem 4rem;
      border-radius: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      border: 1px solid #f0f0f0;
    }
    .spinner {
      width: 60px;
      height: 60px;
      border: 6px solid #f3f3f3;
      border-top: 6px solid var(--admin-primary);
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      margin: 0 auto 1.5rem;
    }
    .loader-text {
      color: var(--admin-primary);
      font-weight: 800;
      font-size: 1.1rem;
      margin: 0;
      letter-spacing: 0.5px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoaderComponent {
  public loaderService = inject(LoaderService);
}
