# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-13

### 🎉 Initial Release

#### Features
- **Core Graph Editor**
  - Interactive DAG visualization with Cytoscape.js
  - Drag-and-drop node reparenting
  - Multi-parent support (Shift+drag)
  - Visual snap-back on invalid operations

- **Node Operations**
  - Add, rename, delete nodes
  - Collapse/expand node hierarchies
  - Detach nodes from parents
  - Context menu with all actions

- **Export Options**
  - PNG image export
  - SVG vector export
  - PDF reports (3 templates)
  - JSON data export
  - CSV spreadsheet export

- **History Management**
  - Undo/Redo with full state tracking
  - Keyboard shortcuts (Ctrl+Z/Y)

- **Themes**
  - Dark theme
  - Light theme
  - Blue theme
  - High contrast theme

- **Layouts**
  - Dagre (hierarchical)
  - Breadth-first (tree)
  - CoSE (force-directed)
  - Grid
  - Circle
  - Concentric

- **Accessibility**
  - ARIA labels
  - Keyboard navigation
  - Focus management

- **Developer Experience**
  - Full TypeScript support
  - Comprehensive API
  - Storybook documentation
