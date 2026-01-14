import { Component, inject, output } from '@angular/core';
import { AppStateService } from '../../../../core/services/state.service';

/**
 * Header component with logo, demo title, and action buttons
 */
@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly state = inject(AppStateService);
  
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly save = output<void>();
  readonly exportAs = output<string>();
  readonly importFrom = output<string>();
}
