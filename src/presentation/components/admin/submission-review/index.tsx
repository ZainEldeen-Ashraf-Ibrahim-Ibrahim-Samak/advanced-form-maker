"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, Eye, AlertCircle, File, ArrowLeft, ExternalLink, Download, Phone, MessageCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { logger } from "@/lib/dev-logger";
import { formatDate } from "@/lib/utils";
import type { Submission } from "@/domain/entities/submission";
import type { FieldValue } from "@/domain/entities/field-value";
import type { ContactFormField } from "@/domain/entities/form-template";

interface SubmissionReviewProps {
  id: string;
}

export function SubmissionReview({ id }: SubmissionReviewProps) {
  const t = useTranslations("submissions");
  const tc = useTranslations("common");
  const tClient = useTranslations("client");
  const locale = useLocale();
  const router = useRouter();
  const submissionDataTitle =
    locale === "ar" ? "بيانات الطلب" : "Submission Data";
  
  const { updateStatus } = useSubmissionsList();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [values, setValues] = useState<FieldValue[]>([]);
  const [contactFields, setContactFields] = useState<ContactFormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rewriteComment, setRewriteComment] = useState("");

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const fetchRes = await fetch(`/api/submissions/${id}`, { cache: "no-store" });
        const json = await fetchRes.json();
        
        if (json.success && !json.data.isNew) {
           setSubmission(json.data.submission);
           setValues(json.data.values);
           if (json.data.formTemplate?.contactFormFields) {
             setContactFields([...json.data.formTemplate.contactFormFields].sort((a: any, b: any) => a.sortOrder - b.sortOrder));
           }
           // Auto mark as viewed if pending
           if (json.data.submission.status === "pending") {
              await updateStatus(json.data.submission.id, "viewed");
              setSubmission(prev => prev ? { ...prev, status: "viewed" } : null);
           }
        }
      } catch (error) {
        logger.error("Failed to fetch submission details", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmission();
  }, [id, updateStatus]);

  const handleStatusChange = async (status: Submission["status"]) => {
    if (status === "needs_rewrite" && !rewriteComment.trim()) return;
    
    setIsUpdating(true);
    try {
      await updateStatus(id, status, status === "needs_rewrite" ? rewriteComment : undefined);
      setSubmission(prev => {
        if (!prev) return prev;
        const newTrack = [...prev.auditTrail, {
          oldStatus: prev.status,
          newStatus: status,
          comment: status === "needs_rewrite" ? rewriteComment : undefined,
          adminId: "optimistic",
          adminName: t("optimisticAdminName"),
          timestamp: new Date()
        }];
        return { ...prev, status, auditTrail: newTrack };
      });
      
      // Clear the comment input after successful submission, regardless of status
      setRewriteComment("");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{tc("noResults")}</p>
        <Button variant="link" onClick={() => router.push("/admin/dashboard")}>{tc("back")}</Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-5 w-5 text-amber-500" />;
      case "viewed": return <Eye className="h-5 w-5 text-emerald-500" />;
      case "needs_rewrite": return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return null;
    }
  };

  const hasAnyValue = values.some((val) => {
    const hasText =
      val?.value !== undefined &&
      val?.value !== null &&
      String(val.value).trim().length > 0;
    const hasMedia = !!val?.mediaUrl && val.mediaUrl.trim().length > 0;
    const hasMediaItems = (val?.mediaItems?.length ?? 0) > 0;

    return hasText || hasMedia || hasMediaItems;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/admin/dashboard">
        <Button variant="ghost" size="sm" className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc("back")}
        </Button>
      </Link>

      {submission.formSnapshot.length > 0 && !hasAnyValue && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("viewDetail")}</AlertTitle>
          <AlertDescription>{tc("noResults")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">{submissionDataTitle}</CardTitle>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={submission.status === "needs_rewrite" ? "destructive" : "secondary"} className="text-sm px-3 py-1 flex items-center gap-1.5">
                    {getStatusIcon(submission.status)}
                    {t(`statuses.${submission.status}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(submission.submittedAt)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-foreground/80">{t("contactRecords")}</Label>
                  {submission.contactRecords.length > 0 ? (
                    <div className="space-y-4">
                      {submission.contactRecords.map((record, index) => (
                        <div key={record.id} className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-primary/80">
                               {submission.contactRecords.length > 1 
                                 ? tClient("contactRecordLabel", { index: index + 1 }) 
                                 : tClient("contactFormTitle")}
                            </h4>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {contactFields.length > 0 ? (
                              contactFields.map(field => {
                                const value = field.key === "name" ? record.name 
                                          : field.key === "email" ? record.email 
                                          : field.key === "phone" ? record.phone 
                                          : field.key === "address" ? ((record as any).address || record.notes)
                                          : null;
                                const label = locale === "ar" ? (field.labelAr || field.label || field.labelEn) : (field.labelEn || field.label || field.labelAr);
                                
                                return (
                                  <div key={field.id} className={`space-y-1 ${field.key === "address" ? "sm:col-span-2" : ""}`}>
                                    <Label className="text-xs text-muted-foreground">{label}</Label>
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-medium ${field.key === "address" ? "whitespace-pre-wrap" : ""}`}>{value || "—"}</p>
                                      {field.key === "phone" && value && (
                                        <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                                          <a 
                                            href={`tel:${value}`} 
                                            className="p-1 px-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/50"
                                            title={tc("call")}
                                          >
                                            <Phone className="h-3.5 w-3.5" />
                                          </a>
                                          <a 
                                            href={`https://wa.me/${value.replace(/\D/g, "")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1 px-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/50"
                                            title={tc("whatsapp")}
                                          >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordName")}</Label>
                                  <p className="text-sm font-medium">{record.name || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordEmail")}</Label>
                                  <p className="text-sm font-medium">{record.email || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordPhone")}</Label>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{record.phone || record.contact || "—"}</p>
                                    {(record.phone || record.contact) && (
                                      <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                                        <a 
                                          href={`tel:${record.phone || record.contact}`} 
                                          className="p-1 px-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/50"
                                          title={tc("call")}
                                        >
                                          <Phone className="h-3.5 w-3.5" />
                                        </a>
                                        <a 
                                          href={`https://wa.me/${(record.phone || record.contact || "").replace(/\D/g, "")}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 px-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/50"
                                          title={tc("whatsapp")}
                                        >
                                          <MessageCircle className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordContact")}</Label>
                                  <p className="text-sm font-medium">{record.contact || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordRole")}</Label>
                                  <p className="text-sm font-medium">{record.role || "—"}</p>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-xs text-muted-foreground">{tClient("contactRecordNotes")}</Label>
                                  <p className="text-sm font-medium whitespace-pre-wrap">{(record as any).address || record.notes || "—"}</p>
                                </div>
                              </>
                            )}
                          </div>
                          {record.mediaUrl && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-sm font-medium mb-2">{tClient("contactRecordAttachment")}:</p>
                              {record.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <a href={record.mediaUrl} target="_blank" rel="noopener noreferrer" title="View attachment" className="block max-w-sm rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity">
                                  <Image
                                    src={record.mediaUrl}
                                    alt="Contact Attachment"
                                    width={400}
                                    height={300}
                                    className="object-cover w-full h-auto"
                                    unoptimized
                                  />
                                </a>
                              ) : (
                                <a
                                  href={record.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                                >
                                  <File className="w-4 h-4" />
                                  {tc("viewDocument")}
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">{t("noContactInfoProvided")}</p>
                  )}
                </div>

                {submission.formSnapshot.map((field) => {
                  const val = values.find(v => v.fieldDefinitionId === field.id);
                  const displayName = locale === "ar" ? field.nameAr || field.nameEn : field.nameEn;
                  
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-base font-semibold text-foreground/80">{displayName}</Label>
                      <div className="bg-muted/30 p-4 rounded-lg border">
                        {val?.mediaItems && val.mediaItems.length > 0 ? (
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                             {val.mediaItems.map((item, idx) => (
                               <div key={idx} className="relative group aspect-square rounded-md overflow-hidden bg-muted border">
                                 {field.inputType === "image" ? (
                                   <Image 
                                     src={item.url} 
                                     alt={`${displayName} ${idx + 1}`} 
                                     fill 
                                     className="object-cover transition-transform group-hover:scale-105" 
                                     sizes="(max-width: 768px) 150px, 160px"
                                   />
                                 ) : (
                                   <div className="flex flex-col items-center justify-center h-full p-2 text-center gap-2">
                                     <File className="h-8 w-8 text-primary/60" />
                                     <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate w-full px-1">
                                       {item.url.split("/").pop()}
                                     </a>
                                   </div>
                                 )}
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                   <a 
                                     href={item.url} 
                                     target="_blank" 
                                     rel="noreferrer" 
                                     title="Open media"
                                     aria-label="Open media"
                                     className="bg-white/20 p-2 rounded-full hover:bg-white/40"
                                   >
                                     <ExternalLink className="h-5 w-5 text-white" />
                                   </a>
                                   {field.inputType === "image" && (
                                     <a 
                                       href={`${item.url.replace("/upload/", "/upload/fl_attachment/")}`} 
                                       download
                                       title="Download media"
                                       aria-label="Download media"
                                       className="bg-white/20 p-2 rounded-full hover:bg-white/40"
                                     >
                                       <Download className="h-5 w-5 text-white" />
                                     </a>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                        ) : val?.mediaUrl ? (
                          field.inputType === "image" ? (
                            <div className="relative h-64 w-full sm:w-96 rounded-md overflow-hidden bg-muted group">
                              <Image 
                                src={val.mediaUrl} 
                                alt={displayName} 
                                fill 
                                className="object-contain" 
                                sizes="(max-width: 768px) 100vw, 384px"
                              />
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={val.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open media"
                                  aria-label="Open media"
                                  className="bg-black/60 p-2 rounded-full text-white hover:bg-black/80"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <a
                                  href={`${val.mediaUrl.replace("/upload/", "/upload/fl_attachment/")}`}
                                  download
                                  title="Download media"
                                  aria-label="Download media"
                                  className="bg-black/60 p-2 rounded-full text-white hover:bg-black/80"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                <File className="h-5 w-5 text-primary" />
                              </div>
                              <a 
                                href={val.mediaUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                {tc("download")}
                              </a>
                            </div>
                          )
                        ) : val?.value ? (
                          <p className="whitespace-pre-wrap">{val.value.toString()}</p>
                        ) : (
                          <p className="text-muted-foreground italic text-sm">{tc("noResults")}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{tc("actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col">
              {submission.status !== "viewed" && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange("viewed")}
                >
                  <Eye className="mr-2 h-4 w-4 text-emerald-500" />
                  {t("markViewed")}
                </Button>
              )}
              
              <div className="pt-4 border-t space-y-3">
                <Label>{t("rewriteComment")}</Label>
                <Textarea 
                  value={rewriteComment}
                  onChange={(e) => setRewriteComment(e.target.value)}
                  placeholder={t("rewriteCommentPlaceholder")}
                  className="min-h-25 resize-none"
                />
                <Button 
                  variant={submission.status === "needs_rewrite" ? "secondary" : "destructive"}
                  className="w-full"
                  disabled={isUpdating || !rewriteComment.trim() || submission.status === "needs_rewrite"}
                  onClick={() => handleStatusChange("needs_rewrite")}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t("markNeedsRewrite")}
                </Button>
                {!rewriteComment.trim() && submission.status !== "needs_rewrite" && (
                   <p className="text-xs text-muted-foreground text-center">{t("rewriteCommentRequired")}</p>
                )}
              </div>

              {submission.resubmissionRequest && (
                <div className="pt-4 border-t space-y-2">
                  <Label>{t("resubmissionRequestStatus")}</Label>
                  <p className="text-sm font-medium">{t(`requestStatuses.${submission.resubmissionRequest.status}`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("requestExpiresAt", { date: formatDate(submission.resubmissionRequest.expiresAt) })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
               <CardTitle className="text-lg">{t("auditTrail")}</CardTitle>
            </CardHeader>
            <CardContent>
               {submission.auditTrail.length === 0 ? (
                 <p className="text-sm text-muted-foreground italic">{tc("noResults")}</p>
               ) : (
                 <div className="space-y-4">
                   {submission.auditTrail.slice().reverse().map((entry, i) => {
                     let dotColor = "bg-primary";
                     if (entry.newStatus === "needs_rewrite") dotColor = "bg-destructive";
                     if (entry.newStatus === "viewed") dotColor = "bg-emerald-500";
                     if (entry.newStatus === "pending") dotColor = "bg-amber-500";
                     return (
                     <div key={i} className="text-sm relative pl-4 border-l-2 border-muted">
                        <div className={`absolute w-2 h-2 rounded-full ${dotColor} -left-1.25 top-1.5 ring-4 ring-background`} />
                        <p className="font-medium">
                          {t("auditEntry", { admin: entry.adminName, oldStatus: t(`statuses.${entry.oldStatus}`), newStatus: t(`statuses.${entry.newStatus}`) })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.timestamp)}</p>
                        {entry.comment && (
                          <div className="mt-1 p-2 bg-muted/50 rounded text-xs italic border-l-2 border-destructive/50">
                            &quot;{entry.comment}&quot;
                          </div>
                        )}
                     </div>
                   )})}
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
