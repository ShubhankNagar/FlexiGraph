import { Component, ViewChild, AfterViewInit, inject } from '@angular/core';
import {
  FlexiGraphComponent,
  FlexiGraphConfig,
  DEFAULT_FLEXIGRAPH_CONFIG,
  NodeEvent,
  ReparentEvent,
  StateChangeEvent,
  ValidationEvent
} from 'ngx-flexigraph';
import { AppStateService, LayoutType } from '../../core/services/state.service';
import { HeaderComponent } from './components/header/header.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';

/**
 * Main workspace component - orchestrates the graph editing experience
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    FlexiGraphComponent,
    HeaderComponent,
    ToolbarComponent,
    SidebarComponent,
    ToastComponent
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss'
})
export class WorkspaceComponent implements AfterViewInit {
  @ViewChild('graph') graphComponent!: FlexiGraphComponent;
  @ViewChild('toolbar') toolbar!: ToolbarComponent;
  
  readonly state = inject(AppStateService);

  ngAfterViewInit(): void {
    // Initialize toolbar zoom level after view is ready
    setTimeout(() => this.toolbar?.setZoomLevel(1), 100);
  }

  /**
   * FlexiGraph configuration based on current state
   */
  graphConfig = (): FlexiGraphConfig => {
    const theme = this.state.currentTheme();
    
    const themeColors = {
      dark: {
        bgColor: '#09090b',
        nodeBg: '#27272a',
        nodeBorder: '#3f3f46',
        nodeText: '#fafafa',
        edgeColor: '#52525b',
        arrowColor: '#71717a'
      },
      light: {
        bgColor: '#ffffff',
        nodeBg: '#f1f5f9',
        nodeBorder: '#94a3b8',
        nodeText: '#1e293b',
        edgeColor: '#64748b',
        arrowColor: '#475569'
      },
      blue: {
        bgColor: '#0c1929',
        nodeBg: '#1e3a5f',
        nodeBorder: '#3b82f6',
        nodeText: '#e0f2fe',
        edgeColor: '#3b82f6',
        arrowColor: '#60a5fa'
      }
    };
    
    const colors = themeColors[theme as keyof typeof themeColors] || themeColors.dark;
    
    return {
      ...DEFAULT_FLEXIGRAPH_CONFIG,
      styling: {
        theme: theme as any,
        nodeStyle: {
          backgroundColor: colors.nodeBg,
          borderColor: colors.nodeBorder,
          textColor: colors.nodeText,
          borderWidth: 2,
          shape: 'round-rectangle',
          width: 160,
          height: 44,
          padding: 14,
          fontSize: 13,
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        selectedNodeStyle: {
          backgroundColor: theme === 'blue' ? '#3b82f6' : '#8b5cf6',
          borderColor: theme === 'blue' ? '#60a5fa' : '#a78bfa',
          textColor: '#fff',
          borderWidth: 2
        },
        hoveredNodeStyle: {
          borderColor: theme === 'blue' ? '#3b82f6' : '#8b5cf6',
          borderWidth: 2
        },
        edgeStyle: {
          lineColor: colors.edgeColor,
          arrowColor: colors.arrowColor,
          lineWidth: 2,
          curveStyle: 'bezier',
          targetArrowShape: 'triangle'
        },
        backgroundColor: colors.bgColor
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
        showZoomControls: false,
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
    };
  };

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
