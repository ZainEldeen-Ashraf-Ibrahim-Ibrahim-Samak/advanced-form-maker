"use client";

import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload } from "./media-upload";
import type { FieldDefinition } from "@/domain/entities/field-definition";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import EmailRegix from "@/components/validation/EmailRegix";
import PhoneRegix from "@/components/validation/PhoneRegix";
import NameRegix from "@/components/validation/NameRegix";

interface FieldRendererProps {
  field: FieldDefinition;
  value?: string | number | string[] | null;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  mediaItems?: { url: string; publicId: string }[];
  onChangeValue: (val: string | number | string[] | null) => void;
  onChangeMedia: (url: string, publicId: string) => void;
  onChangeMediaItems?: (items: { url: string; publicId: string }[]) => void;
  hasError?: boolean;
  disabled?: boolean;
  isAutoFilled?: boolean;
}


function normalizeTextLikeValue(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return "";
}

function normalizeSingleDropdownValue(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);

  if (Array.isArray(raw)) {
    const firstMeaningful = raw.find(
      (item) => typeof item === "string" || typeof item === "number",
    );
    return firstMeaningful === undefined ? "" : String(firstMeaningful);
  }

  if (raw && typeof raw === "object" && "value" in raw) {
    const candidate = (raw as { value?: unknown }).value;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }

  return "";
}

function normalizeMultiDropdownValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  const single = normalizeSingleDropdownValue(raw).trim();
  return single.length > 0 ? [single] : [];
}

export function FieldRenderer({
  field,
  value,
  mediaUrl,
  mediaItems = [],
  onChangeValue,
  onChangeMedia,
  onChangeMediaItems,
  hasError = false,
  disabled = false,
  isAutoFilled = false,
}: FieldRendererProps) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const tAi = useTranslations("aiExtraction");
  const hasInitializedDateRef = useRef(false);

  const controlWrapper = (children: React.ReactNode) => {
    if (!isAutoFilled) return children;
    return (
      <div className="relative group/ai">
        {children}
        <div
          className="absolute -top-2.5 end-2 z-10 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full shadow-sm select-none"
          title={tAi("autoFilledBadge") || "Auto-filled by AI"}
        >
          <Sparkles className="h-2.5 w-2.5 animate-pulse" />
          <span>{tAi("autoFilledBadge")}</span>
        </div>
      </div>
    );
  };


  useEffect(() => {
    if (!disabled && field.inputType === "date" && !hasInitializedDateRef.current) {
      if (!value) {
        const today = new Date().toISOString().split("T")[0];
        onChangeValue(today);
      }
      hasInitializedDateRef.current = true;
    }
  }, [disabled, field.inputType, value, onChangeValue]);

  const displayName = locale === "ar" ? field.nameAr : field.nameEn;
  const isRequired = field.validationRules?.required;
  const { minLength, maxLength } = field.validationRules ?? {};

  const renderLabel = (targetId?: string) => (
    <div className="flex items-center gap-1 mb-2">
      <Label htmlFor={targetId} className={`${hasError ? "text-destructive" : ""} text-base`}>
        {displayName}
      </Label>
      {isRequired && <span className="text-destructive font-bold">*</span>}
    </div>
  );

  const renderReadonlyEmpty = () => (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground italic">
      {tc("noResults")}
    </div>
  );

  const renderReadonlyValue = (text: string) => (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
      {text}
    </div>
  );

  switch (field.inputType) {
    case "text":
      const textValue = normalizeTextLikeValue(value);

      if (disabled) {
        return (
          <div className="space-y-1">
            {renderLabel()}
            {textValue.trim().length > 0
              ? renderReadonlyValue(textValue)
              : renderReadonlyEmpty()}
          </div>
        );
      }

      // If no max length or large max length, use textarea, else input
      if (!maxLength || maxLength > 100) {
        return (
          <div className="space-y-1">
            {renderLabel(field.id)}
            {controlWrapper(
              <Textarea
                id={field.id}
                value={textValue}
                onChange={(e) => onChangeValue(e.target.value)}
                placeholder={displayName}
                required={isRequired}
                minLength={minLength}
                maxLength={maxLength}
                disabled={disabled}
                className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 focus-visible:ring-primary/50 ring-1 ring-primary/20" : ""}`}
              />
            )}
          </div>
        );
      }
      return (
        <div className="space-y-1">
          {renderLabel(field.id)}
          {controlWrapper(
            <Input
              id={field.id}
              value={textValue}
              onChange={(e) => onChangeValue(e.target.value)}
              placeholder={displayName}
              required={isRequired}
              minLength={minLength}
              maxLength={maxLength}
              disabled={disabled}
              className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 focus-visible:ring-primary/50 ring-1 ring-primary/20" : ""}`}
            />
          )}
          {field.validationRules?.regexType === 'email' && (
            <EmailRegix email={textValue} showTypoSuggestions={true} />
          )}
          {field.validationRules?.regexType === 'phone' && (
            <PhoneRegix number={textValue} setNumber={(val) => onChangeValue(val)} />
          )}
          {field.validationRules?.regexType === 'name' && (
            <NameRegix name={textValue} />
          )}
        </div>
      );

    case "number":
      const numberValue =
        value === null || value === undefined ? "" : String(value);

      if (disabled) {
        return (
          <div className="space-y-1">
            {renderLabel()}
            {numberValue.trim().length > 0
              ? renderReadonlyValue(numberValue)
              : renderReadonlyEmpty()}
          </div>
        );
      }

      return (
        <div className="space-y-1">
          {renderLabel(field.id)}
          {controlWrapper(
            <Input
              id={field.id}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={numberValue}
              onChange={(e) => {
                const val = e.target.value;
                // Allow only digits to simulate number input but preserve leading zeros
                if (val === "" || /^[0-9]*$/.test(val)) {
                  onChangeValue(val || null);
                }
              }}
              placeholder={"0"}
              required={isRequired}
              disabled={disabled}
              className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 focus-visible:ring-primary/50 ring-1 ring-primary/20" : ""}`}
            />
          )}
        </div>
      );

    case "date":
      const dateValue = normalizeTextLikeValue(value);

      if (disabled) {
        return (
          <div className="space-y-1">
            {renderLabel()}
            {dateValue.trim().length > 0
              ? renderReadonlyValue(dateValue)
              : renderReadonlyEmpty()}
          </div>
        );
      }

      return (
        <div className="space-y-1">
          {renderLabel(field.id)}
          {controlWrapper(
            <Input
              id={field.id}
              type="date"
              value={dateValue}
              onChange={(e) => onChangeValue(e.target.value)}
              required={isRequired}
              disabled={disabled}
              className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 focus-visible:ring-primary/50 ring-1 ring-primary/20" : ""}`}
            />
          )}
        </div>
      );

    case "dropdown":
      const dropdownValue = normalizeSingleDropdownValue(value);

      if (disabled) {
        return (
          <div className="space-y-1">
            {renderLabel()}
            {dropdownValue.trim().length > 0
              ? renderReadonlyValue(dropdownValue)
              : renderReadonlyEmpty()}
          </div>
        );
      }

      const options = (locale === "ar" ? field.dropdownOptionsAr : field.dropdownOptionsEn) || [];

      if (field.isMultiple) {
        const selectedValues = normalizeMultiDropdownValue(value);

        if (disabled) {
          return (
            <div className="space-y-1">
              {renderLabel()}
              {selectedValues.length > 0
                ? renderReadonlyValue(selectedValues.join(", "))
                : renderReadonlyEmpty()}
            </div>
          );
        }

        const handleAdd = (val: string | null) => {
          if (!val) return;
          if (selectedValues.includes(val)) return;
          onChangeValue([...selectedValues, val]);
        };

        const handleRemove = (val: string) => {
          onChangeValue(selectedValues.filter((item) => item !== val));
        };

        return (
          <div className="space-y-2">
            {renderLabel(field.id)}
            {controlWrapper(
              <Select value="" onValueChange={handleAdd} disabled={disabled}>
                <SelectTrigger id={field.id} className={`${hasError ? "border-destructive ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 ring-1 ring-primary/20" : ""}`}>
                  <SelectValue placeholder={tc("optional")} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt, i) => (
                    <SelectItem key={i} value={opt} disabled={selectedValues.includes(opt)}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-wrap gap-2">
              {selectedValues.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium"
                >
                  {item}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => handleRemove(item)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          {renderLabel(field.id)}
          {controlWrapper(
            <Select
              value={dropdownValue}
              onValueChange={(val) => onChangeValue(val)}
              disabled={disabled}
            >
              <SelectTrigger
                id={field.id}
                className={`${hasError ? "border-destructive ring-destructive" : ""} ${isAutoFilled ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              >
                <SelectValue placeholder={tc("optional")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt, i) => (
                  <SelectItem key={i} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );


    case "image":
    case "file":
      const hasSingleMedia = !!mediaUrl && mediaUrl.trim().length > 0;
      const hasMediaItems = mediaItems.length > 0;

      if (disabled && !hasSingleMedia && !hasMediaItems) {
        return (
          <div className="space-y-1">
            {renderLabel()}
            {renderReadonlyEmpty()}
          </div>
        );
      }

      return (
        <div className="space-y-1">
          {renderLabel(disabled ? undefined : field.id)}
          <MediaUpload
            inputId={field.id}
            type={field.inputType}
            isMultiple={field.isMultiple}
            currentUrl={mediaUrl}
            currentItems={mediaItems}
            onUpload={(url, pubId) => onChangeMedia(url, pubId)}
            onItemsChange={(items) => onChangeMediaItems?.(items)}
            onRemove={() => {
              onChangeMedia("", "");
              onChangeValue(null);
              onChangeMediaItems?.([]);
            }}
            maxFileSize={field.validationRules?.maxFileSize}
            disabled={disabled}
          />
          {hasError && <p className="text-xs text-destructive">{tc("required")}</p>}
        </div>
      );

    default:
      return null;
  }
}
