/**
 * Flattens a deeply nested object or Map into a single-level object.
 * Used primarily for exporting complex nested data into a flat CSV/XLSX structure.
 * 
 * @param obj The object or Map to flatten
 * @param prefix The current prefix for keys (used internally during recursion)
 * @returns A single-level object with dot-notated keys
 */
export function flattenNestedData(obj: any, prefix = ''): Record<string, string | number | boolean | null> {
  if (obj === null || obj === undefined) {
    return { [prefix]: '' };
  }

  // Handle standard primitives
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return { [prefix]: obj };
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return { [prefix]: obj.toISOString() };
  }

  const flattened: Record<string, string | number | boolean | null> = {};

  // Handle Map objects
  if (obj instanceof Map) {
    obj.forEach((value, key) => {
      const newKey = prefix ? `${prefix}.${key}` : String(key);
      if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, flattenNestedData(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });
    return flattened;
  }

  // Handle translation JSON objects specifically
  const isPlainObject = Object.prototype.toString.call(obj) === '[object Object]';
  if (isPlainObject) {
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every(k => k === 'ar' || k === 'en')) {
      // If it's a translation object, prefer 'en' (default locale) or 'ar'
      const value = obj.en || obj.ar || '';
      return { [prefix]: value };
    }
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      flattened[prefix] = '[]';
      return flattened;
    }
    
    // If it's an array of primitives, we can join them
    if (obj.every(item => typeof item !== 'object' || item === null)) {
      flattened[prefix] = obj.join(', ');
      return flattened;
    }
    
    // Otherwise recurse
    obj.forEach((item, index) => {
      const newKey = prefix ? `${prefix}[${index}]` : `[${index}]`;
      Object.assign(flattened, flattenNestedData(item, newKey));
    });
    return flattened;
  }

  // Fallback for standard objects
  for (const key of Object.keys(obj)) {
    // Handling standard i18n JSON objects (like { ar: "...", en: "..." })
    // If we detect an object that ONLY has 'ar' and/or 'en' keys, we might want to just grab 'en' or stringify it.
    // For general robustness, we just flatten it fully.
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      Object.assign(flattened, flattenNestedData(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
