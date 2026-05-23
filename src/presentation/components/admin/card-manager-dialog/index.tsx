import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UnifiedCardItem } from "@/domain/use-cases/admin/manage-dashboard-cards";

const getCardId = (c: any) => c.cardType === "stat" ? c.slug : c.formTemplateId;

function SortableCardRow({
  card,
  onToggleVisibility,
  onUpdateField,
  t,
}: {
  card: UnifiedCardItem;
  onToggleVisibility: (id: string) => void;
  onUpdateField: (
    id: string,
    field: "displayName" | "displayNameAr" | "displayNameEn" | "logoUrl" | "metricLabel" | "metricValue",
    value: string | null
  ) => void;
  t: any;
}) {
  const locale = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getCardId(card) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${isDragging ? "shadow-md z-10" : ""} ${!card.visible ? "opacity-50" : ""}`}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleVisibility(getCardId(card))}
          >
            {card.visible ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {card.visible && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
          <div className="space-y-1" dir="rtl">
            <label className="text-[10px] text-muted-foreground font-semibold block text-right">{t("editCardNameAr") || "Card Name (AR)"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs text-right"
              dir="rtl"
              value={card.displayNameAr ?? ""}
              onChange={(e) => onUpdateField(getCardId(card), "displayNameAr", e.target.value || null)}
              placeholder={card.cardType === "stat" ? card.defaultLabelAr : card.name}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold">{t("editCardNameEn") || "Card Name (EN)"}</label>
            <Input
              size={undefined}
              className="h-8 text-xs"
              value={card.displayNameEn ?? ""}
              onChange={(e) => onUpdateField(getCardId(card), "displayNameEn", e.target.value || null)}
              placeholder={card.cardType === "stat" ? card.defaultLabelEn : card.name}
            />
          </div>
          {card.cardType === "form" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold">{t("editLogoUrl") || "Logo URL"}</label>
                <Input
                  size={undefined}
                  className="h-8 text-xs"
                  value={card.logoUrl ?? ""}
                  onChange={(e) => onUpdateField(getCardId(card), "logoUrl", e.target.value || null)}
                  placeholder={t("logoUrlPlaceholder") || "https://example.com/logo.png"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricLabel") || "Metric Label"}</label>
                <Input
                  size={undefined}
                  className="h-8 text-xs"
                  value={card.metricLabel ?? ""}
                  onChange={(e) => onUpdateField(getCardId(card), "metricLabel", e.target.value || null)}
                  placeholder="Submissions"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold">{t("editMetricValue") || "Metric Value"}</label>
                <Input
                  size={undefined}
                  className="h-8 text-xs"
                  value={card.metricValue ?? ""}
                  onChange={(e) => onUpdateField(getCardId(card), "metricValue", e.target.value || null)}
                  placeholder={card.submissionCount.toString()}
                />
              </div>
            </>
          )}
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
  t: any;
}

export function CardManagerDialog({ open, onOpenChange, cards, onSave, t }: CardManagerDialogProps) {
  const [draftCards, setDraftCards] = useState<UnifiedCardItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
    field: "displayName" | "displayNameAr" | "displayNameEn" | "logoUrl" | "metricLabel" | "metricValue",
    value: string | null
  ) => {
    setDraftCards((prev) =>
      prev.map((c) => (getCardId(c) === id ? { ...c, [field]: value === "" ? null : value } : c))
    );
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
        <div className="py-4 flex-1 overflow-y-auto space-y-2 pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDraftDragEnd}>
            <SortableContext items={draftCards.map(getCardId)} strategy={verticalListSortingStrategy}>
              {draftCards.map((card) => (
                <SortableCardRow
                  key={getCardId(card)}
                  card={card}
                  onToggleVisibility={toggleDraftVisibility}
                  onUpdateField={updateDraftCardField}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
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
