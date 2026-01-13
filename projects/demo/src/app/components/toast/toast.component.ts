import { Component, inject } from '@angular/core';
import { DemoStateService } from '../../services/demo-state.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of state.toasts(); track toast.id) {
        <div 
          class="toast" 
          [class.success]="toast.type === 'success'"
          [class.error]="toast.type === 'error'"
          [class.info]="toast.type === 'info'">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✕ }
              @default { ℹ }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="state.dismissToast(toast.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          @if (toast.duration) {
            <div class="toast-progress" [style.animation-duration.ms]="toast.duration"></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 80px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: slideIn 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .toast.success {
      border-color: var(--success);
    }

    .toast.error {
      border-color: var(--danger);
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 600;
    }

    .toast.success .toast-icon {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
    }

    .toast.error .toast-icon {
      background: rgba(239, 68, 68, 0.2);
      color: var(--danger);
    }

    .toast.info .toast-icon {
      background: rgba(139, 92, 246, 0.2);
      color: var(--accent);
    }

    .toast-message {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
    }

    .toast-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .toast-close:hover {
      background: var(--bg-surface);
      color: var(--text);
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: var(--accent);
      animation: shrink linear forwards;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `]
})
export class ToastContainerComponent {
  state = inject(DemoStateService);
}
