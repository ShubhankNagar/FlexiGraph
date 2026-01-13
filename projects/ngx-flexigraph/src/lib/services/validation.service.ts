import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { FlexiNode } from '../models/graph.models';
import type { FlexiGraphConfig } from '../models/config.models';
import { wouldCreateCycle, getNodeDepth, getNodeHeight } from '../utils/graph-algorithms';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class ValidationService {
  private _validationError = new Subject<{ 
    action?: string; 
    error?: string;
    type?: string;
    message?: string;
    sourceId?: string;
    targetId?: string;
  }>();
  readonly validationError = this._validationError.asObservable();

  /**
   * Validate adding a parent-child relationship (edge)
   */
  async validateEdge<T>(
    nodes: FlexiNode<T>[],
    sourceId: string, 
    targetId: string, 
    config: FlexiGraphConfig,
    emitError = false
  ): Promise<ValidationResult> {
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);

    if (!source || !target) {
      const error = 'Source or target node not found';
      if (emitError) this._validationError.next({ action: 'addParent', error });
      return { isValid: false, error };
    }

    // Check if edge already exists
    if (target.parentIds.includes(sourceId)) {
      const error = 'Edge already exists';
      if (emitError) this._validationError.next({ action: 'addParent', error });
      return { isValid: false, error };
    }

    // Self-loop check
    if (!config.validation?.allowSelfLoops && sourceId === targetId) {
      const error = 'Self-loops are not allowed';
      if (emitError) this._validationError.next({ action: 'addParent', error });
      return { isValid: false, error };
    }

    // Cycle check
    if (!config.validation?.allowCycles && sourceId !== targetId && wouldCreateCycle(nodes, sourceId, targetId)) {
      this._validationError.next({
        type: 'cycle',
        message: 'Cycle detected',
        sourceId,
        targetId
      });
      return { isValid: false, error: 'Cycle detected' };
    }

    // Max parents check
    const maxParents = config.multiParent?.maxParents || 0;
    if (maxParents > 0 && target.parentIds.length >= maxParents) {
      const error = `Node cannot have more than ${maxParents} parents`;
      if (emitError) this._validationError.next({ action: 'addParent', error });
      return { isValid: false, error };
    }

    // Max depth check
    const maxDepth = config.validation?.maxDepth || 0;
    if (maxDepth > 0) {
      const parentDepth = getNodeDepth(nodes, sourceId);
      const childHeight = getNodeHeight(nodes, targetId);
      // New depth would be parent's depth + 1 (edge to child) + child's height
      if (parentDepth + 1 + childHeight > maxDepth) {
         const error = `This connection would exceed the maximum graph depth of ${maxDepth}`;
         if (emitError) this._validationError.next({ action: 'addParent', error });
         return { isValid: false, error };
      }
    }

    // Custom validator
    if (config.validation?.customValidator) {
      try {
        const result = await config.validation.customValidator(sourceId, targetId, nodes);
        if (!result) {
          const error = 'Custom validation failed';
          if (emitError) this._validationError.next({ action: 'addParent', error });
          return { isValid: false, error };
        }
      } catch (e) {
          const error = `Custom validation error: ${e}`;
          if (emitError) this._validationError.next({ action: 'addParent', error });
          return { isValid: false, error };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate reparenting (replacing parents)
   */
  async validateReparent<T>(
    nodes: FlexiNode<T>[],
    childId: string,
    newParentId: string,
    config: FlexiGraphConfig,
    emitError = false
  ): Promise<ValidationResult> {
    // Same node check
    if (childId === newParentId) {
      const error = 'Cannot reparent a node to itself';
      if (emitError) this._validationError.next({ action: 'reparent', error });
      return { isValid: false, error };
    }

    const child = nodes.find(n => n.id === childId);
    const parent = nodes.find(n => n.id === newParentId);

    if (!child || !parent) {
      const error = 'Node not found';
      if (emitError) this._validationError.next({ action: 'reparent', error });
      return { isValid: false, error };
    }

    // Cycle check
    if (!config.validation?.allowCycles && wouldCreateCycle(nodes, newParentId, childId)) {
      const error = 'This connection would create a circular dependency';
      if (emitError) this._validationError.next({ action: 'reparent', error });
      return { isValid: false, error };
    }

    // Max depth check
    const maxDepth = config.validation?.maxDepth || 0;
    if (maxDepth > 0) {
      const parentDepth = getNodeDepth(nodes, newParentId);
      const childHeight = getNodeHeight(nodes, childId);
      if (parentDepth + 1 + childHeight > maxDepth) {
         const error = `This connection would exceed the maximum graph depth of ${maxDepth}`;
         if (emitError) this._validationError.next({ action: 'reparent', error });
         return { isValid: false, error };
      }
    }

    // Custom validator
    if (config.validation?.customValidator) {
      try {
        const result = await config.validation.customValidator(newParentId, childId, nodes);
        if (!result) {
          const error = 'Custom validation failed';
          if (emitError) this._validationError.next({ action: 'reparent', error });
          return { isValid: false, error };
        }
      } catch (e) {
          const error = `Custom validation error: ${e}`;
          if (emitError) this._validationError.next({ action: 'reparent', error });
          return { isValid: false, error };
      }
    }

    return { isValid: true };
  }
}
