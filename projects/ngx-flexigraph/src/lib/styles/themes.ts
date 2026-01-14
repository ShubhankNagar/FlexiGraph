import { GraphTheme } from '../models/config.models';

export const LIGHT_THEME: GraphTheme = {
  backgroundColor: '#ffffff',
  nodeStyle: {
    backgroundColor: '#eef3f8',
    borderColor: '#d1dfea',
    textColor: '#333333',
    borderWidth: 2,
    shape: 'round-rectangle',
    width: 'label',
    height: 40,
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  selectedNodeStyle: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
    textColor: '#ffffff'
  },
  edgeStyle: {
    lineColor: '#cccccc',
    arrowColor: '#cccccc',
    lineWidth: 2,
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    lineStyle: 'solid'
  }
};

export const DARK_THEME: GraphTheme = {
  backgroundColor: '#1a1a2e',
  nodeStyle: {
    backgroundColor: '#16213e',
    borderColor: '#0f3460',
    textColor: '#e8e8e8',
    borderWidth: 2,
    shape: 'round-rectangle',
    width: 'label',
    height: 40,
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  selectedNodeStyle: {
    backgroundColor: '#0d6efd',
    borderColor: '#0a58ca',
    textColor: '#ffffff'
  },
  edgeStyle: {
    lineColor: '#4a4a6a',
    arrowColor: '#4a4a6a',
    lineWidth: 2,
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    lineStyle: 'solid'
  }
};

export const BLUE_THEME: GraphTheme = {
  backgroundColor: '#0c1929',
  nodeStyle: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
    textColor: '#e0f2fe',
    borderWidth: 2,
    shape: 'round-rectangle',
    width: 'label',
    height: 40,
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  selectedNodeStyle: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    textColor: '#ffffff'
  },
  edgeStyle: {
    lineColor: '#3b82f6',
    arrowColor: '#60a5fa',
    lineWidth: 2,
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    lineStyle: 'solid'
  }
};

export const HIGH_CONTRAST_THEME: GraphTheme = {
  backgroundColor: '#000000',
  nodeStyle: {
    backgroundColor: '#ffffff',
    borderColor: '#ffff00',
    textColor: '#000000',
    borderWidth: 3,
    shape: 'round-rectangle',
    width: 'label',
    height: 44,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace'
  },
  selectedNodeStyle: {
    backgroundColor: '#ffff00',
    borderColor: '#ffffff',
    textColor: '#000000'
  },
  edgeStyle: {
    lineColor: '#ffffff',
    arrowColor: '#ffffff',
    lineWidth: 3,
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    lineStyle: 'solid'
  }
};

export function getThemePreset(name: string): GraphTheme {
  switch (name) {
    case 'dark': return DARK_THEME;
    case 'blue': return BLUE_THEME;
    case 'high-contrast': return HIGH_CONTRAST_THEME;
    case 'light':
    default:
      return LIGHT_THEME;
  }
}
