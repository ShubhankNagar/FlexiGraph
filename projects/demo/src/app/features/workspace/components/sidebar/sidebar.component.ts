import { Component, inject, signal } from '@angular/core';
import { AppStateService, DemoType } from '../../../../core/services/state.service';

/**
 * Sidebar component for demo/example selection
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  readonly state = inject(AppStateService);
  readonly expanded = signal(false);

  selectDemo(key: DemoType): void {
    this.state.setDemo(key);
    this.expanded.set(false);
  }
}
