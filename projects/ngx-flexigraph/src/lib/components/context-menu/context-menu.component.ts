/**
 * FlexiGraph Context Menu Component
 * A standalone, reusable context menu component for graph nodes
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ContextMenuItem } from '../../models/config.models';
import type { FlexiNode } from '../../models/graph.models';

/** Position for the context menu (renamed to avoid conflict with service) */
export interface MenuPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'flexi-context-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div 
        class="context-menu"
        [style.left.px]="position().x"
        [style.top.px]="position().y"
        [style.width.px]="width"
        role="menu"
        aria-label="Node actions menu"
        (click)="$event.stopPropagation()">
        
        @if (customTemplate) {
          <ng-container 
            [ngTemplateOutlet]="customTemplate"
            [ngTemplateOutletContext]="{ $implicit: node, items: items }">
          </ng-container>
        } @else {
          @for (item of visibleItems(); track item.id) {
            @if (item.separatorBefore) {
              <div class="menu-separator" role="separator"></div>
            }
            <button
              class="menu-item"
              [class]="item.cssClass || ''"
              [class.disabled]="isItemDisabled(item)"
              [disabled]="isItemDisabled(item)"
              [attr.aria-disabled]="isItemDisabled(item)"
              role="menuitem"
              (click)="onItemClick(item)">
              @if (item.icon) {
                <span class="menu-icon" [innerHTML]="item.icon" aria-hidden="true"></span>
              }
              <span class="menu-label">{{ item.label }}</span>
              @if (item.shortcut) {
                <span class="menu-shortcut" aria-hidden="true">{{ item.shortcut }}</span>
              }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      z-index: 1000;
    }

    .context-menu {
      background: var(--fg-surface, #ffffff);
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 4px;
      min-width: 140px;
      max-width: 280px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: var(--fg-text, #334155);
      border-radius: 6px;
      transition: background-color 0.15s;
      text-align: left;
    }

    .menu-item:hover:not(:disabled) {
      background-color: var(--fg-hover, rgba(0, 123, 255, 0.1));
    }

    .menu-item:focus {
      outline: 2px solid var(--fg-primary, #007bff);
      outline-offset: -2px;
    }

    .menu-item:disabled,
    .menu-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .menu-icon :deep(svg) {
      width: 100%;
      height: 100%;
    }

    .menu-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-shortcut {
      font-size: 11px;
      color: var(--fg-text, #334155);
      opacity: 0.6;
      margin-left: 12px;
      font-family: monospace;
    }

    .menu-separator {
      height: 1px;
      background: var(--fg-border, #e2e8f0);
      margin: 4px 0;
    }

    /* Delete item variant */
    .menu-item.delete-item {
      color: #dc2626;
    }

    .menu-item.delete-item:hover:not(:disabled) {
      background-color: rgba(220, 38, 38, 0.1);
    }
  `]
})
export class FlexiContextMenuComponent<T = any> {
  private elementRef = inject(ElementRef);

  // Inputs
  @Input() items: ContextMenuItem[] = [];
  @Input() node: FlexiNode<T> | null = null;
  @Input() width = 160;
  @Input() customTemplate?: TemplateRef<any>;

  // State
  visible = signal(false);
  position = signal<MenuPosition>({ x: 0, y: 0 });

  // Outputs
  @Output() itemClick = new EventEmitter<{ item: ContextMenuItem; node: FlexiNode<T> | null }>();
  @Output() closed = new EventEmitter<void>();

  // Computed visible items (filter by visibility callback)
  visibleItems = computed(() => {
    if (!this.node) return this.items;
    return this.items.filter(item => {
      if (item.visible) {
        return item.visible(this.node);
      }
      return true;
    });
  });

  /**
   * Show the context menu at the specified position
   */
  show(x: number, y: number, node?: FlexiNode<T>): void {
    if (node) {
      this.node = node;
    }
    
    // Adjust position to stay within viewport
    const menuWidth = this.width;
    const menuHeight = this.items.length * 40; // Approximate
    
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
    
    this.position.set({ 
      x: Math.max(0, adjustedX), 
      y: Math.max(0, adjustedY) 
    });
    this.visible.set(true);
  }

  /**
   * Hide the context menu
   */
  hide(): void {
    if (this.visible()) {
      this.visible.set(false);
      this.closed.emit();
    }
  }

  /**
   * Check if a menu item is disabled
   */
  isItemDisabled(item: ContextMenuItem): boolean {
    if (item.disabled && this.node) {
      return item.disabled(this.node);
    }
    return false;
  }

  /**
   * Handle menu item click
   */
  onItemClick(item: ContextMenuItem): void {
    if (this.isItemDisabled(item)) return;
    
    // Execute the item's action with the current node
    if (item.action && this.node) {
      item.action(this.node);
    }
    
    // Emit event
    this.itemClick.emit({ item, node: this.node });
    
    // Close menu
    this.hide();
  }

  /**
   * Close menu when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.hide();
    }
  }

  /**
   * Close menu on Escape key
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.hide();
  }
}
