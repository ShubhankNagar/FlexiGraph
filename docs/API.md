# API Documentation

Complete API reference for ngx-flexigraph.

## Table of Contents

- [FlexiGraphComponent](#flexigraphcomponent)
- [FlexiNode Interface](#flexinode-interface)
- [FlexiGraphConfig](#flexigraphconfig)
- [Events](#events)
- [Public Methods](#public-methods)
- [Services](#services)

---

## FlexiGraphComponent

The main component for rendering the graph.

### Selector

```html
<flexi-graph></flexi-graph>
```

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `nodes` | `FlexiNode[]` | `[]` | Array of nodes to display |
| `config` | `FlexiGraphConfig \| () => FlexiGraphConfig` | Default config | Configuration object or getter function |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `nodeClick` | `EventEmitter<NodeEvent>` | Emitted when a node is clicked |
| `nodeDoubleClick` | `EventEmitter<NodeEvent>` | Emitted on double-click |
| `nodeReparent` | `EventEmitter<ReparentEvent>` | Emitted when a node is reparented |
| `stateChange` | `EventEmitter<StateChangeEvent>` | Emitted when undo/redo state changes |
| `validationFailed` | `EventEmitter<ValidationEvent>` | Emitted when validation fails |
| `nodeCollapse` | `EventEmitter<CollapseEvent>` | Emitted when a node is collapsed |
| `nodeExpand` | `EventEmitter<ExpandEvent>` | Emitted when a node is expanded |

---

## FlexiNode Interface

```typescript
interface FlexiNode<T = any> {
  id: string;              // Unique identifier
  label: string;           // Display text
  parentIds: string[];     // Array of parent node IDs
  data?: T;                // Custom data payload
  collapsed?: boolean;     // Whether node is collapsed
  hiddenChildCount?: number; // Count of hidden children
}
```

---

## FlexiGraphConfig

### Full Configuration

```typescript
interface FlexiGraphConfig {
  styling?: StylingConfig;
  layout?: LayoutConfig;
  multiParent?: MultiParentConfig;
  zoomPan?: ZoomPanConfig;
  interaction?: InteractionConfig;
  export?: ExportConfig;
}
```

### StylingConfig

```typescript
interface StylingConfig {
  theme?: 'dark' | 'light' | 'blue' | 'high-contrast';
  nodeStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    borderWidth?: number;
    shape?: 'rectangle' | 'round-rectangle' | 'ellipse';
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
  };
  selectedNodeStyle?: NodeStyle;
  hoveredNodeStyle?: NodeStyle;
  edgeStyle?: {
    lineColor?: string;
    arrowColor?: string;
    lineWidth?: number;
    curveStyle?: 'bezier' | 'straight' | 'taxi';
    targetArrowShape?: 'triangle' | 'vee' | 'none';
  };
  backgroundColor?: string;
}
```

### LayoutConfig

```typescript
interface LayoutConfig {
  algorithm?: 'dagre' | 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric';
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  nodeSpacing?: number;
  rankSpacing?: number;
  fit?: boolean;
  padding?: number;
}
```

### ZoomPanConfig

```typescript
interface ZoomPanConfig {
  enableZoom?: boolean;
  enablePan?: boolean;
  showZoomControls?: boolean;
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minZoom?: number;
  maxZoom?: number;
  zoomSensitivity?: number;
  enablePinchZoom?: boolean;
  doubleClickZoom?: boolean;
}
```

---

## Events

### NodeEvent

```typescript
interface NodeEvent {
  node: FlexiNode;
  originalEvent?: MouseEvent;
}
```

### ReparentEvent

```typescript
interface ReparentEvent {
  node: FlexiNode;
  oldParentIds: string[];
  newParentIds: string[];
  isCombine: boolean;
}
```

### StateChangeEvent

```typescript
interface StateChangeEvent {
  undoStackSize: number;
  redoStackSize: number;
  nodes: FlexiNode[];
}
```

---

## Public Methods

Access via `ViewChild`:

```typescript
@ViewChild('graph') graph!: FlexiGraphComponent;
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `undo()` | - | `void` | Undo last action |
| `redo()` | - | `void` | Redo last undone action |
| `zoomIn()` | - | `void` | Zoom in by one step |
| `zoomOut()` | - | `void` | Zoom out by one step |
| `zoomFit()` | - | `void` | Fit graph to viewport |
| `zoomReset()` | - | `void` | Reset zoom to 100% |
| `collapseNode(id)` | `string` | `void` | Collapse a node |
| `expandNode(id)` | `string` | `void` | Expand a node |
| `expandAll()` | - | `void` | Expand all nodes |
| `exportGraph(format)` | `'png' \| 'svg' \| 'pdf' \| 'json' \| 'csv'` | `Promise<void>` | Export graph |
| `forceFullLayout()` | - | `void` | Re-run full layout |
| `getCytoscape()` | - | `Core` | Get Cytoscape instance |

---

## Services

### HistoryService

Manages undo/redo state.

```typescript
import { HistoryService } from 'ngx-flexigraph';

// Inject in component
constructor(private history: HistoryService) {}

// Check if can undo/redo
this.history.canUndo();
this.history.canRedo();
```

### ExportService

Handles graph export.

```typescript
import { ExportService } from 'ngx-flexigraph';

const exportService = new ExportService();
await exportService.exportPng(cytoscape);
await exportService.exportJson(nodes);
```

### CollapseService

Manages collapse/expand state.

```typescript
import { CollapseService } from 'ngx-flexigraph';

const collapseService = new CollapseService();
collapseService.collapse(nodeId, nodes);
collapseService.expand(nodeId, nodes);
```
