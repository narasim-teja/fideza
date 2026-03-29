"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RegisterWizard } from "@/components/admin/register-wizard";
import {
  Shield,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Ban,
  RefreshCw,
  Plus,
} from "lucide-react";

const AGENT_URL = "http://localhost:3001";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  VERIFIED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ENUM: Record<string, number> = {
  PENDING: 0, VERIFIED: 1, APPROVED: 2, SUSPENDED: 3,
};

interface Institution {
  address: string;
  name: string;
  jurisdiction: string;
  businessType: string;
  status: string;
  registeredAt: number;
}

export default function AdminPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);

  const loadInstitutions = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_URL}/api/admin/institutions`);
      if (res.ok) {
        const data = await res.json();
        setInstitutions(data.institutions ?? []);
      }
    } catch {
      // Agent might not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInstitutions(); }, [loadInstitutions]);

  async function handleStatusUpdate(address: string, status: number, label: string) {
    setActionLoading(address);
    const toastId = toast.loading(`Setting status to ${label}...`);
    try {
      const res = await fetch(`${AGENT_URL}/api/admin/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionAddress: address, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Institution ${label.toLowerCase()}`, { id: toastId });
      await loadInstitutions();
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100), { id: toastId });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage institutions, approve KYB, and monitor compliance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadInstitutions(); }}>
          <RefreshCw className="size-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <Building2 className="size-5 text-fideza-lavender mx-auto mb-2" />
            <p className="text-2xl font-bold">{institutions.length}</p>
            <span className="text-xs text-muted-foreground">Institutions</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <CheckCircle2 className="size-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{institutions.filter((i) => i.status === "APPROVED").length}</p>
            <span className="text-xs text-muted-foreground">Approved</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Loader2 className="size-5 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{institutions.filter((i) => i.status === "PENDING").length}</p>
            <span className="text-xs text-muted-foreground">Pending</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <XCircle className="size-5 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{institutions.filter((i) => i.status === "SUSPENDED").length}</p>
            <span className="text-xs text-muted-foreground">Suspended</span>
          </CardContent>
        </Card>
      </div>

      {/* Register New Institution */}
      {showRegForm ? (
        <RegisterWizard
          agentUrl={AGENT_URL}
          onComplete={() => { setShowRegForm(false); loadInstitutions(); }}
          onCancel={() => setShowRegForm(false)}
        />
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed border-fideza-lavender/30 text-fideza-lavender hover:bg-fideza-lavender/5"
          onClick={() => setShowRegForm(true)}
        >
          <Plus className="size-4 mr-2" /> Register New Institution
        </Button>
      )}

      {/* Institution Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Registered Institutions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading institutions...
            </div>
          ) : institutions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="size-8 mx-auto mb-2 opacity-40" />
              <p>No institutions registered yet</p>
              <p className="text-xs mt-1">Institutions can register via the Institution Portal</p>
            </div>
          ) : (
            <div className="space-y-3">
              {institutions.map((inst) => (
                <div key={inst.address} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{inst.name}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[inst.status] ?? ""}`}>{inst.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{inst.jurisdiction}</span>
                      <span>{inst.businessType}</span>
                      <span className="font-mono">{inst.address.slice(0, 10)}...{inst.address.slice(-6)}</span>
                      <span>{new Date(inst.registeredAt * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {inst.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        disabled={actionLoading === inst.address}
                        onClick={() => handleStatusUpdate(inst.address, STATUS_ENUM.APPROVED, "APPROVED")}
                      >
                        {actionLoading === inst.address ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5 mr-1" />}
                        Approve
                      </Button>
                    )}
                    {inst.status !== "SUSPENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        disabled={actionLoading === inst.address}
                        onClick={() => handleStatusUpdate(inst.address, STATUS_ENUM.SUSPENDED, "SUSPENDED")}
                      >
                        <Ban className="size-3.5 mr-1" /> Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
