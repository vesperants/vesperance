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
const SortIndicator: React.FC<{ direction: 'asc' | 'desc' | null }> = React.memo(({ direction }) => {
    if (!direction) return null;
    return <span className="sort-indicator">{direction === 'asc' ? '▲' : '▼'}</span>;
});

// --- Main Component ---
const SearchResults: React.FC<SearchResultsProps> = ({
    results,
    onSort,
    sortColumn,
    sortDirection
}) => {

  // --- Inbuilt CSS ---
  // UPDATED: Default cell style to allow wrapping, removed specific wrap-text class
  const styles = `
    .results-table-container { margin-top: 15px; overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 4px; background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .results-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px; table-layout: fixed; }
    /* UPDATED: Default to wrapping, removed overflow/ellipsis/nowrap */
    .results-table th, .results-table td {
        border-bottom: 1px solid #e0e0e0;
        padding: 12px 15px;
        text-align: left;
        vertical-align: middle; /* Keep content vertically aligned */
        white-space: normal; /* Allow text wrapping */
        word-wrap: break-word; /* Ensure long words break if needed */
        /* overflow: hidden; removed */
        /* text-overflow: ellipsis; removed */
    }
    /* REMOVED: .wrap-text class is no longer needed */
    /* .results-table td.wrap-text, .results-table th.wrap-text { white-space: normal; } */
    .results-table thead th { background-color: #f8f9fa; font-weight: 600; cursor: pointer; position: relative; border-top: 1px solid #e0e0e0; border-bottom-width: 2px; vertical-align: middle; /* Align header text middle */ }
    .results-table thead th:hover { background-color: #f1f3f5; }
    .results-table tbody tr:hover { background-color: #f1f3f5; }
    .results-table td a { color: #1a0dab; text-decoration: none; font-weight: 500; }
    .results-table td a:hover { text-decoration: underline; }
    .sort-indicator { font-size: 0.8em; margin-left: 6px; color: #6c757d; vertical-align: middle; }
    .results-table th.sorted { background-color: #e9ecef; color: #212529; }
    .results-table th.sorted .sort-indicator { color: #000; }
    /* Column Widths - Can be adjusted based on wrapped content appearance */
    /* Note: With wrapping, fixed widths might lead to very tall rows for some columns. */
    /* Consider if 'table-layout: auto;' might be better if widths are less critical. */
    .results-table th:nth-child(1), .results-table td:nth-child(1) { width: 10%; } /* Nirnaya No */
    .results-table th:nth-child(2), .results-table td:nth-child(2) { width: 10%; } /* Mudda No */
    .results-table th:nth-child(3), .results-table td:nth-child(3) { width: 35%; } /* Title */
    .results-table th:nth-child(4), .results-table td:nth-child(4) { width: 15%; } /* Date */
    .results-table th:nth-child(5), .results-table td:nth-child(5) { width: 15%; } /* Ijlas */
    .results-table th:nth-child(6), .results-table td:nth-child(6) { width: 15%; } /* NeKaPa Details */
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
                                // REMOVED: Conditional wrap-text class
                                className={sortColumn === key ? 'sorted' : ''}
                                scope="col"
                                aria-sort={sortColumn === key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                {label}
                                <SortIndicator direction={sortColumn === key ? sortDirection : null} />
                            </th>
                        ))}
                        {/* Non-sortable NKP details header */}
                        <th scope="col">नेकाप विवरण</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((item) => (
                        <tr key={item.resultId}>
                            {sortableColumnsConfig.map(({ key }) => (
                                <td key={`${item.resultId}-${key}`}
                                    // REMOVED: Conditional wrap-text class
                                >
                                    {getCellValue(item, key)}
                                </td>
                            ))}
                            {/* NKP details cell - will now wrap by default */}
                            <td>{formatNkpDetails(item)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </>
  );
};

export default SearchResults;