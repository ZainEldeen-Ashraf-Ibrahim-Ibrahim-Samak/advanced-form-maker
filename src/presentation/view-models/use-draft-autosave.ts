import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/dev-logger";

export function useDraftAutosave<T>(storageKey: string, initialValue: T) {
  const [draft, setDraft] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDraft(JSON.parse(stored));
      }
    } catch (error) {
      logger.warn("Failed to load draft from localStorage", error);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Sync draft to local storage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      logger.warn("Failed to save draft to localStorage", error);
    }
  }, [storageKey, draft, isLoaded]);

  // Update draft (supports functional updates) — stable reference via useCallback
  const updateDraft = useCallback((update: T | ((prev: T) => T)) => {
    setDraft(update);
  }, []);

  // Clear draft
  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      setDraft(initialValue);
    } catch (error) {
      logger.warn("Failed to clear draft from localStorage", error);
    }
  };

  return { draft, updateDraft, clearDraft, isLoaded };
}
