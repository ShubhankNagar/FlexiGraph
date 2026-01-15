/**
 * FlexiGraph Component - Main graph editor component
 * Renders interactive DAG with drag-and-drop reparenting
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  effect,
  DestroyRef,
  computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import cytoscape, { Core, NodeSingular, EdgeSingular, Position } from 'cytoscape';

// @ts-ignore - cytoscape-dagre has no type definitions
import dagre from 'cytoscape-dagre';
// @ts-ignore - cytoscape-svg has no type definitions
import svg from 'cytoscape-svg';

import { FlexiGraphService } from '../../services/flexigraph.service';
import { StableLayoutService, LayoutChange, PositionCache } from '../../services/stable-layout.service';
import type {
  FlexiNode,
  FlexiGraphData,
  NodeEvent,
  ReparentEvent,
  ValidationEvent,
  StateChangeEvent,
  ZoomEvent,
  NodeRenameEvent,
  NodeAddEvent
} from '../../models/graph.models';
import type { FlexiGraphConfig, ContextMenuItem, GraphTheme } from '../../models/config.models';
import { DEFAULT_FLEXIGRAPH_CONFIG } from '../../models/config.models';
import {
  nodesToCytoscapeElements,
  generateCytoscapeStylesheet
} from '../../utils/cytoscape-transforms';
import { getThemePreset } from '../../styles/themes';
import { wouldCreateCycle, deepCloneNodes } from '../../utils/graph-algorithms';

// Register cytoscape extensions
cytoscape.use(dagre);
cytoscape.use(svg);

import { HistoryService } from '../../services/history.service';
import { ValidationService } from '../../services/validation.service';
import { ContextMenuService } from '../../services/context-menu.service';
import { ExportService } from '../../services/export.service';
import { CollapseService } from '../../services/collapse.service';

@Component({
  selector: 'flexi-graph',
  standalone: true,
  imports: [CommonModule],
  providers: [FlexiGraphService, StableLayoutService, HistoryService, ValidationService, ContextMenuService, ExportService, CollapseService],
  template: `
    <div 
      class="flexi-graph-container" 
      [style]="cssVars()"
      tabindex="0"
      role="graphics-document"
      aria-label="Interactive Graph Editor. Use arrow keys to navigate between nodes. Press Enter to select."
    >
      <!-- Main graph canvas -->
      <div #graphContainer class="graph-canvas"></div>

      <!-- Context Menu -->
      @if (contextMenuService.visible()) {
        <div 
          class="context-menu"
          [style.left.px]="contextMenuService.position().x"
          [style.top.px]="contextMenuService.position().y"
          [style.width.px]="config().contextMenu?.width || 160">
          @for (item of contextMenuItems(); track item.id) {
            @if (item.separatorBefore) {
              <div class="menu-separator"></div>
            }
            <button
              class="menu-item"
              [class]="item.cssClass || ''"
              [disabled]="contextMenuService.isItemDisabled(item, cyNodeToFlexiNodeBound)"
              (click)="contextMenuService.executeAction(item, cyNodeToFlexiNodeBound)">
              @if (item.icon) {
                <span class="menu-icon" [innerHTML]="item.icon"></span>
              }
              <span class="menu-label">{{ item.label }}</span>
              @if (item.shortcut) {
                <span class="menu-shortcut">{{ item.shortcut }}</span>
              }
            </button>
          }
        </div>
      }

      <!-- Zoom Controls -->
      @if (config().zoomPan?.showZoomControls) {
        <div class="zoom-controls" [class]="'position-' + (config().zoomPan?.controlsPosition || 'bottom-right')">
          <button class="zoom-btn" (click)="zoomIn()" title="Zoom In">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button class="zoom-btn" (click)="zoomOut()" title="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button class="zoom-btn" (click)="zoomFit()" title="Fit to Screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </button>
          <button class="zoom-btn" (click)="zoomReset()" title="Reset Zoom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          <div class="zoom-level-indicator" title="Current Zoom Level">
            {{ zoomLevelPercent() }}%
          </div>
        </div>
      }

      <!-- Validation Error Toast -->
      @if (validationErrorMessage()) {
        <div class="validation-toast" role="alert" aria-live="polite">
          <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ validationErrorMessage() }}</span>
        </div>
      }

      <!-- Combine Mode Indicator -->
      @if (combineMode()) {
        <div class="combine-mode-indicator">
          Multi-Parent Mode Active (Release Shift to cancel)
        </div>
      }

      <!-- Add Node Dialog -->
      @if (showAddNodeDialog()) {
        <div class="dialog-overlay" (click)="cancelAddNode()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <h3 class="dialog-title">Add Child Node</h3>
            <input 
              type="text" 
              class="dialog-input"
              [value]="dialogNodeName()"
              (input)="dialogNodeName.set($any($event.target).value)"
              (keydown.enter)="confirmAddNode()"
              (keydown.escape)="cancelAddNode()"
              placeholder="Enter node name..."
              autofocus
            >
            <div class="dialog-actions">
              <button class="dialog-btn cancel" (click)="cancelAddNode()">Cancel</button>
              <button class="dialog-btn confirm" (click)="confirmAddNode()">Add</button>
            </div>
          </div>
        </div>
      }

      <!-- Rename Dialog -->
      @if (showRenameDialog()) {
        <div class="dialog-overlay" (click)="cancelRename()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <h3 class="dialog-title">Rename Node</h3>
            <input 
              type="text" 
              class="dialog-input"
              [value]="dialogNodeName()"
              (input)="dialogNodeName.set($any($event.target).value)"
              (keydown.enter)="confirmRename()"
              (keydown.escape)="cancelRename()"
              placeholder="Enter new name..."
              autofocus
            >
            <div class="dialog-actions">
              <button class="dialog-btn cancel" (click)="cancelRename()">Cancel</button>
              <button class="dialog-btn confirm" (click)="confirmRename()">Rename</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .flexi-graph-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .graph-canvas {
      width: 100%;
      height: 100%;
    }

    /* Context Menu */
    .context-menu {
      position: absolute;
      background: var(--fg-surface);
      border: 1px solid var(--fg-border);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 4px;
      z-index: 1000;
      min-width: 140px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: var(--fg-text);
      border-radius: 6px;
      transition: background-color 0.15s;
    }

    .menu-item:hover:not(:disabled) {
      background-color: var(--fg-hover);
    }

    .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-shortcut {
      font-size: 12px;
      color: var(--fg-text);
      opacity: 0.6;
    }

    .menu-separator {
      height: 1px;
      background: var(--fg-border);
      margin: 4px 0;
    }

    /* Zoom Controls */
    .zoom-controls {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px;
      background: var(--fg-surface);
      border: 1px solid var(--fg-border);
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    }
    
    .zoom-btn {
      width: 32px;
      height: 32px;
      padding: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
      color: var(--fg-text);
      transition: all 0.15s;
    }

    .zoom-btn:hover {
      background: var(--fg-hover);
      color: var(--fg-primary);
    }

    /* Dialogs */
    .dialog {
      background: var(--fg-surface);
      border: 1px solid var(--fg-border);
      border-radius: 12px;
      padding: 24px;
      min-width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      color: var(--fg-text);
    }

    .dialog-title {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--fg-text);
    }

    .dialog-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--fg-border);
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      background: var(--fg-surface);
      color: var(--fg-text);
    }

    .dialog-input:focus {
      border-color: var(--fg-primary);
    }

    .dialog-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dialog-btn.cancel {
      background: var(--fg-hover);
      color: var(--fg-text);
    }

    .dialog-btn.cancel:hover {
      opacity: 0.8;
    }

    .dialog-btn.confirm {
      background: var(--fg-primary);
      color: #fff;
    }

    /* Zoom level indicator */
    .zoom-level-indicator {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      text-align: center;
      color: var(--fg-text);
      opacity: 0.7;
      border-top: 1px solid var(--fg-border);
      margin-top: 2px;
    }

    /* Zoom controls positioning */
    .zoom-controls.position-top-left { top: 10px; left: 10px; }
    .zoom-controls.position-top-right { top: 10px; right: 10px; }
    .zoom-controls.position-bottom-left { bottom: 10px; left: 10px; }
    .zoom-controls.position-bottom-right { bottom: 10px; right: 10px; }

    /* Validation error toast */
    .validation-toast {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
      animation: slideUpFade 0.3s ease-out;
      z-index: 1000;
    }

    .validation-toast .toast-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    @keyframes slideUpFade {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Combine mode indicator */
    .combine-mode-indicator {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
      z-index: 100;
    }

    /* Dialog overlay */
    .dialog-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
  `]
})
export class FlexiGraphComponent<T = any> implements AfterViewInit, OnDestroy, OnChanges {
  // Injected services
  private graphService = inject(FlexiGraphService<T>);
  private stableLayoutService = inject(StableLayoutService);
  protected contextMenuService = inject(ContextMenuService<T>);
  private exportService = inject(ExportService);
  private collapseService = inject(CollapseService);

  // Helper for template binding to preserve 'this' context
  protected cyNodeToFlexiNodeBound = (n: NodeSingular) => this.cyNodeToFlexiNode(n);

  // View references
  @ViewChild('graphContainer') private containerRef!: ElementRef<HTMLDivElement>;
  private cy!: Core;

  // Inputs
  @Input() nodes: FlexiNode<T>[] = [];
  @Input() config: () => FlexiGraphConfig = () => DEFAULT_FLEXIGRAPH_CONFIG;

  // Outputs - Events
  @Output() nodeClick = new EventEmitter<NodeEvent<T>>();
  @Output() nodeDragStart = new EventEmitter<NodeEvent<T>>();
  @Output() nodeDragEnd = new EventEmitter<NodeEvent<T>>();
  @Output() nodeReparent = new EventEmitter<ReparentEvent<T>>();
  @Output() nodeDetach = new EventEmitter<NodeEvent<T>>();
  @Output() nodeDelete = new EventEmitter<NodeEvent<T>>();
  @Output() nodeRename = new EventEmitter<NodeRenameEvent<T>>();
  @Output() nodeAdd = new EventEmitter<NodeAddEvent<T>>();
  @Output() validationFailed = new EventEmitter<ValidationEvent<T>>();
  @Output() stateChange = new EventEmitter<StateChangeEvent<T>>();
  @Output() zoomChange = new EventEmitter<ZoomEvent>();
  @Output() linkAdd = new EventEmitter<{ sourceId: string, targetId: string }>();
  @Output() linkRemove = new EventEmitter<{ sourceId: string, targetId: string }>();
  @Output() nodeCollapse = new EventEmitter<{ node: FlexiNode<T>; hiddenCount: number }>();
  @Output() nodeExpand = new EventEmitter<{ node: FlexiNode<T> }>();

  // Internal state (protected for template access)
  protected readonly combineMode = signal(false);
  protected readonly selectedNode = signal<NodeSingular | null>(null);
  protected readonly backgroundColor = signal('#ffffff');
  protected readonly validationErrorMessage = signal<string | null>(null);
  protected readonly currentZoomLevel = signal(1);
  protected readonly zoomLevelPercent = computed(() => Math.round(this.currentZoomLevel() * 100));

  // Computed theme
  protected currentTheme = computed(() => {
    const cfg = this.config();
    const theme = cfg.styling?.theme;
    if (typeof theme === 'string') return getThemePreset(theme);
    if (typeof theme === 'object' && theme) return theme;
    return getThemePreset('light');
  });

  protected cssVars = computed(() => {
    const theme = this.currentTheme();
    const ns = theme.nodeStyle || {};
    const sns = theme.selectedNodeStyle || {};
    
    return {
      '--fg-bg-color': theme.backgroundColor || '#ffffff',
      '--fg-surface': ns.backgroundColor || '#ffffff',
      '--fg-text': ns.textColor || '#333333',
      '--fg-border': ns.borderColor || '#cccccc',
      '--fg-primary': sns.backgroundColor || '#007bff',
      '--fg-hover': (sns.backgroundColor || '#007bff') + '20', // Low opacity for hover
      
      'background-color': theme.backgroundColor || '#ffffff',
      'color': ns.textColor || '#333333'
    };
  });

  // Dialog state for Add Node and Rename
  protected readonly showAddNodeDialog = signal(false);
  protected readonly showRenameDialog = signal(false);
  protected readonly dialogNodeName = signal('');
  protected readonly parentNodeForAdd = signal<FlexiNode<T> | null>(null);
  protected readonly nodeBeingRenamed = signal<FlexiNode<T> | null>(null);

  private originalNodePositions: Map<string, Position> = new Map();
  private savedPositionsForUndo: PositionCache[] = [];
  private savedPositionsForRedo: PositionCache[] = [];
  private keydownHandler!: (e: KeyboardEvent) => void;
  private keyupHandler!: (e: KeyboardEvent) => void;
  private destroyRef = inject(DestroyRef);

  // Default context menu items
  private readonly defaultMenuItems: ContextMenuItem[] = [
    {
      id: 'add-child',
      label: 'Add Child',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      action: (node) => this.onAddChild(node),
      shortcut: 'A'
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      action: (node) => this.onRenameNode(node),
      shortcut: 'F2'
    },
    {
      id: 'detach',
      label: 'Detach',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="16" x2="16" y2="8"/></svg>',
      action: (node) => this.onDetachNode(node),
      visible: (node) => node.parentIds?.length > 0,
      shortcut: 'D'
    },
    {
      id: 'collapse',
      label: 'Collapse',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      action: (node) => this.onCollapseNode(node),
      visible: (node) => this.collapseService.canCollapse(node.id, this.nodes),
      shortcut: 'C',
      separatorBefore: true
    },
    {
      id: 'expand',
      label: 'Expand',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      action: (node) => this.onExpandNode(node),
      visible: (node) => this.collapseService.isCollapsed(node.id),
      shortcut: 'E'
    },
    {
      id: 'lock-position',
      label: 'Lock Position',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      action: (node) => this.onLockPosition(node),
      visible: (node) => !this.stableLayoutService.hasManualPosition(node.id),
      separatorBefore: true
    },
    {
      id: 'unlock-position',
      label: 'Unlock Position',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
      action: (node) => this.onUnlockPosition(node),
      visible: (node) => this.stableLayoutService.hasManualPosition(node.id)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      action: (node) => this.onDeleteNode(node),
      cssClass: 'delete-item',
      separatorBefore: true,
      shortcut: 'Del'
    }
  ];

  contextMenuItems = signal<ContextMenuItem[]>(this.defaultMenuItems);

  ngAfterViewInit(): void {
    this.initializeGraph();
    this.setupKeyboardListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes'] && !changes['nodes'].firstChange) {
      this.updateGraphData();
    }
    if (changes['config'] && !changes['config'].firstChange) {
      this.applyConfigChanges();
    }
  }

  ngOnDestroy(): void {
    this.removeKeyboardListeners();
    this.contextMenuService.hide();
    if (this.cy) {
      this.cy.destroy();
    }
  }

  private initializeGraph(): void {
    const cfg = this.config();
    this.setupServiceListeners();
    // Get theme defaults, then override with user's custom styling
    const theme = cfg.styling?.theme;
    let themedStyles: GraphTheme = {};
    
    if (typeof theme === 'string') {
      themedStyles = getThemePreset(theme);
    } else if (typeof theme === 'object' && theme !== null) {
      themedStyles = theme;
    }
    
    // User's config should override theme defaults
    const mergedStyling = {
      ...themedStyles,
      ...cfg.styling,
      // Deep merge for nested objects
      nodeStyle: { ...themedStyles.nodeStyle, ...cfg.styling?.nodeStyle },
      edgeStyle: { ...themedStyles.edgeStyle, ...cfg.styling?.edgeStyle },
      selectedNodeStyle: { ...themedStyles.selectedNodeStyle, ...cfg.styling?.selectedNodeStyle },
      hoveredNodeStyle: { ...themedStyles.hoveredNodeStyle, ...cfg.styling?.hoveredNodeStyle }
    };

    this.backgroundColor.set(mergedStyling.backgroundColor || '#ffffff');

    const stylesheet = generateCytoscapeStylesheet(mergedStyling);
    const elements = nodesToCytoscapeElements(this.nodes);

    this.cy = cytoscape({
      container: this.containerRef.nativeElement,
      elements,
      style: stylesheet,
      boxSelectionEnabled: cfg.interaction?.enableBoxSelection ?? true,
      userZoomingEnabled: cfg.zoomPan?.enableZoom ?? true,
      userPanningEnabled: cfg.zoomPan?.enablePan ?? true,
      minZoom: cfg.zoomPan?.minZoom ?? 0.1,
      maxZoom: cfg.zoomPan?.maxZoom ?? 4
    });

    this.graphService.initialize(this.nodes, cfg);
    this.setupDragAndDrop();
    this.setupNodeClickListener();
    this.setupZoomListener();
    this.runLayout();

    // Merge custom menu items with defaults
    if (cfg.contextMenu?.items?.length) {
      this.contextMenuItems.set([...this.defaultMenuItems, ...cfg.contextMenu.items]);
    }
  }

  private setupServiceListeners(): void {
    // Link events
    this.graphService.linkAdd.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.linkAdd.emit(event);
    });

    this.graphService.linkRemove.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.linkRemove.emit(event);
    });

    // Validation events
    this.graphService.validationError.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.emitValidationError(event.action === 'reparent' ? 'cycle' : 'custom', event.error || 'Validation failed');
    });
  }

  private setupDragAndDrop(): void {
    const cfg = this.config();
    if (!cfg.interaction?.enableDrag) return;

    this.cy.on('grab', 'node', (event) => {
      const node = event.target as NodeSingular;
      this.originalNodePositions.set(node.id(), { ...node.position() });
      this.contextMenuService.hide();
      node.addClass('dragging');
      
      this.nodeDragStart.emit({
        node: this.cyNodeToFlexiNode(node),
        originalEvent: event.originalEvent,
        position: node.position()
      });
    });

    this.cy.on('free', 'node', async (event) => {
      const draggedNode = event.target as NodeSingular;
      draggedNode.removeClass('dragging');

      // Find drop target
      const dropTarget = this.findDropTarget(draggedNode);

      if (dropTarget) {
        // Dropped on another node - attempt reparent
        await this.handleNodeDrop(draggedNode, dropTarget);
      } else {
        // Dropped on empty canvas - allow free positioning
        // Cache this position as manually set
        this.stableLayoutService.cacheNodePosition(this.cy, draggedNode.id());
        // Add visual indicator for locked position
        draggedNode.addClass('position-locked');
      }

      this.nodeDragEnd.emit({
        node: this.cyNodeToFlexiNode(draggedNode),
        originalEvent: event.originalEvent,
        position: draggedNode.position()
      });
    });
  }

  private findDropTarget(draggedNode: NodeSingular): NodeSingular | null {
    const draggedPos = draggedNode.position();
    
    const target = this.cy.nodes().not(draggedNode).filter((node: NodeSingular) => {
      const pos = node.position();
      const w = node.width();
      const h = node.height();
      return (
        draggedPos.x > pos.x - w / 2 &&
        draggedPos.x < pos.x + w / 2 &&
        draggedPos.y > pos.y - h / 2 &&
        draggedPos.y < pos.y + h / 2
      );
    }).first();

    return target.length > 0 ? target as NodeSingular : null;
  }

  private async handleNodeDrop(childNode: NodeSingular, parentNode: NodeSingular): Promise<void> {
    const childId = childNode.id();
    const parentId = parentNode.id();
    const isCombine = this.combineMode();
    const cfg = this.config();
    const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
    
    // Capture previous parents before modification
    const previousParentIds = [...(this.graphService.getNode(childId)?.parentIds || [])];

    let success = false;
    
    // Perform the reparenting
    if (isCombine) {
      // Add as additional parent
      success = await this.graphService.addParent(childId, parentId);
    } else {
      // Replace all parents
      success = await this.graphService.reparent(childId, parentId);
    }

    if (!success) {
      this.snapBack(childNode);
      return;
    }

    // Update Cytoscape with simple layout
    this.syncCytoscapeWithService();    // Layout and fit
    this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { 
      type: 'reparent', 
      affectedNodeIds: [childId, parentId] 
    });

    // Emit event
    const newParentIds = this.graphService.getNode(childId)?.parentIds || [];
    
    this.nodeReparent.emit({
      node: this.graphService.getNode(childId)!,
      previousParentIds,
      newParentIds,
      isCombine
    });

    this.emitStateChange();
  }

  private snapBack(node: NodeSingular): void {
    const cfg = this.config();
    const original = this.originalNodePositions.get(node.id());
    if (!original) return;

    if (cfg.interaction?.snapBackOnInvalid) {
      node.animate({
        position: original,
        duration: cfg.interaction.snapBackDuration || 200,
        easing: 'ease-out'
      } as any);
    } else {
      node.position(original);
    }
  }

  private setupNodeClickListener(): void {
    const cfg = this.config();

    this.cy.on('tap', 'node', (event) => {
      const node = event.target as NodeSingular;
      
      this.nodeClick.emit({
        node: this.cyNodeToFlexiNode(node),
        originalEvent: event.originalEvent,
        position: node.position()
      });

      if (cfg.contextMenu?.enabled) {
        this.contextMenuService.show(node, this.containerRef.nativeElement.getBoundingClientRect(), cfg);
      }
    });

    // Close menu on background click
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.contextMenuService.hide();
      }
    });

    // Close menu on pan/zoom
    if (cfg.contextMenu?.closeOnPanZoom) {
      this.cy.on('pan zoom', () => this.contextMenuService.hide());
    }
  }

  private setupZoomListener(): void {
    let previousZoom = this.cy.zoom();
    this.currentZoomLevel.set(previousZoom);

    this.cy.on('zoom', () => {
      const currentZoom = this.cy.zoom();
      this.currentZoomLevel.set(currentZoom);
      this.zoomChange.emit({
        level: currentZoom,
        previousLevel: previousZoom,
        action: 'wheel'
      });
      previousZoom = currentZoom;
    });
  }

  /**
   * Handle Cytoscape initialization
   */
  private setupGraphListeners(): void {
    // Show context menu
    this.cy.on('cxttap', 'node', (event) => {
      const node = event.target;
      const cfg = this.config();
      if (cfg.contextMenu?.enabled) {
        this.contextMenuService.show(node, this.containerRef.nativeElement.getBoundingClientRect(), cfg);
      }
    });

    // Hide context menu on background click or pan/zoom
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.selectedNode.set(null);
        this.contextMenuService.hide();
      }
    });

    // Update context menu position on pan/zoom (optional, or just hide)
    this.cy.on('pan zoom', () => {
      const cfg = this.config();
      if (cfg.contextMenu?.closeOnPanZoom) {
        this.contextMenuService.hide();
      }
    });

    // Node selection
    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      this.selectedNode.set(node);
      this.nodeClick.emit({ node: this.cyNodeToFlexiNode(node), originalEvent: event.originalEvent });
    });
  }





  private onAddChild(node: FlexiNode<T>): void {
    const cfg = this.config();
    const promptForName = cfg.newNode?.promptForName ?? true;
    
    if (promptForName) {
      // Show dialog to get node name
      this.parentNodeForAdd.set(node);
      const prefix = cfg.newNode?.defaultNamePrefix || 'Node';
      const nodeCount = this.graphService.nodes().length;
      this.dialogNodeName.set(`${prefix} ${nodeCount + 1}`);
      this.showAddNodeDialog.set(true);
    } else {
      // Auto-generate name and add immediately
      this.confirmAddNode();
    }
  }

  private onRenameNode(node: FlexiNode<T>): void {
    this.nodeBeingRenamed.set(node);
    this.dialogNodeName.set(node.label);
    this.showRenameDialog.set(true);
  }

  // Dialog confirmation methods
  protected async confirmAddNode(): Promise<void> {
    const parent = this.parentNodeForAdd();
    const name = this.dialogNodeName().trim();
    const cfg = this.config();
    
    if (!name) {
      this.cancelAddNode();
      return;
    }
    
    // Create new node without parents first
    const newNode = this.graphService.addNode({
      label: name,
      parentIds: [],
      data: cfg.newNode?.defaultData
    });
    
    if (!newNode) {
      console.error('Failed to create node');
      return;
    }
    
    if (parent) {
      const success = await this.graphService.addParent(newNode.id, parent.id);
      if (!success) {
        // Rollback
        this.graphService.removeNode(newNode.id);
        // Error is already emitted by validation service
        return;
      }
    }
    
    this.syncCytoscapeWithService();
    // Layout and fit
    const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
    this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
    this.nodeAdd.emit({ node: newNode as FlexiNode<T>, parentId: parent?.id });
    this.emitStateChange();
    this.cancelAddNode();
  }

  protected cancelAddNode(): void {
    this.showAddNodeDialog.set(false);
    this.parentNodeForAdd.set(null);
    this.dialogNodeName.set('');
  }

  protected confirmRename(): void {
    const node = this.nodeBeingRenamed();
    const newLabel = this.dialogNodeName().trim();
    
    if (!node || !newLabel) {
      this.cancelRename();
      return;
    }
    
    const oldLabel = node.label;
    
    // Update node label via service
    const updated = this.graphService.updateNode(node.id, { label: newLabel });
    
    if (updated) {
      // Update Cytoscape node label in-place (avoid full sync which loses positions)
      const cyNode = this.cy?.getElementById(node.id);
      if (cyNode && cyNode.length > 0) {
        cyNode.data('label', newLabel);
      }
      this.nodeRename.emit({ node: updated, oldLabel, newLabel });
      this.emitStateChange();
    }
    
    this.cancelRename();
  }

  protected cancelRename(): void {
    this.showRenameDialog.set(false);
    this.nodeBeingRenamed.set(null);
    this.dialogNodeName.set('');
  }

  private onDetachNode(node: FlexiNode<T>): void {
    const cfg = this.config();
    if (this.graphService.detachNode(node.id)) {
      this.syncCytoscapeWithService();
      const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
      this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
      this.nodeDetach.emit({ node });
      this.emitStateChange();
    }
  }

  private onDeleteNode(node: FlexiNode<T>): void {
    const cfg = this.config();
    // Clean up collapse state for deleted node
    this.collapseService.onNodeDeleted(node.id, this.nodes);
    
    if (this.graphService.removeNode(node.id)) {
      this.syncCytoscapeWithService();
      this.syncCollapseVisuals();
      const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
      this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
      this.nodeDelete.emit({ node });
      this.emitStateChange();
    }
  }

  /**
   * Lock node position - prevents layout from moving this node
   */
  private onLockPosition(node: FlexiNode<T>): void {
    this.stableLayoutService.cacheNodePosition(this.cy, node.id);
    // Add visual indicator
    const cyNode = this.cy.getElementById(node.id);
    if (cyNode.length > 0) {
      cyNode.addClass('position-locked');
    }
    this.contextMenuService.hide();
  }

  /**
   * Unlock node position - allows layout to move this node again
   */
  private onUnlockPosition(node: FlexiNode<T>): void {
    this.stableLayoutService.clearManualPosition(node.id);
    // Remove visual indicator
    const cyNode = this.cy.getElementById(node.id);
    if (cyNode.length > 0) {
      cyNode.removeClass('position-locked');
    }
    this.contextMenuService.hide();
  }

  /**
   * Unlock all node positions - public API for demo toolbar
   */
  unlockAllPositions(): void {
    const lockedIds = this.stableLayoutService.getLockedNodeIds();
    lockedIds.forEach(id => {
      const cyNode = this.cy.getElementById(id);
      if (cyNode.length > 0) {
        cyNode.removeClass('position-locked');
      }
    });
    this.stableLayoutService.clearAllManualPositions();
  }

  /**
   * Get count of locked nodes
   */
  getLockedNodeCount(): number {
    return this.stableLayoutService.getLockedNodeCount();
  }

  /**
   * Get total node count (for lock all logic)
   */
  getTotalNodeCount(): number {
    return this.cy?.nodes().length || 0;
  }

  /**
   * Lock all node positions - public API for demo toolbar
   */
  lockAllPositions(): void {
    this.cy?.nodes().forEach((node: any) => {
      const nodeId = node.id();
      if (!this.stableLayoutService.hasManualPosition(nodeId)) {
        this.stableLayoutService.cacheNodePosition(this.cy, nodeId);
        node.addClass('position-locked');
      }
    });
  }

  /**
   * Collapse a node to hide all its descendants
   */
  private onCollapseNode(node: FlexiNode<T>): void {
    const success = this.collapseService.collapse(node.id, this.nodes);
    if (success) {
      const hiddenCount = this.collapseService.getHiddenCount(node.id);
      this.syncCollapseVisuals();
      this.nodeCollapse.emit({ node, hiddenCount });
      this.emitStateChange();
    }
  }

  /**
   * Expand a collapsed node to show all its descendants
   */
  private onExpandNode(node: FlexiNode<T>): void {
    const success = this.collapseService.expand(node.id, this.nodes);
    if (success) {
      this.syncCollapseVisuals();
      const cfg = this.config();
      const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
      this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
      this.nodeExpand.emit({ node });
      this.emitStateChange();
    }
  }

  /**
   * Sync Cytoscape node visuals with collapse state
   * Applies 'collapsed' and 'hidden' classes appropriately
   */
  private syncCollapseVisuals(): void {
    const collapsedIds = this.collapseService.collapsedNodeIds();
    const hiddenIds = this.collapseService.hiddenNodeIds();

    this.cy.batch(() => {
      // Clear previous collapse classes
      this.cy.nodes().removeClass('collapsed hidden');
      this.cy.edges().removeClass('hidden-edge');

      // Apply collapsed class and data
      collapsedIds.forEach(id => {
        const node = this.cy.$id(id);
        if (node.length > 0) {
          const hiddenCount = this.collapseService.getHiddenCount(id);
          node.addClass('collapsed');
          node.data('hiddenCount', hiddenCount);
        }
      });

      // Apply hidden class to hidden nodes
      hiddenIds.forEach(id => {
        const node = this.cy.$id(id);
        if (node.length > 0) {
          node.addClass('hidden');
        }
      });

      // Hide edges connected to hidden nodes
      this.cy.edges().forEach(edge => {
        const sourceHidden = hiddenIds.has(edge.source().id());
        const targetHidden = hiddenIds.has(edge.target().id());
        if (sourceHidden || targetHidden) {
          edge.addClass('hidden-edge');
        }
      });
    });
  }

  // Keyboard handling
  private selectNode(node: NodeSingular): void {
    this.selectedNode.set(node);
    this.cy.nodes().removeClass('selected');
    node.addClass('selected');
    
    // Ensure node is in view
    const extent = this.cy.extent();
    const pos = node.position();
    const padding = 50;

    if (
      pos.x < extent.x1 + padding || 
      pos.x > extent.x2 - padding || 
      pos.y < extent.y1 + padding || 
      pos.y > extent.y2 - padding
    ) {
      this.cy.animate({ center: { eles: node }, duration: 200 } as any);
    }
  }

  private navigateSelection(direction: 'up' | 'down' | 'left' | 'right'): void {
    const selected = this.selectedNode();
    const nodes = this.cy.nodes(':visible');
    
    if (!selected) {
      if (nodes.length > 0) {
        // Select 'root-like' node (min indegree) or just first
        const root = nodes.sort((a, b) => a.indegree(false) - b.indegree(false)).first();
        this.selectNode(root as NodeSingular);
      }
      return;
    }

    const currentPos = selected.position();
    let bestCandidate: NodeSingular | null = null;
    let bestDist = Infinity;

    nodes.not(selected).forEach((node: NodeSingular) => {
      const pos = node.position();
      const dx = pos.x - currentPos.x;
      const dy = pos.y - currentPos.y;
      let isValid = false;

      // Filter based on direction with a 45-degree cone tolerance
      switch (direction) {
        case 'right': 
          isValid = dx > 0 && Math.abs(dy) < dx * 1.5; 
          break;
        case 'left':  
          isValid = dx < 0 && Math.abs(dy) < -dx * 1.5; 
          break;
        case 'down':  
          isValid = dy > 0 && Math.abs(dx) < dy * 1.5; 
          break;
        case 'up':    
          isValid = dy < 0 && Math.abs(dx) < -dy * 1.5; 
          break;
      }

      if (isValid) {
        const dist = dx*dx + dy*dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestCandidate = node;
        }
      }
    });

    // If no candidate in strict cone, try relaxed search (just direction)
    if (!bestCandidate) {
      nodes.not(selected).forEach((node: NodeSingular) => {
        const pos = node.position();
        const dx = pos.x - currentPos.x;
        const dy = pos.y - currentPos.y;
        let isValid = false;

        switch (direction) {
          case 'right': isValid = dx > 0; break;
          case 'left':  isValid = dx < 0; break;
          case 'down':  isValid = dy > 0; break;
          case 'up':    isValid = dy < 0; break;
        }

        if (isValid) {
          const dist = dx*dx + dy*dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestCandidate = node;
          }
        }
      });
    }

    if (bestCandidate) {
      this.selectNode(bestCandidate);
    }
  }

  private setupKeyboardListeners(): void {
    const cfg = this.config();

    this.keydownHandler = (e: KeyboardEvent) => {
      // Escape to close menu
      if (e.key === 'Escape') {
        this.contextMenuService.hide();
        e.preventDefault();
        return;
      }

      // Arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        this.navigateSelection(direction);
        return;
      }

      // Enter/Space to open context menu or edit
      if (e.key === 'Enter' || e.key === ' ') {
        const selected = this.selectedNode();
        if (selected) {
           e.preventDefault();
           const cfg = this.config();
           if (cfg.contextMenu?.enabled) {
             this.contextMenuService.show(selected, this.containerRef.nativeElement.getBoundingClientRect(), cfg);
           }
        }
        return;
      }
      
      // F2 to rename
      if (e.key === 'F2') {
         const selected = this.selectedNode();
           if (selected) {
             e.preventDefault();
             this.onRenameNode(this.cyNodeToFlexiNode(selected));
             this.contextMenuService.hide(); // ensure menu is closed if open
           }
         return;
      }

      // Undo: Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.undo();
        return;
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        this.redo();
        return;
      }

      // Combine mode
      if (e.key === 'Shift' && !this.combineMode()) {
        this.combineMode.set(true);
        try { this.cy.boxSelectionEnabled(false); } catch {}
        // Don't prevent default for Shift to allow other combos
      }

      // Delete key for node deletion
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = this.selectedNode();
        if (selected) {
          e.preventDefault();
          this.onDeleteNode(this.cyNodeToFlexiNode(selected));
          this.contextMenuService.hide();
        }
        return;
      }

      // 'A' key for adding child node
      if (e.key === 'a' || e.key === 'A') {
        const selected = this.selectedNode();
        if (selected && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.onAddChild(this.cyNodeToFlexiNode(selected));
          this.contextMenuService.hide();
        }
        return;
      }

      // 'D' key for detaching node
      if (e.key === 'd' || e.key === 'D') {
        const selected = this.selectedNode();
        if (selected && !e.ctrlKey && !e.metaKey) {
          const flexiNode = this.cyNodeToFlexiNode(selected);
          if (flexiNode.parentIds && flexiNode.parentIds.length > 0) {
            e.preventDefault();
            this.onDetachNode(flexiNode);
            this.contextMenuService.hide();
          }
        }
        return;
      }

      // 'C' key for collapsing node
      if (e.key === 'c' || e.key === 'C') {
        const selected = this.selectedNode();
        if (selected && !e.ctrlKey && !e.metaKey) {
          const flexiNode = this.cyNodeToFlexiNode(selected);
          if (this.collapseService.canCollapse(flexiNode.id, this.nodes)) {
            e.preventDefault();
            this.onCollapseNode(flexiNode);
            this.contextMenuService.hide();
          }
        }
        return;
      }

      // 'E' key for expanding node
      if (e.key === 'e' || e.key === 'E') {
        const selected = this.selectedNode();
        if (selected && !e.ctrlKey && !e.metaKey) {
          const flexiNode = this.cyNodeToFlexiNode(selected);
          if (this.collapseService.canExpand(flexiNode.id)) {
            e.preventDefault();
            this.onExpandNode(flexiNode);
            this.contextMenuService.hide();
          }
        }
        return;
      }

      // '+' and '-' for zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this.zoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        this.zoomOut();
        return;
      }

      // '0' for zoom reset
      if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.zoomFit();
        return;
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && this.combineMode()) {
        this.combineMode.set(false);
        try { this.cy.boxSelectionEnabled(true); } catch {}
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', this.keydownHandler, { passive: false });
    document.addEventListener('keyup', this.keyupHandler, { passive: false });
  }

  private removeKeyboardListeners(): void {
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
  }

  // Public API methods
  undo(): void {
    const result = this.graphService.undo();
    if (result) {
      this.syncCytoscapeWithService();
      // Use simple layout - just run dagre
      const layoutCfg = this.config().layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
      this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
      this.stateChange.emit(result);
    }
  }

  redo(): void {
    const result = this.graphService.redo();
    if (result) {
      this.syncCytoscapeWithService();
      // Use simple layout - just run dagre
      const layoutCfg = this.config().layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
      this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
      this.stateChange.emit(result);
    }
  }

  zoomIn(): void {
    const current = this.cy.zoom();
    const cfg = this.config();
    const newZoom = Math.min(current * 1.2, cfg.zoomPan?.maxZoom || 4);
    this.cy.animate({ zoom: newZoom, duration: cfg.zoomPan?.zoomAnimationDuration || 200 });
    this.zoomChange.emit({ level: newZoom, previousLevel: current, action: 'in' });
  }

  zoomOut(): void {
    const current = this.cy.zoom();
    const cfg = this.config();
    const newZoom = Math.max(current / 1.2, cfg.zoomPan?.minZoom || 0.1);
    this.cy.animate({ zoom: newZoom, duration: cfg.zoomPan?.zoomAnimationDuration || 200 });
    this.zoomChange.emit({ level: newZoom, previousLevel: current, action: 'out' });
  }

  zoomFit(): void {
    const current = this.cy.zoom();
    const cfg = this.config();
    this.cy.fit(undefined, cfg.layout?.padding || 30);
    this.cy.animate({ duration: cfg.zoomPan?.zoomAnimationDuration || 200 });
    this.zoomChange.emit({ level: this.cy.zoom(), previousLevel: current, action: 'fit' });
  }

  zoomReset(): void {
    const current = this.cy.zoom();
    this.cy.zoom(1);
    this.cy.center();
    this.zoomChange.emit({ level: 1, previousLevel: current, action: 'reset' });
  }

  /**
   * Collapse a node by ID to hide all its descendants
   */
  collapseNode(nodeId: string): boolean {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      this.onCollapseNode(node as FlexiNode<T>);
      return true;
    }
    return false;
  }

  /**
   * Expand a collapsed node by ID to show all its descendants
   */
  expandNode(nodeId: string): boolean {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      this.onExpandNode(node as FlexiNode<T>);
      return true;
    }
    return false;
  }

  /**
   * Expand all collapsed nodes
   */
  expandAll(): void {
    this.collapseService.expandAll(this.nodes);
    this.syncCollapseVisuals();
    const cfg = this.config();
    const layoutCfg = cfg.layout || { algorithm: 'dagre', direction: 'LR', animate: true, animationDuration: 500 };
    this.stableLayoutService.runStableLayout(this.cy, layoutCfg, { type: 'full', affectedNodeIds: [] });
    this.emitStateChange();
  }

  /**
   * Check if a node is currently collapsed
   */
  isNodeCollapsed(nodeId: string): boolean {
    return this.collapseService.isCollapsed(nodeId);
  }

  /**
   * Get the collapse service for advanced operations
   */
  getCollapseService(): CollapseService {
    return this.collapseService;
  }

  /**
   * Run layout using stable layout service
   * This prevents the graph from "jumping" when nodes are added or modified
   */
  runLayout(change?: LayoutChange): void {
    this.runStableLayout(change);
  }

  /**
   * Run stable layout - minimizes node movement for unaffected parts of the graph
   */
  private runStableLayout(change?: LayoutChange): void {
    const cfg = this.config();
    const layoutCfg = cfg.layout || { 
      algorithm: 'dagre', 
      direction: 'LR', 
      animate: true, 
      animationDuration: 500 
    };
    
    this.stableLayoutService.runStableLayout(this.cy, layoutCfg, change);
  }

  /**
   * Force a full layout (recomputes everything)
   */
  forceFullLayout(): void {
    this.stableLayoutService.clearCache();
    this.runStableLayout({ type: 'full', affectedNodeIds: [] });
  }

  /**
   * Export graph to file
   */
  async exportGraph(type: 'png' | 'jpeg' | 'svg' | 'json' | 'csv'): Promise<void> {
    const cfg = this.config();
    const exportCfg = cfg.export || { enabled: true, formats: [] };
    
    if (exportCfg.enabled === false) {
      console.warn('FlexiGraph: Export is disabled in configuration');
      return;
    }
    
    const filename = exportCfg.filename || 'graph';
    
    try {
      if (type === 'json') {
        this.exportService.exportToJson(this.graphService.getGraphData(), filename);
      } else if (type === 'csv') {
        this.exportService.exportToCsv(this.graphService.getGraphData().nodes, filename);
      } else {
        await this.exportService.exportToImage(
            this.cy, 
            type, 
            exportCfg,
            filename
        );
      }
    } catch (err) {
      console.error('FlexiGraph: Export failed', err);
    }
  }

  /**
   * Import graph directly
   */
  importGraph(data: FlexiGraphData): void {
    if (!data || !data.nodes) {
      console.warn('FlexiGraph: Invalid data provided to importGraph');
      return;
    }
    
    this.graphService.initialize(data.nodes);
    
    setTimeout(() => {
        this.stableLayoutService.clearCache();
        this.forceFullLayout();
    }, 0);
  }

  /**
   * Get the Cytoscape core instance for external operations
   * Useful for advanced features like PDF export
   */
  getCytoscape(): Core | null {
    return this.cy || null;
  }

  /**
   * Save current positions before making changes (for undo)
   */
  private savePositionsForUndo(): void {
    const positions = this.stableLayoutService.getCurrentPositions(this.cy);
    this.savedPositionsForUndo.push(positions);
    // Limit stack size
    if (this.savedPositionsForUndo.length > 50) {
      this.savedPositionsForUndo.shift();
    }
    // Clear redo stack on new action
    this.savedPositionsForRedo = [];
  }

  // Utility methods
  private cyNodeToFlexiNode(cyNode: NodeSingular): FlexiNode<T> {
    const incomingEdges = cyNode.incomers('edge');
    const parentIds: string[] = [];
    incomingEdges.forEach((edge: EdgeSingular) => {
      parentIds.push(edge.source().id());
    });

    return {
      id: cyNode.id(),
      label: cyNode.data('label') || cyNode.id(),
      parentIds,
      data: cyNode.data(),
      position: cyNode.position()
    };
  }

  private syncCytoscapeWithService(): void {
    const nodes = this.graphService.getGraphData().nodes;
    const elements = nodesToCytoscapeElements(nodes);
    
    this.cy.batch(() => {
      this.cy.elements().remove();
      this.cy.add(elements);
    });
  }

  private updateGraphData(): void {
    if (!this.cy) return;
    this.graphService.setNodes(this.nodes);
    this.syncCytoscapeWithService();
    this.runLayout();
  }

  private applyConfigChanges(): void {
    // Re-apply styling and config changes
    const cfg = this.config();
    const theme = cfg.styling?.theme;
    let themedStyles: GraphTheme = {};
    
    if (typeof theme === 'string') {
      themedStyles = getThemePreset(theme);
    } else if (typeof theme === 'object' && theme !== null) {
      themedStyles = theme;
    }
    
    // User's config should override theme defaults
    const mergedStyling = {
      ...themedStyles,
      ...cfg.styling,
      // Deep merge for nested objects
      nodeStyle: { ...themedStyles.nodeStyle, ...cfg.styling?.nodeStyle },
      edgeStyle: { ...themedStyles.edgeStyle, ...cfg.styling?.edgeStyle },
      selectedNodeStyle: { ...themedStyles.selectedNodeStyle, ...cfg.styling?.selectedNodeStyle },
      hoveredNodeStyle: { ...themedStyles.hoveredNodeStyle, ...cfg.styling?.hoveredNodeStyle }
    };
    
    this.backgroundColor.set(mergedStyling.backgroundColor || '#ffffff');
    
    const stylesheet = generateCytoscapeStylesheet(mergedStyling);
    this.cy.style(stylesheet);
  }

  private emitValidationError(type: ValidationEvent<T>['type'], message: string): void {
    // Show toast
    this.validationErrorMessage.set(message);
    const cfg = this.config();
    const duration = cfg.validation?.errorDisplayDuration || 3000;
    setTimeout(() => this.validationErrorMessage.set(null), duration);

    // Emit event
    this.validationFailed.emit({
      type,
      message,
      node: this.selectedNode() ? this.cyNodeToFlexiNode(this.selectedNode()!) : undefined
    });
  }

  private emitStateChange(): void {
    const data = this.graphService.getGraphData();
    this.stateChange.emit({
      type: 'save',
      currentState: data,
      undoStackSize: this.graphService.undoStack().length,
      redoStackSize: this.graphService.redoStack().length
    });
  }

  // Expose service for external access
  getService(): FlexiGraphService<T> {
    return this.graphService;
  }

  getGraphData(): FlexiGraphData<T> {
    return this.graphService.getGraphData();
  }
}
