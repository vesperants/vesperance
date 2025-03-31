// src/app/search/page.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// --- Local Imports ---
import { muddaMapping } from './muddaMapping'; // Adjust path if needed
import { searchData } from './searchEngine'; // The search function
import type { SearchResultItem } from './searchEngine'; // Result type
import SearchResults from './SearchResults'; // Results table component (expects inbuilt CSS version)
import {
    toNepaliNumber,
    fromNepaliNumber,
    parseBSDateString,
    getNumericBSDate
} from './utils'; // Import helpers

// --- Constants ---
const ITEMS_PER_PAGE = 20;
const currentYearBS = new Date().getFullYear() + 57; // Adjust BS offset if needed
const searchPlaceholder = ". . .";
const selectPlaceholder = "- - -";
const datePlaceholders = { year: "वर्ष", month: "महिना", day: "दिन" };

// --- Generate Options Data (as strings for the original simple picker) ---
const useSelectOptions = () => {
    const years = useMemo(() => Array.from({ length: 80 }, (_, i) => toNepaliNumber(currentYearBS - i)).reverse(), []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => toNepaliNumber(i + 1)), []);
    const days = useMemo(() => Array.from({ length: 32 }, (_, i) => toNepaliNumber(i + 1)), []);
    const ankaOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => toNepaliNumber(i + 1)), []);

    const muddhakoKisimOptions = useMemo(() => muddaMapping.map(type => type.label), []);
    const ijalashkoNaamOptions = useMemo(() => ['सिङ्गल बेञ्च इजलास', 'एक न्यायाधीशको इजलास', 'फूल बेन्च इजलास', 'डिभिजन वेन्च इजलास', 'स्पेशल बेञ्च इजलास', 'तीन न्यायाधीशको इजलास', 'एकल इजलास', 'संयुक्त इजलास', 'पूर्ण इजलास', 'विशेष इजलास', 'वृहद पूर्ण इजलास'], []);
    const faisalakoKisimOptions = useMemo(() => ['जारी', 'खारेज', 'सदर', 'उल्टी', 'बदर', '१८८ को राय बदर', 'केही उल्टी', 'अन्य', 'विविध', 'भविश्यमा सरकारी जिम्मेवारीको पद नदिन लेखी पठाउने', 'सुरू सदर', 'पुनरावेदन अदालतमा फिर्ता', 'सुरू जिल्ला अदालतमा फिर्ता', 'निर्देशन जारी', 'सुरू कार्यालयमा पठाउने', 'रूलिङ कायम', 'डिभिजन वेञ्चमा पेस गर्नु'], []);

    return { years, months, days, ankaOptions, muddhakoKisimOptions, ijalashkoNaamOptions, faisalakoKisimOptions };
};


// --- ScrollPicker Component (Definition matching your Original Snippet) ---
interface ScrollPickerProps {
  options: string[];
  placeholder?: string;
  onSelect?: (selectedOption: string) => void;
  value?: string; // Expects the label string
  label?: string; // Used for aria-label fallback
  className?: string;
  ariaLabel?: string;
  disabled?: boolean; // Keep the disabled prop addition
}
const ScrollPicker: React.FC<ScrollPickerProps> = ({
  options, placeholder = '-- छान्नुहोस् --', onSelect, value: controlledValue,
  label, className = '', ariaLabel, disabled = false // Handle disabled prop
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // This internal state handling is from your original code.
  // It tries to sync with controlledValue but also allows internal selection if uncontrolled.
  const [internalSelected, setInternalSelected] = useState('');
  const selected = controlledValue !== undefined ? controlledValue : internalSelected; // Prefer controlled value

  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

   // Sync internal state if controlled value changes (from original code)
   useEffect(() => {
       // If controlled and value changed OR value reset externally
       if (controlledValue !== undefined && (controlledValue !== internalSelected || controlledValue === '')) {
           setInternalSelected(controlledValue ?? ''); // Update internal state or reset if controlled value is empty/undefined
       }
       // Note: This effect might cause extra renders if not careful.
       // A purely controlled component is often simpler.
   }, [controlledValue, internalSelected]);


  const handleSelectOption = (option: string) => {
    if (disabled) return; // Check disabled
    // Update internal state only if component is uncontrolled (original logic)
    if (controlledValue === undefined) {
        setInternalSelected(option);
    }
    setIsOpen(false);
    if (onSelect) {
      onSelect(option); // Send back the selected label string
    }
  };

  const handleToggleOpen = (event?: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled) return; // Check disabled
    event?.stopPropagation();
    setIsOpen((prev) => !prev);
  };

   const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return; // Check disabled
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleOpen(e); }
    else if (e.key === 'Escape') { setIsOpen(false); }
    else if (e.key === 'ArrowDown' && !isOpen) { e.preventDefault(); setIsOpen(true); }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, option: string) => {
    if (disabled) return; // Check disabled
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSelectOption(option); }
    else if (e.key === 'Escape') { setIsOpen(false); containerRef.current?.focus(); }
  };

  const accessibleName = ariaLabel || label || placeholder;
  const containerClasses = `scroll-picker-container ${isOpen ? 'expanded' : ''} ${disabled ? 'disabled' : ''} ${className}`;

  return (
    <div
      ref={containerRef}
      className={containerClasses} // Use combined class name
      onClick={handleToggleOpen}
      role="listbox"
      // *** CHANGE 1: Removed aria-haspopup="listbox" ***
      aria-expanded={isOpen}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-label={accessibleName}
      aria-disabled={disabled}
    >
      <div className="scroll-picker-text">
        {/* Display the determined selected value (label) or placeholder */}
        {selected || placeholder}
        {/* Arrow: Rely *entirely* on CSS for styling the triangle via .picker-arrow or pseudo-elements */}
      </div>
      {isOpen && (
        <ul className="scroll-picker-list">
          {options.map((option) => (
            <li
              key={option}
              onClick={(e) => { e.stopPropagation(); handleSelectOption(option); }}
              role="option"
              aria-selected={selected === option} // Compare with determined 'selected'
              onKeyDown={(e) => handleOptionKeyDown(e, option)}
              tabIndex={0}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// --- Form Data State (Stores LABELS) ---
type FormDataState = {
    muddaNo: string; nirnayaNo: string; nyayadhish: string;
    muddhakoKisim: string; muddhakoNaam: string; ijalashkoNaam: string; faisalakoKisim: string;
    pakshya: string; vipakshya: string;
    faisalaMitiFromYear: string; faisalaMitiFromMonth: string; faisalaMitiFromDay: string;
    faisalaMitiToYear: string; faisalaMitiToMonth: string; faisalaMitiToDay: string;
    shabdabata: string; nekapaBhag: string;
    nekapaSaal: string; nekapaMahina: string; nekapaAnka: string;
};

const initialFormData: FormDataState = {
    muddaNo: '', nirnayaNo: '', nyayadhish: '', muddhakoKisim: '', muddhakoNaam: '',
    ijalashkoNaam: '', faisalakoKisim: '', pakshya: '', vipakshya: '',
    faisalaMitiFromYear: '', faisalaMitiFromMonth: '', faisalaMitiFromDay: '',
    faisalaMitiToYear: '', faisalaMitiToMonth: '', faisalaMitiToDay: '',
    shabdabata: '', nekapaBhag: '', nekapaSaal: '', nekapaMahina: '', nekapaAnka: '',
};


// ===========================================
// --- Main Search Page Component Function ---
// ===========================================
export default function SearchPage() {
  // --- State Declarations ---
  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [filteredMuddaNaamOptions, setFilteredMuddaNaamOptions] = useState<string[]>([]); // Stores string labels
  const [allSearchResults, setAllSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<keyof SearchResultItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // --- Get Options Data (string arrays) ---
  const {
    years, months, days, ankaOptions,
    muddhakoKisimOptions, ijalashkoNaamOptions, faisalakoKisimOptions
   } = useSelectOptions();

  // --- Effects ---
  // Update filtered muddha names (labels) based on selected Kisim LABEL
  useEffect(() => {
    const selectedKisimLabel = formData.muddhakoKisim;
    if (selectedKisimLabel) {
      const selectedType = muddaMapping.find(type => type.label === selectedKisimLabel);
      const nameLabels = selectedType ? selectedType.names.map(name => name.label) : [];
      const validNameLabels = nameLabels.filter(name => !/^\.*$/.test(name.trim()));
      setFilteredMuddaNaamOptions([...new Set(validNameLabels)]);
      if (formData.muddhakoNaam && !validNameLabels.includes(formData.muddhakoNaam)) {
        setFormData(prev => ({ ...prev, muddhakoNaam: '' }));
      }
    } else {
      setFilteredMuddaNaamOptions([]);
      if (formData.muddhakoNaam) { setFormData(prev => ({ ...prev, muddhakoNaam: '' })); }
    }
  }, [formData.muddhakoKisim, formData.muddhakoNaam]);


  // --- Memos for Sorting/Pagination (Unchanged Logic) ---
  const sortedResults = useMemo(() => {
    // Sorting logic remains the same as previous correct version
    if (!sortColumn || allSearchResults.length === 0) return allSearchResults;
    const resultsToSort = [...allSearchResults];
    resultsToSort.sort((a, b) => {
      const valA = a[sortColumn]; const valB = b[sortColumn];
      if (valA == null && valB == null) return 0; if (valA == null) return sortDirection === 'asc' ? 1 : -1; if (valB == null) return sortDirection === 'asc' ? -1 : 1;
      let comparison = 0;
      switch (sortColumn) {
        case 'decision_date': // फैसला मिति
          const dA = parseBSDateString(String(valA)); const dB = parseBSDateString(String(valB));
          const nA = dA ? getNumericBSDate(dA.year, dA.month, dA.day) : null; const nB = dB ? getNumericBSDate(dB.year, dB.month, dB.day) : null;
          if (nA === nB) comparison = 0; else if (nA === null) comparison = 1; else if (nB === null) comparison = -1; else comparison = nA - nB; break;
        case 'decision_no': // निर्णय नं
        case 'case_no':
        case 'nkp_volume':
        case 'nkp_year':
        case 'nkp_month':
        case 'nkp_issue':
          // Use numeric comparison for these fields after converting from Nepali if needed
          const numA = parseInt(fromNepaliNumber(String(valA)), 10); const numB = parseInt(fromNepaliNumber(String(valB)), 10);
          // Handle potential NaN (e.g., empty strings) by placing them at the end
          const cleanA = isNaN(numA) ? Infinity : numA;
          const cleanB = isNaN(numB) ? Infinity : numB;
          comparison = cleanA - cleanB;
          break;
        default: // Default to string comparison for other columns
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
          break;
      }
      return sortDirection === 'asc' ? comparison : comparison * -1;
    });
    return resultsToSort;
  }, [allSearchResults, sortColumn, sortDirection]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedResults, currentPage]);

  const totalPages = useMemo(() => Math.ceil(sortedResults.length / ITEMS_PER_PAGE), [sortedResults]);


  // --- Event Handlers ---
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name in formData) { setFormData(prev => ({ ...prev, [name]: value })); }
  }, []);

  // handleSelect for the *simple* ScrollPicker (receives and stores label)
  const handleSelect = useCallback((fieldName: keyof FormDataState, selectedLabel: string) => {
     setFormData(prev => ({ ...prev, [fieldName]: selectedLabel }));
  }, []);

  const handleSearch = useCallback(async () => {
    console.log("Initiating search with criteria (labels):", formData);
    setIsLoading(true); setError(null); setAllSearchResults([]); setCurrentPage(1);
    setSortColumn(null); setSearchAttempted(true);
    try {
      const results = await searchData(formData); // Pass label-based state
      setAllSearchResults(results);
      console.log(`Search successful, found ${results.length} total results.`);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "अज्ञात त्रुटि भयो।");
    } finally { setIsLoading(false); }
  // *** CHANGE 3: Added formData to dependency array ***
  }, [formData]);

  // *** MODIFIED SORTING LOGIC ***
  // Only allow sorting on specified columns
  const handleSort = useCallback((columnKey: keyof SearchResultItem) => {
        // Define the columns that are allowed to be sorted
        const allowedSortColumns: (keyof SearchResultItem)[] = ['decision_no', 'decision_date'];

        // Check if the clicked column is in the allowed list
        if (!allowedSortColumns.includes(columnKey)) {
            // If not allowed, do nothing and exit the function
            console.log(`Sorting disabled for column: ${String(columnKey)}`);
            return;
        }

        // --- If sorting is allowed for this column, proceed as before ---
        setCurrentPage(1); // Reset page on sort

        // Check if the same column is clicked again
        if (sortColumn === columnKey) {
            // If yes, toggle the direction
            setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        } else {
            // If a new allowed column is clicked, set it as the sort column and default to 'asc'
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
   }, [sortColumn]); // Dependency on sortColumn is important here

   const handlePageChange = useCallback((newPage: number) => {
       // *** CHANGE 2: Removed unused 'prev' by calling setCurrentPage directly ***
       setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
   }, [totalPages]);

  const handleClear = useCallback(() => {
    setFormData(initialFormData); setFilteredMuddaNaamOptions([]); setAllSearchResults([]);
    setCurrentPage(1); setSortColumn(null); setSearchAttempted(false); setError(null); setIsLoading(false);
   }, []);


  // --- Render Logic (Using original simple ScrollPicker and layout) ---
  return (
    <div className="container"> {/* Ensure this class matches your outer container styling */}
      {/* Header */}
      <div className="page-header"> {/* Ensure this class matches your header styling */}
         <Link href="/home" className="back-button" aria-label="गृहपृष्ठमा फर्कनुहोस्"> {/* Ensure this class matches your back button styling */}
            ←
         </Link>
         <h1 className="page-title">नेपाल कानून पत्रीका खोज</h1> {/* Ensure this class matches your title styling */}
      </div>

      {/* Search Form Grid - Ensure CSS for .grid matches original layout */}
      <div className="grid">
        {/* Row 1 */}
        <div className="row"> {/* Ensure this class matches your row styling */}
          <div>
            <label htmlFor="muddaNo" className="field-label">मुद्दा नं:</label>
            <input type="text" id="muddaNo" name="muddaNo" className="search-box" placeholder={searchPlaceholder} value={formData.muddaNo} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="nirnayaNo" className="field-label">निर्णय नं:</label>
            <input type="text" id="nirnayaNo" name="nirnayaNo" className="search-box" placeholder={searchPlaceholder} value={formData.nirnayaNo} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="nyayadhish" className="field-label">न्यायाधीश:</label>
            <input type="text" id="nyayadhish" name="nyayadhish" className="search-box" placeholder={searchPlaceholder} value={formData.nyayadhish} onChange={handleChange} />
          </div>
        </div>

        {/* Row 2 */}
        <div className="row">
          <div>
              <label className="field-label">मुद्दाको किसिम:</label>
              {/* Use original simple ScrollPicker */}
              <ScrollPicker options={muddhakoKisimOptions} placeholder={selectPlaceholder} value={formData.muddhakoKisim} onSelect={(v) => handleSelect('muddhakoKisim', v)} ariaLabel="मुद्दाको किसिम" />
          </div>
           <div>
               <label className="field-label">इजलासको नाम:</label>
               {/* Use original simple ScrollPicker */}
              <ScrollPicker options={ijalashkoNaamOptions} placeholder={selectPlaceholder} value={formData.ijalashkoNaam} onSelect={(v) => handleSelect('ijalashkoNaam', v)} ariaLabel="इजलासको नाम" />
          </div>
          <div>
              <label className="field-label">फैसलाको किसिम:</label>
              {/* Use original simple ScrollPicker */}
              <ScrollPicker options={faisalakoKisimOptions} placeholder={selectPlaceholder} value={formData.faisalakoKisim} onSelect={(v) => handleSelect('faisalakoKisim', v)} ariaLabel="फैसलाको किसिम" />
          </div>
        </div>

         {/* Row 3 */}
         <div className="row">
           <div>
              <label className="field-label">मुद्दाको नाम:</label>
              {/* Use original simple ScrollPicker */}
              <ScrollPicker
                  options={filteredMuddaNaamOptions}
                  placeholder={selectPlaceholder}
                  value={formData.muddhakoNaam}
                  onSelect={(v) => handleSelect('muddhakoNaam', v)}
                  ariaLabel="मुद्दाको नाम"
                  disabled={!formData.muddhakoKisim} // Keep disabled logic
                  className={!formData.muddhakoKisim ? 'picker-disabled' : ''} // Keep disabled class
              />
          </div>
          <div>
            <label htmlFor="pakshya" className="field-label">पक्ष:</label>
            <input type="text" id="pakshya" name="pakshya" className="search-box" placeholder={searchPlaceholder} value={formData.pakshya} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="vipakshya" className="field-label">विपक्ष:</label>
            <input type="text" id="vipakshya" name="vipakshya" className="search-box" placeholder={searchPlaceholder} value={formData.vipakshya} onChange={handleChange} />
          </div>
        </div>

        {/* Row 4: Date Range & Shabdabata */}
        {/* Ensure CSS for .row-two-col matches original layout */}
        <div className="row-two-col">
          <div>
            <label className="field-label">फैसला मिति:</label>
            {/* Ensure CSS for .date-range-picker and .date-part-combined matches original layout */}
            <div className="date-range-picker">
              <div className="date-part-combined">
                  {/* Use original simple ScrollPicker */}
                  <ScrollPicker options={years} placeholder={datePlaceholders.year} ariaLabel="सुरुको वर्ष" value={formData.faisalaMitiFromYear} onSelect={(v) => handleSelect('faisalaMitiFromYear', v)} />
                  <span className="date-picker-separator">/</span> {/* Keep separators if they were styled */}
                  <ScrollPicker options={months} placeholder={datePlaceholders.month} ariaLabel="सुरुको महिना" value={formData.faisalaMitiFromMonth} onSelect={(v) => handleSelect('faisalaMitiFromMonth', v)} />
                  <span className="date-picker-separator">/</span>
                  <ScrollPicker options={days} placeholder={datePlaceholders.day} ariaLabel="सुरुको दिन" value={formData.faisalaMitiFromDay} onSelect={(v) => handleSelect('faisalaMitiFromDay', v)} />
              </div>
              <span className="date-range-label">देखि</span> {/* Keep labels if styled */}
              <div className="date-part-combined">
                   <ScrollPicker options={years} placeholder={datePlaceholders.year} ariaLabel="अन्त्यको वर्ष" value={formData.faisalaMitiToYear} onSelect={(v) => handleSelect('faisalaMitiToYear', v)} />
                   <span className="date-picker-separator">/</span>
                   <ScrollPicker options={months} placeholder={datePlaceholders.month} ariaLabel="अन्त्यको महिना" value={formData.faisalaMitiToMonth} onSelect={(v) => handleSelect('faisalaMitiToMonth', v)} />
                   <span className="date-picker-separator">/</span>
                   <ScrollPicker options={days} placeholder={datePlaceholders.day} ariaLabel="अन्त्यको दिन" value={formData.faisalaMitiToDay} onSelect={(v) => handleSelect('faisalaMitiToDay', v)} />
              </div>
              <span className="date-range-label">सम्म</span>
            </div>
          </div>
          <div>
             <label htmlFor="shabdabata" className="field-label">शब्दबाट:</label>
             <input type="text" id="shabdabata" name="shabdabata" className="search-box long-search-box" placeholder="खोज चाहेको शब्द..." value={formData.shabdabata} onChange={handleChange} />
          </div>
        </div>

        {/* Row 5: NeKaPa Vivaran - Reverted Structure */}
        {/* Use a wrapper div for the whole section if needed for borders/background */}
        <div className="nekapa-section-wrapper"> {/* Add a wrapper class if needed */}
            <label className="field-label nekapa-main-label">ने.का.प विवरण:</label>
            {/* Ensure CSS for .nekapa-vivaran matches original box layout (e.g., using grid or flex) */}
            <div className="nekapa-vivaran">
                {/* Structure for Label Above Input/Picker */}
                <div className="nekapa-item">
                    <label className="field-label nekapa-item-label" htmlFor="nekapaBhag">भाग</label>
                    <input type="text" id="nekapaBhag" name="nekapaBhag" className="small-input" value={formData.nekapaBhag} onChange={handleChange} />
                </div>
                 <div className="nekapa-item">
                    <label className="field-label nekapa-item-label">साल</label>
                    {/* Use original simple ScrollPicker */}
                    <ScrollPicker options={years} placeholder={selectPlaceholder} ariaLabel="नेकाप साल" value={formData.nekapaSaal} onSelect={(v) => handleSelect('nekapaSaal', v)} />
                </div>
                 <div className="nekapa-item">
                    <label className="field-label nekapa-item-label">महिना</label>
                    {/* Use original simple ScrollPicker */}
                    <ScrollPicker options={months} placeholder={selectPlaceholder} ariaLabel="नेकाप महिना" value={formData.nekapaMahina} onSelect={(v) => handleSelect('nekapaMahina', v)} />
                </div>
                 <div className="nekapa-item">
                    <label className="field-label nekapa-item-label">अंक</label>
                    {/* Use original simple ScrollPicker */}
                    <ScrollPicker options={ankaOptions} placeholder={selectPlaceholder} ariaLabel="नेकाप अंक" value={formData.nekapaAnka} onSelect={(v) => handleSelect('nekapaAnka', v)} />
                </div>
            </div>
        </div> {/* End nekapa-section-wrapper */}

      </div> {/* End of Grid */}

      {/* Button Row */}
      {/* Ensure CSS for .button-container, .button, .button-clear, .button-search matches original */}
      <div className="button-container">
        <button type="button" className="button button-clear" onClick={handleClear}>खाली गर्नुहोस्</button>
        <button type="button" className="button button-search" onClick={handleSearch} disabled={isLoading}>{isLoading ? 'खोज्दैछ...' : 'खोज्नुहोस्'}</button>
      </div>

      {/* Results Area */}
      <div className="results-section">
        {isLoading && <div className="search-status loading">नतिजाहरू लोड हुँदैछन्...</div>}
        {!isLoading && error && <div className="search-status error">त्रुटि: {error}</div>}
        {!isLoading && !error && searchAttempted && allSearchResults.length > 0 && (
            <>
             <div className="results-summary">कूल {toNepaliNumber(allSearchResults.length)} नतिजा मध्ये {toNepaliNumber((currentPage - 1) * ITEMS_PER_PAGE + 1)} - {toNepaliNumber(Math.min(currentPage * ITEMS_PER_PAGE, allSearchResults.length))} देखाइएको छ।</div>
             {/* Pass the MODIFIED handleSort to SearchResults.
                 SearchResults component itself doesn't need changes for this restriction,
                 as the restriction is applied within the handleSort function *before* state is updated.
                 However, SearchResults should visually indicate sortability only for allowed columns if possible.
                 If it always shows sort icons, clicking disallowed ones will just do nothing now. */}
             <SearchResults results={paginatedResults} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
             {totalPages > 1 && ( <div className="pagination-controls"><button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button">{"< अघिल्लो"}</button><span className="pagination-info"> पृष्ठ {toNepaliNumber(currentPage)} / {toNepaliNumber(totalPages)}</span><button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-button">{"अर्को >"}</button></div> )}
            </>
        )}
        {!isLoading && !error && searchAttempted && allSearchResults.length === 0 && ( <div className="search-status no-results">माफ गर्नुहोस्, तपाईंको खोजसँग मिल्ने कुनै नतिजा फेला परेन।</div> )}
       </div>

    </div> // End container div
  ); // End return statement

} // End SearchPage component function