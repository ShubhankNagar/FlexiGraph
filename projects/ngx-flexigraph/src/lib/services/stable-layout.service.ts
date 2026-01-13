/**
 * Stable Layout Service - Prevents graph "jumping" during operations
 * 
 * This service implements an incremental layout approach that:
 * 1. Caches node positions after each layout
 * 2. Identifies which nodes actually need repositioning
 * 3. Constrains unaffected nodes to stay in place
 * 4. Smoothly animates only the affected nodes
 */

import { Injectable, signal } from '@angular/core';
import type { Core, NodeSingular, Position } from 'cytoscape';
import type { FlexiNode } from '../models/graph.models';
import type { LayoutConfig } from '../models/config.models';

export interface PositionCache {
  [nodeId: string]: Position;
}

export interface LayoutChange {
  type: 'add' | 'remove' | 'reparent' | 'full';
  affectedNodeIds: string[];
  newNodeId?: string;
}

@Injectable()
export class StableLayoutService {
  private _positionCache = signal<PositionCache>({});
  private _isFirstLayout = signal<boolean>(true);
  
  readonly positionCache = this._positionCache.asReadonly();

  /**
   * Cache current positions from Cytoscape instance
   */
  cachePositions(cy: Core): void {
    const cache: PositionCache = {};
    cy.nodes().forEach((node: NodeSingular) => {
      cache[node.id()] = { ...node.position() };
    });
    this._positionCache.set(cache);
    this._isFirstLayout.set(false);
  }

  /**
   * Get cached position for a node
   */
  getCachedPosition(nodeId: string): Position | undefined {
    return this._positionCache()[nodeId];
  }

  /**
   * Check if this is the initial layout
   */
  isFirstLayout(): boolean {
    return this._isFirstLayout();
  }

  /**
   * Run stable layout - minimizes movement for unaffected nodes
   * 
   * Strategy:
   * 1. For first layout: run full dagre
   * 2. For subsequent layouts:
   *    - Lock unaffected nodes in place
   *    - Run dagre for only affected subtree
   *    - Animate affected nodes to new positions
   *    - Unlock all nodes
   */
  runStableLayout(
    cy: Core,
    config: LayoutConfig,
    change?: LayoutChange
  ): void {
    const isFirst = this._isFirstLayout();
    const cachedPositions = this._positionCache();
    
    // First layout - run full dagre
    if (isFirst || !change || change.type === 'full' || Object.keys(cachedPositions).length === 0) {
      this.runFullLayout(cy, config);
      return;
    }

    // Incremental layout
    this.runIncrementalLayout(cy, config, change, cachedPositions);
  }

  /**
   * Run a full dagre layout
   */
  private runFullLayout(cy: Core, config: LayoutConfig): void {
    const options = this.buildLayoutOptions(config);
    
    cy.layout(options).run();
    
    // Wait for layout to complete before caching
    setTimeout(() => {
      this.cachePositions(cy);
    }, config.animate ? config.animationDuration + 50 : 50);
  }

  /**
   * Run incremental layout - only moves affected nodes
   */
  private runIncrementalLayout(
    cy: Core,
    config: LayoutConfig,
    change: LayoutChange,
    cachedPositions: PositionCache
  ): void {
    const affectedIds = new Set(change.affectedNodeIds);
    
    // Collect IDs of all nodes in affected subtrees
    const allAffectedIds = this.getAffectedSubtreeIds(cy, affectedIds);
    
    // Step 1: Apply cached positions to ALL nodes first
    cy.nodes().forEach((node: NodeSingular) => {
      const cached = cachedPositions[node.id()];
      if (cached) {
        node.position(cached);
      }
    });

    // Step 2: Lock unaffected nodes
    cy.nodes().forEach((node: NodeSingular) => {
      if (!allAffectedIds.has(node.id())) {
        node.lock();
      }
    });

    // Step 3: Position new nodes near their parent if this is an add operation
    if (change.type === 'add' && change.newNodeId) {
      const newNode = cy.getElementById(change.newNodeId);
      if (newNode.length > 0 && newNode.isNode()) {
        const incomers = newNode.incomers('node');
        if (incomers.length > 0) {
          const parent = incomers.first() as NodeSingular;
          const parentPos = parent.position();
          // Position new node to the right of parent
          (newNode as NodeSingular).position({
            x: parentPos.x + 150,
            y: parentPos.y
          });
        } else {
          // Root node - position at center
          const extent = cy.extent();
          (newNode as NodeSingular).position({
            x: (extent.x1 + extent.x2) / 2,
            y: (extent.y1 + extent.y2) / 2 + 50
          });
        }
      }
    }

    // Step 4: Run layout only for affected subgraph
    if (allAffectedIds.size > 0) {
      const affectedEles = cy.nodes().filter((node: NodeSingular) => 
        allAffectedIds.has(node.id())
      );
      
      // Calculate centroid of affected nodes before layout
      const beforeCentroid = this.calculateCentroid(affectedEles);
      
      // Get the connected edges
      const affectedEdges = affectedEles.connectedEdges();
      const affectedCollection = affectedEles.union(affectedEdges);
      
      // Run layout on affected nodes only
      const options = this.buildLayoutOptions(config, false);
      affectedCollection.layout({
        ...options,
        fit: false,
        animate: false
      }).run();
      
      // Calculate centroid after layout
      const afterCentroid = this.calculateCentroid(affectedEles);
      
      // Adjust positions to maintain relative position to unaffected nodes
      const deltaX = beforeCentroid.x - afterCentroid.x;
      const deltaY = beforeCentroid.y - afterCentroid.y;
      
      affectedEles.forEach((node: NodeSingular) => {
        const pos = node.position();
        node.position({
          x: pos.x + deltaX,
          y: pos.y + deltaY
        });
      });
    }

    // Step 5: Unlock all nodes
    cy.nodes().unlock();

    // Step 6: Animate to final positions if needed
    if (config.animate && allAffectedIds.size > 0) {
      // Already in position - just do a subtle fit
      cy.animate({
        fit: { eles: cy.elements(), padding: config.padding || 30 },
        duration: config.animationDuration / 2,
        easing: config.animationEasing || 'ease-out'
      } as any);
    }

    // Cache new positions
    setTimeout(() => {
      this.cachePositions(cy);
    }, config.animate ? config.animationDuration + 50 : 50);
  }

  /**
   * Get all node IDs in the subtrees affected by the change
   */
  private getAffectedSubtreeIds(cy: Core, directlyAffectedIds: Set<string>): Set<string> {
    const allAffected = new Set<string>(directlyAffectedIds);
    
    // Add descendants of affected nodes
    directlyAffectedIds.forEach(nodeId => {
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        // Get all descendants
        const descendants = node.successors('node');
        descendants.forEach((desc: NodeSingular) => {
          allAffected.add(desc.id());
        });
      }
    });
    
    return allAffected;
  }

  /**
   * Calculate centroid of a node collection
   */
  private calculateCentroid(nodes: any): Position {
    if (nodes.length === 0) {
      return { x: 0, y: 0 };
    }
    
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    
    nodes.forEach((node: any) => {
      if (typeof node.position === 'function') {
        const pos = node.position();
        sumX += pos.x;
        sumY += pos.y;
        count++;
      }
    });
    
    if (count === 0) return { x: 0, y: 0 };
    
    return {
      x: sumX / count,
      y: sumY / count
    };
  }

  /**
   * Build layout options based on algorithm
   */
  private buildLayoutOptions(config: LayoutConfig, fitAfter = true): any {
    const algorithm = config.algorithm || 'dagre';
    const common = {
      animate: config.animate,
      animationDuration: config.animationDuration,
      animationEasing: config.animationEasing,
      fit: fitAfter && (config.fit ?? true),
      padding: config.padding ?? 30,
    };

    // Algorithm-specific defaults
    switch (algorithm) {
      case 'dagre':
        return {
          ...common,
          name: 'dagre',
          rankDir: config.direction || 'LR',
          nodeSep: config.nodeSpacing ?? 50,
          rankSep: config.rankSpacing ?? 100,
          ranker: 'tight-tree',
          align: 'UL',
          ...config.options
        };
      
      case 'breadthfirst':
        return {
          ...common,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: config.nodeSpacing ? config.nodeSpacing / 50 : 1.75,
          circle: false,
          grid: false,
          avoidOverlap: true,
          ...config.options
        };

      case 'cose':
        return {
          ...common,
          name: 'cose',
          nodeRepulsion: (node: any) => 400000,
          nodeOverlap: 10,
          idealEdgeLength: (edge: any) => 10,
          edgeElasticity: (edge: any) => 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          ...config.options
        };

      case 'grid':
        return {
          ...common,
          name: 'grid',
          rows: undefined,
          cols: undefined,
          avoidOverlap: true,
          ...config.options
        };

      case 'circle':
        return {
          ...common,
          name: 'circle',
          startAngle: 3 / 2 * Math.PI,
          clockwise: true,
          avoidOverlap: true,
          ...config.options
        };

      case 'concentric':
        return {
          ...common,
          name: 'concentric',
          startAngle: 3 / 2 * Math.PI,
          clockwise: true,
          minNodeSpacing: config.nodeSpacing ?? 10,
          avoidOverlap: true,
          ...config.options
        };

      default:
        // Fallback to dagre if unknown
        return {
          ...common,
          name: 'dagre',
          rankDir: config.direction || 'LR',
          ...config.options
        };
    }
  }

  /**
   * Restore positions from a saved state (for undo/redo)
   */
  restorePositions(cy: Core, positions: PositionCache, animate = true, duration = 200): void {
    cy.batch(() => {
      cy.nodes().forEach((node: NodeSingular) => {
        const savedPos = positions[node.id()];
        if (savedPos) {
          if (animate) {
            node.animate({
              position: savedPos,
              duration,
              easing: 'ease-out'
            } as any);
          } else {
            node.position(savedPos);
          }
        }
      });
    });
    
    // Update cache with restored positions
    setTimeout(() => {
      this._positionCache.set({ ...positions });
    }, animate ? duration + 50 : 50);
  }

  /**
   * Clear position cache (for reset)
   */
  clearCache(): void {
    this._positionCache.set({});
    this._isFirstLayout.set(true);
  }

  /**
   * Get current positions as cache (for saving to undo stack)
   */
  getCurrentPositions(cy: Core): PositionCache {
    const positions: PositionCache = {};
    cy.nodes().forEach((node: NodeSingular) => {
      positions[node.id()] = { ...node.position() };
    });
    return positions;
  }
}
