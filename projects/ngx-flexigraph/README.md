# ngx-flexigraph

[![npm version](https://img.shields.io/npm/v/ngx-flexigraph.svg)](https://www.npmjs.com/package/ngx-flexigraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Interactive DAG editor for Angular** with drag-and-drop reparenting, multi-parent support, cycle detection, zoom controls, and export capabilities.

## ✨ Features

- 🔄 **Drag-to-reparent** with visual feedback and snap-back animation
- 👨‍👩‍👧 **Multi-parent DAG support** with keyboard modifiers (Shift+drag)
- 🚫 **Built-in cycle detection** and validation
- ↩️ **Undo/redo** state management
- 📋 **Configurable context menu** with icons and shortcuts
- 🔍 **Zoom & pan controls** with mouse wheel/pinch support
- 📤 **Export** to PNG, SVG, JPEG, JSON, CSV
- 🎨 **Theming** (light, dark, blue, high-contrast)
- ⌨️ **Keyboard navigation** (arrow keys, Enter, Delete)
- 📱 **Mobile-friendly** with touch gestures

## 🚀 Quick Start

### Installation

```bash
npm install ngx-flexigraph cytoscape cytoscape-dagre
```

### Basic Usage

```typescript
import { Component } from '@angular/core';
import { FlexiGraphComponent, FlexiNode, DEFAULT_FLEXIGRAPH_CONFIG } from 'ngx-flexigraph';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FlexiGraphComponent],
  template: `
    <flexi-graph
      [nodes]="nodes"
      [config]="config"
      (nodeClick)="onNodeClick($event)"
      (nodeReparent)="onNodeReparent($event)">
    </flexi-graph>
  `,
  styles: [`
    flexi-graph { 
      display: block; 
      width: 100%; 
      height: 600px; 
    }
  `]
})
export class AppComponent {
  nodes: FlexiNode[] = [
    { id: '1', label: 'Root', parentIds: [] },
    { id: '2', label: 'Child A', parentIds: ['1'] },
    { id: '3', label: 'Child B', parentIds: ['1'] },
  ];

  config = () => DEFAULT_FLEXIGRAPH_CONFIG;

  onNodeClick(event: any) {
    console.log('Clicked:', event.node.label);
  }

  onNodeReparent(event: any) {
    console.log('Reparented:', event.node.label);
  }
}
```

## ⚙️ Configuration

The `config` prop accepts a function returning a `FlexiGraphConfig` object:

```typescript
import { FlexiGraphConfig, DEFAULT_FLEXIGRAPH_CONFIG } from 'ngx-flexigraph';

const myConfig = (): FlexiGraphConfig => ({
  ...DEFAULT_FLEXIGRAPH_CONFIG,
  
  // Multi-parent: Hold Shift to add parent instead of replacing
  multiParent: {
    enabled: true,
    modifier: 'shift',
    maxParents: 3,
  },

  // Validation rules
  validation: {
    allowCycles: false,
    allowSelfLoops: false,
    maxDepth: 10,
  },

  // Theme: 'light' | 'dark' | 'blue' | 'high-contrast' | custom
  styling: {
    theme: 'dark',
  },

  // Layout: 'dagre' | 'breadthfirst' | 'cose' | 'grid' | 'circle'
  layout: {
    algorithm: 'dagre',
    direction: 'LR',  // 'LR' | 'TB' | 'RL' | 'BT'
    animate: true,
  },

  // Zoom controls
  zoomPan: {
    showZoomControls: true,
    minZoom: 0.2,
    maxZoom: 3,
  },

  // Export options
  export: {
    enabled: true,
    formats: ['png', 'svg', 'json', 'csv'],
  },
});
```

## 📤 Events

| Event | Payload | Description |
|-------|---------|-------------|
| `nodeClick` | `NodeEvent` | Node clicked |
| `nodeReparent` | `ReparentEvent` | Node reparented |
| `validationFailed` | `ValidationEvent` | Validation error |
| `stateChange` | `StateChangeEvent` | Undo/redo state changed |
| `zoomChange` | `ZoomEvent` | Zoom level changed |
| `nodeRename` | `NodeRenameEvent` | Node renamed |
| `nodeAdd` | `NodeAddEvent` | Node added |
| `nodeDelete` | `NodeEvent` | Node deleted |

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow keys` | Navigate between nodes |
| `Enter` | Select node / Confirm action |
| `Shift + Drag` | Add parent (multi-parent mode) |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Delete` | Delete selected node |
| `F2` | Rename node |
| `A` | Add child node |

## 🎨 Theming

```typescript
// Use preset theme
styling: { theme: 'dark' }

// Or custom theme
styling: {
  theme: {
    backgroundColor: '#1a1a2e',
    nodeStyle: {
      backgroundColor: '#16213e',
      borderColor: '#0f3460',
      textColor: '#e8e8e8',
    },
    edgeStyle: {
      lineColor: '#4a4a6a',
      arrowColor: '#4a4a6a',
    }
  }
}
```

## 📦 Peer Dependencies

- `@angular/core` ^14.0.0 - ^19.0.0
- `cytoscape` ^3.23.0
- `cytoscape-dagre` ^2.5.0

## 📄 License

MIT © Shubhank Nagar
