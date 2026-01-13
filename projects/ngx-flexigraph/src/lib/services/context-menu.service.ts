import { Injectable, signal } from '@angular/core';
import { NodeSingular } from 'cytoscape';
import { FlexiNode } from '../models/graph.models';
import { ContextMenuItem, FlexiGraphConfig } from '../models/config.models';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

@Injectable()
export class ContextMenuService<T = any> {
  // State signals
  private _visible = signal(false);
  private _position = signal<ContextMenuPosition>({ x: 0, y: 0 });
  private _selectedNode = signal<NodeSingular | null>(null);

  // Readonly signals
  readonly visible = this._visible.asReadonly();
  readonly position = this._position.asReadonly();
  readonly selectedNode = this._selectedNode.asReadonly();

  /**
   * Show context menu for a node
   */
  show(
    node: NodeSingular, 
    containerRect: DOMRect, 
    config: FlexiGraphConfig
  ): void {
    this._selectedNode.set(node);
    
    const rendered = node.renderedPosition();
    const menuWidth = config.contextMenu?.width || 160;
    const menuHeight = 140; // Approximate, could be calculated dynamically or passed
    const offset = config.contextMenu?.offset || 10;

    let x = rendered.x + offset;
    let y = rendered.y - menuHeight / 2;

    // Boundary checks with container
    if (x + menuWidth > containerRect.width) {
      x = rendered.x - menuWidth - offset;
    }
    if (x < 0) x = offset;
    if (y + menuHeight > containerRect.height) {
      y = containerRect.height - menuHeight - offset;
    }
    if (y < 0) y = offset;

    this._position.set({ x, y });
    this._visible.set(true);
  }

  /**
   * Hide context menu
   */
  hide(): void {
    this._visible.set(false);
    this._selectedNode.set(null);
  }

  /**
   * Check if a menu item should be disabled
   */
  isItemDisabled(
    item: ContextMenuItem, 
    nodeConverter: (n: NodeSingular) => FlexiNode<T>
  ): boolean {
    const node = this._selectedNode();
    if (!node) return true;
    if (item.disabled) {
      return item.disabled(nodeConverter(node));
    }
    return false;
  }

  /**
   * Execute menu item action
   */
  executeAction(
    item: ContextMenuItem, 
    nodeConverter: (n: NodeSingular) => FlexiNode<T>
  ): void {
    const node = this._selectedNode();
    if (node && item.action) {
      item.action(nodeConverter(node));
    }
    this.hide();
  }
}
