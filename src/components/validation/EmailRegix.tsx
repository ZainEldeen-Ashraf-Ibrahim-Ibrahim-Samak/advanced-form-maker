"use client";
import React, { FC } from "react";
import { EMAIL_REGEX } from "@/constants/constants";
import { Check, AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface EmailRegixProps {
  email: string;
  currentEmail?: string; // For change email scenarios to prevent same email
  showTypoSuggestions?: boolean; // Whether to show domain typo suggestions
}

// Enhanced email validation with typo detection
export const validateEmailEnhanced = (
  email: string, 
  currentEmail?: string,
  t?: (key: string, params?: any) => string
): { isValid: boolean; error?: string; suggestion?: string } => {
  if (!email) return { isValid: false };
  
  // Basic email format validation
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: t?.("VALIDATION.INVALID_EMAIL") || "Please enter a valid email address" };
  }
  
  // Check if same as current email (for change email scenarios)
  if (currentEmail && email === currentEmail) {
    return { isValid: false, error: t?.("CHANGE_EMAIL.ERRORS.SAME_EMAIL") || "New email cannot be the same as current email" };
  }
  
  // Check for common domain typos
  const commonTypos = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmali.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'ymail.co': 'ymail.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com',
    'hotmaill.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'outlook.co': 'outlook.com',
    'outlookk.com': 'outlook.com',
    'live.co': 'live.com',
    'msn.co': 'msn.com',
    'icloud.co': 'icloud.com',
    'me.co': 'me.com',
    'aol.co': 'aol.com',
  };
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && commonTypos[domain as keyof typeof commonTypos]) {
    const suggestedEmail = email.replace(domain, commonTypos[domain as keyof typeof commonTypos]);
    return { 
      isValid: false, 
      error: t?.("CHANGE_EMAIL.ERRORS.DOMAIN_TYPO", { suggested: suggestedEmail }) || `Did you mean ${suggestedEmail}?`,
      suggestion: suggestedEmail
    };
  }
  
  return { isValid: true };
};

const EmailRegix: FC<EmailRegixProps> = ({ 
  email, 
  currentEmail, 
  showTypoSuggestions = true 
}) => {
  // Add language context
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === 'ar';
  // Use enhanced validation if typo suggestions are enabled
  const validation = showTypoSuggestions 
    ? validateEmailEnhanced(email, currentEmail, t)
    : { isValid: EMAIL_REGEX.test(email), error: !EMAIL_REGEX.test(email) ? t('VALIDATION.INVALID_EMAIL') : undefined };

  // If email is empty, don't show validation
  if (!email) {
    return null;
  }

  const { isValid, error, suggestion } = validation;

  return (
    <div
      className={`text-sm mt-2 p-2 pb-3 rounded-md flex items-start ${
        isValid 
          ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
      }`}
      dir={isRTL ? 'rtl' : 'ltr'} // Add direction support for RTL languages
    >
      {isValid ? (
        <>
          <Check size={16} className={`${isRTL ? 'ml-2' : 'mr-2'} mt-0.5 flex-shrink-0`} />
          <span>{t('VALIDATION.VALID_EMAIL')}</span>
        </>
      ) : (
        <>
          <AlertCircle size={16} className={`${isRTL ? 'ml-2' : 'mr-2'} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <span>{error || t('VALIDATION.INVALID_EMAIL')}</span>
            {/* Show suggestion if available */}
            {suggestion && showTypoSuggestions && (
              <div className="mt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    // This will be handled by parent component
                    const event = new CustomEvent('emailSuggestionClick', { 
                      detail: { suggestion } 
                    });
                    document.dispatchEvent(event);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  {suggestion}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Simple validation function for external use (backward compatibility)
const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

export { validateEmail };
export default EmailRegix;
