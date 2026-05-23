"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useFieldBuilder } from "@/presentation/view-models/use-field-builder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { GripVertical, Plus, Trash2, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { FieldCard } from "./field-card";
import { FieldFormDialog } from "./field-form-dialog";
import type { FieldDefinition } from "@/domain/entities/field-definition";
import type { ContactFormField, ContactFormFieldKey } from "@/domain/entities/form-template";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { useSortable, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CONTACT_FORM_FIELD_KEYS, createContactFormFieldConfig, normalizeContactFormFields } from "@/lib/contact-form";

type ContactFormFieldDraft = ContactFormField;

function normalizeDraftContactFormFields(fields: ContactFormFieldDraft[]) {
  return normalizeContactFormFields(fields).map((field, index) => ({
    ...field,
    sortOrder: index,
  }));
}

function areContactFormFieldsEqual(a: ContactFormFieldDraft[], b: ContactFormFieldDraft[]) {
  if (a.length !== b.length) return false;

  return a.every((field, index) => {
    const other = b[index];
    if (!other) return false;

    return (
      field.id === other.id &&
      field.key === other.key &&
      field.labelEn === other.labelEn &&
      field.labelAr === other.labelAr &&
      field.label === other.label &&
      field.placeholderEn === other.placeholderEn &&
      field.placeholderAr === other.placeholderAr &&
      field.placeholder === other.placeholder &&
      field.required === other.required &&
      field.sortOrder === other.sortOrder
    );
  });
}

interface FieldBuilderProps {
  formTemplateId: string;
}

function ContactFormFieldRow({
  field,
  index,
  disabled,
  canRemove,
  t,
  tc,
  onUpdate,
  onRemove,
}: {
  field: ContactFormFieldDraft;
  index: number;
  disabled: boolean;
  canRemove: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tc: (key: string, values?: Record<string, string | number>) => string;
  onUpdate: (id: string, patch: Partial<Omit<ContactFormFieldDraft, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-background p-4 space-y-4 shadow-sm transition-shadow ${isDragging ? "shadow-lg z-10" : "hover:shadow-sm"}`}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
              aria-label={t("dragToReorder")}
              {...attributes}
              {...listeners}
              disabled={disabled}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <Label className="text-sm font-semibold">{t("contactFormInputLabel", { index: index + 1 })}</Label>
          </div>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(field.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title={t("contactFormRemoveInput")}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`contact-key-${field.id}`} className="text-xs text-muted-foreground uppercase">{t("contactFormInputType")}</Label>
            <select
              id={`contact-key-${field.id}`}
              value={field.key}
              onChange={(e) => onUpdate(field.id, { key: e.target.value as ContactFormFieldKey })}
              disabled={disabled}
              aria-label={t("contactFormInputType")}
              title={t("contactFormInputType")}
              className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 text-sm"
            >
              {CONTACT_FORM_FIELD_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`contactInputKinds.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`contact-label-en-${field.id}`} className="text-xs text-muted-foreground uppercase">{t("contactFormInputNameEn")}</Label>
            <Input
              id={`contact-label-en-${field.id}`}
              value={field.labelEn}
              onChange={(e) => onUpdate(field.id, { labelEn: e.target.value })}
              placeholder={t("contactFormInputNameEnPlaceholder")}
              disabled={disabled}
              className="bg-muted/50 focus-visible:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`contact-label-ar-${field.id}`} className="text-xs text-muted-foreground uppercase">{t("contactFormInputNameAr")}</Label>
            <Input
              id={`contact-label-ar-${field.id}`}
              value={field.labelAr}
              onChange={(e) => onUpdate(field.id, { labelAr: e.target.value })}
              placeholder={t("contactFormInputNameArPlaceholder")}
              disabled={disabled}
              dir="rtl"
              className="bg-muted/50 focus-visible:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`contact-placeholder-en-${field.id}`} className="text-xs text-muted-foreground uppercase">{t("contactFormInputPlaceholderEn")}</Label>
            <Input
              id={`contact-placeholder-en-${field.id}`}
              value={field.placeholderEn}
              onChange={(e) => onUpdate(field.id, { placeholderEn: e.target.value })}
              placeholder={t("contactFormInputPlaceholderEnHint")}
              disabled={disabled}
              className="bg-muted/50 focus-visible:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`contact-placeholder-ar-${field.id}`} className="text-xs text-muted-foreground uppercase">{t("contactFormInputPlaceholderAr")}</Label>
            <Input
              id={`contact-placeholder-ar-${field.id}`}
              value={field.placeholderAr}
              onChange={(e) => onUpdate(field.id, { placeholderAr: e.target.value })}
              placeholder={t("contactFormInputPlaceholderArHint")}
              disabled={disabled}
              dir="rtl"
              className="bg-muted/50 focus-visible:bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`contact-required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => onUpdate(field.id, { required: checked === true })}
              disabled={disabled}
            />
            <Label htmlFor={`contact-required-${field.id}`} className="text-sm">
              {tc("required")}
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FieldBuilder({ formTemplateId }: FieldBuilderProps) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  const { fields, isLoading, createField, updateField, deleteField, reorderFields } =
    useFieldBuilder(formTemplateId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [contactFormFields, setContactFormFields] = useState<ContactFormFieldDraft[]>(
    normalizeDraftContactFormFields(normalizeContactFormFields(undefined)),
  );
  const [savedContactFormFields, setSavedContactFormFields] = useState<ContactFormFieldDraft[]>(
    normalizeDraftContactFormFields(normalizeContactFormFields(undefined)),
  );
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [contactFormLocked, setContactFormLocked] = useState(false);
  const [savedContactFormLocked, setSavedContactFormLocked] = useState(false);

  const fetchFormContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const res = await fetch(`/api/admin/forms/${formTemplateId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch form");
      }

      const normalized = normalizeDraftContactFormFields(
        normalizeContactFormFields(data.data?.contactFormFields),
      );

      setContactFormFields(normalized);
      setSavedContactFormFields(normalized);
      const locked = !!data.data?.contactFormLocked;
      setContactFormLocked(locked);
      setSavedContactFormLocked(locked);
    } catch (error) {
      const fallback = normalizeDraftContactFormFields(normalizeContactFormFields(undefined));
      setContactFormFields(fallback);
      setSavedContactFormFields(fallback);
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setIsLoadingContacts(false);
    }
  }, [formTemplateId, tc]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const fieldOrder = reordered.map((f, i) => ({
      fieldId: f.id,
      sortOrder: i,
    }));

    try {
      await reorderFields(fieldOrder);
    } catch {
      toast.error(tc("error"));
    }
  }

  async function handleSaveField(data: Record<string, unknown>) {
    try {
      if (editingField) {
        await updateField(editingField.id, data);
      } else {
        await createField(data);
      }

      setIsDialogOpen(false);
      setEditingField(null);
      toast.success(tc("success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    }
  }

  function handleEdit(field: FieldDefinition) {
    setEditingField(field);
    setIsDialogOpen(true);
  }

  function handleAddField() {
    setEditingField(null);
    setIsDialogOpen(true);
  }

  async function handleDeleteField(fieldId: string) {
    try {
      await deleteField(fieldId);
      toast.success(tc("success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    }
  }

  const normalizedContactFormFields = useMemo(
    () => normalizeDraftContactFormFields(contactFormFields),
    [contactFormFields],
  );

  const hasContactChanges = useMemo(
    () =>
      !areContactFormFieldsEqual(normalizedContactFormFields, savedContactFormFields) ||
      contactFormLocked !== savedContactFormLocked,
    [normalizedContactFormFields, savedContactFormFields, contactFormLocked, savedContactFormLocked],
  );

  useEffect(() => {
    void fetchFormContacts();
  }, [fetchFormContacts]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  async function handleSaveContacts() {
    const normalized = normalizeDraftContactFormFields(contactFormFields);

    if (normalized.length < 1) {
      toast.error(t("contactFormMinOneField"));
      return;
    }

    // Capture current lock value synchronously before any await
    const lockToSave = contactFormLocked;

    setIsSavingContacts(true);
    try {
      const res = await fetch(`/api/admin/forms/${formTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactFormFields: normalized, contactFormLocked: lockToSave }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save");
      }
      setSavedContactFormFields(normalized);
      setSavedContactFormLocked(lockToSave);
      toast.success(tc("success"));
    } catch (error) {
      console.error("[contact form save]", error);
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setIsSavingContacts(false);
    }
  }

  function handleToggleContactFormLock() {
    setContactFormLocked((prev) => !prev);
  }

  function handleAddContact() {
    const current = normalizeDraftContactFormFields(contactFormFields);
    const nextSortOrder = current.length;

    const usedKeys = new Set(current.map((field) => field.key));
    const nextKey = CONTACT_FORM_FIELD_KEYS.find((key) => !usedKeys.has(key)) ?? "name";

    setContactFormFields([
      ...current,
      createContactFormFieldConfig(nextKey, nextSortOrder),
    ]);
  }

  function handleRemoveContact(id: string) {
    setContactFormFields((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((field) => field.id !== id)
        .map((field, index) => ({ ...field, sortOrder: index }));
    });
  }

  function handleUpdateContact(id: string, patch: Partial<Omit<ContactFormFieldDraft, "id">>) {
    setContactFormFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? (() => {
              const nextLabelEn = patch.labelEn ?? field.labelEn ?? patch.label ?? field.label;
              const nextLabelAr = patch.labelAr ?? field.labelAr ?? patch.label ?? field.label;
              const nextPlaceholderEn = patch.placeholderEn ?? field.placeholderEn ?? patch.placeholder ?? field.placeholder;
              const nextPlaceholderAr = patch.placeholderAr ?? field.placeholderAr ?? patch.placeholder ?? field.placeholder;

              return {
                ...field,
                key: patch.key ?? field.key,
                labelEn: nextLabelEn,
                labelAr: nextLabelAr,
                label: patch.label ?? nextLabelEn,
                placeholderEn: nextPlaceholderEn,
                placeholderAr: nextPlaceholderAr,
                placeholder: patch.placeholder ?? nextPlaceholderEn,
                required: patch.required ?? field.required,
              };
            })()
          : field,
      ),
    );
  }

  async function handleContactDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = contactFormFields.findIndex((field) => field.id === active.id);
    const newIndex = contactFormFields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...contactFormFields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setContactFormFields(
      reordered.map((field, index) => ({
        ...field,
        sortOrder: index,
      })),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button type="button" onClick={handleAddField}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addField")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">{t("noFields")}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  onEdit={() => handleEdit(field)}
                  onDelete={() => handleDeleteField(field.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className={`rounded-xl border transition-colors ${contactFormLocked ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/20"}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {contactFormLocked ? (
                <Lock className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <LockOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <h3 className="text-lg font-semibold">{t("contactFormTitle")}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t("contactFormDescription")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={contactFormLocked ? "destructive" : "outline"}
              size="sm"
              onClick={handleToggleContactFormLock}
              disabled={isLoadingContacts}
              className={contactFormLocked ? "" : "text-muted-foreground"}
            >
              {contactFormLocked ? (
                <LockOpen className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span className="ms-2 hidden sm:inline">
                {contactFormLocked ? t("contactFormUnlockToggle") : t("contactFormLockToggle")}
              </span>
            </Button>
            {!contactFormLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddContact}
                disabled={isLoadingContacts || isSavingContacts}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("contactFormAddInput")}
              </Button>
            )}
          </div>
        </div>

        {/* Fields — locked overlay only covers this block */}
        <div className={`relative px-4 pb-4 space-y-3 ${contactFormLocked ? "pointer-events-none select-none" : ""}`}>
          {contactFormLocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-destructive/5 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 text-destructive/70">
                <Lock className="h-8 w-8" />
                <span className="text-sm font-medium">{t("contactFormLockedBadge")}</span>
              </div>
            </div>
          )}
          {isLoadingContacts
            ? [1, 2].map((item) => <Skeleton key={item} className="h-52 w-full rounded-md" />)
            : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleContactDragEnd}
                >
                  <SortableContext
                    items={contactFormFields.map((field) => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {contactFormFields.map((field, index) => (
                        <ContactFormFieldRow
                          key={field.id}
                          field={field}
                          index={index}
                          disabled={isSavingContacts || contactFormLocked}
                          canRemove={contactFormFields.length > 1}
                          t={t}
                          tc={tc}
                          onUpdate={handleUpdateContact}
                          onRemove={handleRemoveContact}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
            )}
        </div>
      </div>

      {/* Save footer — always outside the locked section */}
      <div className="flex items-center justify-between gap-3 px-1">
        {!isLoadingContacts && (
          <Badge variant={hasContactChanges ? "secondary" : "outline"}>
            {hasContactChanges ? t("contactChangesPending") : t("contactChangesSaved")}
          </Badge>
        )}
        <Button
          type="button"
          onClick={handleSaveContacts}
          disabled={isLoadingContacts || isSavingContacts || !hasContactChanges}
          className="ms-auto"
        >
          {isSavingContacts ? tc("loading") : tc("save")}
        </Button>
      </div>

      <FieldFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingField(null);
        }}
        field={editingField}
        onSave={handleSaveField}
      />
    </div>
  );
}
