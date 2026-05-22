"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Database, 
  Trash2, 
  RefreshCcw, 
  ShieldAlert,
  Server,
  Activity,
  Search,
  ChevronRight,
  Edit2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { 
  getCacheStats, 
  clearCacheGroup, 
  listCacheKeys, 
  getCacheValue, 
  updateCacheValue, 
  deleteCacheKey 
} from "@/domain/use-cases/admin/manage-cache";

interface CacheStat {
  label: string;
  count: number;
  color: string;
}

export function CacheManager() {
  const t = useTranslations("cache");
  const [stats, setStats] = useState<{ available: boolean; totalKeys: number; segments: CacheStat[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState<string | null>(null);

  // Discovery / Explorer State
  const [searchPattern, setSearchPattern] = useState("*");
  const [keys, setKeys] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTtl, setEditTtl] = useState(300);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await getCacheStats();
      setStats(data);
    } catch (error) {
      toast.error(t("toasts.refreshFailed"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const result = await listCacheKeys(searchPattern);
      setKeys(result);
    } catch (error) {
      toast.error(t("toasts.searchFailed"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleInspectKey = async (key: string) => {
    try {
      const result = await getCacheValue(key);
      if (result) {
        setSelectedKey(key);
        setEditValue(typeof result.value === "string" ? result.value : JSON.stringify(result.value, null, 2));
        // If ttl is -1, it means persistent. Let's show 0 in the input to indicate forever as per user requirement.
        setEditTtl(result.ttl === -1 ? 0 : result.ttl);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      toast.error(t("toasts.fetchKeyFailed"));
    }
  };

  const handleSaveKey = async () => {
    if (!selectedKey) return;
    setIsUpdateLoading(true);
    try {
      let valueToSave = editValue;
      try {
        // Try parsing as JSON if it looks like an object/array
        if (editValue.trim().startsWith("{") || editValue.trim().startsWith("[")) {
          valueToSave = JSON.parse(editValue);
        }
      } catch {
        // Not JSON, save as string
      }

      await updateCacheValue(selectedKey, valueToSave, editTtl);
      toast.success(t("toasts.updateSuccess"));
      setIsViewModalOpen(false);
      handleSearch();
    } catch (error) {
      toast.error(t("toasts.updateFailed"));
    } finally {
      setIsUpdateLoading(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(t("toasts.deleteConfirm", { key }))) return;
    try {
      await deleteCacheKey(key);
      toast.success(t("toasts.deleteSuccess"));
      setKeys(prev => prev.filter(k => k !== key));
      fetchStats();
    } catch (error) {
      toast.error(t("toasts.deleteFailed"));
    }
  };

  useEffect(() => {
    fetchStats();
    handleSearch();
  }, []);

  const handleClear = async (type: "all" | "forms" | "submissions") => {
    if (!confirm(t("confirmClear"))) return;
    
    setIsClearing(type);
    try {
      const result = await clearCacheGroup(type);
      if (result.success) {
        toast.success(result.message);
        fetchStats();
        handleSearch();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("toasts.cleanupError"));
    } finally {
      setIsClearing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status")}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {stats?.available ? (
                <span className="text-emerald-500 font-medium">{t("connected")}</span>
              ) : (
                <span className="text-destructive font-medium">{t("disconnected")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalKeys")}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{stats?.totalKeys || 0}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {stats?.segments.map((seg, i) => (
              <div key={i} className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground truncate">{seg.label}</span>
                  <span className="font-medium">{seg.count}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500" 
                    style={{ 
                      width: `${(seg.count / (stats.totalKeys || 1)) * 100}%`,
                      backgroundColor: `var(--${seg.color}-500, #3b82f6)`
                    }} 
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                {t("quickOps")}
            </CardTitle>
            <CardDescription>
                {t("quickOpsDesc")}
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleClear("forms")}
                disabled={isClearing !== null || !stats?.available}
                >
                <RefreshCcw className={`me-2 h-4 w-4 ${isClearing === "forms" ? "animate-spin" : ""}`} />
                {t("clearForms")}
                </Button>
                
                <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleClear("submissions")}
                disabled={isClearing !== null || !stats?.available}
                >
                <RefreshCcw className={`me-2 h-4 w-4 ${isClearing === "submissions" ? "animate-spin" : ""}`} />
                {t("clearSubmissions")}
                </Button>

                <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => handleClear("all")}
                disabled={isClearing !== null || !stats?.available}
                >
                <Trash2 className={`me-2 h-4 w-4 ${isClearing === "all" ? "animate-spin" : ""}`} />
                {t("clearAll")}
                </Button>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            {t("keysExplorer")}
                        </CardTitle>
                        <CardDescription>
                            {t("explorerDesc")}
                        </CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                            setSelectedKey("new_key");
                            setEditValue("");
                            setEditTtl(0);
                            setIsViewModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4 me-1" /> {t("addKey")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder={t("searchDesc")} 
                        value={searchPattern}
                        onChange={(e) => setSearchPattern(e.target.value)}
                        className="bg-muted/30"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="border rounded-md divide-y overflow-hidden">
                    {keys.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground italic">
                            {t("noKeysFound")}
                        </div>
                    ) : (
                        <div className="max-h-[320px] overflow-y-auto">
                            {keys.map((key) => (
                                <div key={key} className="flex items-center justify-between p-3 hover:bg-muted/50 group transition-colors">
                                    <div className="flex flex-col min-w-0 pe-4">
                                        <code className="text-xs font-mono font-bold truncate text-primary">{key}</code>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleInspectKey(key)}
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteKey(key)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      {selectedKey === "new_key" || selectedKey?.includes("new_key") ? t("addKeyTitle") : t("editKeyTitle")}
                  </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label>{t("keyName")}</Label>
                      <Input 
                        value={selectedKey!} 
                        onChange={(e) => setSelectedKey(e.target.value)}
                        placeholder="e.g. key:name"
                        disabled={selectedKey !== "new_key" && !selectedKey?.includes("new_key")}
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("ttlSeconds")}</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                              type="number" 
                              value={editTtl} 
                              onChange={(e) => setEditTtl(parseInt(e.target.value) || 0)} 
                              className="flex-1"
                          />
                          {editTtl <= 0 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 shrink-0">{t("persistent")}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">{t("foreverDesc")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("type")}</Label>
                        <Badge variant="outline" className="h-10 w-full flex justify-center font-mono">JSON / String</Badge>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>{t("value")}</Label>
                      <Textarea 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[200px] font-mono text-xs"
                        placeholder='{"hello": "world"}'
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>{t("cancel")}</Button>
                  <Button onClick={handleSaveKey} disabled={isUpdateLoading}>
                      {isUpdateLoading ? <RefreshCcw className="h-4 w-4 animate-spin me-2" /> : <Plus className="h-4 w-4 me-2" />}
                      {t("save")}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
