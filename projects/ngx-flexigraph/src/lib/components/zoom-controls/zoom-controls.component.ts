/**
 * FlexiGraph Zoom Controls Component
 * A standalone, reusable zoom control panel component
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ZoomControlsPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

@Component({
  selector: 'flexi-zoom-controls',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="zoom-controls"
      [class]="'position-' + position"
      role="toolbar"
      aria-label="Graph zoom controls">
      
      <button 
        class="zoom-btn" 
        (click)="onZoomIn()" 
        [disabled]="isMaxZoom()"
        title="Zoom In (+)"
        aria-label="Zoom in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
      
      <button 
        class="zoom-btn" 
        (click)="onZoomOut()" 
        [disabled]="isMinZoom()"
        title="Zoom Out (-)"
        aria-label="Zoom out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
      
      <button 
        class="zoom-btn" 
        (click)="onZoomFit()" 
        title="Fit to Screen (0)"
        aria-label="Fit graph to screen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </button>
      
      <button 
        class="zoom-btn" 
        (click)="onZoomReset()" 
        title="Reset Zoom (100%)"
        aria-label="Reset to 100% zoom">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
      
      @if (showZoomLevel) {
        <div 
          class="zoom-level-indicator" 
          title="Current Zoom Level"
          role="status"
          aria-live="polite"
          aria-label="Zoom level: {{ zoomPercent() }}%">
          {{ zoomPercent() }}%
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      z-index: 100;
    }

    .zoom-controls {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px;
      background: var(--fg-surface, #ffffff);
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    }

    /* Positioning classes */
    .zoom-controls.position-top-left { 
      position: fixed; 
      top: 10px; 
      left: 10px; 
    }
    .zoom-controls.position-top-right { 
      position: fixed; 
      top: 10px; 
      right: 10px; 
    }
    .zoom-controls.position-bottom-left { 
      position: fixed; 
      bottom: 10px; 
      left: 10px; 
    }
    .zoom-controls.position-bottom-right { 
      position: fixed; 
      bottom: 10px; 
      right: 10px; 
    }

    .zoom-btn {
      width: 32px;
      height: 32px;
      padding: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
      color: var(--fg-text, #334155);
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .zoom-btn:hover:not(:disabled) {
      background: var(--fg-hover, rgba(0, 123, 255, 0.1));
      color: var(--fg-primary, #007bff);
    }

    .zoom-btn:focus {
      outline: 2px solid var(--fg-primary, #007bff);
      outline-offset: -2px;
    }

    .zoom-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .zoom-btn svg {
      width: 100%;
      height: 100%;
    }

    .zoom-level-indicator {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      text-align: center;
      color: var(--fg-text, #334155);
      opacity: 0.7;
      border-top: 1px solid var(--fg-border, #e2e8f0);
      margin-top: 2px;
      min-width: 40px;
    }
  `]
})
export class FlexiZoomControlsComponent {
  // Inputs
  @Input() position: ZoomControlsPosition = 'bottom-right';
  @Input() showZoomLevel = true;
  @Input() minZoom = 0.1;
  @Input() maxZoom = 4;
  @Input() zoomStep = 0.2;

  // Current zoom level (should be updated externally)
  currentZoom = signal(1);

  // Outputs
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() zoomFit = new EventEmitter<void>();
  @Output() zoomReset = new EventEmitter<void>();
  @Output() zoomChange = new EventEmitter<number>();

  // Computed
  zoomPercent = computed(() => Math.round(this.currentZoom() * 100));
  isMinZoom = computed(() => this.currentZoom() <= this.minZoom);
  isMaxZoom = computed(() => this.currentZoom() >= this.maxZoom);

  /**
   * Set the current zoom level (called from parent)
   */
  setZoomLevel(level: number): void {
    this.currentZoom.set(level);
  }

  onZoomIn(): void {
    if (!this.isMaxZoom()) {
      this.zoomIn.emit();
      const newZoom = Math.min(this.currentZoom() + this.zoomStep, this.maxZoom);
      this.zoomChange.emit(newZoom);
    }
  }

  onZoomOut(): void {
    if (!this.isMinZoom()) {
      this.zoomOut.emit();
      const newZoom = Math.max(this.currentZoom() - this.zoomStep, this.minZoom);
      this.zoomChange.emit(newZoom);
    }
  }

  onZoomFit(): void {
    this.zoomFit.emit();
  }

  onZoomReset(): void {
    this.zoomReset.emit();
    this.zoomChange.emit(1);
  }
}
