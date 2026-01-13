/**
 * Graph utility functions for ngx-flexigraph
 * Core algorithms for cycle detection, traversal, and validation
 */

import type { FlexiNode, FlexiEdge } from '../models/graph.models';

/**
 * Detects if adding an edge from sourceId to targetId would create a cycle
 * Uses BFS to check if targetId is an ancestor of sourceId
 * 
 * @param nodes - Array of all nodes in the graph
 * @param sourceId - The proposed parent node ID
 * @param targetId - The proposed child node ID
 * @returns true if a cycle would be created, false otherwise
 */
export function wouldCreateCycle<T>(
  nodes: FlexiNode<T>[],
  sourceId: string,
  targetId: string
): boolean {
  // Self-loop check
  if (sourceId === targetId) {
    return true;
  }

  // Build adjacency map for efficient lookup
  const childrenMap = new Map<string, string[]>();
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    });
  });

  // BFS to check if sourceId is reachable from targetId
  // If so, making targetId a child of sourceId would create a cycle
  const visited = new Set<string>();
  const queue: string[] = [targetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (currentId === sourceId) {
      return true; // Cycle detected!
    }
    
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const children = childrenMap.get(currentId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  return false;
}

/**
 * Check if a node is a descendant of another node
 * 
 * @param nodes - Array of all nodes
 * @param ancestorId - Potential ancestor node ID
 * @param descendantId - Potential descendant node ID
 * @returns true if descendantId is a descendant of ancestorId
 */
export function isDescendant<T>(
  nodes: FlexiNode<T>[],
  ancestorId: string,
  descendantId: string
): boolean {
  if (ancestorId === descendantId) {
    return true;
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const queue: string[] = [descendantId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (!node) continue;

    for (const parentId of node.parentIds) {
      if (parentId === ancestorId) {
        return true;
      }
      if (!visited.has(parentId)) {
        queue.push(parentId);
      }
    }
  }

  return false;
}

/**
 * Get all root nodes (nodes with no parents)
 */
export function getRootNodes<T>(nodes: FlexiNode<T>[]): FlexiNode<T>[] {
  return nodes.filter(node => node.parentIds.length === 0);
}

/**
 * Get all leaf nodes (nodes with no children)
 */
export function getLeafNodes<T>(nodes: FlexiNode<T>[]): FlexiNode<T>[] {
  const nodesWithChildren = new Set<string>();
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      nodesWithChildren.add(parentId);
    });
  });
  return nodes.filter(node => !nodesWithChildren.has(node.id));
}

/**
 * Get the depth of a node in the graph (longest path from any root)
 */
export function getNodeDepth<T>(
  nodes: FlexiNode<T>[],
  nodeId: string
): number {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const cache = new Map<string, number>();

  function computeDepth(id: string): number {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

    const node = nodeMap.get(id);
    if (!node || node.parentIds.length === 0) {
      cache.set(id, 0);
      return 0;
    }

    const maxParentDepth = Math.max(
      ...node.parentIds.map(pid => computeDepth(pid))
    );
    const depth = maxParentDepth + 1;
    cache.set(id, depth);
    return depth;
  }

  return computeDepth(nodeId);
}

/**
 * Get the height of a node (longest path to any leaf)
 */
export function getNodeHeight<T>(
  nodes: FlexiNode<T>[],
  nodeId: string
): number {
  // Build children map
  const childrenMap = new Map<string, string[]>();
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    });
  });

  const cache = new Map<string, number>();

  function computeHeight(id: string): number {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

    const children = childrenMap.get(id) || [];
    if (children.length === 0) {
      cache.set(id, 0);
      return 0;
    }

    const maxChildHeight = Math.max(
      ...children.map(childId => computeHeight(childId))
    );
    const height = maxChildHeight + 1;
    cache.set(id, height);
    return height;
  }

  return computeHeight(nodeId);
}

/**
 * Get all ancestors of a node
 */
export function getAncestors<T>(
  nodes: FlexiNode<T>[],
  nodeId: string
): FlexiNode<T>[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const ancestors: FlexiNode<T>[] = [];
  const visited = new Set<string>();
  const queue: string[] = [...(nodeMap.get(nodeId)?.parentIds || [])];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (node) {
      ancestors.push(node);
      queue.push(...node.parentIds);
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a node
 */
export function getDescendants<T>(
  nodes: FlexiNode<T>[],
  nodeId: string
): FlexiNode<T>[] {
  // Build children map
  const childrenMap = new Map<string, string[]>();
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    });
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const descendants: FlexiNode<T>[] = [];
  const visited = new Set<string>();
  const queue: string[] = [...(childrenMap.get(nodeId) || [])];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (node) {
      descendants.push(node);
      queue.push(...(childrenMap.get(currentId) || []));
    }
  }

  return descendants;
}

/**
 * Topological sort of nodes (for rendering order)
 * Returns nodes in order from roots to leaves
 */
export function topologicalSort<T>(nodes: FlexiNode<T>[]): FlexiNode<T>[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();

  // Initialize
  nodes.forEach(node => {
    inDegree.set(node.id, node.parentIds.length);
    node.parentIds.forEach(parentId => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    });
  });

  // Start with nodes that have no parents (in-degree 0)
  const queue: string[] = nodes
    .filter(n => n.parentIds.length === 0)
    .map(n => n.id);
  const sorted: FlexiNode<T>[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodeMap.get(currentId);
    if (node) {
      sorted.push(node);
    }

    const children = childrenMap.get(currentId) || [];
    children.forEach(childId => {
      const newDegree = (inDegree.get(childId) || 0) - 1;
      inDegree.set(childId, newDegree);
      if (newDegree === 0) {
        queue.push(childId);
      }
    });
  }

  return sorted;
}

/**
 * Convert nodes array to edges array (for Cytoscape)
 */
export function nodesToEdges<T>(nodes: FlexiNode<T>[]): FlexiEdge[] {
  const edges: FlexiEdge[] = [];
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      edges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id
      });
    });
  });
  return edges;
}

/**
 * Deep clone a node array (for state snapshots)
 */
export function deepCloneNodes<T>(nodes: FlexiNode<T>[]): FlexiNode<T>[] {
  return JSON.parse(JSON.stringify(nodes));
}

/**
 * Validate a node ID is unique
 */
export function isUniqueId<T>(nodes: FlexiNode<T>[], id: string): boolean {
  return !nodes.some(node => node.id === id);
}

/**
 * Generate a unique node ID
 */
export function generateNodeId<T>(nodes: FlexiNode<T>[], prefix = 'node'): string {
  let counter = nodes.length + 1;
  let id = `${prefix}-${counter}`;
  while (!isUniqueId(nodes, id)) {
    counter++;
    id = `${prefix}-${counter}`;
  }
  return id;
}
