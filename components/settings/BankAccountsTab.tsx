"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

type Account = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean | null;
};

export function BankAccountsTab({ onToast }: { onToast: (m: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    is_primary: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/settings/bank-accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addAccount(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/settings/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ bank_name: "", account_number: "", account_name: "", is_primary: false });
      onToast("Bank account added");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add account.");
    }
  }

  async function remove(account: Account) {
    if (!window.confirm(`Delete ${account.bank_name} • ${account.account_number}?`)) return;
    setBusyId(account.id);
    const res = await fetch(`/api/settings/bank-accounts/${account.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (res.ok) {
      onToast("Bank account deleted");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      onToast(data.error ?? "Could not delete account");
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Bank accounts</h2>
          <p className="text-sm text-ink2">
            These appear on your customer payment page.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-9 px-3">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Account
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Landmark className="h-6 w-6" />}
          title="No bank accounts yet"
          description="Add the account customers should pay into. The first one becomes your primary account."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-blue-border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{account.bank_name}</p>
                  {account.is_primary ? <Badge variant="green">Primary</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-sm text-ink2">
                  {account.account_number} · {account.account_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(account)}
                disabled={busyId === account.id}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Delete account"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add bank account"
      >
        <form onSubmit={addAccount} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Bank name</span>
            <Input
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Account number</span>
            <Input
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              inputMode="numeric"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Account name</span>
            <Input
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              required
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              className="h-4 w-4 rounded border-blue-border text-blue-primary"
            />
            <span className="text-sm font-semibold text-ink">Set as primary account</span>
          </label>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : null}
              Add account
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
