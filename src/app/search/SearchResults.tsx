// src/app/search/SearchResults.tsx
'use client';

import React from 'react';
import type { SearchResultItem } from './searchEngine'; // Ensure this path is correct

// --- Helper Function ---
const formatNkpDetails = (item: SearchResultItem): string => {
    const parts = [
        item.nkp_volume ? `भाग ${item.nkp_volume}` : null,
        item.nkp_year ? `साल ${item.nkp_year}` : null,
        item.nkp_month ? `महिना ${item.nkp_month}` : null,
        item.nkp_issue ? `अंक ${item.nkp_issue}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
};

// --- Configuration & Types ---
const sortableColumnsConfig: ReadonlyArray<{ key: keyof SearchResultItem; label: string }> = [
    { key: 'decision_no', label: 'निर्णय नं.' },
    { key: 'case_no', label: 'मुद्दा नं.' },
    { key: 'title', label: 'विषय/मुद्दा' },
    { key: 'decision_date', label: 'फैसला मिति' },
    { key: 'ijlas_name', label: 'इजलास' },
];

interface SearchResultsProps {
  results: SearchResultItem[];
  onSort: (columnKey: keyof SearchResultItem) => void;
  sortColumn: keyof SearchResultItem | null;
  sortDirection: 'asc' | 'desc';
}

// --- Helper Components ---
// Define the functional component first
const SortIndicatorComponent: React.FC<{ direction: 'asc' | 'desc' | null }> = ({ direction }) => {
    if (!direction) return null;
    return <span className="sort-indicator">{direction === 'asc' ? '▲' : '▼'}</span>;
};
// Wrap it with React.memo
const SortIndicator = React.memo(SortIndicatorComponent);
// *** ADD THIS LINE ***
SortIndicator.displayName = 'SortIndicator'; // Explicitly set the display name


// --- Main Component ---
const SearchResults: React.FC<SearchResultsProps> = ({
    results,
    onSort,
    sortColumn,
    sortDirection
}) => {

  // --- Inbuilt CSS ---
  // (Keep your styles block as it was)
  const styles = `
    .results-table-container { margin-top: 15px; overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 4px; background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .results-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px; table-layout: fixed; }
    .results-table th, .results-table td {
        border-bottom: 1px solid #e0e0e0;
        padding: 12px 15px;
        text-align: left;
        vertical-align: middle;
        white-space: normal;
        word-wrap: break-word;
    }
    .results-table thead th { background-color: #f8f9fa; font-weight: 600; cursor: pointer; position: relative; border-top: 1px solid #e0e0e0; border-bottom-width: 2px; vertical-align: middle; }
    .results-table thead th:hover { background-color: #f1f3f5; }
    .results-table tbody tr:hover { background-color: #f1f3f5; }
    .results-table td a { color: #1a0dab; text-decoration: none; font-weight: 500; }
    .results-table td a:hover { text-decoration: underline; }
    .sort-indicator { font-size: 0.8em; margin-left: 6px; color: #6c757d; vertical-align: middle; }
    .results-table th.sorted { background-color: #e9ecef; color: #212529; }
    .results-table th.sorted .sort-indicator { color: #000; }
    /* Column Widths */
    .results-table th:nth-child(1), .results-table td:nth-child(1) { width: 10%; }
    .results-table th:nth-child(2), .results-table td:nth-child(2) { width: 10%; }
    .results-table th:nth-child(3), .results-table td:nth-child(3) { width: 35%; }
    .results-table th:nth-child(4), .results-table td:nth-child(4) { width: 15%; }
    .results-table th:nth-child(5), .results-table td:nth-child(5) { width: 15%; }
    .results-table th:nth-child(6), .results-table td:nth-child(6) { width: 15%; }
  `;

  // Helper to safely get value or return placeholder/link
  const getCellValue = (item: SearchResultItem, key: keyof SearchResultItem): React.ReactNode => {
      const value = item[key];
      if (value == null || String(value).trim() === '') { return '-'; }
      if (key === 'title' && item.link) {
          return (
              <a href={item.link} target="_blank" rel="noopener noreferrer" title={`पुरा विवरण हेर्नुहोस्: ${String(value)}`}>
                  {String(value)}
              </a>
          );
      }
      return String(value);
  };

  if (results.length === 0) { return null; }

  return (
    <>
        <style>{styles}</style>
        <div className="results-table-container">
            <table className="results-table">
                <thead>
                    <tr>
                        {sortableColumnsConfig.map(({ key, label }) => (
                            <th
                                key={key} onClick={() => onSort(key)}
                                className={sortColumn === key ? 'sorted' : ''}
                                scope="col"
                                aria-sort={sortColumn === key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                {label}
                                <SortIndicator direction={sortColumn === key ? sortDirection : null} />
                            </th>
                        ))}
                        <th scope="col">नेकाप विवरण</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((item) => (
                        <tr key={item.resultId}>
                            {sortableColumnsConfig.map(({ key }) => (
                                <td key={`${item.resultId}-${key}`}>
                                    {getCellValue(item, key)}
                                </td>
                            ))}
                            <td>{formatNkpDetails(item)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </>
  );
};
// *** ALSO ADD DISPLAY NAME TO THE MAIN EXPORTED COMPONENT (Good Practice) ***
SearchResults.displayName = 'SearchResults';

export default SearchResults;