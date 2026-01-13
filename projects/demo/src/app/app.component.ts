import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import { FlexiGraphComponent, FlexiGraphConfig, DEFAULT_FLEXIGRAPH_CONFIG, NodeEvent, ReparentEvent, StateChangeEvent, ValidationEvent } from 'ngx-flexigraph';
import { TopbarComponent } from './components/topbar/topbar.component';
import { FloatingToolbarComponent } from './components/toolbar/floating-toolbar.component';
import { DemoSelectorComponent } from './components/demo-selector/demo-selector.component';
import { ToastContainerComponent } from './components/toast/toast.component';
import { DemoStateService, LayoutType } from './services/demo-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FlexiGraphComponent,
    TopbarComponent,
    FloatingToolbarComponent,
    DemoSelectorComponent,
    ToastContainerComponent
  ],
  template: `
    <div class="app-shell">
      <!-- Topbar -->
      <app-topbar
        (undo)="onUndo()"
        (redo)="onRedo()"
        (save)="onSave()"
        (exportAs)="onExport($event)"
        (importFrom)="onImport($event)">
      </app-topbar>

      <!-- Canvas -->
      <main class="canvas-area">
        <flexi-graph
          [nodes]="state.nodes()"
          [config]="getConfig"
          (nodeClick)="onNodeClick($event)"
          (nodeReparent)="onNodeReparent($event)"
          (stateChange)="onStateChange($event)"
          (validationFailed)="onValidationFailed($event)"
          (zoomChange)="onZoomChange($event)"
          #graph>
        </flexi-graph>

        <!-- Floating Demo Selector -->
        <app-demo-selector></app-demo-selector>

        <!-- Floating Toolbar -->
        <app-floating-toolbar
          (zoomIn)="graphComponent.zoomIn()"
          (zoomOut)="graphComponent.zoomOut()"
          (zoomFit)="graphComponent.zoomFit()"
          (resetLayout)="graphComponent.forceFullLayout()"
          #toolbar>
        </app-floating-toolbar>

        <!-- Help Hint -->
        <div class="canvas-hint">
          <span>Drag to reparent</span>
          <span class="dot">•</span>
          <span><kbd>Shift</kbd> + drag for multi-parent</span>
          <span class="dot">•</span>
          <span>Right-click for menu</span>
        </div>
      </main>

      <!-- Toast Notifications -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :host {
      /* Design Tokens */
      --bg-base: #09090b;
      --bg-subtle: #0f0f12;
      --bg-surface: #18181b;
      --bg-elevated: #1f1f23;
      --border-subtle: rgba(255, 255, 255, 0.06);
      --border: rgba(255, 255, 255, 0.1);
      --accent: #8b5cf6;
      --accent-subtle: rgba(139, 92, 246, 0.15);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #fafafa;
      --text-muted: #71717a;

      display: block;
      height: 100vh;
      height: 100dvh;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg-base);
      color: var(--text);
      overflow: hidden;
    }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .canvas-area {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    flexi-graph {
      display: block;
      width: 100%;
      height: 100%;
    }

    .canvas-hint {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: rgba(15, 15, 18, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: 100px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .canvas-hint kbd {
      padding: 2px 5px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
    }

    .canvas-hint .dot {
      color: var(--border);
    }

    @media (max-width: 768px) {
      .canvas-hint {
        display: none;
      }
    }
  `]
})
export class AppComponent implements AfterViewInit {
  @ViewChild('graph') graphComponent!: FlexiGraphComponent;
  @ViewChild('toolbar') toolbar!: FloatingToolbarComponent;
  
  state = inject(DemoStateService);

  ngAfterViewInit(): void {
    // Initialize toolbar zoom level after view is ready
    setTimeout(() => this.toolbar?.setZoomLevel(1), 100);
  }

  // Config getter
  getConfig = (): FlexiGraphConfig => ({
    ...DEFAULT_FLEXIGRAPH_CONFIG,
    styling: {
      theme: this.state.currentTheme() as any,
      nodeStyle: {
        backgroundColor: this.state.currentTheme() === 'dark' ? '#27272a' : '#f1f5f9',
        borderColor: this.state.currentTheme() === 'dark' ? '#3f3f46' : '#94a3b8',
        textColor: this.state.currentTheme() === 'dark' ? '#fafafa' : '#1e293b',
        borderWidth: 2,
        shape: 'round-rectangle',
        width: 160,
        height: 44,
        padding: 14,
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      selectedNodeStyle: {
        backgroundColor: '#8b5cf6',
        borderColor: '#a78bfa',
        textColor: '#fff',
        borderWidth: 2
      },
      hoveredNodeStyle: {
        borderColor: '#8b5cf6',
        borderWidth: 2
      },
      edgeStyle: {
        lineColor: this.state.currentTheme() === 'dark' ? '#52525b' : '#64748b',
        arrowColor: this.state.currentTheme() === 'dark' ? '#71717a' : '#475569',
        lineWidth: 2,
        curveStyle: 'bezier',
        targetArrowShape: 'triangle'
      },
      backgroundColor: this.state.currentTheme() === 'dark' ? '#09090b' : '#ffffff'
    },
    layout: {
      algorithm: this.state.currentLayout() as LayoutType,
      direction: this.state.currentDemo() === 'org-chart' ? 'TB' : 'LR',
      animate: true,
      animationDuration: 300,
      animationEasing: 'ease-out',
      nodeSpacing: 60,
      rankSpacing: 140,
      fit: true,
      padding: 40
    },
    multiParent: { enabled: true, modifier: 'shift', maxParents: 5 },
    zoomPan: {
      enableZoom: true,
      enablePan: true,
      showZoomControls: false, // Using custom toolbar
      controlsPosition: 'bottom-right',
      minZoom: 0.3,
      maxZoom: 2.5,
      zoomSensitivity: 0.1,
      enablePinchZoom: true,
      doubleClickZoom: true,
      smoothZoom: true,
      zoomAnimationDuration: 200
    },
    interaction: {
      enableDrag: true,
      enableContextMenu: true,
      enableBoxSelection: false,
      snapBackOnInvalid: true,
      snapBackDuration: 250
    },
    export: {
      enabled: true,
      filename: `flexigraph-${this.state.currentDemo()}`,
      defaultScale: 2,
      formats: ['png', 'jpeg', 'svg', 'json', 'csv', 'pdf']
    }
  });

  // Event handlers
  onNodeClick(event: NodeEvent): void {
    this.state.showToast(`Selected: ${event.node.label}`, 'info', 2000);
  }

  onNodeReparent(event: ReparentEvent): void {
    const action = event.isCombine ? 'Added parent to' : 'Reparented';
    this.state.showToast(`${action}: ${event.node.label}`, 'success');
  }

  onStateChange(event: StateChangeEvent): void {
    this.state.updateHistoryState(event.undoStackSize, event.redoStackSize);
  }

  onValidationFailed(event: ValidationEvent): void {
    this.state.showToast(event.message, 'error');
  }

  onZoomChange(event: { level: number }): void {
    this.toolbar?.setZoomLevel(event.level);
  }

  // Actions
  onUndo(): void {
    this.graphComponent?.undo();
  }

  onRedo(): void {
    this.graphComponent?.redo();
  }

  onSave(): void {
    this.state.markSaved();
  }

  async onExport(type: string): Promise<void> {
    if (!this.graphComponent) return;
    
    try {
      if (type === 'pdf') {
        const cy = this.graphComponent.getCytoscape();
        const { PDFExportService } = await import('ngx-flexigraph');
        const pdfService = new PDFExportService();
        await pdfService.exportWithTemplate(cy!, this.state.nodes(), 'professional', `graph-${this.state.currentDemo()}`);
      } else {
        await this.graphComponent.exportGraph(type as any);
      }
      this.state.showToast(`Exported as ${type.toUpperCase()}`, 'success');
    } catch (err) {
      this.state.showToast('Export failed', 'error');
    }
  }

  async onImport(type: string): Promise<void> {
    try {
      const { ExportService } = await import('ngx-flexigraph');
      const exportService = new ExportService();
      
      if (type === 'json') {
        const data = await exportService.openJsonFilePicker();
        this.state.nodes.set(data.nodes);
        this.state.showToast(`Imported ${data.nodes.length} nodes`, 'success');
      } else if (type === 'csv') {
        const nodes = await exportService.openCsvFilePicker();
        this.state.nodes.set(nodes);
        this.state.showToast(`Imported ${nodes.length} nodes`, 'success');
      }
    } catch (err) {
      this.state.showToast('Import failed', 'error');
    }
  }
}
