/**
 * FlexiGraph Search Component
 * Provides search and filter functionality for graph nodes
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { FlexiNode } from '../../models/graph.models';

export interface SearchResult<T = any> {
  node: FlexiNode<T>;
  matchType: 'label' | 'id' | 'data';
  matchedField?: string;
}

@Component({
  selector: 'flexi-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-container" [class.expanded]="isExpanded()">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        
        <input
          type="text"
          class="search-input"
          [placeholder]="placeholder"
          [value]="searchQuery()"
          (input)="onSearchInput($any($event.target).value)"
          (focus)="isExpanded.set(true)"
          (keydown.escape)="clearSearch()"
          (keydown.enter)="selectFirstResult()"
          (keydown.arrowdown)="navigateResults(1)"
          (keydown.arrowup)="navigateResults(-1)"
          role="searchbox"
          aria-label="Search nodes"
          [attr.aria-expanded]="isExpanded() && results().length > 0"
          aria-controls="search-results">
        
        @if (searchQuery()) {
          <button 
            class="clear-btn" 
            (click)="clearSearch()" 
            title="Clear search"
            aria-label="Clear search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }
      </div>
      
      @if (isExpanded() && results().length > 0) {
        <ul 
          id="search-results"
          class="results-list"
          role="listbox"
          aria-label="Search results">
          @for (result of results(); track result.node.id; let i = $index) {
            <li 
              class="result-item"
              [class.selected]="i === selectedIndex()"
              role="option"
              [attr.aria-selected]="i === selectedIndex()"
              (click)="selectResult(result)"
              (mouseenter)="selectedIndex.set(i)">
              <span class="result-label">{{ result.node.label }}</span>
              <span class="result-id">{{ result.node.id }}</span>
              @if (result.matchType !== 'label') {
                <span class="match-badge">{{ result.matchType }}</span>
              }
            </li>
          }
        </ul>
      }
      
      @if (isExpanded() && searchQuery() && results().length === 0) {
        <div class="no-results">
          No nodes found matching "{{ searchQuery() }}"
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .search-container {
      position: relative;
      width: 200px;
      transition: width 0.2s ease;
    }

    .search-container.expanded {
      width: 280px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      width: 16px;
      height: 16px;
      color: var(--fg-text, #94a3b8);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 8px 32px 8px 36px;
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      font-size: 14px;
      color: var(--fg-text, #334155);
      background: var(--fg-surface, #ffffff);
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--fg-primary, #007bff);
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .search-input::placeholder {
      color: var(--fg-text, #94a3b8);
      opacity: 0.6;
    }

    .clear-btn {
      position: absolute;
      right: 8px;
      width: 20px;
      height: 20px;
      padding: 2px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--fg-text, #94a3b8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-btn:hover {
      background: var(--fg-hover, rgba(0, 0, 0, 0.05));
      color: var(--fg-text, #334155);
    }

    .clear-btn svg {
      width: 14px;
      height: 14px;
    }

    .results-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin: 4px 0 0;
      padding: 4px;
      list-style: none;
      background: var(--fg-surface, #ffffff);
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 240px;
      overflow-y: auto;
      z-index: 100;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.1s;
    }

    .result-item:hover,
    .result-item.selected {
      background: var(--fg-hover, rgba(0, 123, 255, 0.1));
    }

    .result-label {
      flex: 1;
      font-size: 14px;
      color: var(--fg-text, #334155);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .result-id {
      font-size: 11px;
      color: var(--fg-text, #94a3b8);
      opacity: 0.7;
      font-family: monospace;
    }

    .match-badge {
      font-size: 9px;
      padding: 2px 6px;
      background: var(--fg-primary, #007bff);
      color: white;
      border-radius: 10px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .no-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      padding: 12px;
      background: var(--fg-surface, #ffffff);
      border: 1px solid var(--fg-border, #e2e8f0);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
      font-size: 13px;
      color: var(--fg-text, #94a3b8);
    }
  `]
})
export class FlexiSearchComponent<T = any> {
  // Inputs
  @Input() nodes: FlexiNode<T>[] = [];
  @Input() placeholder = 'Search nodes...';
  @Input() searchFields: ('label' | 'id' | 'data')[] = ['label', 'id'];
  @Input() caseSensitive = false;
  @Input() maxResults = 10;

  // Outputs
  @Output() nodeSelected = new EventEmitter<FlexiNode<T>>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() resultsChanged = new EventEmitter<SearchResult<T>[]>();

  // State
  searchQuery = signal('');
  isExpanded = signal(false);
  selectedIndex = signal(0);

  // Computed search results
  results = computed(() => {
    const query = this.searchQuery().trim();
    if (!query) return [];

    const searchTerm = this.caseSensitive ? query : query.toLowerCase();
    const matches: SearchResult<T>[] = [];

    for (const node of this.nodes) {
      if (matches.length >= this.maxResults) break;

      // Search label
      if (this.searchFields.includes('label')) {
        const label = this.caseSensitive ? node.label : node.label.toLowerCase();
        if (label.includes(searchTerm)) {
          matches.push({ node, matchType: 'label' });
          continue;
        }
      }

      // Search id
      if (this.searchFields.includes('id')) {
        const id = this.caseSensitive ? node.id : node.id.toLowerCase();
        if (id.includes(searchTerm)) {
          matches.push({ node, matchType: 'id' });
          continue;
        }
      }

      // Search data fields
      if (this.searchFields.includes('data') && node.data) {
        const dataMatch = this.searchInObject(node.data, searchTerm);
        if (dataMatch) {
          matches.push({ node, matchType: 'data', matchedField: dataMatch });
        }
      }
    }

    return matches;
  });

  private searchInObject(obj: any, searchTerm: string, prefix = ''): string | null {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        const val = this.caseSensitive ? value : value.toLowerCase();
        if (val.includes(searchTerm)) {
          return fieldPath;
        }
      } else if (typeof value === 'number') {
        if (value.toString().includes(searchTerm)) {
          return fieldPath;
        }
      } else if (value && typeof value === 'object') {
        const nested = this.searchInObject(value, searchTerm, fieldPath);
        if (nested) return nested;
      }
    }
    return null;
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.selectedIndex.set(0);
    this.searchChanged.emit(value);
    
    // Emit results when computed
    setTimeout(() => this.resultsChanged.emit(this.results()));
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.isExpanded.set(false);
    this.selectedIndex.set(0);
    this.searchChanged.emit('');
    this.resultsChanged.emit([]);
  }

  selectResult(result: SearchResult<T>): void {
    this.nodeSelected.emit(result.node);
    this.isExpanded.set(false);
  }

  selectFirstResult(): void {
    const resultList = this.results();
    if (resultList.length > 0) {
      this.selectResult(resultList[this.selectedIndex()]);
    }
  }

  navigateResults(direction: number): void {
    const resultList = this.results();
    if (resultList.length === 0) return;

    let newIndex = this.selectedIndex() + direction;
    if (newIndex < 0) newIndex = resultList.length - 1;
    if (newIndex >= resultList.length) newIndex = 0;
    
    this.selectedIndex.set(newIndex);
  }

  /**
   * Filter nodes by a predicate function
   */
  static filterNodes<T>(
    nodes: FlexiNode<T>[],
    predicate: (node: FlexiNode<T>) => boolean
  ): FlexiNode<T>[] {
    return nodes.filter(predicate);
  }

  /**
   * Find nodes by label pattern
   */
  static findByLabel<T>(
    nodes: FlexiNode<T>[],
    pattern: string | RegExp,
    caseSensitive = false
  ): FlexiNode<T>[] {
    if (typeof pattern === 'string') {
      const searchTerm = caseSensitive ? pattern : pattern.toLowerCase();
      return nodes.filter(node => {
        const label = caseSensitive ? node.label : node.label.toLowerCase();
        return label.includes(searchTerm);
      });
    }
    return nodes.filter(node => pattern.test(node.label));
  }

  /**
   * Find nodes by data property
   */
  static findByData<T>(
    nodes: FlexiNode<T>[],
    key: string,
    value: any
  ): FlexiNode<T>[] {
    return nodes.filter(node => {
      if (!node.data) return false;
      return (node.data as any)[key] === value;
    });
  }
}
