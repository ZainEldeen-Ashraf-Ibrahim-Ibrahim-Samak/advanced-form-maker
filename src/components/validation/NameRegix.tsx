"use client";
import React, { FC } from "react";
import { NAME_REGEX } from "@/constants/constants";
import { Check, AlertCircle } from "lucide-react"; // Import icons for consistency
import { useLocale, useTranslations } from "next-intl";

interface NameRegixProps {
  name: string;
}

const NameRegix: FC<NameRegixProps> = ({ name }) => {
  // Add language context
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === 'ar';
  const isValidName = (value: string): boolean => {
    return NAME_REGEX.test(value);
  };

  // If name is empty, don't show validation
  if (!name) {
    return null;
  }

  const isValid = isValidName(name);

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
          <span>{t('VALIDATION.VALID_NAME')}</span>
        </>
      ) : (
        <>
          <AlertCircle size={16} className={`${isRTL ? 'ml-2' : 'mr-2'} mt-0.5 flex-shrink-0`} />
          <span>{t('VALIDATION.INVALID_NAME_DETAILS')}</span>
        </>
      )}
    </div>
  );
};

// Simple validation function for external use
const validateName = (name: string): boolean => {
  return NAME_REGEX.test(name);
};

export { validateName };
export default NameRegix;
