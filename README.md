# ngx-flexigraph

> A powerful Angular library for building interactive DAG (Directed Acyclic Graph) editors with drag-and-drop reparenting, multi-parent support, and rich export options.

[![npm version](https://img.shields.io/npm/v/ngx-flexigraph.svg)](https://www.npmjs.com/package/ngx-flexigraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-14+-dd0031.svg)](https://angular.io/)

<p align="center">
  <img src="docs/assets/demo-screenshot.png" alt="FlexiGraph Demo" width="800">
</p>

## ✨ Features

- 🖱️ **Drag-and-Drop Reparenting** - Intuitive node hierarchy management
- 🔗 **Multi-Parent Support** - Hold Shift while dragging for DAG structures
- 📤 **Rich Export** - PNG, SVG, PDF, JSON, CSV formats
- ↩️ **Undo/Redo** - Full history with Ctrl+Z/Y
- 🎨 **4 Themes** - Dark, Light, Blue, High Contrast
- 📐 **6 Layouts** - Dagre, Breadth-first, CoSE, Grid, Circle, Concentric
- 🔍 **Search & Filter** - Find nodes quickly
- 📦 **Collapse/Expand** - Group node hierarchies
- ⌨️ **Keyboard Shortcuts** - Professional workflow support
- 🎯 **Context Menu** - Right-click for all actions

## 🚀 Quick Start

### Installation

```bash
npm install ngx-flexigraph cytoscape cytoscape-dagre
```

### Basic Usage

```typescript
import { Component } from '@angular/core';
import { FlexiGraphComponent, FlexiNode } from 'ngx-flexigraph';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FlexiGraphComponent],
  template: `
    <flexi-graph
      [nodes]="nodes"
      (nodeClick)="onNodeClick($event)"
      (nodeReparent)="onReparent($event)">
    </flexi-graph>
  `
})
export class AppComponent {
  nodes: FlexiNode[] = [
    { id: '1', label: 'Root', parentIds: [] },
    { id: '2', label: 'Child A', parentIds: ['1'] },
    { id: '3', label: 'Child B', parentIds: ['1'] },
  ];

  onNodeClick(event: any) {
    console.log('Clicked:', event.node);
  }

  onReparent(event: any) {
    console.log('Reparented:', event.node);
  }
}
```

## 📖 API Reference

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `nodes` | `FlexiNode[]` | `[]` | Array of nodes to display |
| `config` | `FlexiGraphConfig` | See below | Configuration object |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `nodeClick` | `NodeEvent` | Fired when a node is clicked |
| `nodeReparent` | `ReparentEvent` | Fired when a node is reparented |
| `stateChange` | `StateChangeEvent` | Fired when undo/redo state changes |
| `validationFailed` | `ValidationEvent` | Fired when validation fails |

### Configuration

```typescript
const config: FlexiGraphConfig = {
  styling: {
    theme: 'dark', // 'light' | 'blue' | 'high-contrast'
    nodeStyle: {
      backgroundColor: '#27272a',
      borderColor: '#3f3f46',
      textColor: '#fafafa',
      shape: 'round-rectangle',
      width: 160,
      height: 44
    }
  },
  layout: {
    algorithm: 'dagre', // 'breadthfirst' | 'cose' | 'grid' | 'circle'
    direction: 'LR',    // 'TB' | 'BT' | 'RL'
    animate: true
  },
  multiParent: {
    enabled: true,
    modifier: 'shift',
    maxParents: 5
  },
  zoomPan: {
    enableZoom: true,
    showZoomControls: true,
    minZoom: 0.3,
    maxZoom: 2.5
  }
};
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Collapse selected node |
| `E` | Expand selected node |
| `A` | Add child to selected |
| `D` | Detach from parent |
| `Delete` | Delete selected node |
| `F2` | Rename selected node |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `+/-` | Zoom in/out |
| `0` | Reset zoom |

## 🎨 Themes

```typescript
// Built-in themes
config.styling.theme = 'dark';   // Dark mode
config.styling.theme = 'light';  // Light mode
config.styling.theme = 'blue';   // Blue accent
config.styling.theme = 'high-contrast'; // Accessibility
```

## 📤 Export

```typescript
// Programmatic export
await graphComponent.exportGraph('png');
await graphComponent.exportGraph('svg');
await graphComponent.exportGraph('pdf');
await graphComponent.exportGraph('json');
await graphComponent.exportGraph('csv');
```

## 🏗️ Development

```bash
# Clone repository
git clone https://github.com/ShubhankNagar/FlexiGraph.git
cd FlexiGraph

# Install dependencies
npm install

# Build library
npm run build:lib

# Run demo
npm run start:demo

# Run tests
npm run test:lib
```

## 📁 Project Structure

```
FlexiGraph/
├── projects/
│   ├── ngx-flexigraph/     # Library source
│   │   ├── src/lib/
│   │   │   ├── components/ # FlexiGraph, ContextMenu, etc.
│   │   │   ├── services/   # History, Export, Collapse, etc.
│   │   │   └── utils/      # Cytoscape transforms
│   │   └── package.json
│   └── demo/               # Demo application
└── package.json            # Workspace root
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Shubhank Nagar](https://github.com/ShubhankNagar)

---

<p align="center">
  <a href="https://shubhanknagar.github.io/FlexiGraph/">Live Demo</a> •
  <a href="https://www.npmjs.com/package/ngx-flexigraph">NPM</a> •
  <a href="https://github.com/ShubhankNagar/FlexiGraph/issues">Issues</a>
</p>
