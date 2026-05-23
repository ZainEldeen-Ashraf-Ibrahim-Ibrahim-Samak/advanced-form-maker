"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Eye, EyeOff, Sparkles, X, Plus, Trash2 } from "lucide-react";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UnifiedCardItem } from "@/domain/use-cases/admin/manage-dashboard-cards";
import { CARD_ICON_MAP, CARD_ICON_KEYS, getCardIcon, getCardIconColor, getCardIconBg } from "@/lib/card-icons";

const getCardId = (c: UnifiedCardItem) => c.cardType === "stat" ? c.slug : c.formTemplateId;

function IconPicker({
  value,
  onChange,
  onSuggest,
  isSuggesting,
  t,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  onSuggest: () => void;
  isSuggesting: boolean;
  t: any;
}) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getCardIcon(value);
  const selectedColor = getCardIconColor(value);
  const selectedBg = getCardIconBg(value, "");

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground font-semibold">{t("editLogoIcon") || "Card Icon"}</label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 justify-start gap-2 text-xs font-normal"
          onClick={() => setOpen((o) => !o)}
        >
          {value ? (
            <>
              <span className={`p-0.5 rounded ${selectedBg}`}>
                <SelectedIcon className={`h-3.5 w-3.5 shrink-0 ${selectedColor}`} />
              </span>
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t("noIcon") || "No icon"}</span>
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-violet-500 hover:text-violet-600"
          onClick={onSuggest}
          disabled={isSuggesting}
          title={t("suggestIcon") || "Suggest"}
        >
          <Sparkles className={`h-3.5 w-3.5 ${isSuggesting ? "animate-pulse" : ""}`} />
        </Button>
      </div>
      {open && (
        <div className="border rounded-md p-2 max-h-44 overflow-y-auto bg-card shadow-md z-10">
          <div className="grid grid-cols-8 gap-1">
            {CARD_ICON_KEYS.map((key) => {
              const Icon = CARD_ICON_MAP[key];
              const color = getCardIconColor(key);
              const bg = getCardIconBg(key);
              return (
                <button
                  key={key}
                  type="button"
                  title={key}
                  className={`p-1.5 rounded-md hover:opacity-80 flex items-center justify-center transition-opacity ${bg} ${value === key ? "ring-2 ring-ring" : ""}`}
                  onClick={() => { onChange(key); setOpen(false); }}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableCardRow({
  card,
  onToggleVisibility,
  onUpdateField,
  onSuggestIcon,
  onDelete,
  t,
}: {
  card: UnifiedCardItem;
  onToggleVisibility: (id: string) => void;
  onUpdateField: (
    id: string,
    field: "displayNameAr" | "displayNameEn" | "logoUrl" | "metricLabel" | "metricValue",
    value: string | null
  ) => void;
  onSuggestIcon: (id: string, nameAr: string, nameEn: string) => Promise<void>;
  onDelete?: (id: string) => void;
  t: any;
}) {
  const locale = useLocale();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getCardId(card) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSuggestIcon = async () => {
    setIsSuggesting(true);
    try {
      const nameAr = card.cardType === "form"
        ? (card.displayNameAr ?? card.name ?? "")
        : (card.displayNameAr ?? card.defaultLabelAr ?? "");
      const nameEn = card.cardType === "form"
        ? (card.displayNameEn ?? card.name ?? "")
        : (card.displayNameEn ?? card.defaultLabelEn ?? "");
      await onSuggestIcon(getCardId(card), nameAr, nameEn);
    } finally {
      setIsSuggesting(false);
    }
  };

  const isStat = card.cardType === "stat";
  const isCustomStat = isStat && !card.isDefault;
  const cardId = getCardId(card);

  // Resolve the icon to show in the row header
  const iconKey = card.cardType === "stat"
    ? (card.logoUrl || card.defaultIcon || null)
    : (card.logoUrl ?? null);
  const HeaderIcon = getCardIcon(iconKey);

  // Semantic slug colors for default stat cards
  const slugColor: Record<string, string> = {
    total: "text-violet-500",
    pending: "text-amber-500",
    draft: "text-blue-500",
    viewed: "text-emerald-500",
    needs_rewrite: "text-destructive",
  };
  const slugBg: Record<string, string> = {
    total: "bg-violet-100 dark:bg-violet-950",
    pending: "bg-amber-100 dark:bg-amber-950",
    draft: "bg-blue-100 dark:bg-blue-950",
    viewed: "bg-emerald-100 dark:bg-emerald-950",
    needs_rewrite: "bg-red-100 dark:bg-red-950",
  };

  const iconColor = isStat && card.isDefault
    ? (slugColor[card.slug] ?? getCardIconColor(iconKey))
    : getCardIconColor(iconKey);
  const iconBg = isStat && card.isDefault
    ? (slugBg[card.slug] ?? getCardIconBg(iconKey, "bg-muted"))
    : getCardIconBg(iconKey, "bg-muted");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${
        isDragging ? "shadow-md z-10" : ""
      } ${
        !card.visible ? "opacity-50" : ""
      } ${
        isCustomStat ? "border-violet-200 dark:border-violet-800" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {/* Colored icon badge */}
          <div className={`p-1.5 rounded-md shrink-0 ${iconBg}`}>
            <HeaderIcon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {card.cardType === "stat"
                ? (locale === "ar"
                    ? (card.displayNameAr ?? card.defaultLabelAr)
                    : (card.displayNameEn ?? card.defaultLabelEn))
                : (locale === "ar"
                    ? (card.displayNameAr ?? card.displayNameEn ?? card.name)
                    : (card.displayNameEn ?? card.displayNameAr ?? card.name))}
            </span>
            {card.cardType === "form" && card.description && (
              <span className="text-[10px] text-muted-foreground line-clamp-1">{card.description}</span>
            )}
            {isStat && card.isDefault && (
              <span className="text-[10px] text-muted-foreground font-medium">{t("defaultCard") || "Default"}</span>
            )}
            {isCustomStat && (
              <span className="text-[10px] text-violet-500 font-medium">{t("customCard") || "Custom"}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleVisibility(cardId)}
          >
            {card.visible ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
          {isStat && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(cardId)}
              title={t("deleteCard") || "Delete card"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {card.visible && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
          {/* AR name */}
          <div className="space-y-1" dir="rtl">
            <label className="text-[10px] text-muted-foreground font-semibold block text-right">{t("editCardNameAr") || "Card Name (AR)"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs text-right"
              dir="rtl"
              value={card.displayNameAr ?? ""}
              onChange={(e) => onUpdateField(cardId, "displayNameAr", e.target.value || null)}
              placeholder={card.cardType === "stat" ? card.defaultLabelAr : card.name}
            />
            <p className="text-[9px] text-muted-foreground leading-snug" dir="rtl">{t("helperCardNameAr")}</p>
          </div>
          {/* EN name */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold">{t("editCardNameEn") || "Card Name (EN)"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs"
              value={card.displayNameEn ?? ""}
              onChange={(e) => onUpdateField(cardId, "displayNameEn", e.target.value || null)}
              placeholder={card.cardType === "stat" ? card.defaultLabelEn : card.name}
            />
            <p className="text-[9px] text-muted-foreground leading-snug">{t("helperCardNameEn")}</p>
          </div>
          {/* Icon picker */}
          <div className="col-span-2 sm:col-span-3 space-y-1">
            <IconPicker
              value={card.logoUrl ?? null}
              onChange={(icon) => onUpdateField(cardId, "logoUrl", icon)}
              onSuggest={handleSuggestIcon}
              isSuggesting={isSuggesting}
              t={t}
            />
            <p className="text-[9px] text-muted-foreground leading-snug">{t("helperIcon")}</p>
          </div>
          {/* Metric label */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricLabel") || "Metric Label"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs"
              value={card.metricLabel ?? ""}
              onChange={(e) => onUpdateField(cardId, "metricLabel", e.target.value || null)}
              placeholder={t("metricLabelPlaceholder") || "Submissions"}
            />
            <p className="text-[9px] text-muted-foreground leading-snug">{t("helperMetricLabel")}</p>
          </div>
          {/* Metric value */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricValue") || "Metric Value"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs"
              value={card.metricValue ?? ""}
              onChange={(e) => onUpdateField(cardId, "metricValue", e.target.value || null)}
              placeholder={card.cardType === "form" ? card.submissionCount.toString() : "Live"}
            />
            <p className="text-[9px] text-muted-foreground leading-snug">{t("helperMetricValue")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CardManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: UnifiedCardItem[];
  onSave: (cards: UnifiedCardItem[]) => Promise<void>;
  onSuggestIcon: (titleAr: string, titleEn: string) => Promise<string | null>;
  onAddStatCard: (
    displayNameEn: string,
    displayNameAr: string,
    logoUrl?: string | null,
    metricLabel?: string | null,
    metricValue?: string | null
  ) => Promise<boolean>;
  onDeleteStatCard: (slug: string) => Promise<void>;
  t: any;
}

export function CardManagerDialog({ open, onOpenChange, cards, onSave, onSuggestIcon, onAddStatCard, onDeleteStatCard, t }: CardManagerDialogProps) {
  const [draftCards, setDraftCards] = useState<UnifiedCardItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCardEn, setNewCardEn] = useState("");
  const [newCardAr, setNewCardAr] = useState("");
  const [newCardLogoUrl, setNewCardLogoUrl] = useState<string | null>(null);
  const [newCardMetricLabel, setNewCardMetricLabel] = useState("");
  const [newCardMetricValue, setNewCardMetricValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSuggestingNew, setIsSuggestingNew] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftCards(cards.map((c) => ({ ...c })));
    }
  }, [open, cards]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDraftDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = draftCards.findIndex((c) => getCardId(c) === active.id);
    const newIndex = draftCards.findIndex((c) => getCardId(c) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...draftCards];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setDraftCards(reordered);
  };

  const toggleDraftVisibility = (id: string) => {
    setDraftCards((prev) =>
      prev.map((c) => (getCardId(c) === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const updateDraftCardField = (
    id: string,
    field: "displayNameAr" | "displayNameEn" | "logoUrl" | "metricLabel" | "metricValue",
    value: string | null
  ) => {
    setDraftCards((prev) =>
      prev.map((c) => (getCardId(c) === id ? { ...c, [field]: value === "" ? null : value } : c))
    );
  };

  const handleSuggestIconForCard = async (id: string, nameAr: string, nameEn: string) => {
    const icon = await onSuggestIcon(nameAr, nameEn);
    if (icon) {
      setDraftCards((prev) =>
        prev.map((c) => (getCardId(c) === id ? { ...c, logoUrl: icon } : c))
      );
    }
  };

  const handleSuggestNewCardIcon = async () => {
    setIsSuggestingNew(true);
    try {
      const icon = await onSuggestIcon(newCardAr, newCardEn);
      if (icon) {
        setNewCardLogoUrl(icon);
      }
    } finally {
      setIsSuggestingNew(false);
    }
  };

  const handleDeleteDraftCard = (id: string) => {
    setDraftCards((prev) => prev.filter((c) => getCardId(c) !== id));
  };

  const handleAddCustomCard = async () => {
    if (!newCardEn.trim() || !newCardAr.trim()) return;
    setIsAdding(true);
    try {
      const success = await onAddStatCard(
        newCardEn.trim(),
        newCardAr.trim(),
        newCardLogoUrl,
        newCardMetricLabel.trim() || null,
        newCardMetricValue.trim() || null
      );
      if (success) {
        setShowAddForm(false);
        setNewCardEn("");
        setNewCardAr("");
        setNewCardLogoUrl(null);
        setNewCardMetricLabel("");
        setNewCardMetricValue("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePersisted = async (id: string) => {
    const card = draftCards.find((c) => getCardId(c) === id);
    if (!card || card.cardType !== "stat") return;
    // Remove from draft immediately
    handleDeleteDraftCard(id);
    // Persist deletion
    await onDeleteStatCard(card.slug);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draftCards);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("manageCardsTitle") || "Manage Dashboard Cards"}</DialogTitle>
          <DialogDescription>{t("manageCardsDesc") || "Drag to reorder cards or toggle visibility."}</DialogDescription>
        </DialogHeader>
        {/* Top-level usage hints */}
        <div className="flex gap-3 px-1 text-[9px] text-muted-foreground">
          <span>⠿ {t("helperDragReorder")}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>👁 {t("helperVisibility")}</span>
        </div>
        <div className="py-4 flex-1 overflow-y-auto space-y-2 pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDraftDragEnd}>
            <SortableContext items={draftCards.map(getCardId)} strategy={verticalListSortingStrategy}>
              {draftCards.map((card) => (
                <SortableCardRow
                  key={getCardId(card)}
                  card={card}
                  onToggleVisibility={toggleDraftVisibility}
                  onUpdateField={updateDraftCardField}
                  onSuggestIcon={handleSuggestIconForCard}
                  onDelete={handleDeletePersisted}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Custom Stat Card */}
          {showAddForm ? (
            <div className="p-3 rounded-lg border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20 space-y-3">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t("addCustomCardTitle") || "New Custom Card"}</p>
              <div className="grid grid-cols-2 gap-2">
                {/* EN name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-semibold">{t("editCardNameEn") || "Card Name (EN)"}</label>
                  <Input
                    size={undefined}
                    className="h-8 text-xs"
                    value={newCardEn}
                    onChange={(e) => setNewCardEn(e.target.value)}
                    placeholder={t("newCardEnPlaceholder") || "e.g. Approved"}
                    autoFocus
                  />
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("helperNewCardEn")}</p>
                </div>
                {/* AR name */}
                <div className="space-y-1" dir="rtl">
                  <label className="text-[10px] text-muted-foreground font-semibold block text-right">{t("editCardNameAr") || "Card Name (AR)"}</label>
                  <Input
                    size={undefined}
                    className="h-8 text-xs text-right"
                    dir="rtl"
                    value={newCardAr}
                    onChange={(e) => setNewCardAr(e.target.value)}
                    placeholder={t("newCardArPlaceholder") || "مثال: معتمد"}
                  />
                  <p className="text-[9px] text-muted-foreground leading-snug" dir="rtl">{t("helperNewCardAr")}</p>
                </div>
                {/* Icon picker */}
                <div className="col-span-2 space-y-1">
                  <IconPicker
                    value={newCardLogoUrl}
                    onChange={setNewCardLogoUrl}
                    onSuggest={handleSuggestNewCardIcon}
                    isSuggesting={isSuggestingNew}
                    t={t}
                  />
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("helperIcon")}</p>
                </div>
                {/* Metric label */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricLabel") || "Metric Label"}</label>
                  <Input
                    size={undefined}
                    className="h-8 text-xs"
                    value={newCardMetricLabel}
                    onChange={(e) => setNewCardMetricLabel(e.target.value)}
                    placeholder={t("newCardMetricLabelPlaceholder") || "e.g. Submissions"}
                  />
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("helperMetricLabel")}</p>
                </div>
                {/* Metric value */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricValue") || "Metric Value"}</label>
                  <Input
                    size={undefined}
                    className="h-8 text-xs"
                    value={newCardMetricValue}
                    onChange={(e) => setNewCardMetricValue(e.target.value)}
                    placeholder="Live"
                  />
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("helperMetricValue")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleAddCustomCard}
                  disabled={isAdding || !newCardEn.trim() || !newCardAr.trim()}
                >
                  {isAdding ? "..." : (t("addCard") || "Add Card")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCardEn("");
                    setNewCardAr("");
                    setNewCardLogoUrl(null);
                    setNewCardMetricLabel("");
                    setNewCardMetricValue("");
                  }}
                >
                  {t("cancelEdit") || "Cancel"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1 border-dashed"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addCustomCard") || "Add Custom Card"}
            </Button>
          )}
        </div>
        <DialogFooter className="flex sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("cancelEdit") || "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {t("saveLayout") || "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
