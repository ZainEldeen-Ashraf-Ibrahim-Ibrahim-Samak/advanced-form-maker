"use client";
import React, { useEffect } from 'react';
import { PHONE_REGEX } from "@/constants/constants";
import { Check, AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from 'next-intl';

interface PhoneRegixProps {
  number: string;
  setNumber: (value: string) => void;
  formatPhoneNumber?: (phone: any) => any; // Optional function to format phone number
}

/**
 * Converts Arabic/Eastern Arabic numerals (٠-٩) to English numerals (0-9)
 * Also handles Persian/Urdu numerals (۰-۹)
 */
export const convertArabicNumeralsToEnglish = (text: string): string => {
  if (!text) return text;

  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let result = text;

  // Convert Arabic numerals
  arabicNumerals.forEach((arabicNum, index) => {
    result = result.replace(new RegExp(arabicNum, 'g'), index.toString());
  });

  // Convert Persian numerals
  persianNumerals.forEach((persianNum, index) => {
    result = result.replace(new RegExp(persianNum, 'g'), index.toString());
  });

  return result;
};

const PhoneRegix: React.FC<PhoneRegixProps> = ({ number, setNumber, formatPhoneNumber }) => {
  // Add language context
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === 'ar';
  const defaultFormatPhoneNumber = (phone: string): string => {
    if (!phone) return phone;

    // First, convert any Arabic numerals to English numerals
    let cleanPhone = convertArabicNumeralsToEnglish(phone);

    // Remove any non-digit characters except for the + sign
    cleanPhone = cleanPhone.replace(/[^\d+]/g, '');

    // Egyptian phone number formatting
    if (cleanPhone.startsWith('+20')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('20')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('01')) {
      return `+20${cleanPhone.slice(1)}`;
    } else if (cleanPhone.startsWith('1')) {
      return `+20${cleanPhone}`;
    }

    return cleanPhone;
  };

  // Use provided formatPhoneNumber or default one
  const phoneFormatter = formatPhoneNumber || defaultFormatPhoneNumber;

  const isValidPhoneNumber = (phone: string): boolean => {
    return PHONE_REGEX.test(phone);
  };

  useEffect(() => {
    const formattedNumber = phoneFormatter(number);
    if (formattedNumber !== number) {
      setNumber(formattedNumber);
    }
  }, [number, setNumber, phoneFormatter]);

  // If number is empty, don't show validation
  if (!number) {
    return null;
  }

  const isValid = isValidPhoneNumber(number);

  return (
    <div
      className={`text-sm mt-2 p-2 pb-3 rounded-md flex items-start ${isValid
          ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        }`}
      dir={isRTL ? 'rtl' : 'ltr'} // Add direction support for RTL languages
    >
      {isValid ? (
        <>
          <Check size={16} className={`${isRTL ? 'ml-2' : 'mr-2'} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <span>{t('VALIDATION.VALID_PHONE')}</span>
            {number && (
              <div
                className="text-xs mt-1 opacity-75"
                style={number.startsWith('+') && isRTL ? { direction: 'ltr', textAlign: 'left' } : {}}
              >
                {number}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <AlertCircle size={16} className={`${isRTL ? 'ml-2' : 'mr-2'} mt-0.5 flex-shrink-0`} />
          <span>{t('VALIDATION.INVALID_PHONE_DETAILS')}</span>
        </>
      )}
    </div>
  );
};

// Simple validation function for external use
const validatePhone = (phone: string): boolean => {
  return PHONE_REGEX.test(phone);
};

/**
 * Format a single phone number to Egyptian international format (+201XXXXXXXXX)
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return phone;

  // First, convert any Arabic numerals to English numerals
  let cleanPhone = convertArabicNumeralsToEnglish(phone);

  // Remove any non-digit characters except for the + sign at the start
  cleanPhone = cleanPhone.replace(/[^\d+]/g, '');

  // Egyptian phone number formatting
  if (cleanPhone.startsWith('+20')) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('20')) {
    return `+${cleanPhone}`;
  } else if (cleanPhone.startsWith('01')) {
    return `+20${cleanPhone.slice(1)}`;
  } else if (cleanPhone.startsWith('1')) {
    return `+20${cleanPhone}`;
  }

  return cleanPhone;
};

/**
 * Parse multiple phone numbers from text (comma, newline, space, or semicolon separated)
 * Converts Arabic numerals and formats to Egyptian international format
 * @param text - Text containing multiple phone numbers
 * @returns Array of valid formatted phone numbers
 */
export const parseMultiplePhones = (text: string): string[] => {
  if (!text?.trim()) return [];

  // Split by comma, newline, space, or semicolon
  const parts = text.split(/[,\n\s;]+/);

  const validPhones: string[] = [];
  parts.forEach(p => {
    const phone = p.trim();
    if (!phone) return;

    const formatted = formatPhoneNumber(phone);

    // Validate using PHONE_REGEX or basic Egyptian format check
    const cleanDigits = formatted.replace(/\D/g, '');

    if (validatePhone(formatted)) {
      validPhones.push(formatted);
    } else if (formatted.startsWith('+20') && cleanDigits.length >= 11 && cleanDigits.length <= 12) {
      // Accept Egyptian numbers that are close to valid format
      validPhones.push(formatted);
    }
  });

  // Return unique list
  return [...new Set(validPhones)];
};

/**
 * Get count of valid phone numbers from text
 */
export const countValidPhones = (text: string): number => {
  return parseMultiplePhones(text).length;
};

export { validatePhone };
export default PhoneRegix;
