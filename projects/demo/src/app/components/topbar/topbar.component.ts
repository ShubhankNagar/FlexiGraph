import { Component, inject, output } from '@angular/core';
import { DemoStateService } from '../../services/demo-state.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="topbar">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">FlexiGraph</span>
      </div>

      <!-- Center: Demo Name -->
      <div class="demo-title">
        <span class="demo-icon">{{ state.currentDemoData().icon }}</span>
        <span class="demo-name">{{ state.currentDemoData().name }}</span>
      </div>

      <!-- Right: Actions -->
      <div class="actions">
        <!-- Undo/Redo -->
        <div class="action-group">
          <button 
            class="icon-btn" 
            [disabled]="!state.canUndo()" 
            (click)="undo.emit()"
            title="Undo (Ctrl+Z)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"/>
            </svg>
          </button>
          <button 
            class="icon-btn" 
            [disabled]="!state.canRedo()" 
            (click)="redo.emit()"
            title="Redo (Ctrl+Y)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10h-10a8 8 0 0 0-8 8v2M21 10l-6 6M21 10l-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Export -->
        <div class="dropdown">
          <button class="action-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Export</span>
          </button>
          <div class="dropdown-menu">
            <button (click)="exportAs.emit('png')">🖼️ PNG</button>
            <button (click)="exportAs.emit('svg')">🎨 SVG</button>
            <button (click)="exportAs.emit('pdf')">📄 PDF</button>
            <hr>
            <button (click)="exportAs.emit('json')">📦 JSON</button>
            <button (click)="exportAs.emit('csv')">📋 CSV</button>
          </div>
        </div>

        <!-- Import -->
        <div class="dropdown">
          <button class="action-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            <span>Import</span>
          </button>
          <div class="dropdown-menu">
            <button (click)="importFrom.emit('json')">📦 JSON</button>
            <button (click)="importFrom.emit('csv')">📋 CSV</button>
          </div>
        </div>

        <!-- Save -->
        <button 
          class="save-btn" 
          [class.has-changes]="state.isDirty()"
          [disabled]="!state.isDirty()"
          (click)="save.emit()">
          @if (state.isDirty()) {
            <span class="pulse-dot"></span>
          }
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Save</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      padding: 0 16px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon {
      font-size: 20px;
      color: var(--accent);
    }

    .logo-text {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .demo-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--bg-elevated);
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-group {
      display: flex;
      background: var(--bg-elevated);
      border-radius: 6px;
      padding: 2px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .icon-btn:hover:not(:disabled) {
      background: var(--bg-surface);
      color: var(--text);
    }

    .icon-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .dropdown {
      position: relative;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--bg-elevated);
      border: none;
      border-radius: 6px;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .action-btn:hover {
      background: var(--bg-surface);
      color: var(--text);
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 120px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: all 0.15s;
      z-index: 100;
    }

    .dropdown:hover .dropdown-menu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
    }

    .dropdown-menu button:hover {
      background: var(--bg-surface);
      color: var(--text);
    }

    .dropdown-menu hr {
      margin: 4px 0;
      border: none;
      border-top: 1px solid var(--border-subtle);
    }

    .save-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .save-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .save-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class TopbarComponent {
  state = inject(DemoStateService);
  
  undo = output<void>();
  redo = output<void>();
  save = output<void>();
  exportAs = output<string>();
  importFrom = output<string>();
}
