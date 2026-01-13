/**
 * FlexiGraph Error Classes
 * Comprehensive error handling for the ngx-flexigraph library
 */

/**
 * Base error class for all FlexiGraph errors
 */
export class FlexiGraphError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'FlexiGraphError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    const ErrorWithCaptureStackTrace = Error as any;
    if (typeof ErrorWithCaptureStackTrace.captureStackTrace === 'function') {
      ErrorWithCaptureStackTrace.captureStackTrace(this, FlexiGraphError);
    }
  }
}

/**
 * Validation error - thrown when graph operations violate validation rules
 */
export class ValidationError extends FlexiGraphError {
  constructor(
    message: string,
    public readonly validationType: 'cycle' | 'self-loop' | 'max-depth' | 'max-parents' | 'max-children' | 'custom',
    details?: Record<string, any>
  ) {
    super(message, `VALIDATION_${validationType.toUpperCase().replace('-', '_')}`, details);
    this.name = 'ValidationError';
  }
}

/**
 * Cycle detection error - thrown when an operation would create a cycle
 */
export class CycleDetectedError extends ValidationError {
  constructor(
    public readonly sourceNodeId: string,
    public readonly targetNodeId: string,
    public readonly cyclePath?: string[]
  ) {
    super(
      `Cannot create edge: would create a cycle between "${sourceNodeId}" and "${targetNodeId}"`,
      'cycle',
      { sourceNodeId, targetNodeId, cyclePath }
    );
    this.name = 'CycleDetectedError';
  }
}

/**
 * Self-loop error - thrown when trying to connect a node to itself
 */
export class SelfLoopError extends ValidationError {
  constructor(public readonly nodeId: string) {
    super(
      `Cannot create self-loop on node "${nodeId}"`,
      'self-loop',
      { nodeId }
    );
    this.name = 'SelfLoopError';
  }
}

/**
 * Max depth error - thrown when operation would exceed maximum depth
 */
export class MaxDepthError extends ValidationError {
  constructor(
    public readonly nodeId: string,
    public readonly currentDepth: number,
    public readonly maxDepth: number
  ) {
    super(
      `Maximum depth of ${maxDepth} would be exceeded for node "${nodeId}" (current: ${currentDepth})`,
      'max-depth',
      { nodeId, currentDepth, maxDepth }
    );
    this.name = 'MaxDepthError';
  }
}

/**
 * Max parents error - thrown when node would exceed maximum parent count
 */
export class MaxParentsError extends ValidationError {
  constructor(
    public readonly nodeId: string,
    public readonly currentParentCount: number,
    public readonly maxParents: number
  ) {
    super(
      `Node "${nodeId}" cannot have more than ${maxParents} parents (current: ${currentParentCount})`,
      'max-parents',
      { nodeId, currentParentCount, maxParents }
    );
    this.name = 'MaxParentsError';
  }
}

/**
 * Node not found error - thrown when a referenced node doesn't exist
 */
export class NodeNotFoundError extends FlexiGraphError {
  constructor(public readonly nodeId: string) {
    super(
      `Node with id "${nodeId}" not found`,
      'NODE_NOT_FOUND',
      { nodeId }
    );
    this.name = 'NodeNotFoundError';
  }
}

/**
 * Export error - thrown when graph export fails
 */
export class ExportError extends FlexiGraphError {
  constructor(
    message: string,
    public readonly format: string,
    public readonly originalError?: Error
  ) {
    super(
      `Export to ${format} failed: ${message}`,
      'EXPORT_FAILED',
      { format, originalError: originalError?.message }
    );
    this.name = 'ExportError';
  }
}

/**
 * Configuration error - thrown when invalid configuration is provided
 */
export class ConfigurationError extends FlexiGraphError {
  constructor(
    message: string,
    public readonly configPath?: string
  ) {
    super(
      `Configuration error${configPath ? ` at "${configPath}"` : ''}: ${message}`,
      'CONFIG_ERROR',
      { configPath }
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Layout error - thrown when layout calculation fails
 */
export class LayoutError extends FlexiGraphError {
  constructor(
    message: string,
    public readonly algorithm: string
  ) {
    super(
      `Layout error with "${algorithm}": ${message}`,
      'LAYOUT_ERROR',
      { algorithm }
    );
    this.name = 'LayoutError';
  }
}

/**
 * Helper function to check if an error is a FlexiGraph error
 */
export function isFlexiGraphError(error: unknown): error is FlexiGraphError {
  return error instanceof FlexiGraphError;
}

/**
 * Helper function to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
