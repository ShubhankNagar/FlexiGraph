/**
 * Core interfaces for ngx-flexigraph library
 * Defines node, edge, and graph data structures
 */

/**
 * Represents a node in the graph with generic type support for custom data
 */
export interface FlexiNode<T = any> {
  /** Unique identifier for the node */
  id: string;
  /** Display label for the node */
  label: string;
  /** Array of parent node IDs (for DAG/multi-parent support) */
  parentIds: string[];
  /** Custom user data attached to the node */
  data?: T;
  /** Optional position for manual layout */
  position?: { x: number; y: number };
  /** Whether the node is locked from editing */
  locked?: boolean;
  /** Custom CSS classes to apply */
  classes?: string[];
}

/**
 * Represents an edge (connection) between two nodes
 */
export interface FlexiEdge {
  /** Unique identifier for the edge */
  id?: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Optional edge label */
  label?: string;
  /** Custom user data attached to the edge */
  data?: any;
  /** Custom CSS classes to apply */
  classes?: string[];
}

/**
 * Complete graph data structure
 */
export interface FlexiGraphData<T = any> {
  /** Array of nodes in the graph */
  nodes: FlexiNode<T>[];
  /** Optional array of edges (can be derived from parentIds) */
  edges?: FlexiEdge[];
}

/**
 * Node event payload
 */
export interface NodeEvent<T = any> {
  /** The node that triggered the event */
  node: FlexiNode<T>;
  /** Original Cytoscape event (if applicable) */
  originalEvent?: any;
  /** Mouse/touch position */
  position?: { x: number; y: number };
}

/**
 * Edge event payload
 */
export interface EdgeEvent {
  /** The edge that triggered the event */
  edge: FlexiEdge;
  /** Source node */
  sourceNode: FlexiNode;
  /** Target node */
  targetNode: FlexiNode;
  /** Original Cytoscape event (if applicable) */
  originalEvent?: any;
}

/**
 * Reparent event payload - fired when a node's parent changes
 */
export interface ReparentEvent<T = any> {
  /** The node being reparented */
  node: FlexiNode<T>;
  /** Previous parent IDs */
  previousParentIds: string[];
  /** New parent IDs */
  newParentIds: string[];
  /** Whether this was a combine operation (multi-parent) */
  isCombine: boolean;
}

/**
 * Validation event payload - fired when validation fails
 */
export interface ValidationEvent<T = any> {
  /** Type of validation that failed */
  type: 'cycle' | 'self-loop' | 'max-parents' | 'max-children' | 'custom';
  /** Error message */
  message: string;
  /** The node that caused the validation failure */
  node?: FlexiNode<T>;
  /** Target node (for edge operations) */
  targetNode?: FlexiNode<T>;
}

/**
 * Cycle detection event payload
 */
export interface CycleEvent<T = any> {
  /** The node that would create a cycle */
  sourceNode: FlexiNode<T>;
  /** The target node */
  targetNode: FlexiNode<T>;
  /** Path that would create the cycle */
  cyclePath: string[];
}

/**
 * History/state change event payload
 */
export interface StateChangeEvent<T = any> {
  /** Type of state change */
  type: 'undo' | 'redo' | 'save' | 'restore';
  /** Current graph data */
  currentState: FlexiGraphData<T>;
  /** Number of items in undo stack */
  undoStackSize: number;
  /** Number of items in redo stack */
  redoStackSize: number;
}

/**
 * Node rename event payload
 */
export interface NodeRenameEvent<T = any> {
  /** The node that was renamed */
  node: FlexiNode<T>;
  /** Previous label */
  oldLabel: string;
  /** New label */
  newLabel: string;
}

/**
 * Node add event payload
 */
export interface NodeAddEvent<T = any> {
  /** The newly created node */
  node: FlexiNode<T>;
  /** Parent node ID (if added as child) */
  parentId?: string;
}

/**
 * Zoom event payload
 */
export interface ZoomEvent {
  /** Current zoom level */
  level: number;
  /** Previous zoom level */
  previousLevel: number;
  /** Zoom action type */
  action: 'in' | 'out' | 'reset' | 'fit' | 'wheel' | 'pinch';
}

/**
 * Pan event payload
 */
export interface PanEvent {
  /** Current pan position */
  position: { x: number; y: number };
  /** Pan amount (delta) */
  delta: { x: number; y: number };
}

/**
 * Export event payload
 */
export interface ExportEvent {
  /** Export format */
  format: 'png' | 'svg' | 'json' | 'csv';
  /** Export data (URL or string) */
  data: string;
  /** Export options used */
  options: ExportOptions;
}

/**
 * Export options for image/data export
 */
export interface ExportOptions {
  /** Export format */
  format: 'png' | 'svg' | 'jpeg' | 'webp' | 'json' | 'csv';
  /** Background color (for images) */
  backgroundColor?: string;
  /** Scale factor (for images) */
  scale?: number;
  /** Quality (0-1, for jpeg/webp) */
  quality?: number;
  /** Whether to include only visible area */
  viewportOnly?: boolean;
  /** Include labels in export */
  includeLabels?: boolean;
  /** Custom filename */
  filename?: string;
}
