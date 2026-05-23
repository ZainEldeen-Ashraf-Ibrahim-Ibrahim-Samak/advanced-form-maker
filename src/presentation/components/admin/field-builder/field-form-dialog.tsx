"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import type { FieldDefinition, InputType } from "@/domain/entities/field-definition";

interface FieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FieldDefinition | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const INPUT_TYPES: InputType[] = ["text", "number", "image", "file", "date", "dropdown", "camera"];

export function FieldFormDialog({ open, onOpenChange, field, onSave }: FieldFormDialogProps) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  const [isSaving, setIsSaving] = useState(false);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [inputType, setInputType] = useState<InputType>("text");
  const [isRequired, setIsRequired] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);
  const [dropdownOptionsEn, setDropdownOptionsEn] = useState<string[]>([""]);
  const [dropdownOptionsAr, setDropdownOptionsAr] = useState<string[]>([""]);

  useEffect(() => {
    if (field) {
      setNameEn(field.nameEn);
      setNameAr(field.nameAr);
      setInputType(field.inputType);
      setIsRequired(field.validationRules?.required ?? false);
      setIsMultiple(field.isMultiple ?? false);
      setDropdownOptionsEn(
        field.dropdownOptionsEn.length > 0 ? field.dropdownOptionsEn : [""]
      );
      setDropdownOptionsAr(
        field.dropdownOptionsAr.length > 0 ? field.dropdownOptionsAr : [""]
      );
    } else {
      setNameEn("");
      setNameAr("");
      setInputType("text");
      setIsRequired(false);
      setIsMultiple(false);
      setDropdownOptionsEn([""]);
      setDropdownOptionsAr([""]);
    }
  }, [field, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        inputType,
        isMultiple,
        validationRules: { required: isRequired },
      };

      if (inputType === "dropdown") {
        data.dropdownOptionsEn = dropdownOptionsEn.filter((o) => o.trim() !== "");
        data.dropdownOptionsAr = dropdownOptionsAr.filter((o) => o.trim() !== "");
      }

      await onSave(data);
    } finally {
      setIsSaving(false);
    }
  }

  function addOption() {
    setDropdownOptionsEn([...dropdownOptionsEn, ""]);
    setDropdownOptionsAr([...dropdownOptionsAr, ""]);
  }

  function removeOption(index: number) {
    setDropdownOptionsEn(dropdownOptionsEn.filter((_, i) => i !== index));
    setDropdownOptionsAr(dropdownOptionsAr.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {field ? t("editField") : t("addField")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="nameEn">{t("fieldName")}</Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameAr">{t("fieldNameAr")}</Label>
            <Input
              id="nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
              maxLength={200}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fieldType")}</Label>
            <Select value={inputType} onValueChange={(v) => setInputType(v as InputType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INPUT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              title="Mark this field as required"
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isRequired" className="cursor-pointer">
              {t("isRequired")}
            </Label>
          </div>

          {(inputType === "image" || inputType === "file" || inputType === "text" || inputType === "number" || inputType === "dropdown") && (
            <div className="flex items-center gap-2">
              <input
                title={inputType === "dropdown" ? "Allow selecting multiple options" : "Allow multiple values"}
                type="checkbox"
                id="isMultiple"
                checked={isMultiple}
                onChange={(e) => setIsMultiple(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isMultiple" className="cursor-pointer">
                {t("allowMultiple")}
              </Label>
            </div>
          )}

          {inputType === "dropdown" && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>{t("dropdownOptions")}</Label>
                {dropdownOptionsEn.map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dropdownOptionsEn[index]}
                      onChange={(e) => {
                        const updated = [...dropdownOptionsEn];
                        updated[index] = e.target.value;
                        setDropdownOptionsEn(updated);
                      }}
                      placeholder={`${t("dropdownOptionsEn")} ${index + 1}`}
                      className="flex-1"
                    />
                    <Input
                      value={dropdownOptionsAr[index]}
                      onChange={(e) => {
                        const updated = [...dropdownOptionsAr];
                        updated[index] = e.target.value;
                        setDropdownOptionsAr(updated);
                      }}
                      placeholder={`${t("dropdownOptionsAr")} ${index + 1}`}
                      className="flex-1"
                      dir="rtl"
                    />
                    {dropdownOptionsEn.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-1 h-3 w-3" />
                  {t("addOption")}
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isSaving || !nameEn.trim() || !nameAr.trim()}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
