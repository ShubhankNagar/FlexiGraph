/**
 * Unit tests for StableLayoutService
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { StableLayoutService, LayoutChange } from './stable-layout.service';
import { DEFAULT_FLEXIGRAPH_CONFIG } from '../models/config.models';

describe('StableLayoutService', () => {
  let service: StableLayoutService;
  let cySpy: any;
  let layoutSpy: any;
  let collectionSpy: any;
  let nodesSpy: any;

  beforeEach(() => {
    // Setup mocks
    layoutSpy = jasmine.createSpyObj('Layout', ['run']);
    
    // Nodes collection mock
    nodesSpy = jasmine.createSpyObj('Nodes', [
      'forEach', 'filter', 'lock', 'unlock', 'position', 
      'union', 'connectedEdges', 'animate', 'layout', 'map', 'toArray'
    ]);
    nodesSpy.forEach.and.callFake((callback: any) => {
      // no-op by default or implement if needed
    });
    nodesSpy.filter.and.returnValue(nodesSpy);
    nodesSpy.union.and.returnValue(nodesSpy);
    nodesSpy.connectedEdges.and.returnValue(nodesSpy);
    nodesSpy.layout.and.returnValue(layoutSpy); // for runIncrementalLayout

    // Cytoscape Core mock
    cySpy = jasmine.createSpyObj('Core', [
      'nodes', 'layout', 'animate', 'batch', 'getElementById', 'extent', 'elements'
    ]);
    cySpy.nodes.and.returnValue(nodesSpy);
    cySpy.layout.and.returnValue(layoutSpy);
    cySpy.extent.and.returnValue({ x1:0, x2:100, y1:0, y2:100 });
    cySpy.animate.and.callFake(() => {}); // no-op
    cySpy.elements.and.returnValue(nodesSpy); // Mock elements to return nodes collection
    // cy.batch executes callback immediately
    cySpy.batch.and.callFake((fn: Function) => fn());

    TestBed.configureTestingModule({
      providers: [StableLayoutService]
    });
    service = TestBed.inject(StableLayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('runStableLayout', () => {
    it('should run full layout on first run', fakeAsync(() => {
      const config = { ...DEFAULT_FLEXIGRAPH_CONFIG.layout! };
      
      service.runStableLayout(cySpy, config);
      
      expect(service.isFirstLayout()).toBeTrue(); 
      expect(cySpy.layout).toHaveBeenCalled();
      
      // Simulate layout completion buffer (default duration might be 500ms + 50ms buffer)
      tick(1000); 
      
      expect(service.isFirstLayout()).toBeFalse();
    }));

    it('should cache positions after full layout', fakeAsync(() => {
      const config = { ...DEFAULT_FLEXIGRAPH_CONFIG.layout! };
      
      // Mock nodes for caching
      const mockNode = jasmine.createSpyObj('Node', ['id', 'position']);
      mockNode.id.and.returnValue('n1');
      mockNode.position.and.returnValue({ x: 10, y: 20 });
      
      nodesSpy.forEach.and.callFake((cb: any) => cb(mockNode));
      
      service.runStableLayout(cySpy, config);
      tick(1000);
      
      const cached = service.getCachedPosition('n1');
      expect(cached).toEqual({ x: 10, y: 20 });
    }));

    it('should run incremental layout on subsequent runs with changes', fakeAsync(() => {
      const config = { ...DEFAULT_FLEXIGRAPH_CONFIG.layout! };
      
      // Seed nodes for caching
      const mockNode = jasmine.createSpyObj('Node', ['id', 'position', 'lock', 'unlock', 'connectedEdges', 'incomers']);
      mockNode.id.and.returnValue('n1');
      mockNode.position.and.returnValue({ x: 10, y: 20 });
      mockNode.incomers.and.returnValue({ length: 0 }); // for add interactions
      
      // Need to handle both cache seeding and subsequent calls
      nodesSpy.forEach.and.callFake((cb: any) => cb(mockNode));
      // For filter/collection methods
      nodesSpy.filter.and.returnValue(nodesSpy);
      
      // Mock getElementById for getAffectedSubtreeIds
      cySpy.getElementById.and.callFake((id: string) => {
        if (id === 'n1' || id === 'n2') return mockNode;
        return { length: 0 };
      });

      // 1. Initial run
      service.runStableLayout(cySpy, config);
      tick(1000); // Ensure caching happens
      
      // 2. Clear spies
      cySpy.layout.calls.reset();
      
      // 3. Second run with change
      const change: LayoutChange = {
        type: 'add',
        affectedNodeIds: ['n2'],
        newNodeId: 'n2'
      };
      
      service.runStableLayout(cySpy, config, change);
      
      // Incremental layout does NOT call global cy.layout
      expect(cySpy.layout).not.toHaveBeenCalled();
      // But it calls layout on affected nodes collection
      expect(nodesSpy.layout).toHaveBeenCalled();
    }));

    it('should run full layout if change type is "full"', fakeAsync(() => {
      const config = { ...DEFAULT_FLEXIGRAPH_CONFIG.layout! };
      
      // 1. Initial run to seed cache
      service.runStableLayout(cySpy, config);
      tick(1000);
      cySpy.layout.calls.reset();
      
      // 2. Full update
      const change: LayoutChange = { type: 'full', affectedNodeIds: [] };
      service.runStableLayout(cySpy, config, change);
      
      expect(cySpy.layout).toHaveBeenCalled();
    }));
  });

  describe('restorePositions', () => {
    it('should restore positions from cache', fakeAsync(() => {
      const positions = {
        'n1': { x: 100, y: 200 }
      };
      
      const mockNode = jasmine.createSpyObj('Node', ['id', 'position', 'animate']);
      mockNode.id.and.returnValue('n1');
      
      nodesSpy.forEach.and.callFake((cb: any) => cb(mockNode));
      
      service.restorePositions(cySpy, positions, false); // No animation
      
      expect(mockNode.position).toHaveBeenCalledWith({ x: 100, y: 200 });
      
      tick(1000);
      expect(service.getCachedPosition('n1')).toEqual({ x: 100, y: 200 });
    }));
  });
});
