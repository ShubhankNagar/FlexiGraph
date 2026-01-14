/**
 * PDF Export Service for FlexiGraph
 * Comprehensive PDF generation with multiple options and best practices
 */

import { Injectable } from '@angular/core';
import type { Core } from 'cytoscape';
import type { FlexiNode } from '../models/graph.models';

/**
 * PDF page size definitions (in mm)
 */
export const PDF_PAGE_SIZES = {
  'a4': { width: 210, height: 297 },
  'a3': { width: 297, height: 420 },
  'letter': { width: 216, height: 279 },
  'legal': { width: 216, height: 356 },
  'tabloid': { width: 279, height: 432 },
  'custom': { width: 0, height: 0 }
} as const;

export type PDFPageSize = keyof typeof PDF_PAGE_SIZES;
export type PDFOrientation = 'portrait' | 'landscape';

/**
 * PDF export configuration options
 */
export interface PDFExportOptions {
  /** Page size preset or 'custom' */
  pageSize?: PDFPageSize;
  /** Custom width in mm (when pageSize is 'custom') */
  customWidth?: number;
  /** Custom height in mm (when pageSize is 'custom') */
  customHeight?: number;
  /** Page orientation */
  orientation?: PDFOrientation;
  /** Document title (shown in header) */
  title?: string;
  /** Document description/subtitle */
  description?: string;
  /** Document author metadata */
  author?: string;
  /** Document subject metadata */
  subject?: string;
  /** Document keywords metadata */
  keywords?: string[];
  /** Include timestamp in footer */
  includeTimestamp?: boolean;
  /** Include page numbers */
  includePageNumbers?: boolean;
  /** Image quality (0-1) */
  quality?: number;
  /** Graph image scale factor */
  scale?: number;
  /** Background color */
  backgroundColor?: string;
  /** Margin in mm */
  margin?: number;
  /** Include node list on separate page */
  includeNodeList?: boolean;
  /** Include graph statistics */
  includeStats?: boolean;
  /** Header logo (base64 or URL) */
  headerLogo?: string;
  /** Custom CSS for styling (embedded in PDF) */
  customStyles?: string;
}

/**
 * Default PDF export options
 */
export const DEFAULT_PDF_OPTIONS: Required<Omit<PDFExportOptions, 'headerLogo' | 'customStyles' | 'customWidth' | 'customHeight'>> = {
  pageSize: 'a4',
  orientation: 'landscape',
  title: 'FlexiGraph Export',
  description: '',
  author: '',
  subject: 'Graph Export',
  keywords: ['graph', 'diagram', 'flexigraph'],
  includeTimestamp: true,
  includePageNumbers: true,
  quality: 0.95,
  scale: 2,
  backgroundColor: '#ffffff',
  margin: 15,
  includeNodeList: false,
  includeStats: true
};

/**
 * Graph statistics for PDF export
 */
export interface GraphStatistics {
  totalNodes: number;
  rootNodes: number;
  leafNodes: number;
  maxDepth: number;
  avgParentsPerNode: number;
  multiParentNodes: number;
}

@Injectable({
  providedIn: 'root'
})
export class PDFExportService {
  private jsPDF: any = null;

  /**
   * Export graph to PDF
   */
  async exportToPDF(
    cy: Core,
    nodes: FlexiNode[],
    options: PDFExportOptions = {},
    filename: string = 'graph-export'
  ): Promise<void> {
    const opts = { ...DEFAULT_PDF_OPTIONS, ...options };
    
    // Ensure jsPDF is available
    await this.ensureJsPDFLoaded();
    
    if (!this.jsPDF) {
      throw new Error('jsPDF library is not available. Please install jspdf package.');
    }

    try {
      // Get page dimensions
      const pageDims = this.getPageDimensions(opts);
      
      // Create PDF document
      const pdf = new this.jsPDF({
        orientation: opts.orientation,
        unit: 'mm',
        format: opts.pageSize === 'custom' 
          ? [opts.customWidth || 210, opts.customHeight || 297]
          : opts.pageSize
      });

      // Set document metadata
      this.setDocumentMetadata(pdf, opts);

      // Calculate content area
      const contentArea = {
        x: opts.margin,
        y: opts.margin,
        width: pageDims.width - (opts.margin * 2),
        height: pageDims.height - (opts.margin * 2) - 20 // Reserve space for footer
      };

      let currentY = contentArea.y;

      // Add header
      if (opts.title) {
        currentY = this.addHeader(pdf, opts, contentArea, currentY);
      }

      // Add graph image
      currentY = await this.addGraphImage(pdf, cy, opts, contentArea, currentY);

      // Add statistics
      if (opts.includeStats) {
        const stats = this.calculateStatistics(nodes);
        currentY = this.addStatistics(pdf, stats, contentArea, currentY);
      }

      // Add footer
      this.addFooter(pdf, opts, pageDims, 1);

      // Add node list on new page if requested
      if (opts.includeNodeList && nodes.length > 0) {
        pdf.addPage();
        this.addNodeListPage(pdf, nodes, opts, contentArea, pageDims);
        this.addFooter(pdf, opts, pageDims, 2);
      }

      // Save the PDF
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error(`Failed to export PDF: ${(error as Error).message}`);
    }
  }

  /**
   * Load jsPDF dynamically if not already loaded
   */
  private async ensureJsPDFLoaded(): Promise<void> {
    // Check if already loaded
    if (this.jsPDF) return;
    
    // Check global scope (CDN loaded)
    if (typeof (window as any).jspdf !== 'undefined') {
      this.jsPDF = (window as any).jspdf.jsPDF;
      return;
    }

    // Try dynamic import (npm package)
    try {
      // Direct dynamic import - webpack/esbuild will handle this
      const module = await import('jspdf');
      this.jsPDF = module.jsPDF || module.default;
    } catch (err) {
      // jsPDF not available - will throw error when export is attempted
      console.warn(
        'jsPDF not found. To enable PDF export, install with: npm install jspdf\n' +
        'Or include via CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>'
      );
    }
  }

  /**
   * Get page dimensions based on options
   */
  private getPageDimensions(opts: Required<Omit<PDFExportOptions, 'headerLogo' | 'customStyles' | 'customWidth' | 'customHeight'>> & PDFExportOptions): { width: number; height: number } {
    let dims = opts.pageSize === 'custom'
      ? { width: opts.customWidth || 210, height: opts.customHeight || 297 }
      : { ...PDF_PAGE_SIZES[opts.pageSize] };

    // Swap dimensions for landscape
    if (opts.orientation === 'landscape') {
      [dims.width, dims.height] = [dims.height, dims.width];
    }

    return dims;
  }

  /**
   * Set PDF document metadata
   */
  private setDocumentMetadata(pdf: any, opts: PDFExportOptions): void {
    const properties: any = {
      title: opts.title || 'FlexiGraph Export',
      subject: opts.subject || 'Graph Export',
      creator: 'ngx-flexigraph'
    };

    if (opts.author) properties.author = opts.author;
    if (opts.keywords?.length) properties.keywords = opts.keywords.join(', ');

    pdf.setProperties(properties);
  }

  /**
   * Add header to PDF
   */
  private addHeader(
    pdf: any,
    opts: PDFExportOptions,
    contentArea: { x: number; y: number; width: number; height: number },
    currentY: number
  ): number {
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 33, 33);
    pdf.text(opts.title || '', contentArea.x, currentY + 6);
    currentY += 10;

    // Description
    if (opts.description) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(opts.description, contentArea.x, currentY + 4);
      currentY += 8;
    }

    // Separator line
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.line(contentArea.x, currentY + 2, contentArea.x + contentArea.width, currentY + 2);
    currentY += 8;

    return currentY;
  }

  /**
   * Add graph image to PDF
   */
  private async addGraphImage(
    pdf: any,
    cy: Core,
    opts: PDFExportOptions,
    contentArea: { x: number; y: number; width: number; height: number },
    currentY: number
  ): Promise<number> {
    // Get graph as PNG
    const pngData = (cy as any).png({
      output: 'base64uri',
      bg: opts.backgroundColor || '#ffffff',
      full: true,
      scale: opts.scale || 2,
      quality: opts.quality || 0.95
    });

    // Calculate image dimensions to fit content area
    const availableHeight = contentArea.height - (currentY - contentArea.y) - 30; // Reserve space for stats
    const availableWidth = contentArea.width;

    // Get original image dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = pngData;
    });

    // Calculate scaled dimensions maintaining aspect ratio
    const aspectRatio = img.width / img.height;
    let imgWidth = availableWidth;
    let imgHeight = availableWidth / aspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = availableHeight * aspectRatio;
    }

    // Center horizontally
    const imgX = contentArea.x + (contentArea.width - imgWidth) / 2;

    // Add image
    pdf.addImage(pngData, 'PNG', imgX, currentY, imgWidth, imgHeight);

    return currentY + imgHeight + 8;
  }

  /**
   * Calculate graph statistics
   */
  calculateStatistics(nodes: FlexiNode[]): GraphStatistics {
    const rootNodes = nodes.filter(n => !n.parentIds || n.parentIds.length === 0);
    const allParentIds: string[] = [];
    nodes.forEach(n => {
      if (n.parentIds) allParentIds.push(...n.parentIds);
    });
    const childIds = new Set(allParentIds);
    const leafNodes = nodes.filter(n => !childIds.has(n.id) || 
      !nodes.some(other => other.parentIds?.includes(n.id)));
    const multiParentNodes = nodes.filter(n => n.parentIds && n.parentIds.length > 1);
    
    const totalParents = nodes.reduce((sum, n) => sum + (n.parentIds?.length || 0), 0);
    const avgParents = nodes.length > 0 ? totalParents / nodes.length : 0;

    // Calculate max depth using BFS
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const depths = new Map<string, number>();
    
    const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0; // Avoid cycles
      if (depths.has(nodeId)) return depths.get(nodeId)!;
      
      visited.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node || !node.parentIds || node.parentIds.length === 0) {
        depths.set(nodeId, 0);
        return 0;
      }

      const maxParentDepth = Math.max(
        ...node.parentIds.map(pid => calculateDepth(pid, new Set(visited)))
      );
      const depth = maxParentDepth + 1;
      depths.set(nodeId, depth);
      return depth;
    };

    nodes.forEach(n => calculateDepth(n.id));
    const maxDepth = depths.size > 0 ? Math.max(...Array.from(depths.values())) : 0;

    return {
      totalNodes: nodes.length,
      rootNodes: rootNodes.length,
      leafNodes: leafNodes.length,
      maxDepth,
      avgParentsPerNode: Math.round(avgParents * 100) / 100,
      multiParentNodes: multiParentNodes.length
    };
  }

  /**
   * Add statistics section to PDF
   */
  private addStatistics(
    pdf: any,
    stats: GraphStatistics,
    contentArea: { x: number; y: number; width: number; height: number },
    currentY: number
  ): number {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Graph Statistics', contentArea.x, currentY + 4);
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    const statsText = [
      `Total Nodes: ${stats.totalNodes}`,
      `Root Nodes: ${stats.rootNodes}`,
      `Leaf Nodes: ${stats.leafNodes}`,
      `Max Depth: ${stats.maxDepth}`,
      `Multi-Parent Nodes: ${stats.multiParentNodes}`,
      `Avg Parents/Node: ${stats.avgParentsPerNode}`
    ];

    // Display stats in two columns
    const colWidth = contentArea.width / 3;
    statsText.forEach((text, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      pdf.text(text, contentArea.x + (col * colWidth), currentY + 4 + (row * 5));
    });

    return currentY + 15;
  }

  /**
   * Add footer to PDF
   */
  private addFooter(
    pdf: any,
    opts: PDFExportOptions,
    pageDims: { width: number; height: number },
    pageNumber: number
  ): void {
    const footerY = pageDims.height - 10;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);

    // Timestamp
    if (opts.includeTimestamp) {
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated: ${timestamp}`, opts.margin || 15, footerY);
    }

    // Page number
    if (opts.includePageNumbers) {
      const pageText = `Page ${pageNumber}`;
      const textWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageDims.width - (opts.margin || 15) - textWidth, footerY);
    }

    // Center text
    pdf.text('Created with ngx-flexigraph', pageDims.width / 2, footerY, { align: 'center' });
  }

  /**
   * Add node list page
   */
  private addNodeListPage(
    pdf: any,
    nodes: FlexiNode[],
    opts: PDFExportOptions,
    contentArea: { x: number; y: number; width: number; height: number },
    pageDims: { width: number; height: number }
  ): void {
    let currentY = contentArea.y;

    // Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 33, 33);
    pdf.text('Node List', contentArea.x, currentY + 6);
    currentY += 12;

    // Table headers
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(contentArea.x, currentY, contentArea.width, 7, 'F');
    
    const colWidths = [contentArea.width * 0.25, contentArea.width * 0.35, contentArea.width * 0.4];
    pdf.text('ID', contentArea.x + 2, currentY + 5);
    pdf.text('Label', contentArea.x + colWidths[0] + 2, currentY + 5);
    pdf.text('Parent IDs', contentArea.x + colWidths[0] + colWidths[1] + 2, currentY + 5);
    currentY += 8;

    // Table rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    const maxRows = Math.floor((pageDims.height - currentY - 20) / 6);
    const displayNodes = nodes.slice(0, maxRows);

    displayNodes.forEach((node, i) => {
      const rowY = currentY + (i * 6);
      
      // Alternating row colors
      if (i % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(contentArea.x, rowY - 1, contentArea.width, 6, 'F');
      }

      pdf.setTextColor(60, 60, 60);
      
      // Truncate text if too long
      const truncate = (text: string, maxLen: number) => 
        text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;

      pdf.text(truncate(node.id, 25), contentArea.x + 2, rowY + 3);
      pdf.text(truncate(node.label, 35), contentArea.x + colWidths[0] + 2, rowY + 3);
      pdf.text(truncate(node.parentIds?.join(', ') || '-', 40), contentArea.x + colWidths[0] + colWidths[1] + 2, rowY + 3);
    });

    if (nodes.length > maxRows) {
      currentY = currentY + (displayNodes.length * 6) + 5;
      pdf.setTextColor(100, 100, 100);
      pdf.text(`... and ${nodes.length - maxRows} more nodes`, contentArea.x, currentY);
    }
  }

  /**
   * Export with custom template
   */
  async exportWithTemplate(
    cy: Core,
    nodes: FlexiNode[],
    template: 'minimal' | 'detailed' | 'professional',
    filename: string = 'graph-export'
  ): Promise<void> {
    const templates: Record<string, PDFExportOptions> = {
      minimal: {
        pageSize: 'a4',
        orientation: 'landscape',
        includeStats: false,
        includeNodeList: false,
        includeTimestamp: false,
        includePageNumbers: false,
        margin: 10
      },
      detailed: {
        pageSize: 'a4',
        orientation: 'landscape',
        includeStats: true,
        includeNodeList: true,
        includeTimestamp: true,
        includePageNumbers: true
      },
      professional: {
        pageSize: 'a4',
        orientation: 'landscape',
        title: 'Graph Analysis Report',
        description: 'Comprehensive graph visualization and analysis',
        includeStats: true,
        includeNodeList: true,
        includeTimestamp: true,
        includePageNumbers: true,
        margin: 20
      }
    };

    return this.exportToPDF(cy, nodes, templates[template], filename);
  }
}
