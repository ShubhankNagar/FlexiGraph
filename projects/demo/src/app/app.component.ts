import { Component } from '@angular/core';
import { WorkspaceComponent } from './features/workspace/workspace.component';

/**
 * Root application shell - minimal bootstrap component
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WorkspaceComponent],
  template: `<app-workspace />`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      height: 100dvh;
    }
  `]
})
export class AppComponent {}
