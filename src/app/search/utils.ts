// src/app/search/utils.ts

// --- Nepali Number Conversion ---
export const nepaliDigitsMap: { [key: string]: string } = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

export const toNepaliNumber = (num: number | string): string => {
  const nepaliDigits: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  // Ensure input is a string before splitting
  return String(num).split('').map(digit => nepaliDigits[digit] || digit).join('');
};

export const fromNepaliNumber = (nepaliNumStr: string | undefined | null): string => {
    if (!nepaliNumStr) return '';
    try {
        // Use Array.from for better handling of potential edge cases
        return Array.from(nepaliNumStr).map(digit => nepaliDigitsMap[digit] ?? digit).join('');
    } catch (e) {
        console.error("Error in fromNepaliNumber:", e, "Input:", nepaliNumStr);
        return ''; // Return empty string on error
    }
};

// --- Date Parsing ---
/**
 * Parses a BS date string (YYYY.MM.DD, YYYY/MM/DD, YYYY-MM-DD, possibly with Nepali numerals)
 * into components. Returns null if invalid.
 */
export const parseBSDateString = (bsDateStr: string | undefined | null): { year: number; month: number; day: number } | null => {
    if (!bsDateStr || typeof bsDateStr !== 'string' || bsDateStr.trim() === '') {
        return null;
    }
    try {
        const standardNumStr = fromNepaliNumber(bsDateStr);
        // Normalize separators (dot, hyphen, space) to slash
        const normalizedStr = standardNumStr.replace(/[-.\s]/g, '/');
        const parts = normalizedStr.split('/');

        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            // Basic validation
            if (!isNaN(year) && !isNaN(month) && !isNaN(day) &&
                year > 1900 && year < 2200 && // Plausible BS year range
                month >= 1 && month <= 12 &&
                day >= 1 && day <= 32) { // Max possible days
                return { year, month, day };
            }
        }
    } catch (e) {
        console.error("Error parsing BS Date String:", e, "Input:", bsDateStr);
    }
    return null;
};

/**
 * Converts parsed BS date components into a single comparable number (YYYYMMDD).
 * Returns null if any component is invalid.
 */
export const getNumericBSDate = (year: number | null, month: number | null, day: number | null): number | null => {
    // Use strict checks including isNaN and integer check
    if (year === null || month === null || day === null ||
        isNaN(year) || isNaN(month) || isNaN(day) ||
        !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
        month < 1 || month > 12 || day < 1 || day > 32) {
        return null;
    }
    try {
        // Calculation remains the same
        return year * 10000 + month * 100 + day;
    } catch (e) {
        console.error("Error in getNumericBSDate calculation:", e, "Inputs:", year, month, day);
        return null;
    }
};

// --- Option Type ---
// Define common types used by components here if needed
export interface PickerOption {
  label: string;
  value: string | number; // Allow string or number value
}