/**
 * Regular Expression to ensure admin inputs (form names, descriptions, field labels, etc.) 
 * only contain safe characters to prevent injection attacks and ensure proper display.
 * 
 * Allowed characters:
 * - English alphanumeric (a-z, A-Z, 0-9)
 * - Arabic alphanumeric (\u0600-\u06FF)
 * - Common punctuation: Spaces, commas, periods, question marks, exclamation marks, hyphens, underscores, quotes
 */
export const SAFE_TEXT_REGEX = /^[\u0600-\u06FFa-zA-Z0-9\s.,?!'"\-_()]+$/;
export const SAFE_TEXT_ERROR = 'Input contains invalid characters. Only English/Arabic letters, numbers, spaces, and basic punctuation are allowed.';
