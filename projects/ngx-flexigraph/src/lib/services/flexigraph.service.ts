import { Injectable, signal, computed, inject } from '@angular/core';
import type { FlexiNode, FlexiGraphData, StateChangeEvent } from '../models/graph.models';
import type { FlexiGraphConfig } from '../models/config.models';
import { DEFAULT_FLEXIGRAPH_CONFIG } from '../models/config.models';
import { deepCloneNodes, generateNodeId } from '../utils/graph-algorithms';
import { HistoryService } from './history.service';
import { ValidationService } from './validation.service';
import { Subject } from 'rxjs';

@Injectable()
export class FlexiGraphService<T = any> {
  private historyService = inject(HistoryService<T>);
  private validationService = inject(ValidationService);

  // State signals
  private _nodes = signal<FlexiNode<T>[]>([]);
  private _config = signal<FlexiGraphConfig>(DEFAULT_FLEXIGRAPH_CONFIG);

  // Public computed signals
  readonly nodes = this._nodes.asReadonly();
  readonly config = this._config.asReadonly();
  
  // Delegated signals
  readonly undoStack = this.historyService.undoStack;
  readonly redoStack = this.historyService.redoStack;
  readonly isDirty = this.historyService.isDirty;
  readonly canUndo = this.historyService.canUndo;
  readonly canRedo = this.historyService.canRedo;

  // Event subjects
  private _linkAdd = new Subject<{ sourceId: string, targetId: string }>();
  private _linkRemove = new Subject<{ sourceId: string, targetId: string }>();

  // Public events
  readonly linkAdd = this._linkAdd.asObservable();
  readonly linkRemove = this._linkRemove.asObservable();
  readonly validationError = this.validationService.validationError;

  readonly nodeCount = computed(() => this._nodes().length);

  /**
   * Initialize the service with nodes and optional config
   */
  initialize(nodes: FlexiNode<T>[], config?: Partial<FlexiGraphConfig>): void {
    this._nodes.set(deepCloneNodes(nodes));
    if (config) {
      this._config.set({ ...DEFAULT_FLEXIGRAPH_CONFIG, ...config });
    }
    this.historyService.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FlexiGraphConfig>): void {
    this._config.update(current => ({ ...current, ...config }));
  }

  /**
   * Save current state to history (before making changes)
   */
  saveState(): void {
    this.historyService.saveState(this._nodes(), this._config().history);
  }

  /**
   * Undo the last action
   */
  undo(): StateChangeEvent<T> | null {
    const result = this.historyService.undo(this._nodes());
    if (result) {
      this._nodes.set(result.currentState.nodes);
    }
    return result;
  }

  /**
   * Redo the last undone action
   */
  redo(): StateChangeEvent<T> | null {
    const result = this.historyService.redo(this._nodes());
    if (result) {
      this._nodes.set(result.currentState.nodes);
    }
    return result;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): FlexiNode<T> | undefined {
    return this._nodes().find(n => n.id === id);
  }

  /**
   * Add a new node
   */
  addNode(node: Partial<FlexiNode<T>> & { label: string }): FlexiNode<T> | null {
    if (node.id && this.getNode(node.id)) {
      return null;
    }
    this.saveState();

    const newNode: FlexiNode<T> = {
      id: node.id || generateNodeId(this._nodes()),
      label: node.label,
      parentIds: node.parentIds || [],
      data: node.data,
      position: node.position,
      locked: node.locked,
      classes: node.classes
    };

    this._nodes.update(nodes => [...nodes, newNode]);
    return newNode;
  }

  /**
   * Update a node
   */
  updateNode(id: string, updates: Partial<FlexiNode<T>>): FlexiNode<T> | null {
    const node = this.getNode(id);
    if (!node) return null;

    this.saveState();

    this._nodes.update(nodes => 
      nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    );

    return this.getNode(id) || null;
  }

  /**
   * Remove a node and all its edges
   */
  removeNode(id: string): boolean {
    const node = this.getNode(id);
    if (!node) return false;

    this.saveState();

    this._nodes.update(nodes => {
      // Remove the node
      const filtered = nodes.filter(n => n.id !== id);
      
      // Emit removing edges where node is child
      if (node && node.parentIds) {
        node.parentIds.forEach(pid => this._linkRemove.next({ sourceId: pid, targetId: id }));
      }

      // Remove references to this node from other nodes' parentIds
      return filtered.map(n => {
        if (n.parentIds.includes(id)) {
          this._linkRemove.next({ sourceId: id, targetId: n.id });
          return {
            ...n,
            parentIds: n.parentIds.filter(pid => pid !== id)
          };
        }
        return n;
      });
    });

    return true;
  }

  /**
   * Add a parent to a node (create edge)
   * Returns false if validation fails
   */
  async addParent(childId: string, parentId: string, validate = true): Promise<boolean> {
    if (validate) {
      const validation = await this.validationService.validateEdge(
        this._nodes(), 
        parentId, 
        childId, 
        this._config(),
        true // Emit error events
      );
      if (!validation.isValid) return false;
    }

    // Double check specific conditions like edge already exists if not covered by validateEdge fully
    // validateEdge covers existing edge check
    const child = this.getNode(childId);
    if (!child || child.parentIds.includes(parentId)) {
      if (!validate) return false; // If skipping validation but physically impossible/redundant
    }

    this.saveState();

    this._nodes.update(nodes =>
      nodes.map(n => n.id === childId 
        ? { ...n, parentIds: [...n.parentIds, parentId] }
        : n
      )
    );

    this._linkAdd.next({ sourceId: parentId, targetId: childId });

    return true;
  }

  /**
   * Remove a parent from a node (remove edge)
   */
  removeParent(childId: string, parentId: string): boolean {
    const child = this.getNode(childId);
    if (!child || !child.parentIds.includes(parentId)) return false;

    this.saveState();

    this._nodes.update(nodes =>
      nodes.map(n => n.id === childId
        ? { ...n, parentIds: n.parentIds.filter(pid => pid !== parentId) }
        : n
      )
    );

    this._linkRemove.next({ sourceId: parentId, targetId: childId });

    return true;
  }

  /**
   * Reparent a node - replace all parents with a new parent
   */
  async reparent(childId: string, newParentId: string): Promise<boolean> {
    return this.setParents(childId, [newParentId]);
  }

  /**
   * Set parents for a node (replacing existing)
   */
  async setParents(childId: string, parentIds: string[], validate = true): Promise<boolean> {
    const child = this.getNode(childId);
    if (!child) return false;

    if (validate) {
      const config = this._config();
      // Validate each new parent
      for (const parentId of parentIds) {
        // We check using validateEdge but with emitError=true
        const res = await this.validationService.validateEdge(this._nodes(), parentId, childId, config, true);
        
        // Ignore "Edge already exists" error because we might be re-adding the same parent in setParents
        // Check "Edge already exists" string carefully, or improve ValidationResult to include code
        if (!res.isValid && res.error !== 'Edge already exists' && !res.error?.includes('more than')) {
          return false;
        }
        
        // Check max parents for the NEW set
        const maxParents = config.multiParent?.maxParents || 0;
        if (maxParents > 0 && parentIds.length > maxParents) {
          // Manually emit error since validateEdge checks against *current* count
          this.validationService['validateEdge']([], '', '', config, true); // Hack to access emit? No.
           // We should probably just fail. 
           // If we want to emit, we need a way.
           // Actually, let's just let the loop check happen.
           // But validateEdge checks against *existing* parents.
           // If we are replacing, we should check against *new* count.
           // So the manual check below is correct.
        }
      }
      
      const maxParents = config.multiParent?.maxParents || 0;
      if (maxParents > 0 && parentIds.length > maxParents) {
         // Emit error manually? 
         // Since we can't easily trigger the service emission without private access,
         // maybe we skip emitting specific error for this case or accept it.
         // Or we can call validateEdge with a dummy node to trigger the error if we really want consistency.
         return false;
      }
    }
    
    // Calculate and emit diffs
    const oldParentIds = child.parentIds;
    const added = parentIds.filter(pid => !oldParentIds.includes(pid));
    const removed = oldParentIds.filter(pid => !parentIds.includes(pid));

    this.saveState();

    this._nodes.update(nodes =>
      nodes.map(n => n.id === childId ? { ...n, parentIds } : n)
    );

    added.forEach(pid => this._linkAdd.next({ sourceId: pid, targetId: childId }));
    removed.forEach(pid => this._linkRemove.next({ sourceId: pid, targetId: childId }));

    return true;
  }

  /**
   * Detach a node from all parents (make it a root)
   */
  detachNode(nodeId: string): boolean {
    const node = this.getNode(nodeId);
    if (!node || node.parentIds.length === 0) return false;

    this.saveState();

    this._nodes.update(nodes =>
      nodes.map(n => n.id === nodeId ? { ...n, parentIds: [] } : n)
    );

    node.parentIds.forEach(pid => this._linkRemove.next({ sourceId: pid, targetId: nodeId }));

    return true;
  }

  /**
   * Check if reparenting would be valid
   */
  async canReparent(childId: string, newParentId: string): Promise<boolean> {
    const res = await this.validationService.validateReparent(
      this._nodes(), 
      childId, 
      newParentId, 
      this._config()
    );
    return res.isValid;
  }

  /**
   * Clear dirty flag (after save)
   */
  markClean(): void {
    this.historyService.markClean();
  }

  /**
   * Get current graph data
   */
  getGraphData(): FlexiGraphData<T> {
    return {
      nodes: deepCloneNodes(this._nodes())
    };
  }

  /**
   * Set nodes directly (for restoration)
   */
  setNodes(nodes: FlexiNode<T>[]): void {
    this._nodes.set(deepCloneNodes(nodes));
  }
  
  // Expose services if needed (or just their methods)
  // For now keep it internal
}
