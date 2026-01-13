/**
 * FlexiGraph Minimap Component
 * Provides an overview panel showing the entire graph with navigation
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Core, NodeSingular } from 'cytoscape';

export type MinimapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MinimapViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'flexi-minimap',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="minimap-container"
      [class]="'position-' + position"
      [style.width.px]="width"
      [style.height.px]="height"
      role="img"
      aria-label="Graph overview minimap">
      
      <canvas 
        #minimapCanvas
        class="minimap-canvas"
        [width]="width"
        [height]="height"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()">
      </canvas>
      
      <div 
        class="viewport-indicator"
        [style.left.px]="viewportRect().x"
        [style.top.px]="viewportRect().y"
        [style.width.px]="viewportRect().width"
        [style.height.px]="viewportRect().height">
      </div>
      
      @if (showLabel) {
        <div class="minimap-label">Overview</div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      z-index: 50;
    }

    .minimap-container {
      position: relative;
      background: var(--fg-surface, #ffffff);
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    /* Positioning classes */
    .minimap-container.position-top-left { 
      position: fixed; 
      top: 10px; 
      left: 10px; 
    }
    .minimap-container.position-top-right { 
      position: fixed; 
      top: 10px; 
      right: 10px; 
    }
    .minimap-container.position-bottom-left { 
      position: fixed; 
      bottom: 10px; 
      left: 10px; 
    }
    .minimap-container.position-bottom-right { 
      position: fixed; 
      bottom: 60px; /* Above zoom controls */
      right: 10px; 
    }

    .minimap-canvas {
      display: block;
      cursor: crosshair;
    }

    .viewport-indicator {
      position: absolute;
      border: 2px solid var(--fg-primary, #007bff);
      background: rgba(0, 123, 255, 0.1);
      pointer-events: none;
      border-radius: 2px;
      transition: all 0.1s ease-out;
    }

    .minimap-label {
      position: absolute;
      bottom: 4px;
      left: 4px;
      font-size: 9px;
      font-weight: 500;
      color: var(--fg-text, #666);
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `]
})
export class FlexiMinimapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('minimapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Inputs
  @Input() cytoscape: Core | null = null;
  @Input() position: MinimapPosition = 'bottom-right';
  @Input() width = 150;
  @Input() height = 100;
  @Input() nodeColor = '#94a3b8';
  @Input() edgeColor = '#cbd5e1';
  @Input() backgroundColor = '#f8fafc';
  @Input() showLabel = true;
  @Input() updateInterval = 100; // ms

  // Outputs
  @Output() navigate = new EventEmitter<{ x: number; y: number }>();

  // State
  private isDragging = false;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private updateTimer: any;
  private resizeObserver: ResizeObserver | null = null;

  viewportRect = signal<MinimapViewport>({ x: 0, y: 0, width: 50, height: 30 });

  ngAfterViewInit(): void {
    this.setupMinimap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cytoscape'] && !changes['cytoscape'].firstChange) {
      this.setupMinimap();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupMinimap(): void {
    if (!this.cytoscape) return;
    
    // Initial render
    this.render();
    this.updateViewport();

    // Listen to Cytoscape events
    this.cytoscape.on('pan zoom resize', () => {
      this.updateViewport();
    });

    this.cytoscape.on('add remove data position', '*', () => {
      this.scheduleRender();
    });
  }

  private scheduleRender(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => this.render(), this.updateInterval);
  }

  private render(): void {
    if (!this.canvasRef || !this.cytoscape) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Calculate scale to fit graph in minimap
    const bb = this.cytoscape.elements().boundingBox();
    if (bb.w === 0 || bb.h === 0) return;

    const padding = 10;
    const scaleX = (this.width - padding * 2) / bb.w;
    const scaleY = (this.height - padding * 2) / bb.h;
    this.scale = Math.min(scaleX, scaleY, 1);

    // Center the graph
    this.offsetX = (this.width - bb.w * this.scale) / 2 - bb.x1 * this.scale;
    this.offsetY = (this.height - bb.h * this.scale) / 2 - bb.y1 * this.scale;

    // Draw edges
    ctx.strokeStyle = this.edgeColor;
    ctx.lineWidth = 1;
    this.cytoscape.edges().forEach((edge: any) => {
      const source = edge.source();
      const target = edge.target();
      const sp = source.position();
      const tp = target.position();

      ctx.beginPath();
      ctx.moveTo(sp.x * this.scale + this.offsetX, sp.y * this.scale + this.offsetY);
      ctx.lineTo(tp.x * this.scale + this.offsetX, tp.y * this.scale + this.offsetY);
      ctx.stroke();
    });

    // Draw nodes
    ctx.fillStyle = this.nodeColor;
    this.cytoscape.nodes().forEach((node: NodeSingular) => {
      const pos = node.position();
      const x = pos.x * this.scale + this.offsetX;
      const y = pos.y * this.scale + this.offsetY;
      const size = Math.max(3, node.width() * this.scale * 0.3);

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private updateViewport(): void {
    if (!this.cytoscape) return;

    const extent = this.cytoscape.extent();
    const zoom = this.cytoscape.zoom();
    const pan = this.cytoscape.pan();

    // Calculate viewport rectangle in minimap coordinates
    const container = this.cytoscape.container();
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const vpWidth = (containerWidth / zoom) * this.scale;
    const vpHeight = (containerHeight / zoom) * this.scale;
    const vpX = (-pan.x / zoom) * this.scale + this.offsetX;
    const vpY = (-pan.y / zoom) * this.scale + this.offsetY;

    this.viewportRect.set({
      x: Math.max(0, vpX),
      y: Math.max(0, vpY),
      width: Math.min(vpWidth, this.width),
      height: Math.min(vpHeight, this.height)
    });
  }

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.navigateToPosition(event);
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.navigateToPosition(event);
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  private navigateToPosition(event: MouseEvent): void {
    if (!this.cytoscape) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert minimap coordinates to graph coordinates
    const graphX = (x - this.offsetX) / this.scale;
    const graphY = (y - this.offsetY) / this.scale;

    // Pan to center on this position
    const container = this.cytoscape.container();
    if (!container) return;

    const zoom = this.cytoscape.zoom();
    const panX = container.clientWidth / 2 - graphX * zoom;
    const panY = container.clientHeight / 2 - graphY * zoom;

    this.cytoscape.animate({
      pan: { x: panX, y: panY },
      duration: 150,
      easing: 'ease-out'
    } as any);

    this.navigate.emit({ x: graphX, y: graphY });
  }

  private cleanup(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Force a re-render of the minimap
   */
  refresh(): void {
    this.render();
    this.updateViewport();
  }
}
