import { Injectable, signal, computed } from '@angular/core';
import type { FlexiNode, StateChangeEvent } from '../models/graph.models';
import type { HistoryConfig } from '../models/config.models';
import { deepCloneNodes } from '../utils/graph-algorithms';

@Injectable()
export class HistoryService<T = any> {
  // State signals
  private _undoStack = signal<FlexiNode<T>[][]>([]);
  private _redoStack = signal<FlexiNode<T>[][]>([]);
  private _isDirty = signal<boolean>(false);

  // Readonly signals
  readonly undoStack = this._undoStack.asReadonly();
  readonly redoStack = this._redoStack.asReadonly();
  readonly isDirty = this._isDirty.asReadonly();

  // Computed values
  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);

  /**
   * Reset history state
   */
  clear(): void {
    this._undoStack.set([]);
    this._redoStack.set([]);
    this._isDirty.set(false);
  }

  /**
   * Configure/Initialize with initial state if needed
   * (Currently just clears, but could load history)
   */
  initialize(): void {
    this.clear();
  }

  /**
   * Push current state to undo stack before mutation
   */
  saveState(currentNodes: FlexiNode<T>[], config?: HistoryConfig): void {
    if (!config?.enabled) return;

    // Clone to ensure immutability in history
    const stateSnapshot = deepCloneNodes(currentNodes);
    
    this._undoStack.update(stack => {
      const newStack = [...stack, stateSnapshot];
      // Limit stack size
      const maxSize = config.maxStackSize || 50;
      if (newStack.length > maxSize) {
        return newStack.slice(-maxSize);
      }
      return newStack;
    });

    // Clear redo stack on new action
    this._redoStack.set([]);
    this._isDirty.set(true);
  }

  /**
   * Undo: Returns previous state and updates stacks
   * @param currentNodes Current state to push to redo stack
   */
  undo(currentNodes: FlexiNode<T>[]): StateChangeEvent<T> | null {
    const undoStack = this._undoStack();
    if (undoStack.length === 0) return null;

    const snapshot = deepCloneNodes(currentNodes);
    const previousNodes = undoStack[undoStack.length - 1];

    // Move current state to redo stack
    this._redoStack.update(stack => [...stack, snapshot]);
    
    // Pop from undo stack
    this._undoStack.update(stack => stack.slice(0, -1));
    
    // Update dirty flag
    if (this._undoStack().length === 0) {
      this._isDirty.set(false);
    }

    return {
      type: 'undo',
      currentState: { nodes: previousNodes },
      undoStackSize: this._undoStack().length,
      redoStackSize: this._redoStack().length
    };
  }

  /**
   * Redo: Returns next state and updates stacks
   * @param currentNodes Current state to push to undo stack
   */
  redo(currentNodes: FlexiNode<T>[]): StateChangeEvent<T> | null {
    const redoStack = this._redoStack();
    if (redoStack.length === 0) return null;

    const snapshot = deepCloneNodes(currentNodes);
    const nextNodes = redoStack[redoStack.length - 1];

    // Move current state to undo stack
    this._undoStack.update(stack => [...stack, snapshot]);
    
    // Pop from redo stack
    this._redoStack.update(stack => stack.slice(0, -1));
    
    this._isDirty.set(true);

    return {
      type: 'redo',
      currentState: { nodes: nextNodes },
      undoStackSize: this._undoStack().length,
      redoStackSize: this._redoStack().length
    };
  }

  markClean(): void {
    this._isDirty.set(false);
    this._undoStack.set([]);
    this._redoStack.set([]);
  }
}
