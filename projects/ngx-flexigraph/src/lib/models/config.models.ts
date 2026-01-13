/**
 * Configuration interfaces for ngx-flexigraph library
 * Defines all customization options for the graph editor
 */

import { TemplateRef } from '@angular/core';
import type { FlexiNode } from './graph.models';

/**
 * Main configuration interface for FlexiGraph component
 */
export interface FlexiGraphConfig {
  /** Multi-parent behavior configuration */
  multiParent?: MultiParentConfig;
  /** Validation rules configuration */
  validation?: ValidationConfig;
  /** Visual styling configuration */
  styling?: StylingConfig;
  /** Layout algorithm configuration */
  layout?: LayoutConfig;
  /** User interaction configuration */
  interaction?: InteractionConfig;
  /** History/undo-redo configuration */
  history?: HistoryConfig;
  /** Context menu configuration */
  contextMenu?: ContextMenuConfig;
  /** Zoom and pan configuration */
  zoomPan?: ZoomPanConfig;
  /** Export configuration */
  export?: ExportConfig;
  /** New node creation configuration */
  newNode?: NewNodeConfig;
}

/**
 * New node creation configuration
 */
export interface NewNodeConfig {
  /** Prompt user for node name (true = show input, false = auto-generate) */
  promptForName: boolean;
  /** Default prefix for auto-generated node names */
  defaultNamePrefix: string;
  /** Default node data template */
  defaultData?: any;
}

/**
 * Multi-parent behavior configuration
 */
export interface MultiParentConfig {
  /** Whether multi-parent is enabled */
  enabled: boolean;
  /** Keyboard modifier to trigger combine mode */
  modifier: 'shift' | 'ctrl' | 'alt' | 'meta';
  /** Maximum number of parents allowed per node (0 = unlimited) */
  maxParents?: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Allow cycles in the graph (default: false for DAG) */
  allowCycles: boolean;
  /** Allow self-loops (node connected to itself) */
  allowSelfLoops: boolean;
  /** Maximum tree depth (0 = unlimited) */
  maxDepth?: number;
  /** Maximum children per node (0 = unlimited) */
  maxChildren?: number;
  /** Custom validation function */
  customValidator?: (source: string, target: string, nodes: FlexiNode[]) => boolean | Promise<boolean>;
  /** Show validation error messages */
  showValidationErrors?: boolean;
  /** Validation error display duration (ms) */
  errorDisplayDuration?: number;
}

/**
 * Node styling configuration 
 */
export interface NodeStyleConfig {
  /** Background color */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Text color */
  textColor?: string;
  /** Node shape */
  shape?: 'rectangle' | 'round-rectangle' | 'ellipse' | 'diamond' | 'hexagon' | 'octagon';
  /** Node width (or 'label' for auto-sizing) */
  width?: number | 'label';
  /** Node height */
  height?: number;
  /** Padding around label */
  padding?: number;
  /** Font size */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
}

/**
 * Edge styling configuration
 */
export interface EdgeStyleConfig {
  /** Line color */
  lineColor?: string;
  /** Line width */
  lineWidth?: number;
  /** Arrow shape at target */
  targetArrowShape?: 'triangle' | 'triangle-backcurve' | 'vee' | 'circle' | 'square' | 'diamond' | 'none';
  /** Arrow color */
  arrowColor?: string;
  /** Curve style */
  curveStyle?: 'bezier' | 'straight' | 'segments' | 'taxi';
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Visual styling configuration
 */
/**
 * Base interface for graph visual styles
 */
export interface GraphTheme {
  /** Default node style */
  nodeStyle?: NodeStyleConfig;
  /** Selected node style (merged with default) */
  selectedNodeStyle?: Partial<NodeStyleConfig>;
  /** Hovered node style (merged with default) */
  hoveredNodeStyle?: Partial<NodeStyleConfig>;
  /** Default edge style */
  edgeStyle?: EdgeStyleConfig;
  /** Graph background color */
  backgroundColor?: string;
  /** Selection box color */
  selectionBoxColor?: string;
}

/**
 * Visual styling configuration
 */
export interface StylingConfig extends GraphTheme {
  /** Theme preset or custom theme object */
  theme?: 'light' | 'dark' | 'high-contrast' | 'blue' | GraphTheme;
}

/**
 * Layout algorithm configuration
 */
export interface LayoutConfig {
  /** Layout algorithm to use */
  algorithm: 'dagre' | 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric';
  /** Layout direction (for hierarchical layouts) */
  direction: 'LR' | 'TB' | 'RL' | 'BT';
  /** Animate layout changes */
  animate: boolean;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Animation easing function */
  animationEasing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Spacing between nodes */
  nodeSpacing?: number;
  /** Spacing between ranks/levels */
  rankSpacing?: number;
  /** Fit graph to viewport after layout */
  fit?: boolean;
  /** Padding around graph when fitting */
  padding?: number;
  /** Algorithm-specific options */
  options?: Record<string, any>;
}

/**
 * User interaction configuration
 */
export interface InteractionConfig {
  /** Enable node dragging */
  enableDrag: boolean;
  /** Enable context menu on node click/right-click */
  enableContextMenu: boolean;
  /** Enable box selection */
  enableBoxSelection: boolean;
  /** Snap back to original position on invalid drop */
  snapBackOnInvalid: boolean;
  /** Snap back animation duration (ms) */
  snapBackDuration: number;
  /** Enable edge creation by dragging */
  enableEdgeCreation?: boolean;
  /** Enable node double-click editing */
  enableDoubleClickEdit?: boolean;
  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
}

/**
 * History/undo-redo configuration
 */
export interface HistoryConfig {
  /** Enable undo/redo functionality */
  enabled: boolean;
  /** Maximum number of states to keep in history */
  maxStackSize: number;
  /** Throttle state capture (ms) - prevents too many saves during rapid actions */
  captureThrottleMs?: number;
  /** Auto-save to localStorage */
  autoSaveToStorage?: boolean;
  /** Storage key for auto-save */
  storageKey?: string;
}

/**
 * Context menu item configuration
 */
export interface ContextMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon (SVG string or icon class) */
  icon?: string;
  /** Click handler */
  action: (node: any) => void;
  /** Whether to show this item */
  visible?: (node: any) => boolean;
  /** Whether item is disabled */
  disabled?: (node: any) => boolean;
  /** Custom CSS class */
  cssClass?: string;
  /** Separator before this item */
  separatorBefore?: boolean;
  /** Keyboard shortcut hint */
  shortcut?: string;
}

/**
 * Context menu configuration
 */
export interface ContextMenuConfig {
  /** Enable context menu */
  enabled: boolean;
  /** Menu items */
  items: ContextMenuItem[];
  /** Menu position strategy */
  position: 'auto' | 'right' | 'left' | 'cursor';
  /** Custom template for menu */
  customTemplate?: TemplateRef<any>;
  /** Offset from node */
  offset?: number;
  /** Menu width */
  width?: number;
  /** Close on outside click */
  closeOnOutsideClick?: boolean;
  /** Close on pan/zoom */
  closeOnPanZoom?: boolean;
}

/**
 * Zoom and pan configuration
 */
export interface ZoomPanConfig {
  /** Enable zoom */
  enableZoom: boolean;
  /** Enable pan */
  enablePan: boolean;
  /** Minimum zoom level */
  minZoom: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Zoom sensitivity for mouse wheel */
  zoomSensitivity: number;
  /** Enable pinch-to-zoom on touch devices */
  enablePinchZoom: boolean;
  /** Show zoom controls UI */
  showZoomControls: boolean;
  /** Zoom controls position */
  controlsPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Enable double-click to zoom to node */
  doubleClickZoom: boolean;
  /** Smooth zoom animation */
  smoothZoom: boolean;
  /** Zoom animation duration */
  zoomAnimationDuration: number;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  /** Enable export functionality */
  enabled: boolean;
  /** Default filename prefix */
  filename?: string;
  /** Available export formats */
  formats: Array<'png' | 'svg' | 'jpeg' | 'webp' | 'json' | 'csv' | 'pdf'>;
  /** Default background color for image exports */
  defaultBackgroundColor?: string;
  /** Default scale for image exports */
  defaultScale?: number;
  /** Default quality for jpeg/webp */
  defaultQuality?: number;
  /** Show export button in toolbar */
  showExportButton?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_FLEXIGRAPH_CONFIG: FlexiGraphConfig = {
  multiParent: {
    enabled: true,
    modifier: 'shift',
    maxParents: 0
  },
  validation: {
    allowCycles: false,
    allowSelfLoops: false,
    maxDepth: 0,
    maxChildren: 0,
    showValidationErrors: true,
    errorDisplayDuration: 3000
  },
  styling: {
    theme: 'light',
    nodeStyle: {
      backgroundColor: '#eef3f8',
      borderColor: '#d1dfea',
      borderWidth: 2,
      textColor: '#333333',
      shape: 'round-rectangle',
      width: 'label',
      height: 40,
      padding: 10,
      fontSize: 14,
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    selectedNodeStyle: {
      backgroundColor: '#007bff',
      borderColor: '#0056b3',
      borderWidth: 3,
      textColor: '#ffffff'
    },
    edgeStyle: {
      lineColor: '#cccccc',
      lineWidth: 2,
      targetArrowShape: 'triangle',
      arrowColor: '#cccccc',
      curveStyle: 'bezier',
      lineStyle: 'solid'
    },
    backgroundColor: '#ffffff'
  },
  layout: {
    algorithm: 'dagre',
    direction: 'LR',
    animate: true,
    animationDuration: 500,
    animationEasing: 'ease-out',
    nodeSpacing: 50,
    rankSpacing: 100,
    fit: true,
    padding: 30
  },
  interaction: {
    enableDrag: true,
    enableContextMenu: true,
    enableBoxSelection: true,
    snapBackOnInvalid: true,
    snapBackDuration: 200,
    enableKeyboardShortcuts: true
  },
  history: {
    enabled: true,
    maxStackSize: 50,
    captureThrottleMs: 100
  },
  contextMenu: {
    enabled: true,
    items: [],
    position: 'auto',
    offset: 10,
    width: 160,
    closeOnOutsideClick: true,
    closeOnPanZoom: true
  },
  zoomPan: {
    enableZoom: true,
    enablePan: true,
    minZoom: 0.1,
    maxZoom: 4,
    zoomSensitivity: 0.1,
    enablePinchZoom: true,
    showZoomControls: true,
    controlsPosition: 'bottom-right',
    doubleClickZoom: true,
    smoothZoom: true,
    zoomAnimationDuration: 200
  },
  export: {
    enabled: true,
    formats: ['png', 'svg', 'json'],
    defaultBackgroundColor: '#ffffff',
    defaultScale: 2,
    defaultQuality: 0.92
  },
  newNode: {
    promptForName: true,
    defaultNamePrefix: 'Node'
  }
};
