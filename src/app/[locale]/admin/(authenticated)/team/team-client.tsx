"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, UserPlus, Loader2, Pencil } from "lucide-react";
import {
  createTeamMember,
  deleteTeamMember,
  updateTeamMember,
  updateTeamMemberRole,
} from "@/domain/use-cases/admin/manage-team";
import { useTranslations } from "next-intl";
import EmailRegix from "@/components/validation/EmailRegix";
import PhoneRegix from "@/components/validation/PhoneRegix";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
  createdAt?: string;
};

export function TeamClient({
  initialMembers,
  currentUserId,
}: {
  initialMembers: TeamMember[];
  currentUserId: string;
}) {
  const t = useTranslations("team");
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user" as "admin" | "user",
    password: "",
  });
  const [editingMember, setEditingMember] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const router = useRouter();

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const result = await createTeamMember(newMember);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        setMembers([result.data, ...members]);
        setIsCreateOpen(false);
        setNewMember({ name: "", email: "", phone: "", role: "user", password: "" });
        toast.success(t("createSuccess"));
        router.refresh();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("createError")));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    setIsDeleting(id);
    try {
      const result = await deleteTeamMember(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setMembers(members.filter((m) => m.id !== id));
      toast.success(t("deleteSuccess"));
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("deleteError")));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRoleChange = async (id: string, newRole: "admin" | "user") => {
    try {
      const result = await updateTeamMemberRole(id, newRole);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setMembers(
        members.map((m) => (m.id === id ? { ...m, role: newRole } : m)),
      );
      toast.success(t("roleUpdateSuccess"));
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("roleUpdateError")));
      // Revert select visually by re-fetching or forcing state refresh, though simplified here.
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditingMember({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      password: "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMemberId) {
      toast.error(t("updateError"));
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateTeamMember(editingMemberId, editingMember);
      if (updated.error) {
        toast.error(updated.error);
        return;
      }
      if (updated.data) {
        setMembers(
          members.map((member) =>
            member.id === editingMemberId
              ? {
                  ...member,
                  name: updated.data.name,
                  email: updated.data.email,
                  phone: updated.data.phone,
                  role: updated.data.role,
                }
              : member,
          ),
        );
        setIsEditOpen(false);
        setEditingMemberId(null);
        setEditingMember({ name: "", email: "", phone: "", password: "" });
        toast.success(t("updateSuccess"));
        router.refresh();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("updateError")));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("addUser")}
              </Button>
            }
          />
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("addMember")}</DialogTitle>
                <DialogDescription>
                  {t("addMemberDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input
                    id="name"
                    required
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                  />
                  <EmailRegix email={newMember.email} showTypoSuggestions={true} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="text-left"
                    value={newMember.phone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                  />
                  <PhoneRegix 
                    number={newMember.phone} 
                    setNumber={(val) => setNewMember({ ...newMember, phone: val })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("passwordPlaceholder")}
                    value={newMember.password}
                    onChange={(e) =>
                      setNewMember({ ...newMember, password: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("role")}</Label>
                  <Select
                    onValueChange={(val) =>
                      setNewMember({
                        ...newMember,
                        role: (val as "admin" | "user") || "user",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("user")}</SelectItem>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingMemberId(null);
            setEditingMember({ name: "", email: "", phone: "", password: "" });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>{t("editMember")}</DialogTitle>
              <DialogDescription>
                {t("editMemberDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t("name")}</Label>
                <Input
                  id="edit-name"
                  required
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t("email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  required
                  value={editingMember.email}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      email: e.target.value,
                    })
                  }
                />
                <EmailRegix email={editingMember.email} showTypoSuggestions={true} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">{t("phone")}</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  dir="ltr"
                  className="text-left"
                  value={editingMember.phone}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      phone: e.target.value,
                    })
                  }
                />
                <PhoneRegix 
                  number={editingMember.phone} 
                  setNumber={(val) => setEditingMember({ ...editingMember, phone: val })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">{t("password")}</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder={t("passwordUpdatePlaceholder")}
                  value={editingMember.password}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      password: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3 md:hidden">
        {members.map((member) => (
          <div key={member.id} className="rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium wrap-break-word">{member.name}</p>
                <p className="text-sm text-muted-foreground break-all mt-1">
                  {member.email}
                </p>
                {member.phone && (
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                    {member.phone}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(member)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={
                    member.id === currentUserId || isDeleting === member.id
                  }
                  onClick={() => handleDelete(member.id)}
                >
                  {isDeleting === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <Label className="text-xs text-muted-foreground">{t("role")}</Label>
              <Select
                value={member.role}
                onValueChange={(val) =>
                  handleRoleChange(member.id, (val as "admin" | "user") || "user")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("user")}</SelectItem>
                  <SelectItem value="admin">{t("admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            {t("noMembers")}
          </div>
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium whitespace-normal wrap-break-word">
                  {member.name}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="break-all">{member.email}</div>
                  {member.phone && (
                    <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                      {member.phone}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={member.role}
                    onValueChange={(val) =>
                      handleRoleChange(
                        member.id,
                        (val as "admin" | "user") || "user",
                      )
                    }
                  >
                    <SelectTrigger className="w-28 lg:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("user")}</SelectItem>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="me-1"
                    onClick={() => openEditDialog(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={
                      member.id === currentUserId || isDeleting === member.id
                    }
                    onClick={() => handleDelete(member.id)}
                  >
                    {isDeleting === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center h-24 text-muted-foreground"
                >
                  {t("noMembers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
