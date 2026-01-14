import { Component, inject, output, signal } from '@angular/core';
import { DemoStateService, LayoutType, ThemeType } from '../../services/demo-state.service';

@Component({
  selector: 'app-floating-toolbar',
  standalone: true,
  template: `
    <div class="toolbar" [class.visible]="isVisible()">
      <!-- Layout -->
      <div class="tool-group">
        <label>Layout</label>
        <select [value]="state.currentLayout()" (change)="onLayoutChange($any($event.target).value)">
          <option value="dagre">Hierarchy</option>
          <option value="breadthfirst">Tree</option>
          <option value="cose">Force</option>
          <option value="grid">Grid</option>
          <option value="circle">Circle</option>
        </select>
      </div>

      <div class="divider"></div>

      <!-- Theme -->
      <div class="tool-group theme-toggle">
        <button 
          class="theme-btn" 
          [class.active]="state.currentTheme() === 'dark'"
          (click)="state.setTheme('dark')"
          title="Dark">🌙</button>
        <button 
          class="theme-btn" 
          [class.active]="state.currentTheme() === 'light'"
          (click)="state.setTheme('light')"
          title="Light">☀️</button>
        <button 
          class="theme-btn" 
          [class.active]="state.currentTheme() === 'blue'"
          (click)="state.setTheme('blue')"
          title="Blue">🔵</button>
      </div>

      <div class="divider"></div>

      <!-- Zoom -->
      <div class="tool-group zoom-group">
        <button class="icon-btn" (click)="zoomOut.emit()" title="Zoom Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <span class="zoom-level">{{ zoomLevel() }}%</span>
        <button class="icon-btn" (click)="zoomIn.emit()" title="Zoom In">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button class="icon-btn" (click)="zoomFit.emit()" title="Fit to Screen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      </div>

      <div class="divider"></div>

      <!-- Reset -->
      <button class="icon-btn" (click)="resetLayout.emit()" title="Reset Layout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9v-9"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .toolbar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(15, 15, 18, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
      transition: all 0.3s ease;
      z-index: 100;
    }

    .toolbar.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .tool-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tool-group label {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tool-group select {
      padding: 4px 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      color: var(--text);
      font-size: 11px;
      cursor: pointer;
    }

    .tool-group select:focus {
      outline: none;
      border-color: var(--accent);
    }

    .divider {
      width: 1px;
      height: 20px;
      background: var(--border);
    }

    .theme-toggle {
      display: flex;
      background: var(--bg-elevated);
      border-radius: 6px;
      padding: 2px;
    }

    .theme-btn {
      padding: 4px 6px;
      background: transparent;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      opacity: 0.5;
      transition: all 0.15s;
    }

    .theme-btn:hover {
      opacity: 0.8;
    }

    .theme-btn.active {
      background: var(--accent);
      opacity: 1;
    }

    .zoom-group {
      gap: 4px;
    }

    .zoom-level {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      min-width: 32px;
      text-align: center;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: var(--bg-elevated);
      border: none;
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .icon-btn:hover {
      background: var(--bg-surface);
      color: var(--text);
    }
  `]
})
export class FloatingToolbarComponent {
  state = inject(DemoStateService);
  
  isVisible = signal(true);
  zoomLevel = signal(100);
  
  zoomIn = output<void>();
  zoomOut = output<void>();
  zoomFit = output<void>();
  resetLayout = output<void>();

  onLayoutChange(layout: LayoutType): void {
    this.state.setLayout(layout);
    // Trigger re-layout after state change
    setTimeout(() => this.resetLayout.emit(), 50);
  }

  setZoomLevel(level: number): void {
    this.zoomLevel.set(Math.round(level * 100));
  }
}
