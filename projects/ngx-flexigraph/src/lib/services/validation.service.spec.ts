import { TestBed } from '@angular/core/testing';
import { ValidationService } from './validation.service';
import { FlexiNode } from '../models/graph.models';
import { DEFAULT_FLEXIGRAPH_CONFIG, FlexiGraphConfig } from '../models/config.models';

describe('ValidationService', () => {
  let service: ValidationService;
  let nodes: FlexiNode[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationService]
    });
    service = TestBed.inject(ValidationService);
    nodes = [
      { id: '1', label: 'Node 1', parentIds: [] },
      { id: '2', label: 'Node 2', parentIds: ['1'] },
      { id: '3', label: 'Node 3', parentIds: ['2'] }
    ];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateEdge', () => {
    it('should fail if source or target node does not exist', async () => {
      const result = await service.validateEdge(nodes, '1', '99', DEFAULT_FLEXIGRAPH_CONFIG);
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('not found');
    });

    it('should fail if edge already exists', async () => {
      const result = await service.validateEdge(nodes, '1', '2', DEFAULT_FLEXIGRAPH_CONFIG);
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('Edge already exists');
    });

    it('should fail for self-loops by default', async () => {
      const result = await service.validateEdge(nodes, '1', '1', DEFAULT_FLEXIGRAPH_CONFIG);
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('Self-loops');
    });

    it('should allow self-loops if configured', async () => {
      const config: FlexiGraphConfig = {
        ...DEFAULT_FLEXIGRAPH_CONFIG,
        validation: { ...DEFAULT_FLEXIGRAPH_CONFIG.validation!, allowSelfLoops: true }
      };
      const result = await service.validateEdge(nodes, '1', '1', config);
      expect(result.isValid).toBeTrue();
    });

    it('should detect cycles', async () => {
      // 1 -> 2 -> 3. Try to add 3 -> 1
      const result = await service.validateEdge(nodes, '3', '1', DEFAULT_FLEXIGRAPH_CONFIG);
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('Cycle detected');
    });

    it('should check max parents limit', async () => {
      const config: FlexiGraphConfig = {
        ...DEFAULT_FLEXIGRAPH_CONFIG,
        multiParent: { enabled: true, modifier: 'shift', maxParents: 1 }
      };
      // Node 2 already has 1 parent (Node 1). Try to add Node 3 as parent.
      // Wait, Node 3 is child of 2. Let's try adding Node 3 as parent of Node 2. Cycle.
      // Let's create new node 4.
      const testNodes = [
        ...nodes, 
        { id: '4', label: 'Node 4', parentIds: [] }
      ];
      // Node 2 has '1' as parent. Try add '4' as parent.
      const result = await service.validateEdge(testNodes, '4', '2', config);
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('cannot have more than 1 parents');
    });

    it('should validate max depth', async () => {
       const config: FlexiGraphConfig = {
        ...DEFAULT_FLEXIGRAPH_CONFIG,
        validation: { ...DEFAULT_FLEXIGRAPH_CONFIG.validation!, maxDepth: 2 }
      };
      // 1 (depth 0) -> 2 (depth 1) -> 3 (depth 2)
      // Trying to add child to 3 should fail as it would be depth 3
      const testNodes = [...nodes, { id: '4', label: 'Node 4', parentIds: [] }];
      
      const result = await service.validateEdge(testNodes, '3', '4', config);
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('exceed the maximum graph depth');
    });
    
    it('should execute custom validator', async () => {
        const customConfig: FlexiGraphConfig = {
            ...DEFAULT_FLEXIGRAPH_CONFIG,
            validation: {
                ...DEFAULT_FLEXIGRAPH_CONFIG.validation!,
                customValidator: (s, t, n) => {
                    return Promise.resolve(s !== '1'); // Forbid '1' as source
                }
            }
        };
        const result = await service.validateEdge(nodes, '1', '3', customConfig);
        expect(result.isValid).toBeFalse();
        expect(result.error).toBe('Custom validation failed');
    });
  });

  describe('validateReparent', () => {
      it('should prevent reparenting to self', async () => {
          const result = await service.validateReparent(nodes, '1', '1', DEFAULT_FLEXIGRAPH_CONFIG);
          expect(result.isValid).toBeFalse();
          expect(result.error).toContain('itself');
      });

      it('should prevent cycles during reparent', async () => {
          // 1 -> 2 -> 3.
          // Reparent 1 to 3. (3 becomes parent of 1). 3->1->2->3 cycle.
          const result = await service.validateReparent(nodes, '1', '3', DEFAULT_FLEXIGRAPH_CONFIG);
          expect(result.isValid).toBeFalse();
          expect(result.error).toContain('circular dependency');
      });
  });
});
