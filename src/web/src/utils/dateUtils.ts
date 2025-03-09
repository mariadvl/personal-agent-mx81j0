import {
  format,
  formatDistance,
  formatDistanceToNow,
  parseISO,
  isValid,
  isToday,
  isYesterday,
  differenceInDays,
} from 'date-fns'; // ^2.30.0

/**
 * Formats a date with the specified format string
 * @param date The date to format
 * @param formatStr The format string to use
 * @returns Formatted date string or empty string if date is invalid
 */
export function formatDate(date: Date | string | number, formatStr: string): string {
  if (date === null || date === undefined) {
    return '';
  }
  
  // Parse string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Check if date is valid
  if (!isValid(dateObj)) {
    return '';
  }
  
  return format(dateObj, formatStr);
}

/**
 * Formats a date for display in the UI with a human-friendly format
 * @param date The date to format
 * @returns Human-friendly formatted date
 */
export function formatDateForDisplay(date: Date | string | number): string {
  if (date === null || date === undefined) {
    return '';
  }
  
  // Parse string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Check if date is valid
  if (!isValid(dateObj)) {
    return '';
  }
  
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'h:mm a')}`;
  }
  
  const now = new Date();
  if (dateObj.getFullYear() === now.getFullYear()) {
    return format(dateObj, 'MMM d at h:mm a'); // Same year
  }
  
  return format(dateObj, 'MMM d, yyyy at h:mm a'); // Different year
}

/**
 * Formats a date as a relative time string (e.g., '5 minutes ago')
 * @param date The date to format
 * @param options Options for formatting
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  options: { addSuffix?: boolean } = { addSuffix: true }
): string {
  if (date === null || date === undefined) {
    return '';
  }
  
  // Parse string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Check if date is valid
  if (!isValid(dateObj)) {
    return '';
  }
  
  return formatDistanceToNow(dateObj, options);
}

/**
 * Formats a date range for display (e.g., 'Jan 1 - Jan 5, 2023')
 * @param startDate Start date of the range
 * @param endDate End date of the range
 * @returns Formatted date range
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number
): string {
  if (startDate === null || startDate === undefined || 
      endDate === null || endDate === undefined) {
    return '';
  }
  
  // Parse string dates
  const startDateObj = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const endDateObj = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  // Check if dates are valid
  if (!isValid(startDateObj) || !isValid(endDateObj)) {
    return '';
  }
  
  const sameYear = startDateObj.getFullYear() === endDateObj.getFullYear();
  const sameMonth = sameYear && startDateObj.getMonth() === endDateObj.getMonth();
  
  if (sameYear) {
    if (sameMonth) {
      // Same month and year: "Jan 1-5, 2023"
      return `${format(startDateObj, 'MMM d')}-${format(endDateObj, 'd, yyyy')}`;
    } else {
      // Different months, same year: "Jan 1 - Feb 5, 2023"
      return `${format(startDateObj, 'MMM d')} - ${format(endDateObj, 'MMM d, yyyy')}`;
    }
  } else {
    // Different years: "Jan 1, 2022 - Feb 5, 2023"
    return `${format(startDateObj, 'MMM d, yyyy')} - ${format(endDateObj, 'MMM d, yyyy')}`;
  }
}

/**
 * Checks if a date is valid
 * @param date The date to check
 * @returns True if date is valid, false otherwise
 */
export function isDateValid(date: any): boolean {
  if (date === null || date === undefined) {
    return false;
  }
  
  // Handle string dates
  if (typeof date === 'string') {
    date = parseISO(date);
  }
  
  return isValid(date);
}

/**
 * Gets the difference between two dates in the specified unit
 * @param dateLeft First date for comparison
 * @param dateRight Second date for comparison
 * @param unit Unit of time for difference calculation (e.g., 'days')
 * @returns Difference in the specified unit
 */
export function getDateDifference(
  dateLeft: Date | string | number,
  dateRight: Date | string | number,
  unit: string = 'days'
): number {
  if (dateLeft === null || dateLeft === undefined || 
      dateRight === null || dateRight === undefined) {
    return 0;
  }
  
  // Parse string dates
  const dateLeftObj = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const dateRightObj = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  
  // Check if dates are valid
  if (!isValid(dateLeftObj) || !isValid(dateRightObj)) {
    return 0;
  }
  
  // For now we only implement days, but this can be extended with other units
  switch (unit) {
    case 'days':
    default:
      return differenceInDays(dateLeftObj, dateRightObj);
  }
}

/**
 * Groups an array of objects by day based on a date property
 * @param items Array of items to group
 * @param dateProperty Property name containing the date
 * @returns Items grouped by day (YYYY-MM-DD)
 */
export function groupDatesByDay<T>(
  items: T[],
  dateProperty: string
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  
  items.forEach(item => {
    const itemDate = (item as any)[dateProperty];
    if (!itemDate) return;
    
    // Parse date if it's a string
    const dateObj = typeof itemDate === 'string' ? parseISO(itemDate) : itemDate;
    
    // Skip invalid dates
    if (!isValid(dateObj)) return;
    
    // Use YYYY-MM-DD as the key for grouping
    const dayKey = format(dateObj, 'yyyy-MM-dd');
    
    if (!result[dayKey]) {
      result[dayKey] = [];
    }
    
    result[dayKey].push(item);
  });
  
  return result;
}

/**
 * Formats only the time portion of a date
 * @param date The date to extract time from
 * @param formatStr The format string to use (defaults to 'h:mm a')
 * @returns Formatted time string
 */
export function formatTimeOnly(
  date: Date | string | number,
  formatStr: string = 'h:mm a'
): string {
  if (date === null || date === undefined) {
    return '';
  }
  
  // Parse string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Check if date is valid
  if (!isValid(dateObj)) {
    return '';
  }
  
  return format(dateObj, formatStr);
}