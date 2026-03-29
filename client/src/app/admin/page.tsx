"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  const [regName, setRegName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regJurisdiction, setRegJurisdiction] = useState("BR");
  const [regType, setRegType] = useState("Investment Bank");
  const [registering, setRegistering] = useState(false);

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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-fideza-lavender" />
              <span className="text-sm font-medium">Register New Institution</span>
            </div>
            {!showRegForm && (
              <Button size="sm" variant="outline" onClick={() => setShowRegForm(true)}>
                <Plus className="size-3.5 mr-1" /> Add Institution
              </Button>
            )}
          </div>

          {showRegForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Institution Name</label>
                  <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Acme Capital Partners" disabled={registering} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Registration Number</label>
                  <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="CNPJ-00.000.000/0001-00" disabled={registering} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Jurisdiction</label>
                  <select value={regJurisdiction} onChange={(e) => setRegJurisdiction(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" disabled={registering}>
                    {["BR", "US", "UK", "EU", "SG"].map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Business Type</label>
                  <select value={regType} onChange={(e) => setRegType(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" disabled={registering}>
                    {["Investment Bank", "Asset Manager", "Insurance", "Pension Fund", "Corporate"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold"
                  disabled={registering || !regName}
                  onClick={async () => {
                    setRegistering(true);
                    const toastId = toast.loading("Registering institution on-chain...");
                    try {
                      const res = await fetch(`${AGENT_URL}/api/institution/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: regName, registrationNumber: regNumber, jurisdiction: regJurisdiction, businessType: regType, kybDocHash: `kyb-${regName.toLowerCase().replace(/\s/g, "-")}` }),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      toast.success("Institution registered (PENDING)", { id: toastId });
                      setShowRegForm(false);
                      setRegName(""); setRegNumber("");
                      await loadInstitutions();
                    } catch (e: any) {
                      toast.error(e.message?.slice(0, 100), { id: toastId });
                    } finally {
                      setRegistering(false);
                    }
                  }}
                >
                  {registering ? <><Loader2 className="size-3.5 animate-spin mr-1" /> Registering...</> : <><Building2 className="size-3.5 mr-1" /> Register</>}
                </Button>
                <Button variant="outline" onClick={() => setShowRegForm(false)} disabled={registering}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
