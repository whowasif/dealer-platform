import type {
  BeneficiaryRole,
  DistributionType,
  PayoutSchedule,
  ProjectStatus,
} from "@/lib/types";

// -----------------------------------------------------------------------------
// Presentational badges for the projects feature. Server components (no hooks).
// -----------------------------------------------------------------------------

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-indigo-50 text-indigo-700",
  profit_distributed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const ROLE_LABELS: Record<BeneficiaryRole, string> = {
  representative: "Representative",
  district_head: "District head",
  divisional_head: "Divisional head",
  hq: "HQ",
};

const ROLE_STYLES: Record<BeneficiaryRole, string> = {
  representative: "bg-brand-50 text-brand-700",
  district_head: "bg-teal-50 text-teal-700",
  divisional_head: "bg-purple-50 text-purple-700",
  hq: "bg-slate-100 text-slate-700",
};

export function RoleBadge({ role }: { role: BeneficiaryRole }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ROLE_STYLES[role] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

const DIST_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
};

export function DistributionStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        DIST_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export function DistributionTypeLabel({ type }: { type: DistributionType }) {
  return <>{type === "profit_share" ? "Profit share" : "Investment return"}</>;
}

export function ScheduleLabel({ schedule }: { schedule: PayoutSchedule }) {
  return <>{schedule === "monthly" ? "Monthly" : "Annual"}</>;
}
