import {
  FileText, File, Clipboard, ClipboardList, ClipboardCheck,
  Users, User, UserCheck, Contact, IdCard,
  Building, Building2, Home, Landmark, Store,
  Heart, Star, Award, Trophy,
  Briefcase, Folder, FolderOpen, Archive,
  Mail, Phone, MessageSquare, Send,
  MapPin, Globe, Flag,
  DollarSign, CreditCard, Receipt,
  Calendar, Clock, Timer,
  BarChart, TrendingUp, PieChart,
  Settings, Wrench, Hammer,
  Shield, Lock, Key,
  Image, Camera, Video,
  Truck, Car, Plane,
  Leaf, Sun, Cloud,
  AlertCircle, Eye,
  type LucideIcon,
} from "lucide-react";

export const CARD_ICON_MAP: Record<string, LucideIcon> = {
  "file-text": FileText,
  "file": File,
  "clipboard": Clipboard,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  "users": Users,
  "user": User,
  "user-check": UserCheck,
  "contact": Contact,
  "id-card": IdCard,
  "building": Building,
  "building-2": Building2,
  "home": Home,
  "landmark": Landmark,
  "store": Store,
  "heart": Heart,
  "star": Star,
  "award": Award,
  "trophy": Trophy,
  "briefcase": Briefcase,
  "folder": Folder,
  "folder-open": FolderOpen,
  "archive": Archive,
  "mail": Mail,
  "phone": Phone,
  "message-square": MessageSquare,
  "send": Send,
  "map-pin": MapPin,
  "globe": Globe,
  "flag": Flag,
  "dollar-sign": DollarSign,
  "credit-card": CreditCard,
  "receipt": Receipt,
  "calendar": Calendar,
  "clock": Clock,
  "timer": Timer,
  "bar-chart": BarChart,
  "trending-up": TrendingUp,
  "pie-chart": PieChart,
  "settings": Settings,
  "wrench": Wrench,
  "hammer": Hammer,
  "shield": Shield,
  "lock": Lock,
  "key": Key,
  "image": Image,
  "camera": Camera,
  "video": Video,
  "truck": Truck,
  "car": Car,
  "plane": Plane,
  "leaf": Leaf,
  "sun": Sun,
  "cloud": Cloud,
  "alert-circle": AlertCircle,
  "eye": Eye,
};

/** Curated color class for each icon key */
export const CARD_ICON_COLORS: Record<string, string> = {
  "file-text":       "text-blue-500",
  "file":            "text-blue-400",
  "clipboard":       "text-indigo-500",
  "clipboard-list":  "text-indigo-400",
  "clipboard-check": "text-emerald-500",
  "users":           "text-violet-500",
  "user":            "text-violet-400",
  "user-check":      "text-green-500",
  "contact":         "text-cyan-500",
  "id-card":         "text-cyan-600",
  "building":        "text-slate-500",
  "building-2":      "text-slate-600",
  "home":            "text-orange-400",
  "landmark":        "text-stone-500",
  "store":           "text-amber-500",
  "heart":           "text-rose-500",
  "star":            "text-yellow-500",
  "award":           "text-yellow-600",
  "trophy":          "text-amber-600",
  "briefcase":       "text-sky-600",
  "folder":          "text-yellow-400",
  "folder-open":     "text-yellow-500",
  "archive":         "text-gray-500",
  "mail":            "text-blue-500",
  "phone":           "text-green-500",
  "message-square":  "text-teal-500",
  "send":            "text-sky-500",
  "map-pin":         "text-red-500",
  "globe":           "text-cyan-500",
  "flag":            "text-red-400",
  "dollar-sign":     "text-emerald-500",
  "credit-card":     "text-blue-600",
  "receipt":         "text-lime-600",
  "calendar":        "text-purple-500",
  "clock":           "text-amber-500",
  "timer":           "text-orange-500",
  "bar-chart":       "text-indigo-500",
  "trending-up":     "text-emerald-500",
  "pie-chart":       "text-violet-500",
  "settings":        "text-gray-500",
  "wrench":          "text-zinc-500",
  "hammer":          "text-orange-600",
  "shield":          "text-blue-600",
  "lock":            "text-red-500",
  "key":             "text-amber-500",
  "image":           "text-pink-500",
  "camera":          "text-pink-400",
  "video":           "text-fuchsia-500",
  "truck":           "text-sky-600",
  "car":             "text-blue-500",
  "plane":           "text-sky-500",
  "leaf":            "text-green-500",
  "sun":             "text-yellow-500",
  "cloud":           "text-sky-400",
  "alert-circle":    "text-destructive",
  "eye":             "text-emerald-500",
};

/** Background pill colors for icon badges */
export const CARD_ICON_BG_COLORS: Record<string, string> = {
  "file-text":       "bg-blue-100 dark:bg-blue-950",
  "file":            "bg-blue-100 dark:bg-blue-950",
  "clipboard":       "bg-indigo-100 dark:bg-indigo-950",
  "clipboard-list":  "bg-indigo-100 dark:bg-indigo-950",
  "clipboard-check": "bg-emerald-100 dark:bg-emerald-950",
  "users":           "bg-violet-100 dark:bg-violet-950",
  "user":            "bg-violet-100 dark:bg-violet-950",
  "user-check":      "bg-green-100 dark:bg-green-950",
  "contact":         "bg-cyan-100 dark:bg-cyan-950",
  "id-card":         "bg-cyan-100 dark:bg-cyan-950",
  "building":        "bg-slate-100 dark:bg-slate-900",
  "building-2":      "bg-slate-100 dark:bg-slate-900",
  "home":            "bg-orange-100 dark:bg-orange-950",
  "landmark":        "bg-stone-100 dark:bg-stone-900",
  "store":           "bg-amber-100 dark:bg-amber-950",
  "heart":           "bg-rose-100 dark:bg-rose-950",
  "star":            "bg-yellow-100 dark:bg-yellow-950",
  "award":           "bg-yellow-100 dark:bg-yellow-950",
  "trophy":          "bg-amber-100 dark:bg-amber-950",
  "briefcase":       "bg-sky-100 dark:bg-sky-950",
  "folder":          "bg-yellow-100 dark:bg-yellow-950",
  "folder-open":     "bg-yellow-100 dark:bg-yellow-950",
  "archive":         "bg-gray-100 dark:bg-gray-900",
  "mail":            "bg-blue-100 dark:bg-blue-950",
  "phone":           "bg-green-100 dark:bg-green-950",
  "message-square":  "bg-teal-100 dark:bg-teal-950",
  "send":            "bg-sky-100 dark:bg-sky-950",
  "map-pin":         "bg-red-100 dark:bg-red-950",
  "globe":           "bg-cyan-100 dark:bg-cyan-950",
  "flag":            "bg-red-100 dark:bg-red-950",
  "dollar-sign":     "bg-emerald-100 dark:bg-emerald-950",
  "credit-card":     "bg-blue-100 dark:bg-blue-950",
  "receipt":         "bg-lime-100 dark:bg-lime-950",
  "calendar":        "bg-purple-100 dark:bg-purple-950",
  "clock":           "bg-amber-100 dark:bg-amber-950",
  "timer":           "bg-orange-100 dark:bg-orange-950",
  "bar-chart":       "bg-indigo-100 dark:bg-indigo-950",
  "trending-up":     "bg-emerald-100 dark:bg-emerald-950",
  "pie-chart":       "bg-violet-100 dark:bg-violet-950",
  "settings":        "bg-gray-100 dark:bg-gray-900",
  "wrench":          "bg-zinc-100 dark:bg-zinc-900",
  "hammer":          "bg-orange-100 dark:bg-orange-950",
  "shield":          "bg-blue-100 dark:bg-blue-950",
  "lock":            "bg-red-100 dark:bg-red-950",
  "key":             "bg-amber-100 dark:bg-amber-950",
  "image":           "bg-pink-100 dark:bg-pink-950",
  "camera":          "bg-pink-100 dark:bg-pink-950",
  "video":           "bg-fuchsia-100 dark:bg-fuchsia-950",
  "truck":           "bg-sky-100 dark:bg-sky-950",
  "car":             "bg-blue-100 dark:bg-blue-950",
  "plane":           "bg-sky-100 dark:bg-sky-950",
  "leaf":            "bg-green-100 dark:bg-green-950",
  "sun":             "bg-yellow-100 dark:bg-yellow-950",
  "cloud":           "bg-sky-100 dark:bg-sky-950",
  "alert-circle":    "bg-red-100 dark:bg-red-950",
  "eye":             "bg-emerald-100 dark:bg-emerald-950",
};

export const CARD_ICON_KEYS = Object.keys(CARD_ICON_MAP);

export function getCardIcon(key: string | null | undefined): LucideIcon {
  if (!key) return FileText;
  return CARD_ICON_MAP[key] ?? FileText;
}

export function getCardIconColor(key: string | null | undefined, fallback = "text-muted-foreground"): string {
  if (!key) return fallback;
  return CARD_ICON_COLORS[key] ?? fallback;
}

export function getCardIconBg(key: string | null | undefined, fallback = "bg-muted"): string {
  if (!key) return fallback;
  return CARD_ICON_BG_COLORS[key] ?? fallback;
}

export function isKnownIcon(value: string | null | undefined): boolean {
  return !!value && value in CARD_ICON_MAP;
}

export function suggestIconLocally(nameEn: string, nameAr: string): string | null {
  const text = `${nameEn} ${nameAr}`.toLowerCase();
  
  const rules = [
    { keys: ["total", "all", "sum", "إجمالي", "مجموع", "كل"], icon: "file-text" },
    { keys: ["pending", "wait", "hold", "انتظار", "معلق"], icon: "clock" },
    { keys: ["draft", "temp", "underway", "edit", "typing", "write", "مسودة", "مسودات", "تعديل", "كتابة"], icon: "file" },
    { keys: ["view", "eye", "seen", "مشاهد", "رؤية", "تمت"], icon: "eye" },
    { keys: ["rewrite", "needs", "alert", "warn", "fix", "تعديل", "تنبيه", "تحتاج"], icon: "alert-circle" },
    { keys: ["user", "member", "customer", "people", "client", "مستخدم", "عميل", "أعضاء"], icon: "user" },
    { keys: ["team", "group", "users", "فريق", "مستخدمين"], icon: "users" },
    { keys: ["contact", "lead", "profile", "اتصال", "ملف"], icon: "contact" },
    { keys: ["mail", "email", "inbox", "بريد", "رسالة"], icon: "mail" },
    { keys: ["chat", "message", "feedback", "comment", "دردشة", "تعليق", "ملاحظة"], icon: "message-square" },
    { keys: ["money", "dollar", "payment", "revenue", "price", "finance", "مال", "دفع", "سعر", "إيرادات", "تمويل"], icon: "dollar-sign" },
    { keys: ["card", "payment", "credit", "بطاقة", "دفع", "ائتمان"], icon: "credit-card" },
    { keys: ["chart", "report", "graph", "stats", "analytics", "تقرير", "بيانات", "تحليل"], icon: "bar-chart" },
    { keys: ["trend", "grow", "نمو", "اتجاه"], icon: "trending-up" },
    { keys: ["clock", "time", "hour", "ساعة", "وقت"], icon: "clock" },
    { keys: ["date", "calendar", "schedule", "تقويم", "تاريخ", "جدول"], icon: "calendar" },
    { keys: ["lock", "secure", "safety", "قفل", "أمان"], icon: "lock" },
    { keys: ["key", "auth", "مفتاح", "صلاحية"], icon: "key" },
    { keys: ["settings", "config", "control", "إعدادات", "ضبط", "تحكم"], icon: "settings" },
    { keys: ["check", "success", "done", "approve", "confirm", "تم", "نجاح", "موافقة", "تأكيد"], icon: "clipboard-check" },
    { keys: ["file", "document", "sheet", "ملف", "مستند"], icon: "file" },
    { keys: ["image", "photo", "pic", "media", "صورة", "وسائط"], icon: "image" },
    { keys: ["video", "movie", "فيديو", "فيلم"], icon: "video" }
  ];

  for (const rule of rules) {
    if (rule.keys.some(k => text.includes(k))) {
      return rule.icon;
    }
  }

  return null;
}

