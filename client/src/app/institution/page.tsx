"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2,
  FileCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
} from "lucide-react";

import { IssuanceResults } from "@/components/institution/issuance-results";

const AGENT_URL = "http://localhost:3001";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  VERIFIED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ISSUANCE_STAGES = [
  { key: "DEPLOY", label: "Deploy Contract", desc: "Deploying token on Privacy Node" },
  { key: "MINT", label: "Mint Tokens", desc: "Initializing metadata + minting supply" },
  { key: "RATE", label: "AI Rating", desc: "Running 6-stage compliance pipeline" },
  { key: "REGISTER", label: "Register Bond", desc: "Adding to BondPropertyRegistry" },
] as const;

interface IssuanceResult {
  tokenAddress: string;
  assetId: string;
  riskScore: number;
  riskTier: string;
  rating: string;
  recommendation: string;
  recommendationRationale: string;
  numChecks: number;
  deployTxHash: string;
  mintTxHash: string;
  attestationTxHash: string;
  checks: Array<{ checkId: string; checkName: string; result: string; severity: string; rationale: string; method: string }>;
  riskFactors: string[];
  disclosure: { disclosed: string[]; bucketed: string[]; withheld: string[] };
}

interface InstitutionInfo {
  address: string;
  name: string;
  jurisdiction: string;
  businessType: string;
  status: string;
  registeredAt: number;
}

export default function InstitutionPage() {
  // KYB state
  const [instName, setInstName] = useState("Fideza Capital Partners");
  const [regNumber, setRegNumber] = useState("CNPJ-33.000.167/0001-01");
  const [jurisdiction, setJurisdiction] = useState("BR");
  const [businessType, setBusinessType] = useState("Investment Bank");
  const [kybDoc, setKybDoc] = useState("kyb-doc-fideza-capital-2026");
  const [instStatus, setInstStatus] = useState<InstitutionInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Issue Asset state
  const [assetType, setAssetType] = useState<"bond" | "invoice" | "abs">("bond");
  const [bondName, setBondName] = useState("");
  const [issuerName, setIssuerName] = useState("Fideza Capital Partners");
  const [issuerSector, setIssuerSector] = useState("Energy");
  const [couponBps, setCouponBps] = useState(500);
  const [currency, setCurrency] = useState("USD");
  const [seniority, setSeniority] = useState("Senior Unsecured");
  const [collateral] = useState("None");
  const [totalSupply, setTotalSupply] = useState("10000");
  const [maturityDate, setMaturityDate] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [faceValue, setFaceValue] = useState("1000");
  const [paymentFrequency, setPaymentFrequency] = useState("Semi-Annual");
  const [minInvestment, setMinInvestment] = useState("10000");
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueStage, setIssueStage] = useState(-1);
  const [issueResult, setIssueResult] = useState<IssuanceResult | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Load institution status on mount
  useEffect(() => {
    fetch(`${AGENT_URL}/api/institution/status`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setInstStatus(data); })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  async function handleRegister() {
    const toastId = toast.loading("Registering institution...");
    try {
      const res = await fetch(`${AGENT_URL}/api/institution/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: instName, registrationNumber: regNumber, jurisdiction, businessType, kybDocHash: kybDoc }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Institution registered", { id: toastId });
      // Reload status
      const statusRes = await fetch(`${AGENT_URL}/api/institution/status`);
      if (statusRes.ok) setInstStatus(await statusRes.json());
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100), { id: toastId });
    }
  }

  async function handleIssue() {
    setIsIssuing(true);
    setIssueError(null);
    setIssueResult(null);
    setIssueStage(0);

    const metadata: Record<string, unknown> = {
      issuerName,
      issuerSector,
      issuerJurisdiction: jurisdiction,
      currency,
      seniority,
      collateralType: collateral,
    };

    if (assetType === "bond") {
      metadata.bondId = bondName || `BOND-${Date.now()}`;
      metadata.couponRateBps = couponBps;
      metadata.issuerCreditRating = "BBB";
    } else if (assetType === "invoice") {
      metadata.invoiceId = bondName || `INV-${Date.now()}`;
      metadata.debtorName = issuerName;
      metadata.debtorIndustry = issuerSector;
      metadata.debtorJurisdiction = jurisdiction;
      metadata.debtorCreditRating = "BBB";
      metadata.paymentTerms = "Net 90";
      metadata.recourseType = "Full Recourse";
      metadata.faceValue = totalSupply;
    } else {
      metadata.absId = bondName || `ABS-${Date.now()}`;
      metadata.poolType = "auto-loans";
      metadata.trancheName = "Senior A";
      metadata.trancheSeniority = "Senior";
      metadata.creditEnhancementBps = couponBps;
    }

    const stageTimer = setInterval(() => {
      setIssueStage((prev) => (prev < ISSUANCE_STAGES.length - 1 ? prev + 1 : prev));
    }, 4000);

    try {
      const res = await fetch(`${AGENT_URL}/api/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetType, metadata, totalSupply }),
      });
      clearInterval(stageTimer);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setIssueStage(ISSUANCE_STAGES.length - 1);
      setIssueResult(data);
    } catch (e: any) {
      clearInterval(stageTimer);
      setIssueError(e.message?.slice(0, 200) || "Failed to issue asset");
    } finally {
      setIsIssuing(false);
    }
  }

  const selectClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fideza-lavender/50";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Institution Portal</h1>
        <p className="text-sm text-muted-foreground">
          KYB registration, asset issuance, and AI-powered compliance rating
        </p>
      </div>

      <Tabs defaultValue="issue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kyb">KYB Status</TabsTrigger>
          <TabsTrigger value="issue">Issue Asset</TabsTrigger>
        </TabsList>

        {/* ---- KYB Tab ---- */}
        <TabsContent value="kyb" className="space-y-4">
          {/* Status Card */}
          {loadingStatus ? (
            <Card><CardContent className="pt-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading status...</CardContent></Card>
          ) : instStatus ? (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-fideza-lavender" />
                    <span className="font-semibold">{instStatus.name}</span>
                  </div>
                  <Badge className={STATUS_COLORS[instStatus.status] ?? ""}>{instStatus.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Jurisdiction:</span> {instStatus.jurisdiction}</div>
                  <div><span className="text-muted-foreground">Type:</span> {instStatus.businessType}</div>
                  <div><span className="text-muted-foreground">Address:</span> <span className="font-mono text-xs">{instStatus.address.slice(0, 14)}...</span></div>
                  <div><span className="text-muted-foreground">Registered:</span> {new Date(instStatus.registeredAt * 1000).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileCheck className="size-4 text-fideza-lavender" />
                  Register Institution (KYB)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Institution Name</label>
                    <Input value={instName} onChange={(e) => setInstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Registration Number</label>
                    <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Jurisdiction</label>
                    <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} className={selectClass}>
                      {["BR", "US", "UK", "EU", "SG"].map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Business Type</label>
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={selectClass}>
                      {["Investment Bank", "Asset Manager", "Insurance", "Pension Fund", "Corporate"].map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">KYB Document Hash</label>
                  <Input value={kybDoc} onChange={(e) => setKybDoc(e.target.value)} placeholder="kyb-doc-hash-or-identifier" />
                </div>
                <Button onClick={handleRegister} className="w-full bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold">
                  <Building2 className="size-4 mr-2" /> Register Institution
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Issue Asset Tab ---- */}
        <TabsContent value="issue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="size-4 text-fideza-lavender" />
                    Issue New Asset
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Asset Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          if (assetType === "bond") {
                            setBondName("BOND-2026-001");
                            setIssuerName("Fideza Capital Partners");
                            setIssuerSector("Energy");
                            setIssueDate("2026-04-01");
                            setMaturityDate("2031-04-01");
                            setCouponBps(525);
                            setPaymentFrequency("Semi-Annual");
                            setCurrency("USD");
                            setFaceValue("1000");
                            setTotalSupply("50000");
                            setMinInvestment("25000");
                          } else {
                            setAssetType("bond");
                          }
                        }}
                        disabled={isIssuing}
                        className={`py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                          assetType === "bond"
                            ? "border-fideza-lavender bg-fideza-lavender/10 text-fideza-lavender"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bond
                      </button>
                      {(["Invoice", "ABS"] as const).map((t) => (
                        <div
                          key={t}
                          className="relative py-2 px-3 rounded-md text-sm font-medium border border-border text-muted-foreground/40 text-center cursor-not-allowed"
                        >
                          {t}
                          <span className="absolute -top-2 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-fideza-lavender/15 text-fideza-lavender font-medium">
                            Soon
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Bond ID</label>
                    <Input value={bondName} onChange={(e) => setBondName(e.target.value)} placeholder="BOND-2026-001" disabled={isIssuing} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Issuer Name</label>
                      <Input value={issuerName} onChange={(e) => setIssuerName(e.target.value)} disabled={isIssuing} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Sector</label>
                      <select value={issuerSector} onChange={(e) => setIssuerSector(e.target.value)} className={selectClass} disabled={isIssuing}>
                        {["Energy", "Telecom", "Infrastructure", "Banking", "Mining", "Retail", "Agriculture", "Technology"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Issue Date</label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={isIssuing} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Maturity Date</label>
                      <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} disabled={isIssuing} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Coupon Rate (bps)</label>
                      <Input type="number" value={couponBps} onChange={(e) => setCouponBps(Number(e.target.value))} disabled={isIssuing} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Payment Frequency</label>
                      <select value={paymentFrequency} onChange={(e) => setPaymentFrequency(e.target.value)} className={selectClass} disabled={isIssuing}>
                        {["Monthly", "Quarterly", "Semi-Annual", "Annual"].map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Currency</label>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass} disabled={isIssuing}>
                        {["USD", "BRL", "EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Face Value (per unit)</label>
                      <Input type="number" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} disabled={isIssuing} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Total Supply</label>
                    <Input type="number" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} disabled={isIssuing} />
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Min. Investment</label>
                    <Input type="number" value={minInvestment} onChange={(e) => setMinInvestment(e.target.value)} disabled={isIssuing} />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleIssue}
                disabled={isIssuing || instStatus?.status !== "APPROVED"}
                className="w-full h-12 bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold text-base"
              >
                {isIssuing ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Issuing Bond...</>
                ) : instStatus?.status !== "APPROVED" ? (
                  "Institution Must Be Approved First"
                ) : (
                  <><Zap className="size-4 mr-2" /> Issue Bond</>
                )}
              </Button>
            </div>

            {/* Pipeline + Result */}
            <div className="lg:col-span-7 space-y-4">
              <Card className={isIssuing ? "border-fideza-lavender/30" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Shield className="size-4 text-fideza-lavender" />
                    <span className="text-sm font-medium">AI Issuance Pipeline</span>
                    {isIssuing && <Badge variant="outline" className="ml-auto text-xs text-fideza-lavender border-fideza-lavender/30">Running</Badge>}
                    {issueResult && <Badge className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Complete</Badge>}
                  </div>

                  <div className="space-y-1">
                    {ISSUANCE_STAGES.map((stage, i) => {
                      const isComplete = issueStage > i || (issueResult != null && !issueError);
                      const isActive = issueStage === i && isIssuing;
                      return (
                        <div key={stage.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-fideza-lavender/10" : isComplete ? "bg-emerald-500/5" : ""}`}>
                          <div className="shrink-0">
                            {isComplete ? <CheckCircle2 className="size-4 text-emerald-400" /> : isActive ? <Loader2 className="size-4 text-fideza-lavender animate-spin" /> : <div className="size-4 rounded-full border-[1.5px] border-border" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isComplete ? "text-emerald-400" : isActive ? "text-fideza-lavender" : "text-muted-foreground"}`}>{stage.label}</span>
                            {(isActive || isComplete) && <p className="text-[11px] text-muted-foreground truncate">{stage.desc}</p>}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{stage.key}</span>
                        </div>
                      );
                    })}
                  </div>

                  {issueError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <XCircle className="size-4 shrink-0" /><span>{issueError}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {issueResult && <IssuanceResults result={issueResult} />}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
