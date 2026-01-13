import { Injectable } from '@angular/core';
import type { Core } from 'cytoscape';
import type { FlexiGraphData, FlexiNode } from '../models/graph.models';
import type { ExportConfig } from '../models/config.models';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export graph as an image
   */
  async exportToImage(
    cy: Core, 
    type: 'png' | 'jpeg' | 'svg', 
    config: ExportConfig,
    filename: string = 'graph'
  ): Promise<void> {
    const options: any = {
      output: 'blob',
      bg: config.defaultBackgroundColor || '#ffffff',
      full: true, // Export full graph, not just viewport
      scale: config.defaultScale || 2,
      quality: config.defaultQuality || 0.92
    };

    let blob: Blob;

    try {
      if (type === 'svg') {
        // Cytoscape SVG export isn't built-in to Core in definitions sometimes, 
        // but 'cytoscape-svg' extension might be needed or it's method named differently.
        // Standard cytoscape has cy.svg() but returns string.
        // We will assume standard method for now.
        const svgContent = (cy as any).svg({ ...options, output: 'string', scale: 1 });
        blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      } else if (type === 'png') {
        blob = await (cy as any).png(options);
      } else if (type === 'jpeg') {
        blob = await (cy as any).jpg(options);
      } else {
        throw new Error(`Unsupported image type: ${type}`);
      }

      this.downloadFile(blob, `${filename}.${type}`);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Export graph data as JSON
   */
  exportToJson(data: FlexiGraphData, filename: string = 'graph'): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this.downloadFile(blob, `${filename}.json`);
  }

  /**
   * Export nodes metadata as CSV
   */
  exportToCsv(nodes: FlexiNode[], filename: string = 'graph-nodes'): void {
    if (!nodes || nodes.length === 0) return;

    // Get all unique keys from data
    const dataKeys = new Set<string>();
    nodes.forEach(node => {
      if (node.data) {
        Object.keys(node.data).forEach(k => dataKeys.add(k));
      }
    });

    const headers = ['id', 'label', 'parentIds', ...Array.from(dataKeys)];
    const rows = nodes.map(node => {
      const row = [
        node.id,
        `"${node.label.replace(/"/g, '""')}"`, // Escape quotes
        `"${node.parentIds.join(',')}"`
      ];

      dataKeys.forEach(key => {
        const val = node.data?.[key];
        const valStr = val === undefined || val === null ? '' : String(val);
        row.push(`"${valStr.replace(/"/g, '""')}"`);
      });

      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${filename}.csv`);
  }

  /**
   * Trigger browser download for a blob
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // =====================
  // IMPORT METHODS
  // =====================

  /**
   * Import graph data from JSON string
   */
  importFromJson<T = any>(jsonString: string): FlexiGraphData<T> {
    try {
      const data = JSON.parse(jsonString);
      return this.validateAndNormalizeData<T>(data);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${(error as Error).message}`);
    }
  }

  /**
   * Import graph data from JSON file
   */
  async importFromJsonFile<T = any>(file: File): Promise<FlexiGraphData<T>> {
    const content = await this.readFileAsText(file);
    return this.importFromJson<T>(content);
  }

  /**
   * Import nodes from CSV string
   */
  importFromCsv<T = any>(csvString: string): FlexiNode<T>[] {
    const lines = csvString.trim().split('\n').map(line => this.parseCsvLine(line));
    
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0];
    const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const labelIndex = headers.findIndex(h => h.toLowerCase() === 'label');
    const parentIdsIndex = headers.findIndex(h => h.toLowerCase() === 'parentids');

    if (idIndex === -1) {
      throw new Error('CSV must contain an "id" column');
    }
    if (labelIndex === -1) {
      throw new Error('CSV must contain a "label" column');
    }

    const nodes: FlexiNode<T>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const id = row[idIndex] || `node-${i}`;
      const label = row[labelIndex] || id;
      const parentIds = parentIdsIndex >= 0 && row[parentIdsIndex] 
        ? row[parentIdsIndex].split(',').map(p => p.trim()).filter(p => p)
        : [];

      // Extract additional data from other columns
      const data: Record<string, any> = {};
      headers.forEach((header, idx) => {
        if (idx !== idIndex && idx !== labelIndex && idx !== parentIdsIndex) {
          data[header] = row[idx] || '';
        }
      });

      nodes.push({
        id,
        label,
        parentIds,
        data: Object.keys(data).length > 0 ? data as T : undefined
      });
    }

    return nodes;
  }

  /**
   * Import nodes from CSV file
   */
  async importFromCsvFile<T = any>(file: File): Promise<FlexiNode<T>[]> {
    const content = await this.readFileAsText(file);
    return this.importFromCsv<T>(content);
  }

  /**
   * Open file picker and import JSON
   */
  async openJsonFilePicker<T = any>(): Promise<FlexiGraphData<T>> {
    const file = await this.openFilePicker('.json', 'application/json');
    return this.importFromJsonFile<T>(file);
  }

  /**
   * Open file picker and import CSV
   */
  async openCsvFilePicker<T = any>(): Promise<FlexiNode<T>[]> {
    const file = await this.openFilePicker('.csv', 'text/csv');
    return this.importFromCsvFile<T>(file);
  }

  /**
   * Create and trigger a file input for file selection
   */
  private openFilePicker(accept: string, mimeType: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      
      input.onchange = (event: Event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          resolve(files[0]);
        } else {
          reject(new Error('No file selected'));
        }
      };
      
      input.oncancel = () => reject(new Error('File selection cancelled'));
      input.click();
    });
  }

  /**
   * Read file content as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse a CSV line respecting quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Validate and normalize imported data
   */
  private validateAndNormalizeData<T>(data: any): FlexiGraphData<T> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: expected an object');
    }

    // Handle both { nodes: [...] } and [...] formats
    let nodes: any[];
    let edges: any[] = [];

    if (Array.isArray(data)) {
      nodes = data;
    } else if (Array.isArray(data.nodes)) {
      nodes = data.nodes;
      edges = data.edges || [];
    } else {
      throw new Error('Invalid data format: expected nodes array');
    }

    // Validate and normalize each node
    const normalizedNodes: FlexiNode<T>[] = nodes.map((node, index) => {
      if (!node.id) {
        throw new Error(`Node at index ${index} is missing required 'id' property`);
      }

      return {
        id: String(node.id),
        label: node.label || node.name || String(node.id),
        parentIds: Array.isArray(node.parentIds) 
          ? node.parentIds.map(String) 
          : (node.parent ? [String(node.parent)] : []),
        data: node.data,
        position: node.position,
        locked: node.locked,
        classes: node.classes
      };
    });

    return {
      nodes: normalizedNodes,
      edges
    };
  }
}

