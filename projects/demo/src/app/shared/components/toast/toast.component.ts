import { Component, inject } from '@angular/core';
import { AppStateService } from '../../../core/services/state.service';

/**
 * Toast notification container component
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  readonly state = inject(AppStateService);
}
