import { Injectable, signal, computed } from '@angular/core';
import { FlexiNode } from 'ngx-flexigraph';

/**
 * Demo data sets for the FlexiGraph application
 */
export const DEMO_DATA = {
  'po-hierarchy': {
    name: 'Purchase Orders',
    icon: '📦',
    description: 'Financial tracking hierarchy',
    color: '#10b981',
    nodes: [
      { id: 'PO-001', label: 'Main Project PO', parentIds: [] },
      { id: 'PO-002', label: 'Hardware Procurement', parentIds: ['PO-001'] },
      { id: 'PO-003', label: 'Software Licensing', parentIds: ['PO-001'] },
      { id: 'PO-004', label: 'OS Licenses', parentIds: ['PO-003'] },
      { id: 'PO-005', label: 'Independent PO', parentIds: [] },
      { id: 'PO-006', label: 'Consulting Services', parentIds: ['PO-005'] },
    ]
  },
  'org-chart': {
    name: 'Organization',
    icon: '🏢',
    description: 'Company org hierarchy',
    color: '#8b5cf6',
    nodes: [
      { id: 'ceo', label: 'CEO - Sarah Johnson', parentIds: [] },
      { id: 'cto', label: 'CTO - Michael Chen', parentIds: ['ceo'] },
      { id: 'cfo', label: 'CFO - Emily Davis', parentIds: ['ceo'] },
      { id: 'coo', label: 'COO - James Wilson', parentIds: ['ceo'] },
      { id: 'eng-lead', label: 'VP Engineering', parentIds: ['cto'] },
      { id: 'design-lead', label: 'VP Design', parentIds: ['cto'] },
      { id: 'dev-team', label: 'Dev Team Lead', parentIds: ['eng-lead'] },
      { id: 'qa-team', label: 'QA Team Lead', parentIds: ['eng-lead'] },
      { id: 'frontend', label: 'Frontend Engineers', parentIds: ['dev-team'] },
      { id: 'backend', label: 'Backend Engineers', parentIds: ['dev-team'] },
      { id: 'ux', label: 'UX Designers', parentIds: ['design-lead'] },
      { id: 'ui', label: 'UI Designers', parentIds: ['design-lead'] },
      { id: 'finance', label: 'Finance Team', parentIds: ['cfo'] },
      { id: 'ops', label: 'Operations Team', parentIds: ['coo'] },
    ]
  },
  'project-deps': {
    name: 'Dependencies',
    icon: '📚',
    description: 'Multi-parent package graph',
    color: '#f59e0b',
    nodes: [
      { id: 'app', label: '@myorg/app', parentIds: [] },
      { id: 'core', label: '@myorg/core', parentIds: ['app'] },
      { id: 'ui', label: '@myorg/ui-kit', parentIds: ['app'] },
      { id: 'utils', label: '@myorg/utils', parentIds: ['core', 'ui'] },
      { id: 'api', label: '@myorg/api-client', parentIds: ['app'] },
      { id: 'auth', label: '@myorg/auth', parentIds: ['api', 'core'] },
      { id: 'logging', label: '@myorg/logging', parentIds: ['core', 'api', 'auth'] },
      { id: 'config', label: '@myorg/config', parentIds: ['core', 'auth'] },
      { id: 'testing', label: '@myorg/testing', parentIds: ['app'] },
    ]
  }
};

export type DemoType = keyof typeof DEMO_DATA;
export type LayoutType = 'dagre' | 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric';
export type ThemeType = 'dark' | 'light' | 'blue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

/**
 * Global application state service
 * Manages graph data, UI state, and notifications
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  // Graph data
  readonly currentDemo = signal<DemoType>('po-hierarchy');
  readonly nodes = signal<FlexiNode[]>(DEMO_DATA['po-hierarchy'].nodes);
  
  // UI state
  readonly currentLayout = signal<LayoutType>('dagre');
  readonly currentTheme = signal<ThemeType>('dark');
  readonly isDirty = signal(false);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  
  // Toast notifications
  private toastId = 0;
  readonly toasts = signal<Toast[]>([]);
  
  // Computed properties
  readonly currentDemoData = computed(() => DEMO_DATA[this.currentDemo()]);
  readonly demoList = Object.entries(DEMO_DATA).map(([key, data]) => ({
    key: key as DemoType,
    ...data
  }));

  /**
   * Load a new demo dataset
   */
  setDemo(key: DemoType): void {
    const demo = DEMO_DATA[key];
    if (demo) {
      this.currentDemo.set(key);
      this.nodes.set([...demo.nodes]);
      this.isDirty.set(false);
      this.canUndo.set(false);
      this.canRedo.set(false);
      this.showToast(`Loaded: ${demo.name}`, 'success');
    }
  }

  setLayout(layout: LayoutType): void {
    this.currentLayout.set(layout);
  }

  setTheme(theme: ThemeType): void {
    this.currentTheme.set(theme);
  }

  cycleTheme(): void {
    const themes: ThemeType[] = ['dark', 'light', 'blue'];
    const current = themes.indexOf(this.currentTheme());
    this.currentTheme.set(themes[(current + 1) % themes.length]);
  }

  updateHistoryState(undoSize: number, redoSize: number): void {
    this.isDirty.set(undoSize > 0 || redoSize > 0);
    this.canUndo.set(undoSize > 0);
    this.canRedo.set(redoSize > 0);
  }

  markSaved(): void {
    this.isDirty.set(false);
    this.canUndo.set(false);
    this.canRedo.set(false);
    this.showToast('Changes saved!', 'success');
  }

  // Toast management
  showToast(message: string, type: Toast['type'] = 'info', duration = 3000): void {
    const id = ++this.toastId;
    this.toasts.update(t => [...t, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => this.dismissToast(id), duration);
    }
  }

  dismissToast(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
