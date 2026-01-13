/**
 * CollapseService - Manages node collapse/expand state
 * Handles hiding descendants and tracking collapsed nodes
 */

import { Injectable, signal, computed } from '@angular/core';
import type { FlexiNode } from '../models/graph.models';

/**
 * State for a single collapsed node
 */
export interface CollapseNodeState {
  nodeId: string;
  hiddenDescendantIds: string[];
  collapsedAt: number; // timestamp for ordering
}

/**
 * Full collapse state for serialization
 */
export interface CollapseState {
  collapsedNodes: CollapseNodeState[];
}

@Injectable({
  providedIn: 'root'
})
export class CollapseService {
  // Core state
  private _collapsedNodeIds = signal<Set<string>>(new Set());
  private _hiddenNodeIds = signal<Set<string>>(new Set());
  private _collapseStates = signal<Map<string, CollapseNodeState>>(new Map());

  // Public readonly signals
  readonly collapsedNodeIds = this._collapsedNodeIds.asReadonly();
  readonly hiddenNodeIds = this._hiddenNodeIds.asReadonly();

  // Computed
  readonly hasCollapsedNodes = computed(() => this._collapsedNodeIds().size > 0);

  /**
   * Collapse a node and hide all its descendants
   */
  collapse(nodeId: string, nodes: FlexiNode[]): boolean {
    // Don't collapse if already collapsed
    if (this._collapsedNodeIds().has(nodeId)) {
      return false;
    }

    // Find all descendants
    const descendants = this.findAllDescendants(nodeId, nodes);
    
    // Don't collapse if no children
    if (descendants.length === 0) {
      return false;
    }

    // Update collapse states
    const newCollapseStates = new Map(this._collapseStates());
    newCollapseStates.set(nodeId, {
      nodeId,
      hiddenDescendantIds: descendants,
      collapsedAt: Date.now()
    });
    this._collapseStates.set(newCollapseStates);

    // Update collapsed node IDs
    const newCollapsed = new Set(this._collapsedNodeIds());
    newCollapsed.add(nodeId);
    this._collapsedNodeIds.set(newCollapsed);

    // Update hidden node IDs
    this.recalculateHiddenNodes(nodes);

    return true;
  }

  /**
   * Expand a collapsed node and show its descendants
   */
  expand(nodeId: string, nodes: FlexiNode[]): boolean {
    // Don't expand if not collapsed
    if (!this._collapsedNodeIds().has(nodeId)) {
      return false;
    }

    // Remove from collapse states
    const newCollapseStates = new Map(this._collapseStates());
    newCollapseStates.delete(nodeId);
    this._collapseStates.set(newCollapseStates);

    // Update collapsed node IDs
    const newCollapsed = new Set(this._collapsedNodeIds());
    newCollapsed.delete(nodeId);
    this._collapsedNodeIds.set(newCollapsed);

    // Recalculate hidden nodes (some may still be hidden by other collapsed parents)
    this.recalculateHiddenNodes(nodes);

    return true;
  }

  /**
   * Toggle collapse state of a node
   */
  toggle(nodeId: string, nodes: FlexiNode[]): boolean {
    if (this._collapsedNodeIds().has(nodeId)) {
      return this.expand(nodeId, nodes);
    } else {
      return this.collapse(nodeId, nodes);
    }
  }

  /**
   * Expand all collapsed nodes
   */
  expandAll(nodes: FlexiNode[]): void {
    this._collapseStates.set(new Map());
    this._collapsedNodeIds.set(new Set());
    this._hiddenNodeIds.set(new Set());
  }

  /**
   * Check if a node is collapsed
   */
  isCollapsed(nodeId: string): boolean {
    return this._collapsedNodeIds().has(nodeId);
  }

  /**
   * Check if a node is hidden
   */
  isHidden(nodeId: string): boolean {
    return this._hiddenNodeIds().has(nodeId);
  }

  /**
   * Check if a node is visible (not hidden)
   */
  isVisible(nodeId: string): boolean {
    return !this._hiddenNodeIds().has(nodeId);
  }

  /**
   * Get count of hidden descendants for a collapsed node
   */
  getHiddenCount(nodeId: string): number {
    const state = this._collapseStates().get(nodeId);
    return state ? state.hiddenDescendantIds.length : 0;
  }

  /**
   * Get IDs of hidden descendants for a collapsed node
   */
  getHiddenDescendants(nodeId: string): string[] {
    const state = this._collapseStates().get(nodeId);
    return state ? [...state.hiddenDescendantIds] : [];
  }

  /**
   * Get visible nodes (filter out hidden ones)
   */
  getVisibleNodes<T>(nodes: FlexiNode<T>[]): FlexiNode<T>[] {
    const hidden = this._hiddenNodeIds();
    return nodes.filter(node => !hidden.has(node.id));
  }

  /**
   * Expand ancestors to reveal a specific node
   * Useful for search functionality
   */
  revealNode(nodeId: string, nodes: FlexiNode[]): void {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Find all ancestor collapsed nodes and expand them
    const ancestorsToExpand = this.findCollapsedAncestors(nodeId, nodes);
    
    for (const ancestorId of ancestorsToExpand) {
      this.expand(ancestorId, nodes);
    }
  }

  /**
   * Get full collapse state for serialization
   */
  getCollapseState(): CollapseState {
    return {
      collapsedNodes: Array.from(this._collapseStates().values())
    };
  }

  /**
   * Restore collapse state from serialization
   */
  restoreCollapseState(state: CollapseState, nodes: FlexiNode[]): void {
    // Clear existing state
    this._collapseStates.set(new Map());
    this._collapsedNodeIds.set(new Set());

    // Restore each collapsed node
    for (const nodeState of state.collapsedNodes) {
      const newStates = new Map(this._collapseStates());
      newStates.set(nodeState.nodeId, nodeState);
      this._collapseStates.set(newStates);

      const newCollapsed = new Set(this._collapsedNodeIds());
      newCollapsed.add(nodeState.nodeId);
      this._collapsedNodeIds.set(newCollapsed);
    }

    // Recalculate hidden nodes based on current graph
    this.recalculateHiddenNodes(nodes);
  }

  /**
   * Clear all collapse state
   */
  clear(): void {
    this._collapseStates.set(new Map());
    this._collapsedNodeIds.set(new Set());
    this._hiddenNodeIds.set(new Set());
  }

  /**
   * Handle node deletion - clean up collapse state
   */
  onNodeDeleted(nodeId: string, nodes: FlexiNode[]): void {
    // If deleted node was collapsed, remove its state
    if (this._collapsedNodeIds().has(nodeId)) {
      const newStates = new Map(this._collapseStates());
      newStates.delete(nodeId);
      this._collapseStates.set(newStates);

      const newCollapsed = new Set(this._collapsedNodeIds());
      newCollapsed.delete(nodeId);
      this._collapsedNodeIds.set(newCollapsed);
    }

    // Recalculate hidden nodes
    this.recalculateHiddenNodes(nodes);
  }

  /**
   * Check if a node can be collapsed (has visible children)
   */
  canCollapse(nodeId: string, nodes: FlexiNode[]): boolean {
    if (this._collapsedNodeIds().has(nodeId)) {
      return false;
    }
    const children = this.findDirectChildren(nodeId, nodes);
    return children.length > 0;
  }

  /**
   * Check if a node can be expanded (is currently collapsed)
   */
  canExpand(nodeId: string): boolean {
    return this._collapsedNodeIds().has(nodeId);
  }

  // =====================
  // Private Helper Methods
  // =====================

  /**
   * Find all descendant node IDs of a given node
   */
  private findAllDescendants(nodeId: string, nodes: FlexiNode[]): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (currentId: string) => {
      const children = this.findDirectChildren(currentId, nodes);
      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          descendants.push(child.id);
          traverse(child.id);
        }
      }
    };

    traverse(nodeId);
    return descendants;
  }

  /**
   * Find direct children of a node
   */
  private findDirectChildren(nodeId: string, nodes: FlexiNode[]): FlexiNode[] {
    return nodes.filter(node => node.parentIds?.includes(nodeId));
  }

  /**
   * Find collapsed ancestors that are hiding a node
   */
  private findCollapsedAncestors(nodeId: string, nodes: FlexiNode[]): string[] {
    const ancestors: string[] = [];
    const collapsedNodes = this._collapsedNodeIds();

    const findAncestors = (currentId: string) => {
      const node = nodes.find(n => n.id === currentId);
      if (!node || !node.parentIds) return;

      for (const parentId of node.parentIds) {
        if (collapsedNodes.has(parentId)) {
          ancestors.push(parentId);
        }
        findAncestors(parentId);
      }
    };

    findAncestors(nodeId);
    return ancestors;
  }

  /**
   * Recalculate which nodes should be hidden based on all collapsed nodes
   * A node is hidden if ANY of its ancestors is collapsed
   */
  private recalculateHiddenNodes(nodes: FlexiNode[]): void {
    const hidden = new Set<string>();
    const collapsedNodes = this._collapsedNodeIds();

    // For each collapsed node, hide all descendants
    for (const collapsedId of collapsedNodes) {
      const descendants = this.findAllDescendants(collapsedId, nodes);
      descendants.forEach(id => hidden.add(id));
    }

    this._hiddenNodeIds.set(hidden);
  }
}
