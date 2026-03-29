"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  X,
  Check,
  Globe,
  Users,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react";

const STEPS = [
  { label: "Company Info", icon: Building2 },
  { label: "Key Personnel", icon: Users },
  { label: "Compliance", icon: Scale },
  { label: "Documents", icon: FileText },
  { label: "Review", icon: ShieldCheck },
] as const;

const JURISDICTIONS = ["BR", "US", "UK", "EU", "SG", "HK", "JP", "KR", "AE", "CH"] as const;
const BUSINESS_TYPES = ["Investment Bank", "Asset Manager", "Insurance", "Pension Fund", "Corporate", "Family Office", "Hedge Fund", "Broker-Dealer"] as const;
const AUM_RANGES = ["< $10M", "$10M - $100M", "$100M - $500M", "$500M - $1B", "$1B - $10B", "> $10B"] as const;

interface DocFile {
  name: string;
  size: string;
  type: string;
}

const REQUIRED_DOCS = [
  { key: "incorporation", label: "Certificate of Incorporation", desc: "Articles of incorporation or equivalent" },
  { key: "financials", label: "Audited Financial Statements", desc: "Most recent fiscal year" },
  { key: "tax", label: "Tax Registration", desc: "Tax ID or VAT registration certificate" },
  { key: "ownership", label: "Ownership Structure", desc: "UBO declaration and org chart" },
] as const;

const OPTIONAL_DOCS = [
  { key: "license", label: "Regulatory License", desc: "Operating license from relevant authority" },
  { key: "insurance", label: "Professional Insurance", desc: "E&O or professional liability coverage" },
] as const;

interface RegisterWizardProps {
  agentUrl: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function RegisterWizard({ agentUrl, onComplete, onCancel }: RegisterWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [jurisdiction, setJurisdiction] = useState("BR");
  const [businessType, setBusinessType] = useState("Investment Bank");
  const [website, setWebsite] = useState("");
  const [aum, setAum] = useState("< $10M");
  const [yearFounded, setYearFounded] = useState("");
  const [headquartersCity, setHeadquartersCity] = useState("");

  // Step 2: Key Personnel
  const [ceoName, setCeoName] = useState("");
  const [ceoEmail, setCeoEmail] = useState("");
  const [complianceOfficer, setComplianceOfficer] = useState("");
  const [complianceEmail, setComplianceEmail] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");

  // Step 3: Compliance
  const [regulatoryBody, setRegulatoryBody] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [lastAuditDate, setLastAuditDate] = useState("");
  const [amlFramework, setAmlFramework] = useState("");
  const [sanctionsScreening, setSanctionsScreening] = useState(false);
  const [pepScreening, setPepScreening] = useState(false);
  const [adverseMediaScreening, setAdverseMediaScreening] = useState(false);

  // Step 4: Documents
  const [docs, setDocs] = useState<Record<string, DocFile | null>>({});

  function simulateUpload(key: string) {
    const fakeNames: Record<string, string> = {
      incorporation: "cert_of_incorporation.pdf",
      financials: "audited_financials_2025.pdf",
      aml: "aml_kyc_policy_v3.pdf",
      ownership: "ubo_declaration.pdf",
      license: "regulatory_license.pdf",
      insurance: "pi_insurance_cert.pdf",
      tax: "tax_registration.pdf",
    };
    setDocs((prev) => ({
      ...prev,
      [key]: {
        name: fakeNames[key] ?? `${key}_document.pdf`,
        size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
        type: "PDF",
      },
    }));
  }

  function removeDoc(key: string) {
    setDocs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function fillDemoAndAdvance() {
    if (step === 0) {
      setCompanyName("Meridian Capital Partners");
      setRegNumber("CNPJ-12.345.678/0001-90");
      setJurisdiction("BR");
      setBusinessType("Asset Manager");
      setWebsite("https://meridiancap.com.br");
      setAum("$500M - $1B");
      setYearFounded("2016");
      setHeadquartersCity("Sao Paulo");
    } else if (step === 1) {
      setCeoName("Rafael Oliveira");
      setCeoEmail("rafael@meridiancap.com.br");
      setComplianceOfficer("Marina Santos");
      setComplianceEmail("marina.santos@meridiancap.com.br");
      setPrimaryContact("Carlos Mendes");
      setPrimaryPhone("+55 11 3456-7890");
    } else if (step === 2) {
      setRegulatoryBody("CVM");
      setLicenseNumber("CVM-2016-04821");
      setLastAuditDate("2025-11-20");
      setAmlFramework("FATF-based / COAF aligned");
      setSanctionsScreening(true);
      setPepScreening(true);
      setAdverseMediaScreening(true);
    } else if (step === 3) {
      for (const d of [...REQUIRED_DOCS, ...OPTIONAL_DOCS]) {
        simulateUpload(d.key);
      }
    }
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 150);
    }
  }

  const canProceed = (s: number) => {
    if (s === 0) return !!companyName && !!regNumber;
    if (s === 1) return !!ceoName && !!complianceOfficer;
    if (s === 2) return true;
    if (s === 3) return true;
    return true;
  };

  async function handleSubmit() {
    setSubmitting(true);
    const toastId = toast.loading("Registering institution on-chain...");
    try {
      const res = await fetch(`${agentUrl}/api/institution/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          registrationNumber: regNumber,
          jurisdiction,
          businessType,
          kybDocHash: `kyb-${companyName.toLowerCase().replace(/\s/g, "-")}`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Institution registered (PENDING)", { id: toastId });
      onComplete();
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${
                  isActive
                    ? "bg-fideza-lavender/15 text-fideza-lavender border border-fideza-lavender/30"
                    : isDone
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15"
                      : "bg-muted/30 text-muted-foreground border border-transparent"
                }`}
              >
                {isDone ? (
                  <Check className="size-3.5 shrink-0" />
                ) : (
                  <Icon className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Company Information</h3>
                  <p className="text-xs text-muted-foreground">Basic details about the institution</p>
                </div>
                <DemoFillButton onClick={fillDemoAndAdvance} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Institution Name *" value={companyName} onChange={setCompanyName} placeholder="Acme Capital Partners" />
                <Field label="Registration Number *" value={regNumber} onChange={setRegNumber} placeholder="CNPJ-00.000.000/0001-00" />
                <SelectField label="Jurisdiction *" value={jurisdiction} onChange={setJurisdiction} options={[...JURISDICTIONS]} />
                <SelectField label="Business Type *" value={businessType} onChange={setBusinessType} options={[...BUSINESS_TYPES]} />
                <Field label="Website" value={website} onChange={setWebsite} placeholder="https://acmecapital.com" icon={<Globe className="size-3.5" />} />
                <SelectField label="Assets" value={aum} onChange={setAum} options={[...AUM_RANGES]} />
                <Field label="Year Founded" value={yearFounded} onChange={setYearFounded} placeholder="2018" />
                <Field label="Headquarters City" value={headquartersCity} onChange={setHeadquartersCity} placeholder="Sao Paulo" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Key Personnel</h3>
                  <p className="text-xs text-muted-foreground">Primary contacts and officers</p>
                </div>
                <DemoFillButton onClick={fillDemoAndAdvance} />
              </div>
              <Separator />
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Chief Executive</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name *" value={ceoName} onChange={setCeoName} placeholder="John Smith" />
                    <Field label="Email" value={ceoEmail} onChange={setCeoEmail} placeholder="john@acmecapital.com" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Compliance Officer</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name *" value={complianceOfficer} onChange={setComplianceOfficer} placeholder="Jane Doe" />
                    <Field label="Email" value={complianceEmail} onChange={setComplianceEmail} placeholder="compliance@acmecapital.com" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Primary Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" value={primaryContact} onChange={setPrimaryContact} placeholder="Contact person" />
                    <Field label="Phone" value={primaryPhone} onChange={setPrimaryPhone} placeholder="+55 11 9999-0000" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Compliance & Regulatory</h3>
                  <p className="text-xs text-muted-foreground">Regulatory status and compliance framework</p>
                </div>
                <DemoFillButton onClick={fillDemoAndAdvance} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Regulatory Body" value={regulatoryBody} onChange={setRegulatoryBody} placeholder="CVM, SEC, FCA..." />
                <Field label="License Number" value={licenseNumber} onChange={setLicenseNumber} placeholder="LIC-2024-XXXX" />
                <Field label="Last Audit Date" value={lastAuditDate} onChange={setLastAuditDate} placeholder="2025-12-15" type="date" />
                <Field label="AML Framework" value={amlFramework} onChange={setAmlFramework} placeholder="FATF-based, BSA/AML..." />
              </div>

              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Screening Capabilities</p>
                <div className="grid grid-cols-3 gap-3">
                  <Toggle label="Sanctions Screening" checked={sanctionsScreening} onChange={setSanctionsScreening} />
                  <Toggle label="PEP Screening" checked={pepScreening} onChange={setPepScreening} />
                  <Toggle label="Adverse Media" checked={adverseMediaScreening} onChange={setAdverseMediaScreening} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Document Upload</h3>
                  <p className="text-xs text-muted-foreground">Upload required and optional supporting documents</p>
                </div>
                <DemoFillButton onClick={fillDemoAndAdvance} />
              </div>
              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Required Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  {REQUIRED_DOCS.map((d) => (
                    <DocSlot key={d.key} label={d.label} desc={d.desc} file={docs[d.key] ?? null} onUpload={() => simulateUpload(d.key)} onRemove={() => removeDoc(d.key)} />
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Optional Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  {OPTIONAL_DOCS.map((d) => (
                    <DocSlot key={d.key} label={d.label} desc={d.desc} file={docs[d.key] ?? null} onUpload={() => simulateUpload(d.key)} onRemove={() => removeDoc(d.key)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Review & Submit</h3>
                <p className="text-xs text-muted-foreground">Verify all information before submitting</p>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <ReviewSection title="Company Info" items={[
                  ["Institution", companyName],
                  ["Reg. Number", regNumber],
                  ["Jurisdiction", jurisdiction],
                  ["Business Type", businessType],
                  ["Website", website || "-"],
                  ["AUM", aum],
                  ["Founded", yearFounded || "-"],
                  ["HQ City", headquartersCity || "-"],
                ]} />
                <ReviewSection title="Key Personnel" items={[
                  ["CEO", ceoName],
                  ["CEO Email", ceoEmail || "-"],
                  ["Compliance Officer", complianceOfficer],
                  ["Compliance Email", complianceEmail || "-"],
                  ["Primary Contact", primaryContact || "-"],
                  ["Phone", primaryPhone || "-"],
                ]} />
                <ReviewSection title="Compliance" items={[
                  ["Regulatory Body", regulatoryBody || "-"],
                  ["License", licenseNumber || "-"],
                  ["Last Audit", lastAuditDate || "-"],
                  ["AML Framework", amlFramework || "-"],
                  ["Sanctions Screening", sanctionsScreening ? "Yes" : "No"],
                  ["PEP Screening", pepScreening ? "Yes" : "No"],
                  ["Adverse Media", adverseMediaScreening ? "Yes" : "No"],
                ]} />
                <ReviewSection title="Documents" items={[
                  ...REQUIRED_DOCS.map((d) => [d.label, docs[d.key] ? "Uploaded" : "Missing"] as [string, string]),
                  ...OPTIONAL_DOCS.map((d) => [d.label, docs[d.key] ? "Uploaded" : "-"] as [string, string]),
                ]} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(step - 1)} disabled={submitting}>
          {step === 0 ? "Cancel" : <><ChevronLeft className="size-3.5 mr-1" /> Back</>}
        </Button>

        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>

        {step < STEPS.length - 1 ? (
          <Button
            className="bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold"
            disabled={!canProceed(step)}
            onClick={() => setStep(step + 1)}
          >
            Next <ChevronRight className="size-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            className="bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <><Loader2 className="size-3.5 animate-spin mr-1" /> Registering...</>
            ) : (
              <><Building2 className="size-3.5 mr-1" /> Register Institution</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function Field({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={icon ? "pl-8" : ""}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium transition-all ${
        checked
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
      }`}
    >
      <div className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? "border-emerald-400 bg-emerald-400" : "border-muted-foreground/40"
      }`}>
        {checked && <Check className="size-2.5 text-black" />}
      </div>
      {label}
    </button>
  );
}

function DocSlot({ label, desc, file, onUpload, onRemove }: {
  label: string; desc: string; file: DocFile | null; onUpload: () => void; onRemove: () => void;
}) {
  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <FileText className="size-8 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{file.name}</p>
          <p className="text-[10px] text-muted-foreground">{file.size} - {file.type}</p>
        </div>
        <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onUpload}
      className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-fideza-lavender/40 hover:bg-fideza-lavender/5 transition-all text-center group"
    >
      <Upload className="size-5 text-muted-foreground group-hover:text-fideza-lavender transition-colors" />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">{desc}</span>
    </button>
  );
}

function DemoFillButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-fideza-lime/80 border border-fideza-lime/20 hover:bg-fideza-lime/10 hover:text-fideza-lime transition-all"
    >
      <Zap className="size-3" />
      Fill demo
    </button>
  );
}

function ReviewSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-medium text-fideza-lavender uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className={`font-medium ${v === "Missing" ? "text-yellow-400" : v === "Uploaded" ? "text-emerald-400" : ""}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
