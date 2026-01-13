/**
 * Unit tests for ExportService
 */
import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';
import { ExportConfig } from '../models/config.models';

describe('ExportService', () => {
  let service: ExportService;
  let cySpy: any;

  beforeEach(() => {
    // Mock Cytoscape
    cySpy = jasmine.createSpyObj('Core', ['json', 'png', 'jpg', 'svg']);
    
    // Default mocks
    cySpy.json.and.returnValue({ elements: { nodes: [], edges: [] } });
    cySpy.png.and.returnValue('data:image/png;base64,fake');
    cySpy.jpg.and.returnValue('data:image/jpeg;base64,fake');
    cySpy.svg.and.returnValue('<svg>fake</svg>');

    // Spy on DOM methods for download
    spyOn(document, 'createElement').and.callThrough();
    spyOn(document.body, 'appendChild').and.callThrough();
    spyOn(document.body, 'removeChild').and.callThrough();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:fake');
    spyOn(URL, 'revokeObjectURL');

    TestBed.configureTestingModule({
      providers: [ExportService]
    });
    service = TestBed.inject(ExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportGraph', () => {
    it('should export JSON', () => {
      const config: ExportConfig = { format: 'json', filename: 'test' };
      // Mock anchor click
      const mockAnchor = jasmine.createSpyObj('a', ['click', 'setAttribute']);
      (document.createElement as jasmine.Spy).and.returnValue(mockAnchor);

      service.exportGraph(cySpy, config);

      expect(cySpy.json).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export PNG', () => {
      const config: ExportConfig = { format: 'png', filename: 'test' };
      const mockAnchor = jasmine.createSpyObj('a', ['click', 'setAttribute']);
      (document.createElement as jasmine.Spy).and.returnValue(mockAnchor);

      service.exportGraph(cySpy, config);

      expect(cySpy.png).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should export JPEG', () => {
      const config: ExportConfig = { format: 'jpeg', filename: 'test' };
      const mockAnchor = jasmine.createSpyObj('a', ['click', 'setAttribute']);
      (document.createElement as jasmine.Spy).and.returnValue(mockAnchor);

      service.exportGraph(cySpy, config);

      expect(cySpy.jpg).toHaveBeenCalled();
    });

    it('should export SVG', () => {
      const config: ExportConfig = { format: 'svg', filename: 'test' };
      const mockAnchor = jasmine.createSpyObj('a', ['click', 'setAttribute']);
      (document.createElement as jasmine.Spy).and.returnValue(mockAnchor);

      service.exportGraph(cySpy, config);

      expect(cySpy.svg).toHaveBeenCalled();
    });

    it('should export CSV', () => {
      const config: ExportConfig = { format: 'csv', filename: 'test' };
      
      // Mock cy.json returning structure for CSV
      cySpy.json.and.returnValue({
        elements: {
          nodes: [
            { data: { id: 'n1', label: 'Node 1', parent: 'root' } },
            { data: { id: 'root', label: 'Root' } }
          ],
          edges: []
        }
      });

      const mockAnchor = jasmine.createSpyObj('a', ['click', 'setAttribute']);
      (document.createElement as jasmine.Spy).and.returnValue(mockAnchor);

      service.exportGraph(cySpy, config);

      expect(cySpy.json).toHaveBeenCalled(); // CSV derived from JSON
      expect(mockAnchor.click).toHaveBeenCalled();
      
      // Verify CSV content (roughly)
      // Check createObjectURL calls arguments
      const blobArgs = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
      expect(blobArgs instanceof Blob).toBeTrue();
    });
  });

  describe('validations', () => {
    it('should throw error for unsupported format', () => {
      const config: any = { format: 'unsupported', filename: 'test' };
      expect(() => service.exportGraph(cySpy, config)).toThrowError(/Unsupported export format/);
    });
  });
});
