"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormManager } from "@/presentation/view-models/use-form-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, FileText, Trash2, Settings, Share2, Copy, QrCode, Download, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "next-intl";
import { useRef } from "react";
import { Switch } from "@/components/ui/switch";

export function FormManager() {
  const tc = useTranslations("common");
  const t = useTranslations("forms");
  const ts = useTranslations("sharing");
  const tAi = useTranslations("aiExtraction");
  const locale = useLocale();
  const { forms, isLoading, createForm, updateForm, deleteForm } = useFormManager();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormDesc, setEditFormDesc] = useState("");
  const [editFormAiAutoFillEnabled, setEditFormAiAutoFillEnabled] = useState(false);
  const [editFormIsLocked, setEditFormIsLocked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Share Dialog State
  const [shareFormId, setShareFormId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isShareLoading, setIsShareLoading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleCreate() {
    if (!newFormName.trim()) return;
    setIsCreating(true);
    try {
      await createForm(newFormName.trim(), newFormDesc.trim());
      setNewFormName("");
      setNewFormDesc("");
      setIsCreateOpen(false);
      toast.success(tc("success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenEdit(form: typeof forms[number]) {
    setEditingFormId(form.id);
    setEditFormName(form.name);
    setEditFormDesc(form.description || "");
    setEditFormAiAutoFillEnabled(form.aiAutoFillEnabled || false);
    setEditFormIsLocked(form.isLocked || false);
    setIsEditOpen(true);
  }

  async function handleUpdate() {
    if (!editingFormId || !editFormName.trim()) return;
    setIsEditing(true);
    try {
      await updateForm(editingFormId, {
        name: editFormName.trim(),
        description: editFormDesc.trim(),
        aiAutoFillEnabled: editFormAiAutoFillEnabled,
        isLocked: editFormIsLocked,
      });
      setIsEditOpen(false);
      setEditingFormId(null);
      toast.success(tc("success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    } finally {
      setIsEditing(false);
    }
  }

  async function handleSetActive(id: string) {
    try {
      await updateForm(id, { isActive: true });
      toast.success(tc("success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteForm(id);
    if (result.success) {
      toast.success(tc("success"));
    } else {
      toast.error(result.error || tc("error"));
    }
  }

  function handleOpenShare(id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}/f/${id}`;
    setShareUrl(url);
    setShareFormId(id);
    setIsShareOpen(true);
  }

  function handleCopyShareLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success(tc("copied"));
  }

  function handleDownloadQR() {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2; // High DPI
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `form-qr-${shareFormId}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success(tc("success"));
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger nativeButton={true} render={<Button />}>
            <Plus className="me-2 h-4 w-4" />
            {t("createForm")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createForm")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">{t("formName")}</Label>
                <Input
                  id="form-name"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder={t("formName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">{t("formDescription")}</Label>
                <Textarea
                  id="form-desc"
                  value={newFormDesc}
                  onChange={(e) => setNewFormDesc(e.target.value)}
                  placeholder={t("formDescription")}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newFormName.trim() || isCreating}
                className="w-full"
              >
                {tc("create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noForms")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card
              key={form.id}
              className={`transition-all hover:shadow-md ${form.isActive ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    {form.description && (
                      <CardDescription>{form.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {form.isActive ? (
                      <Badge variant="default">{t("activeForm")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("inactiveForm")}</Badge>
                    )}
                    {form.isLocked && (
                      <Badge variant="destructive">
                        {t("locked")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/forms/${form.id}`}>
                    <Button variant="outline" size="sm">
                      <Settings className="me-1 h-3 w-3" />
                      {t("title")}
                    </Button>
                  </Link>
                  {!form.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetActive(form.id)}
                    >
                      {t("setActive")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(form)}
                    title={tc("edit") || "Edit"}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenShare(form.id)}
                    title={ts("title")}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="ms-auto text-destructive" />}>
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteWarning")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(form.id)}>
                          {tc("delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Form Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editForm")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-form-name">{t("formName")}</Label>
              <Input
                id="edit-form-name"
                value={editFormName}
                onChange={(e) => setEditFormName(e.target.value)}
                placeholder={t("formName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-form-desc">{t("formDescription")}</Label>
              <Textarea
                id="edit-form-desc"
                value={editFormDesc}
                onChange={(e) => setEditFormDesc(e.target.value)}
                placeholder={t("formDescription")}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="space-y-0.5 max-w-[80%]">
                <Label htmlFor="edit-form-ai" className="text-sm font-semibold cursor-pointer">
                  {tAi("enableAiAutoFill")}
                </Label>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {tAi("aiAutoFillDesc")}
                </p>
              </div>
              <Switch
                id="edit-form-ai"
                checked={editFormAiAutoFillEnabled}
                onCheckedChange={setEditFormAiAutoFillEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="space-y-0.5 max-w-[80%]">
                <Label htmlFor="edit-form-locked" className="text-sm font-semibold cursor-pointer">
                  {t("lockForm")}
                </Label>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {t("lockFormDesc")}
                </p>
              </div>
              <Switch
                id="edit-form-locked"
                checked={editFormIsLocked}
                onCheckedChange={setEditFormIsLocked}
              />
            </div>
            <Button
              onClick={handleUpdate}
              disabled={!editFormName.trim() || isEditing}
              className="w-full"
            >
              {isEditing ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4 mr-2" /> : null}
              {tc("save") || "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              {ts("title")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
             <div className="bg-white p-4 rounded-xl shadow-inner border border-zinc-100" ref={qrRef}>
                <QRCodeSVG 
                  value={shareUrl} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/favicon.ico", // Attempt to include favicon as logo if available
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
             </div>
             
              <div className="w-full space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">{ts("publicLink")}</Label>
                <div className="flex items-center gap-2">
                 <Input 
                   readOnly 
                   value={shareUrl} 
                   className="bg-muted/30 font-mono text-xs overflow-hidden text-ellipsis h-10"
                 />
                 <Button size="icon" onClick={handleCopyShareLink}>
                   <Copy className="h-4 w-4" />
                 </Button>
               </div>
             </div>

             <div className="w-full pt-4 border-t flex flex-col gap-3">
               <div className="flex items-center justify-between text-muted-foreground">
                 <div className="flex items-center gap-2 text-sm">
                   <QrCode className="h-4 w-4" />
                   <span>{ts("qrTitle")}</span>
                 </div>
                 <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase">{ts("dynamicLink")}</span>
               </div>
               <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleDownloadQR}>
                 <Download className="h-4 w-4" />
                 {ts("downloadPng")}
               </Button>
             </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setIsShareOpen(false)}
            >
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
