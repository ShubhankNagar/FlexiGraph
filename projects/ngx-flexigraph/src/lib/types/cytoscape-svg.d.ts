/**
 * Type declarations for cytoscape-svg
 */
declare module 'cytoscape-svg' {
  import { Core } from 'cytoscape';

  interface SvgOptions {
    output?: 'string' | 'blob';
    bg?: string;
    full?: boolean;
    scale?: number;
  }

  export default function register(cytoscape: typeof import('cytoscape')): void;
}
