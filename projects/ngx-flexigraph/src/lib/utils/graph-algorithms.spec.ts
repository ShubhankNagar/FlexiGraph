/**
 * Unit tests for graph-algorithms.ts
 * Tests cycle detection, traversal, topological sort, and helper functions
 */

import {
  wouldCreateCycle,
  isDescendant,
  getRootNodes,
  getLeafNodes,
  getNodeDepth,
  getAncestors,
  getDescendants,
  topologicalSort,
  nodesToEdges,
  deepCloneNodes,
  isUniqueId,
  generateNodeId
} from './graph-algorithms';
import { FlexiNode } from '../models/graph.models';

describe('Graph Algorithms', () => {
  // Test data - simple linear graph: A -> B -> C
  const linearGraph: FlexiNode[] = [
    { id: 'A', label: 'Node A', parentIds: [] },
    { id: 'B', label: 'Node B', parentIds: ['A'] },
    { id: 'C', label: 'Node C', parentIds: ['B'] }
  ];

  // Test data - tree graph:
  //     A
  //    / \
  //   B   C
  //  /
  // D
  const treeGraph: FlexiNode[] = [
    { id: 'A', label: 'Node A', parentIds: [] },
    { id: 'B', label: 'Node B', parentIds: ['A'] },
    { id: 'C', label: 'Node C', parentIds: ['A'] },
    { id: 'D', label: 'Node D', parentIds: ['B'] }
  ];

  // Test data - DAG with multi-parent:
  //     A
  //    / \
  //   B   C
  //    \ /
  //     D
  const dagGraph: FlexiNode[] = [
    { id: 'A', label: 'Node A', parentIds: [] },
    { id: 'B', label: 'Node B', parentIds: ['A'] },
    { id: 'C', label: 'Node C', parentIds: ['A'] },
    { id: 'D', label: 'Node D', parentIds: ['B', 'C'] }
  ];

  // Test data - disconnected graph
  const disconnectedGraph: FlexiNode[] = [
    { id: 'A', label: 'Node A', parentIds: [] },
    { id: 'B', label: 'Node B', parentIds: ['A'] },
    { id: 'X', label: 'Node X', parentIds: [] },
    { id: 'Y', label: 'Node Y', parentIds: ['X'] }
  ];

  describe('wouldCreateCycle', () => {
    // wouldCreateCycle(sourceId, targetId) checks if making targetId a child of sourceId would create a cycle
    
    it('should return true when connecting a node to its ancestor (creates back-edge)', () => {
      // C -> A would create cycle (A already reaches C via A->B->C)
      expect(wouldCreateCycle(linearGraph, 'C', 'A')).toBeTrue();
    });

    it('should return false when connecting a node to a valid child', () => {
      // A -> C: C is already reachable from A, but we're just adding another path, not a back-edge
      // Actually, A -> C means adding C as a child of A. Since we already have A->B->C,
      // adding A->C doesn't create a cycle because C doesn't reach back to A
      expect(wouldCreateCycle(linearGraph, 'A', 'C')).toBeFalse();
    });

    it('should return true for self-loops', () => {
      expect(wouldCreateCycle(linearGraph, 'A', 'A')).toBeTrue();
    });

    it('should handle DAG with multi-parent correctly', () => {
      // D -> A would create a cycle because A reaches D
      expect(wouldCreateCycle(dagGraph, 'D', 'A')).toBeTrue();
      // A -> D: D is already reachable from A, adding direct edge doesn't create cycle
      expect(wouldCreateCycle(dagGraph, 'A', 'D')).toBeFalse();
    });

    it('should work with empty graph', () => {
      expect(wouldCreateCycle([], 'A', 'B')).toBeFalse();
    });

    it('should handle disconnected graphs', () => {
      // A -> X: X is in a separate subgraph, safe to connect
      expect(wouldCreateCycle(disconnectedGraph, 'A', 'X')).toBeFalse();
      // Y -> A: A is in a separate subgraph, safe to connect  
      expect(wouldCreateCycle(disconnectedGraph, 'Y', 'A')).toBeFalse();
    });
  });

  describe('isDescendant', () => {
    it('should return true for direct child', () => {
      expect(isDescendant(linearGraph, 'A', 'B')).toBeTrue();
    });

    it('should return true for indirect descendant', () => {
      expect(isDescendant(linearGraph, 'A', 'C')).toBeTrue();
    });

    it('should return false when not a descendant', () => {
      expect(isDescendant(linearGraph, 'C', 'A')).toBeFalse();
    });

    it('should return true for same node', () => {
      expect(isDescendant(linearGraph, 'A', 'A')).toBeTrue();
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants of a node', () => {
      const descendants = getDescendants(treeGraph, 'A');
      expect(descendants.length).toBe(3);
      const ids = descendants.map(n => n.id);
      expect(ids).toContain('B');
      expect(ids).toContain('C');
      expect(ids).toContain('D');
    });

    it('should return empty array for leaf node', () => {
      const descendants = getDescendants(linearGraph, 'C');
      expect(descendants.length).toBe(0);
    });

    it('should handle non-existent node', () => {
      const descendants = getDescendants(linearGraph, 'Z');
      expect(descendants.length).toBe(0);
    });
  });

  describe('getAncestors', () => {
    it('should return all ancestors of a node', () => {
      const ancestors = getAncestors(linearGraph, 'C');
      expect(ancestors.length).toBe(2);
      const ids = ancestors.map(n => n.id);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
    });

    it('should return empty array for root node', () => {
      const ancestors = getAncestors(linearGraph, 'A');
      expect(ancestors.length).toBe(0);
    });

    it('should handle multi-parent correctly', () => {
      const ancestors = getAncestors(dagGraph, 'D');
      expect(ancestors.length).toBe(3);
      const ids = ancestors.map(n => n.id);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
    });
  });

  describe('topologicalSort', () => {
    it('should return nodes in valid topological order', () => {
      const sorted = topologicalSort(linearGraph);
      const aIndex = sorted.findIndex(n => n.id === 'A');
      const bIndex = sorted.findIndex(n => n.id === 'B');
      const cIndex = sorted.findIndex(n => n.id === 'C');
      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
    });

    it('should handle DAG with multi-parent', () => {
      const sorted = topologicalSort(dagGraph);
      const aIndex = sorted.findIndex(n => n.id === 'A');
      const bIndex = sorted.findIndex(n => n.id === 'B');
      const cIndex = sorted.findIndex(n => n.id === 'C');
      const dIndex = sorted.findIndex(n => n.id === 'D');
      
      expect(aIndex).toBeLessThan(bIndex);
      expect(aIndex).toBeLessThan(cIndex);
      expect(bIndex).toBeLessThan(dIndex);
      expect(cIndex).toBeLessThan(dIndex);
    });

    it('should return empty array for empty graph', () => {
      expect(topologicalSort([])).toEqual([]);
    });

    it('should include all nodes', () => {
      const sorted = topologicalSort(treeGraph);
      expect(sorted.length).toBe(treeGraph.length);
    });
  });

  describe('getRootNodes', () => {
    it('should find all nodes with no parents', () => {
      const roots = getRootNodes(treeGraph);
      expect(roots.length).toBe(1);
      expect(roots[0].id).toBe('A');
    });

    it('should find multiple root nodes', () => {
      const roots = getRootNodes(disconnectedGraph);
      expect(roots.length).toBe(2);
      const rootIds = roots.map(n => n.id);
      expect(rootIds).toContain('A');
      expect(rootIds).toContain('X');
    });
  });

  describe('getLeafNodes', () => {
    it('should find all nodes with no children', () => {
      const leaves = getLeafNodes(treeGraph);
      expect(leaves.length).toBe(2);
      const leafIds = leaves.map(n => n.id);
      expect(leafIds).toContain('C');
      expect(leafIds).toContain('D');
    });

    it('should find single leaf in linear graph', () => {
      const leaves = getLeafNodes(linearGraph);
      expect(leaves.length).toBe(1);
      expect(leaves[0].id).toBe('C');
    });
  });

  describe('getNodeDepth', () => {
    it('should return 0 for root node', () => {
      expect(getNodeDepth(treeGraph, 'A')).toBe(0);
    });

    it('should return correct depth for nested nodes', () => {
      expect(getNodeDepth(linearGraph, 'B')).toBe(1);
      expect(getNodeDepth(linearGraph, 'C')).toBe(2);
    });
  });

  describe('nodesToEdges', () => {
    it('should convert nodes to edges', () => {
      const edges = nodesToEdges(linearGraph);
      expect(edges.length).toBe(2);
    });

    it('should create correct edge structure', () => {
      const edges = nodesToEdges(linearGraph);
      const edge = edges.find(e => e.source === 'A' && e.target === 'B');
      expect(edge).toBeDefined();
      expect(edge?.id).toBe('A->B');
    });

    it('should handle multi-parent relationships', () => {
      const edges = nodesToEdges(dagGraph);
      expect(edges.length).toBe(4);
    });

    it('should handle empty graph', () => {
      expect(nodesToEdges([])).toEqual([]);
    });
  });

  describe('deepCloneNodes', () => {
    it('should create a deep copy of nodes', () => {
      const cloned = deepCloneNodes(treeGraph);
      expect(cloned).toEqual(treeGraph);
      expect(cloned).not.toBe(treeGraph);
      expect(cloned[0]).not.toBe(treeGraph[0]);
    });

    it('should clone parentIds arrays', () => {
      const cloned = deepCloneNodes(dagGraph);
      expect(cloned[3].parentIds).toEqual(['B', 'C']);
      expect(cloned[3].parentIds).not.toBe(dagGraph[3].parentIds);
    });

    it('should handle empty array', () => {
      expect(deepCloneNodes([])).toEqual([]);
    });
  });

  describe('isUniqueId', () => {
    it('should return true for unique id', () => {
      expect(isUniqueId(linearGraph, 'Z')).toBeTrue();
    });

    it('should return false for existing id', () => {
      expect(isUniqueId(linearGraph, 'A')).toBeFalse();
    });

    it('should handle empty array', () => {
      expect(isUniqueId([], 'A')).toBeTrue();
    });
  });

  describe('generateNodeId', () => {
    it('should generate unique id', () => {
      const id = generateNodeId(linearGraph);
      expect(isUniqueId(linearGraph, id)).toBeTrue();
    });

    it('should use custom prefix', () => {
      const id = generateNodeId(linearGraph, 'custom');
      expect(id.startsWith('custom')).toBeTrue();
    });
  });
});
