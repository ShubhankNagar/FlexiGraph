/**
 * Unit tests for cytoscape-transforms.ts
 * Tests data transformation between FlexiGraph models and Cytoscape format
 */

import {
  nodesToCytoscapeElements,
  nodeStyleToCytoscape,
  edgeStyleToCytoscape,
  generateCytoscapeStylesheet
} from './cytoscape-transforms';
import { FlexiNode } from '../models/graph.models';
import { StylingConfig, NodeStyleConfig, EdgeStyleConfig } from '../models/config.models';

describe('Cytoscape Transforms', () => {
  // Test data
  const simpleNodes: FlexiNode[] = [
    { id: 'root', label: 'Root Node', parentIds: [] },
    { id: 'child1', label: 'Child 1', parentIds: ['root'] },
    { id: 'child2', label: 'Child 2', parentIds: ['root'] }
  ];

  const multiParentNodes: FlexiNode[] = [
    { id: 'A', label: 'Node A', parentIds: [] },
    { id: 'B', label: 'Node B', parentIds: ['A'] },
    { id: 'C', label: 'Node C', parentIds: ['A'] },
    { id: 'D', label: 'Node D', parentIds: ['B', 'C'] }
  ];

  const nodesWithData: FlexiNode<{ priority: number }>[] = [
    { id: 'n1', label: 'Node 1', parentIds: [], data: { priority: 1 } },
    { id: 'n2', label: 'Node 2', parentIds: ['n1'], data: { priority: 2 } }
  ];

  describe('nodesToCytoscapeElements', () => {
    it('should transform nodes to Cytoscape elements', () => {
      const elements = nodesToCytoscapeElements(simpleNodes);
      expect(elements.length).toBe(5); // 3 nodes + 2 edges
    });

    it('should create correct node elements', () => {
      const elements = nodesToCytoscapeElements(simpleNodes);
      const nodeElements = elements.filter(e => e.group === 'nodes');
      
      expect(nodeElements.length).toBe(3);
      expect(nodeElements[0].data?.id).toBe('root');
      expect(nodeElements[0].data?.['label']).toBe('Root Node');
    });

    it('should create correct edge elements', () => {
      const elements = nodesToCytoscapeElements(simpleNodes);
      const edgeElements = elements.filter(e => e.group === 'edges');
      
      expect(edgeElements.length).toBe(2);
      // Each edge should have source and target
      edgeElements.forEach(edge => {
        expect(edge.data?.source).toBeDefined();
        expect(edge.data?.target).toBeDefined();
      });
    });

    it('should handle multi-parent relationships', () => {
      const elements = nodesToCytoscapeElements(multiParentNodes);
      const edgeElements = elements.filter(e => e.group === 'edges');
      
      // Should have edges: A->B, A->C, B->D, C->D
      expect(edgeElements.length).toBe(4);
    });

    it('should preserve custom data on nodes', () => {
      const elements = nodesToCytoscapeElements(nodesWithData);
      const nodeElements = elements.filter(e => e.group === 'nodes');
      
      expect((nodeElements[0].data as any).priority).toBe(1);
      expect((nodeElements[1].data as any).priority).toBe(2);
    });

    it('should handle empty array', () => {
      const elements = nodesToCytoscapeElements([]);
      expect(elements).toEqual([]);
    });

    it('should handle nodes with position', () => {
      const nodesWithPosition: FlexiNode[] = [
        { id: 'n1', label: 'N1', parentIds: [], position: { x: 100, y: 200 } }
      ];
      const elements = nodesToCytoscapeElements(nodesWithPosition);
      
      expect(elements[0].position?.x).toBe(100);
      expect(elements[0].position?.y).toBe(200);
    });

    it('should handle nodes with classes', () => {
      const nodesWithClasses: FlexiNode[] = [
        { id: 'n1', label: 'N1', parentIds: [], classes: ['special', 'highlighted'] }
      ];
      const elements = nodesToCytoscapeElements(nodesWithClasses);
      
      expect(elements[0].classes).toBe('special highlighted');
    });

    it('should generate unique edge IDs', () => {
      const elements = nodesToCytoscapeElements(multiParentNodes);
      const edgeElements = elements.filter(e => e.group === 'edges');
      const edgeIds = edgeElements.map(e => e.data?.id);
      
      const uniqueIds = new Set(edgeIds);
      expect(uniqueIds.size).toBe(edgeIds.length);
    });
  });

  describe('nodeStyleToCytoscape', () => {
    it('should transform basic node style', () => {
      const style: NodeStyleConfig = {
        backgroundColor: '#ff0000',
        borderColor: '#000000',
        textColor: '#ffffff'
      };
      
      const cyStyle = nodeStyleToCytoscape(style);
      
      expect(cyStyle['background-color']).toBe('#ff0000');
      expect(cyStyle['border-color']).toBe('#000000');
      expect(cyStyle['color']).toBe('#ffffff');
    });

    it('should include label property', () => {
      const cyStyle = nodeStyleToCytoscape({});
      expect(cyStyle['label']).toBe('data(label)');
    });

    it('should set text alignment', () => {
      const cyStyle = nodeStyleToCytoscape({});
      expect(cyStyle['text-valign']).toBe('center');
      expect(cyStyle['text-halign']).toBe('center');
    });

    it('should transform border width', () => {
      const style: NodeStyleConfig = { borderWidth: 3 };
      const cyStyle = nodeStyleToCytoscape(style);
      expect(cyStyle['border-width']).toBe(3);
    });

    it('should transform shape', () => {
      const style: NodeStyleConfig = { shape: 'ellipse' };
      const cyStyle = nodeStyleToCytoscape(style);
      expect(cyStyle['shape']).toBe('ellipse');
    });

    it('should transform dimensions', () => {
      const style: NodeStyleConfig = { width: 100, height: 50 };
      const cyStyle = nodeStyleToCytoscape(style);
      expect(cyStyle['width']).toBe(100);
      expect(cyStyle['height']).toBe(50);
    });

    it('should transform font properties', () => {
      const style: NodeStyleConfig = { fontSize: 14, fontFamily: 'Arial' };
      const cyStyle = nodeStyleToCytoscape(style);
      expect(cyStyle['font-size']).toBe(14);
      expect(cyStyle['font-family']).toBe('Arial');
    });
  });

  describe('edgeStyleToCytoscape', () => {
    it('should transform basic edge style', () => {
      const style: EdgeStyleConfig = {
        lineColor: '#333',
        arrowColor: '#666',
        lineWidth: 2
      };
      
      const cyStyle = edgeStyleToCytoscape(style);
      
      expect(cyStyle['line-color']).toBe('#333');
      expect(cyStyle['target-arrow-color']).toBe('#666');
      expect(cyStyle['width']).toBe(2);
    });

    it('should transform curve style', () => {
      const style: EdgeStyleConfig = { curveStyle: 'bezier' };
      const cyStyle = edgeStyleToCytoscape(style);
      expect(cyStyle['curve-style']).toBe('bezier');
    });

    it('should transform arrow shape', () => {
      const style: EdgeStyleConfig = { targetArrowShape: 'triangle' };
      const cyStyle = edgeStyleToCytoscape(style);
      expect(cyStyle['target-arrow-shape']).toBe('triangle');
    });

    it('should transform line style', () => {
      const style: EdgeStyleConfig = { lineStyle: 'dashed' };
      const cyStyle = edgeStyleToCytoscape(style);
      expect(cyStyle['line-style']).toBe('dashed');
    });
  });

  describe('generateCytoscapeStylesheet', () => {
    it('should generate stylesheet with node styles', () => {
      const config: StylingConfig = {
        nodeStyle: {
          backgroundColor: '#fff',
          borderColor: '#000'
        }
      };
      
      const stylesheet = generateCytoscapeStylesheet(config);
      const nodeRule = stylesheet.find((s: any) => s.selector === 'node');
      
      expect(nodeRule).toBeDefined();
      expect(nodeRule?.style['background-color']).toBe('#fff');
    });

    it('should generate stylesheet with edge styles', () => {
      const config: StylingConfig = {
        edgeStyle: {
          lineColor: '#999',
          lineWidth: 2
        }
      };
      
      const stylesheet = generateCytoscapeStylesheet(config);
      const edgeRule = stylesheet.find((s: any) => s.selector === 'edge');
      
      expect(edgeRule).toBeDefined();
      expect(edgeRule?.style['line-color']).toBe('#999');
    });

    it('should include selected node style', () => {
      const config: StylingConfig = {
        nodeStyle: { backgroundColor: '#fff' },
        selectedNodeStyle: { backgroundColor: '#00f' }
      };
      
      const stylesheet = generateCytoscapeStylesheet(config);
      const selectedRule = stylesheet.find((s: any) => 
        s.selector && s.selector.includes('selected')
      );
      
      expect(selectedRule).toBeDefined();
    });

    it('should include combine-target style', () => {
      const stylesheet = generateCytoscapeStylesheet({});
      const combineRule = stylesheet.find((s: any) => s.selector === '.combine-target');
      
      expect(combineRule).toBeDefined();
      expect(combineRule?.style['border-color']).toBe('#28a745');
    });

    it('should include invalid-target style', () => {
      const stylesheet = generateCytoscapeStylesheet({});
      const invalidRule = stylesheet.find((s: any) => s.selector === '.invalid-target');
      
      expect(invalidRule).toBeDefined();
      expect(invalidRule?.style['border-color']).toBe('#dc3545');
    });

    it('should include dragging style', () => {
      const stylesheet = generateCytoscapeStylesheet({});
      const draggingRule = stylesheet.find((s: any) => s.selector === '.dragging');
      
      expect(draggingRule).toBeDefined();
      expect(draggingRule?.style['opacity']).toBe(0.7);
    });
  });

});
