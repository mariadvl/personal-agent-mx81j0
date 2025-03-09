import { 
  truncateText, 
  formatMemoryCategory, 
  formatFileType, 
  formatNumber, 
  formatPercentage, 
  formatCurrency, 
  formatTimeAgo, 
  capitalizeFirstLetter, 
  formatImportanceLevel, 
  formatByteSize, 
  formatListToString 
} from '../../src/utils/formatters';
import { MemoryCategory } from '../../src/types/memory';
import { AllowedFileType } from '../../src/types/document';
import { subDays } from 'date-fns'; // ^2.30.0

describe('truncateText', () => {
  it('should return empty string for null or undefined input', () => {
    expect(truncateText(null as unknown as string, 10)).toBe('');
    expect(truncateText(undefined as unknown as string, 10)).toBe('');
  });

  it('should return original text if length is less than max length', () => {
    const text = 'Hello World';
    expect(truncateText(text, 20)).toBe(text);
  });

  it('should truncate text and add ellipsis when text exceeds max length', () => {
    const text = 'This is a long text that should be truncated';
    const maxLength = 10;
    expect(truncateText(text, maxLength)).toBe('This is a...');
  });
});

describe('formatMemoryCategory', () => {
  it('should format "conversation" category correctly', () => {
    expect(formatMemoryCategory('conversation' as MemoryCategory)).toBe('Conversation');
  });

  it('should format "document" category correctly', () => {
    expect(formatMemoryCategory('document' as MemoryCategory)).toBe('Document');
  });

  it('should format "web" category correctly', () => {
    expect(formatMemoryCategory('web' as MemoryCategory)).toBe('Web');
  });

  it('should format "important" category correctly', () => {
    expect(formatMemoryCategory('important' as MemoryCategory)).toBe('Important');
  });

  it('should format "user_defined" category correctly', () => {
    expect(formatMemoryCategory('user_defined' as MemoryCategory)).toBe('User defined');
  });
});

describe('formatFileType', () => {
  it('should format "pdf" file type correctly', () => {
    expect(formatFileType('pdf' as AllowedFileType)).toBe('PDF');
  });

  it('should format "docx" file type correctly', () => {
    expect(formatFileType('docx' as AllowedFileType)).toBe('DOCX');
  });

  it('should format "txt" file type correctly', () => {
    expect(formatFileType('txt' as AllowedFileType)).toBe('TXT');
  });

  it('should format "md" file type correctly', () => {
    expect(formatFileType('md' as AllowedFileType)).toBe('MD');
  });

  it('should format "csv" file type correctly', () => {
    expect(formatFileType('csv' as AllowedFileType)).toBe('CSV');
  });

  it('should format "xlsx" file type correctly', () => {
    expect(formatFileType('xlsx' as AllowedFileType)).toBe('XLSX');
  });
});

describe('formatNumber', () => {
  it('should return empty string for null or undefined input', () => {
    expect(formatNumber(null as unknown as number)).toBe('');
    expect(formatNumber(undefined as unknown as number)).toBe('');
    expect(formatNumber(NaN)).toBe('');
  });

  it('should format integer correctly', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1000)).toBe('-1,000');
  });

  it('should format decimal number with default decimal places', () => {
    expect(formatNumber(1000.5)).toBe('1,001'); // Default is 0 decimal places, so it rounds
  });

  it('should format decimal number with specified decimal places', () => {
    expect(formatNumber(1000.5, 2)).toBe('1,000.50');
    expect(formatNumber(1000.567, 1)).toBe('1,000.6'); // Rounds to 1 decimal place
  });

  it('should format large numbers with thousand separators', () => {
    expect(formatNumber(1234567.89, 2)).toBe('1,234,567.89');
  });
});

describe('formatPercentage', () => {
  it('should return empty string for null or undefined input', () => {
    expect(formatPercentage(null as unknown as number)).toBe('');
    expect(formatPercentage(undefined as unknown as number)).toBe('');
    expect(formatPercentage(NaN)).toBe('');
  });

  it('should format decimal as percentage correctly', () => {
    expect(formatPercentage(0.5)).toBe('50%');
    expect(formatPercentage(1)).toBe('100%');
    expect(formatPercentage(0.123)).toBe('12%'); // Default is 0 decimal places, so it rounds
  });

  it('should format percentage with specified decimal places', () => {
    expect(formatPercentage(0.5, 2)).toBe('50.00%');
    expect(formatPercentage(0.123, 1)).toBe('12.3%');
  });

  it('should handle zero correctly', () => {
    expect(formatPercentage(0)).toBe('0%');
  });

  it('should handle negative percentages correctly', () => {
    expect(formatPercentage(-0.5)).toBe('-50%');
  });
});

describe('formatCurrency', () => {
  it('should return empty string for null or undefined input', () => {
    expect(formatCurrency(null as unknown as number)).toBe('');
    expect(formatCurrency(undefined as unknown as number)).toBe('');
    expect(formatCurrency(NaN)).toBe('');
  });

  it('should format USD currency correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1000.5)).toBe('$1,000.50');
  });

  it('should format EUR currency correctly', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
    expect(formatCurrency(1000.5, 'EUR')).toBe('€1,000.50');
  });

  it('should format JPY currency correctly', () => {
    expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
    expect(formatCurrency(1000.5, 'JPY')).toBe('¥1,001'); // JPY typically has no decimal places
  });

  it('should handle zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative amounts correctly', () => {
    expect(formatCurrency(-1000)).toBe('-$1,000.00');
  });
});

describe('formatTimeAgo', () => {
  it('should return empty string for null or undefined input', () => {
    expect(formatTimeAgo(null as unknown as Date)).toBe('');
    expect(formatTimeAgo(undefined as unknown as Date)).toBe('');
    expect(formatTimeAgo(new Date('invalid date'))).toBe('');
  });

  it('should format recent date correctly', () => {
    const now = new Date();
    // Just check it returns something since exact output depends on timing
    expect(formatTimeAgo(now)).not.toBe('');
  });

  it('should format date from yesterday correctly', () => {
    const yesterday = subDays(new Date(), 1);
    expect(formatTimeAgo(yesterday)).toContain('day ago');
  });

  it('should format date from last week correctly', () => {
    const lastWeek = subDays(new Date(), 7);
    expect(formatTimeAgo(lastWeek)).toContain('days ago');
  });

  it('should format date from last month correctly', () => {
    const lastMonth = subDays(new Date(), 30);
    expect(formatTimeAgo(lastMonth)).toContain('month ago');
  });

  it('should handle string date input correctly', () => {
    const dateString = new Date().toISOString();
    expect(formatTimeAgo(dateString)).not.toBe('');
  });

  it('should handle timestamp input correctly', () => {
    const timestamp = new Date().getTime();
    expect(formatTimeAgo(timestamp)).not.toBe('');
  });
});

describe('capitalizeFirstLetter', () => {
  it('should return empty string for null or undefined input', () => {
    expect(capitalizeFirstLetter(null as unknown as string)).toBe('');
    expect(capitalizeFirstLetter(undefined as unknown as string)).toBe('');
  });

  it('should capitalize first letter correctly', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello');
    expect(capitalizeFirstLetter('world')).toBe('World');
  });

  it('should handle empty string correctly', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });

  it('should handle already capitalized string correctly', () => {
    expect(capitalizeFirstLetter('Hello')).toBe('Hello');
  });

  it('should handle single character correctly', () => {
    expect(capitalizeFirstLetter('a')).toBe('A');
  });
});

describe('formatImportanceLevel', () => {
  it('should format level 1 correctly', () => {
    expect(formatImportanceLevel(1)).toBe('Low');
  });

  it('should format level 2 correctly', () => {
    expect(formatImportanceLevel(2)).toBe('Medium-Low');
  });

  it('should format level 3 correctly', () => {
    expect(formatImportanceLevel(3)).toBe('Medium');
  });

  it('should format level 4 correctly', () => {
    expect(formatImportanceLevel(4)).toBe('Medium-High');
  });

  it('should format level 5 correctly', () => {
    expect(formatImportanceLevel(5)).toBe('High');
  });

  it('should return default value for invalid levels', () => {
    expect(formatImportanceLevel(0)).toBe('Normal');
    expect(formatImportanceLevel(6)).toBe('Normal');
    expect(formatImportanceLevel(null as unknown as number)).toBe('Normal');
  });
});

describe('formatByteSize', () => {
  it('should format bytes correctly', () => {
    expect(formatByteSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(formatByteSize(1024)).toBe('1 KB');
    expect(formatByteSize(2048)).toBe('2 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatByteSize(1048576)).toBe('1 MB');
    expect(formatByteSize(2097152)).toBe('2 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatByteSize(1073741824)).toBe('1 GB');
  });

  it('should format with specified decimal places', () => {
    expect(formatByteSize(1500, 1)).toBe('1.5 KB');
    expect(formatByteSize(1500, 0)).toBe('1 KB');
  });

  it('should handle zero correctly', () => {
    expect(formatByteSize(0)).toBe('0 Bytes');
  });
});

describe('formatListToString', () => {
  it('should return empty string for empty array', () => {
    expect(formatListToString([])).toBe('');
    expect(formatListToString(null as unknown as string[])).toBe('');
  });

  it('should return single item without conjunction', () => {
    expect(formatListToString(['Apple'])).toBe('Apple');
  });

  it('should format two items with conjunction correctly', () => {
    expect(formatListToString(['Apple', 'Banana'])).toBe('Apple and Banana');
  });

  it('should format multiple items with conjunction correctly', () => {
    expect(formatListToString(['Apple', 'Banana', 'Orange'])).toBe('Apple, Banana, and Orange');
    expect(formatListToString(['A', 'B', 'C', 'D'])).toBe('A, B, C, and D');
  });

  it('should work with custom conjunction', () => {
    expect(formatListToString(['Apple', 'Banana'], 'or')).toBe('Apple or Banana');
    expect(formatListToString(['Apple', 'Banana', 'Orange'], 'or')).toBe('Apple, Banana, or Orange');
  });
});