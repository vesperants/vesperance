// src/app/search/searchEngine.ts
import Papa from 'papaparse';
import nepaliscript from 'nepscript'; // Correct default import based on documentation
import Fuse from 'fuse.js'; // For fuzzy searching

import { muddaMapping } from './muddaMapping'; // Adjust path if needed

// --- Types ---

// Input criteria from the form (ensure this matches your FormDataState in page.tsx)
type SearchCriteria = {
    muddaNo: string; // User input (potentially Nepali or Arabic numerals)
    nirnayaNo: string; // User input (potentially Nepali or Arabic numerals)
    nyayadhish: string;
    muddhakoKisim: string; // Label from form
    ijalashkoNaam: string; // Label from form
    faisalakoKisim: string; // Label from form
    muddhakoNaam: string; // Label from form
    pakshya: string;
    vipakshya: string;
    faisalaMitiFromYear: string; // Nepali Numeral BS Year
    faisalaMitiFromMonth: string; // Nepali Numeral BS Month
    faisalaMitiFromDay: string; // Nepali Numeral BS Day
    faisalaMitiToYear: string; // Nepali Numeral BS Year
    faisalaMitiToMonth: string; // Nepali Numeral BS Month
    faisalaMitiToDay: string; // Nepali Numeral BS Day
    shabdabata: string;
    nekapaBhag: string; // Nepali Numeral
    nekapaSaal: string; // Nepali Numeral BS Year
    nekapaMahina: string; // Nepali Numeral BS Month
    nekapaAnka: string; // Nepali Numeral Number
    [key: string]: string; // Index signature
};

// Represents a row parsed from the CSV file.
// IMPORTANT: Keys MUST match the CSV headers AFTER lowercase/underscore transformation.
type CsvRow = {
    id?: string;
    link?: string;
    title?: string;
    ijlas_name?: string; // From 'Ijlas Name' header
    mudda_type_value?: string; // Assumes a column with the ID/value for Mudda Kisim
    mudda_type_text?: string; // Assumes a column with the text label for Mudda Kisim
    mudda_name_value?: string; // Assumes a column with the ID/value for Mudda Naam
    mudda_name_text?: string; // Assumes a column with the text label for Mudda Naam
    faisala_type_value?: string; // Assumes a column matching the Faisala Kisim label/ID
    page?: string;
    decision_no?: string; // From 'Decision No' header (EXPECTED TO BE ROMAN NUMERALS IN CSV)
    case_no?: string; // From 'Case No' header (EXPECTED TO BE ROMAN NUMERALS IN CSV)
    nkp_volume?: string; // From 'NKP Volume' or 'Nekapa Bhag' header
    nkp_year?: string; // From 'NKP Year' or 'Nekapa Saal' header
    nkp_month?: string; // From 'NKP Month' or 'Nekapa Mahina' header
    nkp_issue?: string; // From 'NKP Issue' or 'Nekapa Anka' header
    decision_date?: string; // From 'Decision Date' or 'Faisala Miti' header (expecting YYYY/MM/DD format ideally)
    judges?: string; // From 'Judges' or 'Nyayadhish' header
    subject?: string;
    petitioner?: string; // From 'Petitioner' or 'Pakshya' header
    respondent?: string; // From 'Respondent' or 'Vipakshya' header
    lawyers?: string;
    // Add any other relevant columns from your CSV here
    [key: string]: string | undefined;
};

// Final result item structure sent back to the UI.
export type SearchResultItem = CsvRow & {
    resultId: number | string; // Unique ID for React keys
};

// --- Constants ---
const CSV_FILE_PATH = '/nkp_data.csv'; // Path relative to the /public folder
const FUZZY_SEARCH_THRESHOLD = 0.4; // Fuse.js: 0 = exact, 1 = match anything. Lower is stricter.
const FUZZY_SEARCH_DISTANCE = 150; // Fuse.js: How far apart matches can be.
const FUZZY_MIN_MATCH_LENGTH = 3; // Minimum characters in input to trigger fuzzy search logic.
// const DEBOUNCE_DELAY = 300; // Unused constant

// --- Helper Functions ---

const nepaliDigitsMap: { [key: string]: string } = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

/**
 * Safely converts Nepali numeral string to standard Western Arabic numeral string.
 * Returns an empty string if input is null, undefined, empty, or conversion fails.
 * Added check to bypass conversion if input is already Arabic numerals.
 */
const fromNepaliNumber = (nepaliNumStr: string | undefined | null): string => {
    if (!nepaliNumStr) return '';
    const trimmedStr = String(nepaliNumStr).trim();
    if (!trimmedStr) return '';
    try {
        // If it's already standard digits, return as is
        if (/^[0-9]+$/.test(trimmedStr)) {
            return trimmedStr;
        }
        return Array.from(trimmedStr).map(digit => nepaliDigitsMap[digit] ?? digit).join('');
    // *** FIX: Changed 'catch (e)' to 'catch (_e)' ***
    } catch (_e) {
        // console.error("Error in fromNepaliNumber:", _e, "Input:", nepaliNumStr);
        return ''; // Return empty string on error
    }
};

/**
 * Safely parses a BS date string (potentially with Nepali numerals and various separators)
 * into numeric components. Returns null if parsing fails or input is invalid/incomplete.
 */
const parseBSDateString = (bsDateStr: string | undefined | null): { year: number; month: number; day: number } | null => {
    if (!bsDateStr || typeof bsDateStr !== 'string') return null;
    const trimmedStr = bsDateStr.trim();
    if (trimmedStr === '') return null;

    try {
        const standardNumStr = fromNepaliNumber(trimmedStr);
        const normalizedStr = standardNumStr.replace(/[-.]/g, '/'); // Normalize separators
        const parts = normalizedStr.split('/');

        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            // Basic validation
            if (!isNaN(year) && !isNaN(month) && !isNaN(day) &&
                year > 1900 && year < 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 32) {
                return { year, month, day };
            }
        }
    // *** FIX: Changed 'catch (e)' to 'catch (_e)' ***
    } catch (_e) {
        // console.error("Error parsing BS Date String:", _e, "Input:", bsDateStr);
    }
    // console.warn(`Failed to parse BS date string: "${bsDateStr}"`);
    return null;
};


/**
 * Converts numeric BS date components to a single comparable number (YYYYMMDD).
 * Returns null if any input component is invalid or outside basic plausible ranges.
 */
const getNumericBSDate = (year: number | null | undefined, month: number | null | undefined, day: number | null | undefined): number | null => {
    if (year == null || month == null || day == null ||
        isNaN(year) || isNaN(month) || isNaN(day) ||
        !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
        month < 1 || month > 12 || day < 1 || day > 32 || year < 1900 || year > 2200) {
        return null;
    }
    try {
        return year * 10000 + month * 100 + day;
    // *** FIX: Changed 'catch (e)' to 'catch (_e)' ***
    } catch (_e) {
        // console.error("Error in getNumericBSDate calculation:", _e, "Inputs:", year, month, day);
        return null;
    }
};

/**
 * Converts a Roman numeral string to an integer.
 * Returns null if the input is invalid or not a Roman numeral.
 */
const romanToInt = (romanStr: string | undefined | null): number | null => {
    if (!romanStr || typeof romanStr !== 'string') {
        return null;
    }

    const str = romanStr.trim().toUpperCase();
    if (str.length === 0) {
        return null;
    }

    const romanMap: { [key: string]: number } = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
    };

    let result = 0;
    let prevValue = 0;

    for (let i = str.length - 1; i >= 0; i--) {
        const char = str[i];
        const currentValue = romanMap[char];

        if (currentValue === undefined) {
            // console.warn(`Invalid character '${char}' found in Roman numeral string: "${romanStr}"`);
            return null; // Not a valid Roman numeral character
        }

        if (currentValue < prevValue) {
            result -= currentValue; // Subtractive case (e.g., IV, IX)
        } else {
            result += currentValue;
        }
        prevValue = currentValue;
    }

    // Roman numerals generally represent positive integers > 0
    if (result <= 0) {
        // console.warn(`Conversion resulted in non-positive number for Roman numeral: "${romanStr}"`);
        return null;
    }

    return result;
};


/**
 * Safely transliterates Romanized Nepali text to Devanagari script using nepscript.
 */
const safeTransliterate = (text: string | undefined | null): string => {
    if (!text) return '';
    const trimmedText = text.trim();
    if (trimmedText.length < FUZZY_MIN_MATCH_LENGTH) {
        return trimmedText;
    }
    try {
        // Heuristic: If it contains Devanagari, assume it's already Nepali.
        if (/[\u0900-\u097F]/.test(trimmedText)) {
            return trimmedText;
        }
        const transliterated = nepaliscript(trimmedText);
        if (typeof transliterated === 'string' && transliterated.length > 0) {
             return transliterated;
        } else {
             console.warn(`nepscript returned non-string or empty for input: "${trimmedText}"`);
             return trimmedText; // Fallback
        }

    } catch (e) { // This catch block error was already handled by commenting the console.error below
        console.error(`Error transliterating "${trimmedText}" with nepscript:`, e);
        return trimmedText; // Fallback
    }
};


// --- Main Search Function ---
export const searchData = async (criteria: SearchCriteria): Promise<SearchResultItem[]> => {
    console.log("Search engine received criteria:", criteria);
    const startTime = performance.now();

    // 1. Fetch CSV Data
    let csvText: string;
    try {
        const fetchStartTime = performance.now();
        const response = await fetch(CSV_FILE_PATH);
        if (!response.ok) {
            throw new Error(`खोज डाटा फाइल लोड गर्न असमर्थ भयौं (Status: ${response.status}). फाइल '/public${CSV_FILE_PATH}' मा छ कि छैन जाँच्नुहोस्।`);
        }
        csvText = await response.text();
        console.log(`CSV fetched in ${((performance.now() - fetchStartTime) / 1000).toFixed(2)}s`);
        if (!csvText || csvText.trim().length === 0) {
            console.warn("CSV file fetched but appears to be empty.");
            return [];
        }
    } catch (error) {
        console.error("Error fetching or reading CSV:", error);
        const message = error instanceof Error ? error.message : "खोज डाटा फाइल प्राप्त गर्न वा पढ्न असफल भयो।";
        throw new Error(message);
    }

    // 2. Parse CSV Data
    let parsedData: CsvRow[] = [];
    try {
        console.time("CSV Parsing");
        const results = await new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
            Papa.parse<CsvRow>(csvText, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: (header) => header?.trim().toLowerCase().replace(/\s+/g, '_') ?? '',
                complete: (res) => {
                    const validData = res.data.filter(row =>
                        row != null &&
                        typeof row === 'object' &&
                        Object.keys(row).length > 0 &&
                        Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '')
                    );
                    if (res.errors.length > 0) {
                        console.warn("CSV Parsing encountered warnings (showing first 5):", res.errors.slice(0, 5));
                    }
                     if (validData.length === 0 && res.meta.fields && res.meta.fields.length > 0) {
                         console.warn("CSV parsed with headers but no valid data rows found. Check CSV content after the header.");
                     } else if (validData.length === 0) {
                         console.error("CSV parsing failed to find headers or any valid data rows. Check CSV format and content.");
                     }
                    resolve({ ...res, data: validData });
                },
                error: (err: Papa.ParseError) => {
                    console.error("Papaparse fatal error:", err);
                    reject(new Error("डाटा फाइल प्रशोधन गर्दा गम्भीर त्रुटि भयो। फाइलको संरचना जाँच्नुहोस्।"));
                }
            });
        });
        console.timeEnd("CSV Parsing");
        parsedData = results.data;

        if (parsedData.length === 0) {
             console.warn("Parsing finished, but no valid data rows were extracted.");
             return [];
        }
        console.log(`Parsed ${parsedData.length} valid data rows.`);
        // Log sample keys if needed:
        // if (parsedData.length > 0) console.log("Sample Parsed Row Keys:", Object.keys(parsedData[0]));

    } catch (parseError) {
        console.error("Error during CSV parsing process:", parseError);
        const message = parseError instanceof Error ? parseError.message : "खोज डाटा फाइल प्रशोधन गर्न असफल भयो।";
        throw new Error(message);
    }

    // 3. Prepare Search Criteria
    console.time("Criteria Preparation");

    // --- Date Range ---
    const parsedYearFrom = criteria.faisalaMitiFromYear ? parseInt(fromNepaliNumber(criteria.faisalaMitiFromYear), 10) : NaN;
    const parsedMonthFrom = criteria.faisalaMitiFromMonth ? parseInt(fromNepaliNumber(criteria.faisalaMitiFromMonth), 10) : NaN;
    const parsedDayFrom = criteria.faisalaMitiFromDay ? parseInt(fromNepaliNumber(criteria.faisalaMitiFromDay), 10) : NaN;
    const parsedYearTo = criteria.faisalaMitiToYear ? parseInt(fromNepaliNumber(criteria.faisalaMitiToYear), 10) : NaN;
    const parsedMonthTo = criteria.faisalaMitiToMonth ? parseInt(fromNepaliNumber(criteria.faisalaMitiToMonth), 10) : NaN;
    const parsedDayTo = criteria.faisalaMitiToDay ? parseInt(fromNepaliNumber(criteria.faisalaMitiToDay), 10) : NaN;
    const startNumericBSDate = !isNaN(parsedYearFrom) && !isNaN(parsedMonthFrom) && !isNaN(parsedDayFrom)
        ? getNumericBSDate(parsedYearFrom, parsedMonthFrom, parsedDayFrom)
        : null;
    const endNumericBSDate = !isNaN(parsedYearTo) && !isNaN(parsedMonthTo) && !isNaN(parsedDayTo)
        ? getNumericBSDate(parsedYearTo, parsedMonthTo, parsedDayTo)
        : null;

    // --- Dropdown Lookups ---
    const selectedKisimMapping = criteria.muddhakoKisim ? muddaMapping.find(k => k.label === criteria.muddhakoKisim) : undefined;
    const kisimValueToMatch = selectedKisimMapping?.value;
    const selectedNaamMapping = selectedKisimMapping?.names.find(n => n.label === criteria.muddhakoNaam);
    const naamValueToMatch = selectedNaamMapping?.value;

    // --- Exact Match Criteria (Labels/Values) ---
    const ijalashLabelTrimmed = criteria.ijalashkoNaam?.trim() || '';
    const faisalaCriteriaTrimmed = criteria.faisalakoKisim?.trim() || '';

    // --- Convert User Input Numbers (potentially Nepali) to Integers ---
    const criteriaCaseNoStr = fromNepaliNumber(criteria.muddaNo).trim();
    const criteriaDecisionNoStr = fromNepaliNumber(criteria.nirnayaNo).trim();
    const criteriaNkpVolStr = fromNepaliNumber(criteria.nekapaBhag).trim();
    const criteriaNkpYearStr = fromNepaliNumber(criteria.nekapaSaal).trim();
    const criteriaNkpMonthStr = fromNepaliNumber(criteria.nekapaMahina).trim();
    const criteriaNkpIssueStr = fromNepaliNumber(criteria.nekapaAnka).trim();

    // Parse the user's input strings into numbers if they are valid, otherwise NaN
    const criteriaCaseNoNum = criteriaCaseNoStr ? parseInt(criteriaCaseNoStr, 10) : NaN;
    const criteriaDecisionNoNum = criteriaDecisionNoStr ? parseInt(criteriaDecisionNoStr, 10) : NaN;

    // --- Fuzzy Match Criteria (Transliterated and Trimmed) ---
    const judgesSearchTerm = safeTransliterate(criteria.nyayadhish);
    const petitionerSearchTerm = safeTransliterate(criteria.pakshya);
    const respondentSearchTerm = safeTransliterate(criteria.vipakshya);
    const shabdabataSearchTerm = safeTransliterate(criteria.shabdabata);

    console.timeEnd("Criteria Preparation");

    // 4. Filter Data - Phase 1: Exact Matches & Ranges
    console.time("Initial Filtering (Exact/Range)");
    // Use const as intermediateResults is not reassigned after this filter
    const intermediateResults = parsedData.filter(row => {
        if (!row) return false;

        try {
            // --- Roman Numeral / Integer Equality Checks ---
            // Compare user's integer input with integer converted from row's Roman numeral

            // Check Case No (muddaNo)
            if (!isNaN(criteriaCaseNoNum)) { // Only check if user provided a valid number
                const rowCaseNoRoman = row.case_no; // Get Roman numeral string from CSV row
                const rowCaseNoNum = romanToInt(rowCaseNoRoman); // Convert Roman numeral to integer

                // If row data is not valid Roman OR converted number doesn't match input, filter out
                if (rowCaseNoNum === null || rowCaseNoNum !== criteriaCaseNoNum) {
                    return false;
                }
            }

            // Check Decision No (nirnayaNo)
            if (!isNaN(criteriaDecisionNoNum)) { // Only check if user provided a valid number
                const rowDecisionNoRoman = row.decision_no; // Get Roman numeral string from CSV row
                const rowDecisionNoNum = romanToInt(rowDecisionNoRoman); // Convert Roman numeral to integer

                // If row data is not valid Roman OR converted number doesn't match input, filter out
                if (rowDecisionNoNum === null || rowDecisionNoNum !== criteriaDecisionNoNum) {
                    return false;
                }
            }

            // --- Remaining Exact String Checks (Apply fromNepaliNumber to row data if applicable) ---
            if (criteriaNkpVolStr && fromNepaliNumber(row.nkp_volume).trim() !== criteriaNkpVolStr) return false;
            if (criteriaNkpYearStr && fromNepaliNumber(row.nkp_year).trim() !== criteriaNkpYearStr) return false;
            if (criteriaNkpMonthStr && fromNepaliNumber(row.nkp_month).trim() !== criteriaNkpMonthStr) return false;
            if (criteriaNkpIssueStr && fromNepaliNumber(row.nkp_issue).trim() !== criteriaNkpIssueStr) return false;

            // --- Dropdown Value Checks ---
            if (kisimValueToMatch && String(row.mudda_type_value ?? '').trim() !== String(kisimValueToMatch)) return false;
            if (naamValueToMatch && String(row.mudda_name_value ?? '').trim() !== String(naamValueToMatch)) return false;

            // --- Label/Value Checks ---
            if (ijalashLabelTrimmed && String(row.ijlas_name ?? '').trim() !== ijalashLabelTrimmed) return false;
            if (faisalaCriteriaTrimmed && String(row.faisala_type_value ?? '').trim() !== faisalaCriteriaTrimmed) return false;

            // --- Date Range Check ---
            if (startNumericBSDate || endNumericBSDate) {
                const rowBSDateComponents = parseBSDateString(row.decision_date);
                const rowNumericBSDate = rowBSDateComponents ? getNumericBSDate(rowBSDateComponents.year, rowBSDateComponents.month, rowBSDateComponents.day) : null;

                // Row must have a valid parseable date within the range if a range is specified
                if (rowNumericBSDate === null) return false;
                if (startNumericBSDate !== null && rowNumericBSDate < startNumericBSDate) return false;
                if (endNumericBSDate !== null && rowNumericBSDate > endNumericBSDate) return false;
            }

            // If all NON-FUZZY checks passed, keep for Phase 2
            return true;

        } catch (filterError) {
            console.error("Error during initial filtering of row:", filterError, "Row data:", row);
            return false; // Exclude row on error
        }
    });
    console.timeEnd("Initial Filtering (Exact/Range)");
    console.log(`Found ${intermediateResults.length} results after initial filtering.`);

    // Return early if initial filtering yielded no results
    if (intermediateResults.length === 0) {
        console.log("Search complete. No results after initial filtering.");
        return [];
    }

    // 5. Filter Data - Phase 2: Fuzzy Matching (using Fuse.js)
    let finalFilteredResults = intermediateResults; // Start with results from Phase 1

    // --- Fuse.js Configuration ---
    const fuseOptions: Fuse.IFuseOptions<CsvRow> = {
        minMatchCharLength: FUZZY_MIN_MATCH_LENGTH,
        threshold: FUZZY_SEARCH_THRESHOLD,
        distance: FUZZY_SEARCH_DISTANCE,
        ignoreLocation: true, // Search anywhere in the string
        keys: [
            { name: 'judges', weight: 0.9 },
            { name: 'petitioner', weight: 1.0 },
            { name: 'respondent', weight: 1.0 },
            { name: 'title', weight: 0.7 },
            { name: 'subject', weight: 0.6 },
            { name: 'lawyers', weight: 0.5 },
            { name: 'mudda_type_text', weight: 0.3 }, // Text value from dropdowns
            { name: 'mudda_name_text', weight: 0.4 }, // Text value from dropdowns
            // Add other free-text fields from CSV if needed for 'shabdabata'
        ],
    };

    /** Helper to apply Fuse.js filtering sequentially */
    const applyFuzzyFilter = (
        term: string,
        data: CsvRow[],
        options: Fuse.IFuseOptions<CsvRow>
    ): CsvRow[] => {
        // Only filter if term is valid and there's data to filter
        if (!term || term.length < FUZZY_MIN_MATCH_LENGTH || data.length === 0) {
            return data;
        }
        console.time(`Fuzzy Filtering for term: "${term.substring(0, 20)}..."`);
        const fuse = new Fuse(data, options);
        const results = fuse.search(term); // Search using the (potentially transliterated) term
        console.timeEnd(`Fuzzy Filtering for term: "${term.substring(0, 20)}..."`);
        console.log(` -> Found ${results.length} fuzzy matches.`);
        return results.map(result => result.item); // Return only the original data items
    };

    // --- Apply Fuzzy Filters Sequentially ---
    // Filter by Judges (only search 'judges' field)
    finalFilteredResults = applyFuzzyFilter(judgesSearchTerm, finalFilteredResults, { ...fuseOptions, keys: ['judges'] });
    // Filter by Petitioner (search relevant fields)
    finalFilteredResults = applyFuzzyFilter(petitionerSearchTerm, finalFilteredResults, { ...fuseOptions, keys: [{name: 'petitioner', weight: 1.0}, {name: 'title', weight: 0.5}, {name: 'subject', weight: 0.4}] });
    // Filter by Respondent (search relevant fields)
    finalFilteredResults = applyFuzzyFilter(respondentSearchTerm, finalFilteredResults, { ...fuseOptions, keys: [{name: 'respondent', weight: 1.0}, {name: 'title', weight: 0.5}, {name: 'subject', weight: 0.4}] });
    // Filter by Shabdabata (search across all configured text keys)
    finalFilteredResults = applyFuzzyFilter(shabdabataSearchTerm, finalFilteredResults, fuseOptions);


    // 6. Format and Return Final Results
    const finalResultsWithId: SearchResultItem[] = finalFilteredResults.map((row, index) => ({
        ...row,
        // Use a stable ID from CSV if 'id' column exists and is valid, otherwise generate temporary one.
        resultId: (row.id && !isNaN(Number(row.id))) ? Number(row.id) : `temp_${startTime}_${index}`
    }));

    const endTime = performance.now();
    console.log(`Search complete. Found ${finalResultsWithId.length} final matching results in ${((endTime - startTime) / 1000).toFixed(2)}s.`);

    return finalResultsWithId;
};