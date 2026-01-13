import { Component, inject, signal } from '@angular/core';
import { DemoStateService, DemoType } from '../../services/demo-state.service';

@Component({
  selector: 'app-demo-selector',
  standalone: true,
  template: `
    <div class="selector-container" [class.expanded]="expanded()">
      <!-- Collapsed: Show icons only -->
      <div class="demo-icons" (mouseenter)="expanded.set(true)">
        @for (demo of state.demoList; track demo.key) {
          <button 
            class="demo-icon-btn" 
            [class.active]="state.currentDemo() === demo.key"
            [style.--demo-color]="demo.color"
            (click)="selectDemo(demo.key)"
            [title]="demo.name">
            <span class="icon">{{ demo.icon }}</span>
          </button>
        }
      </div>

      <!-- Expanded: Show full cards -->
      <div class="demo-cards" (mouseleave)="expanded.set(false)">
        @for (demo of state.demoList; track demo.key) {
          <button 
            class="demo-card" 
            [class.active]="state.currentDemo() === demo.key"
            [style.--demo-color]="demo.color"
            (click)="selectDemo(demo.key)">
            <span class="card-icon">{{ demo.icon }}</span>
            <div class="card-content">
              <span class="card-name">{{ demo.name }}</span>
              <span class="card-desc">{{ demo.description }}</span>
            </div>
            @if (state.currentDemo() === demo.key) {
              <span class="active-indicator">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .selector-container {
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 50;
    }

    .demo-icons {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px;
      background: rgba(15, 15, 18, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .selector-container.expanded .demo-icons {
      display: none;
    }

    .demo-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--bg-elevated);
      border: 2px solid transparent;
      border-radius: 10px;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .demo-icon-btn:hover {
      transform: scale(1.05);
      border-color: var(--demo-color);
    }

    .demo-icon-btn.active {
      background: var(--accent-subtle);
      border-color: var(--accent);
    }

    .demo-cards {
      display: none;
      flex-direction: column;
      gap: 6px;
      padding: 8px;
      background: rgba(15, 15, 18, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      min-width: 220px;
    }

    .selector-container.expanded .demo-cards {
      display: flex;
    }

    .demo-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }

    .demo-card:hover {
      background: var(--bg-elevated);
    }

    .demo-card.active {
      background: var(--accent-subtle);
      border-color: var(--accent);
    }

    .card-icon {
      font-size: 24px;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .card-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
    }

    .card-desc {
      font-size: 11px;
      color: var(--text-muted);
    }

    .active-indicator {
      color: var(--accent);
    }
  `]
})
export class DemoSelectorComponent {
  state = inject(DemoStateService);
  expanded = signal(false);

  selectDemo(key: DemoType): void {
    this.state.setDemo(key);
    this.expanded.set(false);
  }
}
