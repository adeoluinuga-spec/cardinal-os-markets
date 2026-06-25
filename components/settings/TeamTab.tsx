"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";

type Member = {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean | null;
};

const ROLES = [
  { label: "Admin", value: "admin" },
  { label: "Sales Agent", value: "sales_agent" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Finance", value: "finance" },
  { label: "Rider", value: "rider" },
  { label: "Viewer", value: "viewer" },
];

export function TeamTab({ onToast }: { onToast: (m: string) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ full_name: "", email: "", role: "sales_agent" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  async function load() {
    const res = await fetch("/api/settings/team");
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeRole(member: Member, role: string) {
    setBusyId(member.id);
    const res = await fetch(`/api/settings/team/${member.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusyId(null);
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role } : m)),
      );
      onToast("Role updated");
    } else {
      const data = await res.json().catch(() => ({}));
      onToast(data.error ?? "Could not update role");
    }
  }

  async function toggleActive(member: Member) {
    setBusyId(member.id);
    const res = await fetch(`/api/settings/team/${member.id}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !member.is_active }),
    });
    setBusyId(null);
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, is_active: !member.is_active } : m,
        ),
      );
      onToast(member.is_active ? "Member deactivated" : "Member reactivated");
    } else {
      const data = await res.json().catch(() => ({}));
      onToast(data.error ?? "Could not update member");
    }
  }

  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    if (!invite.full_name.trim() || !invite.email.trim()) return;
    setInviting(true);
    setInviteError("");
    const res = await fetch("/api/settings/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invite),
    });
    setInviting(false);
    if (res.ok) {
      setInviteOpen(false);
      setInvite({ full_name: "", email: "", role: "sales_agent" });
      onToast("Invite sent");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setInviteError(data.message ?? data.error ?? "Could not send invite.");
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Team members</h2>
          <p className="text-sm text-ink2">Manage who has access and what they can do.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="h-9 px-3">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-blue-border text-xs uppercase text-ink2">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 pr-3 font-semibold">Phone</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isOwner = member.role === "owner";
                return (
                  <tr key={member.id} className="border-b border-blue-border/60">
                    <td className="py-3 pr-3 font-semibold text-ink">
                      {member.full_name}
                    </td>
                    <td className="py-3 pr-3">
                      {isOwner ? (
                        <Badge variant="gold">Owner</Badge>
                      ) : (
                        <Select
                          value={member.role}
                          disabled={busyId === member.id}
                          onChange={(e) => changeRole(member, e.target.value)}
                          className="h-9 w-40"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-ink2">{member.phone ?? "—"}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={member.is_active ? "green" : "red"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      {isOwner ? (
                        <span className="text-xs text-ink3">—</span>
                      ) : (
                        <Button
                          variant="ghost"
                          className="h-8 px-3 text-xs"
                          disabled={busyId === member.id}
                          onClick={() => toggleActive(member)}
                        >
                          {member.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a team member"
        description="They'll get an email with a temporary password."
      >
        <form onSubmit={sendInvite} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Full name</span>
            <Input
              value={invite.full_name}
              onChange={(e) => setInvite({ ...invite, full_name: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Email address</span>
            <Input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Role</span>
            <Select
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </label>
          {inviteError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {inviteError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Spinner className="h-4 w-4" /> : null}
              Send invite
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
