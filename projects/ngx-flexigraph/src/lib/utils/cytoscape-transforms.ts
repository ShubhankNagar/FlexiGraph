/**
 * Cytoscape transformation utilities for ngx-flexigraph
 * Converts between library data models and Cytoscape format
 */

import type { FlexiNode, FlexiEdge } from '../models/graph.models';
import type { StylingConfig, NodeStyleConfig, EdgeStyleConfig } from '../models/config.models';
import type { ElementDefinition } from 'cytoscape';

/**
 * Transform FlexiNode array to Cytoscape ElementDefinition array
 * Supports edge labels and custom edge data
 */
export function nodesToCytoscapeElements<T>(
  nodes: FlexiNode<T>[],
  edges?: FlexiEdge[]
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const edgeMap = new Map<string, FlexiEdge>();

  // Build edge map for quick lookup by source-target
  if (edges) {
    edges.forEach(edge => {
      const key = `${edge.source}->${edge.target}`;
      edgeMap.set(key, edge);
    });
  }

  nodes.forEach(node => {
    // Add node
    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        label: node.label,
        ...node.data
      },
      position: node.position,
      classes: node.classes?.join(' '),
      locked: node.locked
    });

    // Add edges from parentIds
    node.parentIds.forEach(parentId => {
      const edgeKey = `${parentId}->${node.id}`;
      const edgeData = edgeMap.get(edgeKey);
      
      elements.push({
        group: 'edges',
        data: {
          id: edgeData?.id || edgeKey,
          source: parentId,
          target: node.id,
          label: edgeData?.label || '',
          ...edgeData?.data
        },
        classes: edgeData?.classes?.join(' ')
      });
    });
  });

  return elements;
}

/**
 * Transform Cytoscape elements back to FlexiNode array
 */
export function cytoscapeToNodes<T>(cy: any): FlexiNode<T>[] {
  const nodes: FlexiNode<T>[] = [];

  cy.nodes().forEach((node: any) => {
    const incomingEdges = node.incomers('edge');
    const parentIds: string[] = [];

    incomingEdges.forEach((edge: any) => {
      parentIds.push(edge.source().id());
    });

    nodes.push({
      id: node.id(),
      label: node.data('label') || node.data('name') || node.id(),
      parentIds,
      data: node.data(),
      position: node.position(),
      locked: node.locked(),
      classes: node.classes()
    });
  });

  return nodes;
}

/**
 * Convert NodeStyleConfig to Cytoscape stylesheet properties
 */
export function nodeStyleToCytoscape(style: NodeStyleConfig): Record<string, any> {
  const cyStyle: Record<string, any> = {};

  if (style.backgroundColor) cyStyle['background-color'] = style.backgroundColor;
  if (style.borderColor) cyStyle['border-color'] = style.borderColor;
  if (style.borderWidth !== undefined) cyStyle['border-width'] = style.borderWidth;
  if (style.textColor) cyStyle['color'] = style.textColor;
  if (style.shape) cyStyle['shape'] = style.shape;
  if (style.width) cyStyle['width'] = style.width;
  if (style.height !== undefined) cyStyle['height'] = style.height;
  if (style.padding !== undefined) cyStyle['padding'] = style.padding;
  if (style.fontSize !== undefined) cyStyle['font-size'] = style.fontSize;
  if (style.fontFamily) cyStyle['font-family'] = style.fontFamily;

  // Default text alignment
  cyStyle['text-valign'] = 'center';
  cyStyle['text-halign'] = 'center';
  cyStyle['label'] = 'data(label)';

  return cyStyle;
}

/**
 * Convert EdgeStyleConfig to Cytoscape stylesheet properties
 */
export function edgeStyleToCytoscape(style: EdgeStyleConfig): Record<string, any> {
  const cyStyle: Record<string, any> = {};

  if (style.lineColor) cyStyle['line-color'] = style.lineColor;
  if (style.lineWidth !== undefined) cyStyle['width'] = style.lineWidth;
  if (style.targetArrowShape) cyStyle['target-arrow-shape'] = style.targetArrowShape;
  if (style.arrowColor) cyStyle['target-arrow-color'] = style.arrowColor;
  if (style.curveStyle) cyStyle['curve-style'] = style.curveStyle;
  if (style.lineStyle) cyStyle['line-style'] = style.lineStyle;
  
  // Ensure edges render above nodes in dense layouts (grid, circle)
  cyStyle['z-index'] = 999;

  return cyStyle;
}

/**
 * Generate complete Cytoscape stylesheet from StylingConfig
 * Returns any[] to avoid type conflicts with Cytoscape's internal types
 */
export function generateCytoscapeStylesheet(config: StylingConfig): any[] {
  const stylesheet: any[] = [];

  // Base node style
  if (config.nodeStyle) {
    stylesheet.push({
      selector: 'node',
      style: nodeStyleToCytoscape(config.nodeStyle)
    });
  }

  // Selected node style
  if (config.selectedNodeStyle) {
    const mergedStyle = { ...config.nodeStyle, ...config.selectedNodeStyle };
    stylesheet.push({
      selector: 'node.selected, node:selected',
      style: nodeStyleToCytoscape(mergedStyle)
    });
  }

  // Hovered node style
  if (config.hoveredNodeStyle) {
    const mergedStyle = { ...config.nodeStyle, ...config.hoveredNodeStyle };
    stylesheet.push({
      selector: 'node:active',
      style: {
        'overlay-color': '#007bff',
        'overlay-opacity': 0.2,
        'overlay-padding': 10
      }
    });
  }

  // Base edge style
  if (config.edgeStyle) {
    const edgeStyles = edgeStyleToCytoscape(config.edgeStyle);
    
    // Add edge label support
    stylesheet.push({
      selector: 'edge',
      style: {
        ...edgeStyles,
        'label': 'data(label)',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'font-size': 11,
        'color': config.edgeStyle.lineColor || '#666',
        'text-background-color': config.backgroundColor || '#fff',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px'
      }
    });
  } else {
    // Default edge style with label support
    stylesheet.push({
      selector: 'edge',
      style: {
        'label': 'data(label)',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'font-size': 11
      }
    });
  }

  // Combine mode visual indicator (when holding Shift for multi-parent)
  stylesheet.push({
    selector: '.combine-target',
    style: {
      'border-color': '#28a745',
      'border-width': 3,
      'background-color': '#d4edda'
    }
  });

  // Invalid drop target
  stylesheet.push({
    selector: '.invalid-target',
    style: {
      'border-color': '#dc3545',
      'border-width': 3,
      'background-color': '#f8d7da'
    }
  });

  // Dragging state
  stylesheet.push({
    selector: '.dragging',
    style: {
      'opacity': 0.7,
      'z-index': 999
    }
  });

  // Locked position node style - subtle indicator with lock emoji in label
  stylesheet.push({
    selector: '.position-locked',
    style: {
      'border-style': 'solid',
      'border-width': 1,
      'border-color': '#475569',
      'label': (ele: { data: (key: string) => string }) => {
        const originalLabel = ele.data('label') || '';
        return `${originalLabel} 🔒`;
      }
    }
  });

  // Collapsed node style - double border with badge indicator
  stylesheet.push({
    selector: '.collapsed',
    style: {
      'border-style': 'double',
      'border-width': 4,
      'border-color': '#6366f1',
      'background-color': '#eef2ff',
      'shadow-blur': 8,
      'shadow-color': '#6366f1',
      'shadow-opacity': 0.3,
      'shadow-offset-x': 0,
      'shadow-offset-y': 2
    }
  });

  // Collapsed node shows label with hidden count badge
  stylesheet.push({
    selector: '.collapsed[hiddenCount]',
    style: {
      'label': (ele: { data: (arg0: string) => string; }) => {
        const label = ele.data('label') || '';
        const count = ele.data('hiddenCount');
        return count ? `${label}\n[${count} hidden]` : label;
      },
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'font-size': 11,
      'text-valign': 'center',
      'text-halign': 'center'
    }
  });

  // Hidden node style - completely hidden
  stylesheet.push({
    selector: '.hidden',
    style: {
      'display': 'none',
      'visibility': 'hidden',
      'opacity': 0
    }
  });

  // Edges connected to hidden nodes
  stylesheet.push({
    selector: 'edge.hidden-edge',
    style: {
      'display': 'none',
      'visibility': 'hidden'
    }
  });

  return stylesheet;
}

