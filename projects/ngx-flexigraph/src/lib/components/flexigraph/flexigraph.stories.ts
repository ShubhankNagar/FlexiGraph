import type { Meta, StoryObj } from '@storybook/angular';
import { FlexiGraphComponent } from './flexigraph.component';
import { DEFAULT_FLEXIGRAPH_CONFIG, FlexiGraphConfig } from '../../models/config.models';
import { FlexiNode } from '../../models/graph.models';

const meta: Meta<FlexiGraphComponent> = {
  title: 'Components/FlexiGraph',
  component: FlexiGraphComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
  }),
  argTypes: {
    nodes: { control: 'object' },
    // Config is a function, so we might not be able to edit it directly in controls easily,
    // but we can demonstrate different configs via stories.
  },
  parameters: {
    docs: {
      description: {
        component: `
# FlexiGraph Component

An interactive DAG (Directed Acyclic Graph) editor for Angular with:
- 🔄 Drag-and-drop reparenting
- 👨‍👩‍👧 Multi-parent support (Shift+drag)
- 🚫 Built-in cycle detection
- ↩️ Undo/redo support
- 📋 Context menu
- 🔍 Zoom & pan controls
- 📤 Export to PNG/SVG/JSON/CSV
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<FlexiGraphComponent>;

// ============================================
// BASIC EXAMPLES
// ============================================

const basicNodes: FlexiNode[] = [
  { id: '1', label: 'Root', parentIds: [] },
  { id: '2', label: 'Child A', parentIds: ['1'] },
  { id: '3', label: 'Child B', parentIds: ['1'] },
  { id: '4', label: 'Grandchild A1', parentIds: ['2'] },
  { id: '5', label: 'Grandchild B1', parentIds: ['3'] },
];

export const Basic: Story = {
  args: {
    nodes: basicNodes,
    config: () => DEFAULT_FLEXIGRAPH_CONFIG,
  },
  parameters: {
    docs: {
      description: {
        story: 'A simple hierarchical graph with default settings. Drag nodes onto others to reparent.'
      }
    }
  }
};

// ============================================
// ORGANIZATION CHART EXAMPLE
// ============================================

const orgChartNodes: FlexiNode[] = [
  { id: 'ceo', label: 'CEO - John Smith', parentIds: [], data: { role: 'Executive', department: 'Leadership' } },
  { id: 'cto', label: 'CTO - Jane Doe', parentIds: ['ceo'], data: { role: 'Executive', department: 'Technology' } },
  { id: 'cfo', label: 'CFO - Bob Wilson', parentIds: ['ceo'], data: { role: 'Executive', department: 'Finance' } },
  { id: 'coo', label: 'COO - Alice Brown', parentIds: ['ceo'], data: { role: 'Executive', department: 'Operations' } },
  { id: 'eng-lead', label: 'Engineering Lead', parentIds: ['cto'], data: { role: 'Manager', department: 'Engineering' } },
  { id: 'design-lead', label: 'Design Lead', parentIds: ['cto'], data: { role: 'Manager', department: 'Design' } },
  { id: 'dev1', label: 'Senior Developer', parentIds: ['eng-lead'], data: { role: 'IC', department: 'Engineering' } },
  { id: 'dev2', label: 'Junior Developer', parentIds: ['eng-lead'], data: { role: 'IC', department: 'Engineering' } },
  { id: 'designer1', label: 'UX Designer', parentIds: ['design-lead'], data: { role: 'IC', department: 'Design' } },
  { id: 'accountant', label: 'Senior Accountant', parentIds: ['cfo'], data: { role: 'IC', department: 'Finance' } },
  { id: 'ops1', label: 'Operations Manager', parentIds: ['coo'], data: { role: 'Manager', department: 'Operations' } },
];

export const OrganizationChart: Story = {
  args: {
    nodes: orgChartNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: 'blue',
        nodeStyle: {
          backgroundColor: '#e3f2fd',
          borderColor: '#1976d2',
          textColor: '#0d47a1',
          borderWidth: 2,
          shape: 'round-rectangle',
          width: 180,
          height: 50,
          fontSize: 13,
        },
        selectedNodeStyle: {
          backgroundColor: '#1976d2',
          borderColor: '#0d47a1',
          textColor: '#ffffff',
        }
      },
      layout: {
        algorithm: 'dagre',
        direction: 'TB', // Top to bottom for org charts
        animate: true,
        animationDuration: 400,
        nodeSpacing: 50,
        rankSpacing: 80,
      },
      contextMenu: {
        enabled: true,
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'An organization chart showing company hierarchy. Demonstrates top-to-bottom layout and custom styling.'
      }
    }
  }
};

// ============================================
// PROJECT DEPENDENCIES EXAMPLE
// ============================================

const projectDependencyNodes: FlexiNode[] = [
  { id: 'app', label: '@myorg/app', parentIds: [], data: { version: '1.0.0', type: 'application' } },
  { id: 'core', label: '@myorg/core', parentIds: ['app'], data: { version: '2.1.0', type: 'library' } },
  { id: 'ui', label: '@myorg/ui', parentIds: ['app'], data: { version: '3.0.0', type: 'library' } },
  { id: 'utils', label: '@myorg/utils', parentIds: ['core', 'ui'], data: { version: '1.5.0', type: 'library' } }, // Multi-parent!
  { id: 'api', label: '@myorg/api', parentIds: ['app'], data: { version: '2.0.0', type: 'library' } },
  { id: 'auth', label: '@myorg/auth', parentIds: ['api'], data: { version: '1.2.0', type: 'library' } },
  { id: 'logging', label: '@myorg/logging', parentIds: ['core', 'api', 'auth'], data: { version: '0.9.0', type: 'library' } }, // Multi-parent!
  { id: 'config', label: '@myorg/config', parentIds: ['core', 'auth'], data: { version: '1.0.0', type: 'library' } },
];

export const ProjectDependencies: Story = {
  args: {
    nodes: projectDependencyNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      multiParent: {
        enabled: true,
        modifier: 'shift',
        maxParents: 5,
      },
      styling: {
        theme: 'dark',
        nodeStyle: {
          backgroundColor: '#2d3748',
          borderColor: '#4a5568',
          textColor: '#e2e8f0',
          borderWidth: 2,
          shape: 'round-rectangle',
          width: 150,
          height: 40,
          fontSize: 12,
          fontFamily: 'monospace',
        },
        edgeStyle: {
          lineColor: '#718096',
          arrowColor: '#a0aec0',
          lineWidth: 2,
          curveStyle: 'bezier',
        }
      },
      layout: {
        algorithm: 'dagre',
        direction: 'LR',
        animate: true,
        animationDuration: 300,
        nodeSpacing: 40,
        rankSpacing: 120,
      },
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'A package dependency graph showing multi-parent relationships. Some packages depend on multiple other packages. Use Shift+drag to add additional parents.'
      }
    }
  }
};

// ============================================
// PURCHASE ORDER HIERARCHY
// ============================================

const purchaseOrderNodes: FlexiNode[] = [
  { id: 'PO-001', label: 'Main Project PO', parentIds: [], data: { amount: 500000, status: 'approved' } },
  { id: 'PO-002', label: 'Hardware Procurement', parentIds: ['PO-001'], data: { amount: 150000, status: 'approved' } },
  { id: 'PO-003', label: 'Software Licensing', parentIds: ['PO-001'], data: { amount: 75000, status: 'approved' } },
  { id: 'PO-004', label: 'Server Equipment', parentIds: ['PO-002'], data: { amount: 80000, status: 'pending' } },
  { id: 'PO-005', label: 'Networking Gear', parentIds: ['PO-002'], data: { amount: 45000, status: 'pending' } },
  { id: 'PO-006', label: 'OS Licenses', parentIds: ['PO-003'], data: { amount: 25000, status: 'approved' } },
  { id: 'PO-007', label: 'Dev Tools', parentIds: ['PO-003'], data: { amount: 30000, status: 'pending' } },
  { id: 'PO-008', label: 'Consulting Services', parentIds: ['PO-001'], data: { amount: 200000, status: 'draft' } },
];

export const PurchaseOrderHierarchy: Story = {
  args: {
    nodes: purchaseOrderNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: 'light',
        nodeStyle: {
          backgroundColor: '#f0f9ff',
          borderColor: '#0ea5e9',
          textColor: '#0369a1',
          borderWidth: 2,
          shape: 'round-rectangle',
          width: 170,
          height: 44,
          fontSize: 13,
        },
      },
      layout: {
        algorithm: 'dagre',
        direction: 'LR',
        animate: true,
        animationDuration: 400,
        nodeSpacing: 50,
        rankSpacing: 140,
      },
      history: {
        enabled: true,
        maxStackSize: 50,
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'A purchase order hierarchy for financial tracking. Demonstrates undo/redo capability with history enabled.'
      }
    }
  }
};

// ============================================
// THEME VARIATIONS
// ============================================

export const DarkTheme: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: 'dark'
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Dark theme variant for low-light environments.'
      }
    }
  }
};

export const HighContrastTheme: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: 'high-contrast'
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'High contrast theme for accessibility. Meets WCAG requirements for color contrast.'
      }
    }
  }
};

export const BlueTheme: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: 'blue'
      }
    }),
  },
};

// ============================================
// LAYOUT VARIATIONS
// ============================================

export const BreadthFirstLayout: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      layout: {
        algorithm: 'breadthfirst',
        direction: 'TB',
        animate: true,
        animationDuration: 500,
        options: {
          directed: true
        }
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Breadth-first tree layout algorithm.'
      }
    }
  }
};

export const CircleLayout: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      layout: {
        algorithm: 'circle',
        direction: 'LR',
        animate: true,
        animationDuration: 500,
      }
    }),
  },
};

export const CoSELayout: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      layout: {
        algorithm: 'cose',
        direction: 'LR',
        animate: true,
        animationDuration: 800,
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'CoSE (Compound Spring Embedder) force-directed layout.'
      }
    }
  }
};

// ============================================
// FEATURE CONFIGURATIONS
// ============================================

export const MultiParentConfig: Story = {
  args: {
    nodes: [
      { id: '1', label: 'Parent A', parentIds: [] },
      { id: '2', label: 'Parent B', parentIds: [] },
      { id: '3', label: 'Child (Shared)', parentIds: ['1', '2'] }
    ],
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      multiParent: {
        enabled: true,
        modifier: 'shift',
        maxParents: 2
      },
      layout: {
        ...DEFAULT_FLEXIGRAPH_CONFIG.layout!,
        algorithm: 'dagre',
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates multi-parent mode. Hold Shift while dragging to add additional parents instead of replacing.'
      }
    }
  }
};

export const ZoomPanControls: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      zoomPan: {
        enableZoom: true,
        enablePan: true,
        showZoomControls: true,
        controlsPosition: 'bottom-right',
        minZoom: 0.2,
        maxZoom: 3,
        smoothZoom: true,
        zoomAnimationDuration: 200,
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Zoom and pan controls with configured limits. Use mouse wheel to zoom, drag canvas to pan.'
      }
    }
  }
};

export const ExportEnabled: Story = {
  args: {
    nodes: purchaseOrderNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      export: {
        enabled: true,
        filename: 'my-graph',
        defaultScale: 2,
        defaultQuality: 0.92,
        formats: ['png', 'svg', 'jpeg', 'json', 'csv'],
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Export configuration enabled. Right-click on nodes for context menu with export options.'
      }
    }
  }
};

// ============================================
// VALIDATION EXAMPLES
// ============================================

export const ValidationConfig: Story = {
  args: {
    nodes: basicNodes,
    config: () => ({
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      validation: {
        allowCycles: false,
        allowSelfLoops: false,
        maxDepth: 4,
        showValidationErrors: true,
        errorDisplayDuration: 3000,
      }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Validation rules configured: no cycles, no self-loops, max depth of 4. Try creating invalid connections to see error messages.'
      }
    }
  }
};
