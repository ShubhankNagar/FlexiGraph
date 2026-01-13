/**
 * Unit tests for FlexiGraphService
 * Tests graph state management, undo/redo, validation, and CRUD operations
 */

import { TestBed } from '@angular/core/testing';
import { FlexiGraphService } from './flexigraph.service';
import { FlexiNode } from '../models/graph.models';
import { DEFAULT_FLEXIGRAPH_CONFIG } from '../models/config.models';
import { HistoryService } from './history.service';
import { ValidationService } from './validation.service';

describe('FlexiGraphService', () => {
  let service: FlexiGraphService;

  // Test data
  const initialNodes: FlexiNode[] = [
    { id: 'root', label: 'Root Node', parentIds: [] },
    { id: 'child1', label: 'Child 1', parentIds: ['root'] },
    { id: 'child2', label: 'Child 2', parentIds: ['root'] },
    { id: 'grandchild', label: 'Grandchild', parentIds: ['child1'] }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FlexiGraphService,
        HistoryService,
        ValidationService
      ]
    });
    service = TestBed.inject(FlexiGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should initialize with provided nodes', () => {
      service.initialize(initialNodes);
      const data = service.getGraphData();
      expect(data.nodes.length).toBe(4);
    });

    it('should clear previous state on initialization', () => {
      service.initialize(initialNodes);
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      
      service.initialize(initialNodes);
      expect(service.getGraphData().nodes.length).toBe(4);
    });

    it('should apply provided config', () => {
      const config = { ...DEFAULT_FLEXIGRAPH_CONFIG };
      service.initialize(initialNodes, config);
      expect(service).toBeTruthy();
    });

    it('should clear undo/redo stacks', () => {
      service.initialize(initialNodes);
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      
      service.initialize(initialNodes);
      expect(service.undoStack().length).toBe(0);
      expect(service.redoStack().length).toBe(0);
    });
  });

  describe('getNode', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should return node by id', () => {
      const node = service.getNode('root');
      expect(node?.id).toBe('root');
      expect(node?.label).toBe('Root Node');
    });

    it('should return undefined for non-existent node', () => {
      const node = service.getNode('nonexistent');
      expect(node).toBeUndefined();
    });
  });

  describe('addNode', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should add a new node', () => {
      const newNode: FlexiNode = { id: 'newNode', label: 'New Node', parentIds: [] };
      const result = service.addNode(newNode);
      
      expect(result).toBeTruthy();
      expect(service.getNode('newNode')).toBeTruthy();
      expect(service.getGraphData().nodes.length).toBe(5);
    });

    it('should reject duplicate node id', () => {
      const duplicate: FlexiNode = { id: 'root', label: 'Duplicate', parentIds: [] };
      const result = service.addNode(duplicate);
      
      expect(result).toBeNull();
      expect(service.getGraphData().nodes.length).toBe(4);
    });

    it('should push to undo stack', () => {
      const initialUndoLength = service.undoStack().length;
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      
      expect(service.undoStack().length).toBe(initialUndoLength + 1);
    });
  });

  describe('removeNode', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should remove a node', () => {
      const result = service.removeNode('child2');
      
      expect(result).toBeTrue();
      expect(service.getNode('child2')).toBeUndefined();
      expect(service.getGraphData().nodes.length).toBe(3);
    });

    it('should return false for non-existent node', () => {
      const result = service.removeNode('nonexistent');
      expect(result).toBeFalse();
    });

    it('should remove parent references from children', () => {
      service.removeNode('child1');
      // grandchild should have its parentIds updated
      const grandchild = service.getNode('grandchild');
      expect(grandchild?.parentIds).not.toContain('child1');
    });

    it('should push to undo stack', () => {
      const initialUndoLength = service.undoStack().length;
      service.removeNode('child2');
      
      expect(service.undoStack().length).toBe(initialUndoLength + 1);
    });
  });

  describe('reparent', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should reparent a node', async () => {
      const result = await service.reparent('grandchild', 'child2');
      
      expect(result).toBeTrue();
      const grandchild = service.getNode('grandchild');
      expect(grandchild?.parentIds).toContain('child2');
      expect(grandchild?.parentIds).not.toContain('child1');
    });

    it('should reject if would create cycle', async () => {
      const result = await service.reparent('root', 'grandchild');
      expect(result).toBeFalse();
    });

    it('should reject self-loops', async () => {
      const result = await service.reparent('root', 'root');
      expect(result).toBeFalse();
    });

    it('should reject non-existent nodes', async () => {
      expect(await service.reparent('nonexistent', 'root')).toBeFalse();
      expect(await service.reparent('root', 'nonexistent')).toBeFalse();
    });
  });

  describe('addParent', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should add additional parent (multi-parent)', async () => {
      const result = await service.addParent('grandchild', 'child2');
      
      expect(result).toBeTrue();
      const grandchild = service.getNode('grandchild');
      expect(grandchild?.parentIds).toContain('child1');
      expect(grandchild?.parentIds).toContain('child2');
    });

    it('should reject if would create cycle', async () => {
      const result = await service.addParent('root', 'grandchild');
      expect(result).toBeFalse();
    });

    it('should reject if parent already exists', async () => {
      const result = await service.addParent('grandchild', 'child1');
      expect(result).toBeFalse();
    });
  });

  describe('detachNode', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should remove all parents from a node', () => {
      const result = service.detachNode('child1');
      
      expect(result).toBeTrue();
      const child1 = service.getNode('child1');
      expect(child1?.parentIds.length).toBe(0);
    });

    it('should return false for non-existent node', () => {
      const result = service.detachNode('nonexistent');
      expect(result).toBeFalse();
    });

    it('should return false for already detached node', () => {
      const result = service.detachNode('root');
      expect(result).toBeFalse();
    });
  });

  describe('undo/redo', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should undo addNode', () => {
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      expect(service.getGraphData().nodes.length).toBe(5);
      
      service.undo();
      expect(service.getGraphData().nodes.length).toBe(4);
      expect(service.getNode('new')).toBeUndefined();
    });

    it('should redo after undo', () => {
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      service.undo();
      
      service.redo();
      expect(service.getGraphData().nodes.length).toBe(5);
      expect(service.getNode('new')).toBeTruthy();
    });

    it('should clear redo stack on new action', () => {
      service.addNode({ id: 'new1', label: 'New 1', parentIds: [] });
      service.undo();
      expect(service.redoStack().length).toBe(1);
      
      service.addNode({ id: 'new2', label: 'New 2', parentIds: [] });
      expect(service.redoStack().length).toBe(0);
    });

    it('should return null if nothing to undo', () => {
      expect(service.undo()).toBeNull();
    });

    it('should return null if nothing to redo', () => {
      expect(service.redo()).toBeNull();
    });

    it('should undo removeNode', () => {
      service.removeNode('child2');
      expect(service.getNode('child2')).toBeUndefined();
      
      service.undo();
      expect(service.getNode('child2')).toBeTruthy();
    });

    it('should undo reparent', async () => {
      await service.reparent('grandchild', 'child2');
      const grandchild = service.getNode('grandchild');
      expect(grandchild?.parentIds).toContain('child2');
      
      service.undo();
      const restored = service.getNode('grandchild');
      expect(restored?.parentIds).toContain('child1');
      expect(restored?.parentIds).not.toContain('child2');
    });

    it('should support multiple undo operations', () => {
      service.addNode({ id: 'n1', label: 'N1', parentIds: [] });
      service.addNode({ id: 'n2', label: 'N2', parentIds: [] });
      service.addNode({ id: 'n3', label: 'N3', parentIds: [] });
      
      expect(service.getGraphData().nodes.length).toBe(7);
      
      service.undo();
      service.undo();
      service.undo();
      
      expect(service.getGraphData().nodes.length).toBe(4);
    });
  });

  // Note: Validation methods (isGraphValid, getValidationErrors) can be added later

  describe('getGraphData', () => {
    it('should return complete graph data', () => {
      service.initialize(initialNodes);
      const data = service.getGraphData();
      
      expect(data.nodes).toBeDefined();
      expect(data.nodes.length).toBe(4);
    });

    it('should return deep copy (not reference)', () => {
      service.initialize(initialNodes);
      const data1 = service.getGraphData();
      const data2 = service.getGraphData();
      
      expect(data1.nodes).not.toBe(data2.nodes);
    });
  });

  describe('canUndo/canRedo signals', () => {
    beforeEach(() => {
      service.initialize(initialNodes);
    });

    it('should correctly report canUndo state', () => {
      expect(service.canUndo()).toBeFalse();
      
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      expect(service.canUndo()).toBeTrue();
    });

    it('should correctly report canRedo state', () => {
      expect(service.canRedo()).toBeFalse();
      
      service.addNode({ id: 'new', label: 'New', parentIds: [] });
      service.undo();
      expect(service.canRedo()).toBeTrue();
    });
  });
});
