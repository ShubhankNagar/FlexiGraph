import { Component, inject, input, output, signal } from '@angular/core';
import { AppStateService, LayoutType } from '../../../../core/services/state.service';

/**
 * Floating toolbar for layout, theme, and zoom controls
 */
@Component({
  selector: 'app-toolbar',
  standalone: true,
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {
  readonly state = inject(AppStateService);
  
  readonly isVisible = signal(true);
  readonly zoomLevel = signal(100);
  readonly lockedCount = input(0);
  readonly totalCount = input(0);
  
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly zoomFit = output<void>();
  readonly resetLayout = output<void>();
  readonly toggleLock = output<void>();

  onLayoutChange(layout: LayoutType): void {
    this.state.setLayout(layout);
    // Trigger re-layout after state change
    setTimeout(() => this.resetLayout.emit(), 50);
  }

  setZoomLevel(level: number): void {
    this.zoomLevel.set(Math.round(level * 100));
  }

  onToggleLock(): void {
    this.toggleLock.emit();
  }
}
