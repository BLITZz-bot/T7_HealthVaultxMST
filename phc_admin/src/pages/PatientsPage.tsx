import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Filter,
  Heart,
  Home,
  MapPin,
  Phone,
  Search,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { repository } from '@/backend';
import type { PatientMember, PatientVitals } from '@/backend/types';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Badge, Card, EmptyState, PageHeader, QueryView, StatCard } from '@/components/ui';
import { formatRelative } from '@/lib/format';

type ViewMode = 'family' | 'table';
type HealthFilter = 'all' | 'high_risk' | 'pregnant' | 'chronic' | 'with_vitals';
type SourceFilter = 'all' | 'scan' | 'manual' | 'cloud_sync';

export function PatientsPage() {
  const patientsQuery = useLiveQuery((phc) => repository.listPatients(phc), ['members', 'vitals', 'households']);

  // Filters & State
  const [q, setQ] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [ashaFilter, setAshaFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('family');
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
  const [selectedPatient, setSelectedPatient] = useState<PatientMember | null>(null);

  // Unique lists for dropdowns
  const { villages, ashaWorkers } = useMemo(() => {
    const list = patientsQuery.data ?? [];
    const vSet = new Set<string>();
    const aSet = new Set<string>();
    for (const p of list) {
      if (p.villageName) vSet.add(p.villageName);
      if (p.ashaName) aSet.add(p.ashaName);
    }
    return {
      villages: [...vSet].sort(),
      ashaWorkers: [...aSet].sort(),
    };
  }, [patientsQuery.data]);

  // Statistics
  const stats = useMemo(() => {
    const all = patientsQuery.data ?? [];
    const householdIds = new Set(all.map((p) => p.householdId));
    const highRisk = all.filter((p) => p.isHighRisk).length;
    const pregnant = all.filter((p) => p.isPregnant).length;
    const scanned = all.filter((p) => p.latestVitals?.entrySource === 'scan').length;
    const withVitals = all.filter((p) => p.latestVitals !== null).length;

    return {
      totalPatients: all.length,
      totalHouseholds: householdIds.size,
      highRisk,
      pregnant,
      scanned,
      withVitals,
    };
  }, [patientsQuery.data]);

  const toggleFamily = (householdId: string) => {
    setExpandedFamilies((prev) => ({
      ...prev,
      [householdId]: prev[householdId] === undefined ? false : !prev[householdId],
    }));
  };

  const needle = q.trim().toLowerCase();
  const control =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Clinical Records"
        subtitle="Comprehensive clinical database categorized by Family, City/Village, and Assigned ASHA Worker with Camera-OCR verification."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('family')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'family'
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="size-3.5" />
                Family Group View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="size-3.5" />
                All Patients Table
              </button>
            </div>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          icon={<Users className="size-5 text-brand-700" />}
          tone="brand"
          hint="Active registered citizens"
        />
        <StatCard
          label="Households / Families"
          value={stats.totalHouseholds}
          icon={<Home className="size-5 text-emerald-700" />}
          tone="green"
          hint="Field mapped units"
        />
        <StatCard
          label="High-Risk Patients"
          value={stats.highRisk}
          icon={<AlertTriangle className="size-5 text-red-700" />}
          tone="red"
          hint="Requires doctor review"
        />
        <StatCard
          label="Maternal Care"
          value={stats.pregnant}
          icon={<Heart className="size-5 text-orange-700" />}
          tone="orange"
          hint="Active ANC records"
        />
        <StatCard
          label="Handwritten Scans"
          value={stats.scanned}
          icon={<Camera className="size-5 text-purple-700" />}
          tone="neutral"
          hint="Camera OCR ingested vitals"
        />
      </div>

      {/* Comprehensive Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search patient, head, ABHA, house..."
                className={`${control} w-full pl-9`}
              />
            </div>

            {/* Village / City */}
            <select
              aria-label="Filter by City or Village"
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className={control}
            >
              <option value="">All Villages / Wards ({villages.length})</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  📍 {v}
                </option>
              ))}
            </select>

            {/* ASHA Worker */}
            <select
              aria-label="Filter by ASHA Worker"
              value={ashaFilter}
              onChange={(e) => setAshaFilter(e.target.value)}
              className={control}
            >
              <option value="">All ASHA Workers ({ashaWorkers.length})</option>
              {ashaWorkers.map((w) => (
                <option key={w} value={w}>
                  👩‍⚕️ {w}
                </option>
              ))}
            </select>

            {/* Clinical Filter */}
            <select
              aria-label="Filter by Health Condition"
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value as HealthFilter)}
              className={control}
            >
              <option value="all">Clinical Status: All</option>
              <option value="high_risk">⚠️ High Risk Cases</option>
              <option value="pregnant">🤰 Pregnant Mothers (ANC)</option>
              <option value="chronic">💊 Chronic Condition / NCD</option>
              <option value="with_vitals">📊 With Recorded Vitals</option>
            </select>

            {/* Data Source Filter */}
            <select
              aria-label="Filter by Entry Source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className={control}
            >
              <option value="all">Data Source: All</option>
              <option value="scan">📷 Camera OCR (Handwritten)</option>
              <option value="manual">✏️ Field Manual Entry</option>
              <option value="cloud_sync">☁️ Cloud Synchronized</option>
            </select>
          </div>

          {(q || villageFilter || ashaFilter || healthFilter !== 'all' || sourceFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setVillageFilter('');
                setAshaFilter('');
                setHealthFilter('all');
                setSourceFilter('all');
              }}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Main Content Area */}
      <QueryView
        query={patientsQuery}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No patient clinical records found." />}
      >
        {(allPatients) => {
          // Apply filters
          const filtered = allPatients.filter((p) => {
            if (villageFilter && p.villageName !== villageFilter) return false;
            if (ashaFilter && p.ashaName !== ashaFilter) return false;

            if (healthFilter === 'high_risk' && !p.isHighRisk) return false;
            if (healthFilter === 'pregnant' && !p.isPregnant) return false;
            if (healthFilter === 'chronic' && !p.hasChronic) return false;
            if (healthFilter === 'with_vitals' && !p.latestVitals) return false;

            if (sourceFilter === 'scan' && p.latestVitals?.entrySource !== 'scan') return false;
            if (sourceFilter === 'manual' && p.latestVitals?.entrySource !== 'manual') return false;
            if (sourceFilter === 'cloud_sync' && p.latestVitals?.entrySource !== 'cloud_sync') return false;

            if (needle) {
              const matchesName = p.fullName.toLowerCase().includes(needle);
              const matchesHead = p.headName.toLowerCase().includes(needle);
              const matchesAbha = p.abhaId?.toLowerCase().includes(needle) ?? false;
              const matchesHouse = p.houseNumber?.toLowerCase().includes(needle) ?? false;
              if (!matchesName && !matchesHead && !matchesAbha && !matchesHouse) return false;
            }

            return true;
          });

          if (filtered.length === 0) {
            return (
              <Card className="p-12 text-center">
                <Filter className="mx-auto size-8 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-800">No records match your filters</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Try clearing the search query or selecting a different village/ASHA filter.
                </p>
              </Card>
            );
          }

          // Group by Household for Family View
          if (viewMode === 'family') {
            const familyGroups: Record<
              string,
              {
                householdId: string;
                headName: string;
                houseNumber: string | null;
                villageName: string | null;
                ashaName: string | null;
                ashaPhone: string | null;
                updatedAt: string;
                members: PatientMember[];
              }
            > = {};

            for (const p of filtered) {
              if (!familyGroups[p.householdId]) {
                familyGroups[p.householdId] = {
                  householdId: p.householdId,
                  headName: p.headName,
                  houseNumber: p.houseNumber,
                  villageName: p.villageName,
                  ashaName: p.ashaName,
                  ashaPhone: p.ashaPhone,
                  updatedAt: p.updatedAt,
                  members: [],
                };
              }
              familyGroups[p.householdId].members.push(p);
            }

            const familiesList = Object.values(familyGroups);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p>
                    Showing <span className="font-semibold text-slate-800">{filtered.length}</span> patients across{' '}
                    <span className="font-semibold text-slate-800">{familiesList.length}</span> households
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = Object.keys(expandedFamilies).length > 0 &&
                        Object.values(expandedFamilies).every(Boolean);
                      const next: Record<string, boolean> = {};
                      for (const fam of familiesList) {
                        next[fam.householdId] = !allExpanded;
                      }
                      setExpandedFamilies(next);
                    }}
                    className="text-brand-700 hover:underline"
                  >
                    Toggle Collapse All
                  </button>
                </div>

                {familiesList.map((fam) => {
                  const isCollapsed = expandedFamilies[fam.householdId] === false;
                  const hasHighRiskInFamily = fam.members.some((m) => m.isHighRisk);
                  const hasPregnantInFamily = fam.members.some((m) => m.isPregnant);
                  const scannedCount = fam.members.filter((m) => m.latestVitals?.entrySource === 'scan').length;

                  return (
                    <Card
                      key={fam.householdId}
                      className={`overflow-hidden transition-all ${
                        hasHighRiskInFamily ? 'border-red-200 ring-1 ring-red-100' : ''
                      }`}
                    >
                      {/* Family Header Banner */}
                      <div
                        onClick={() => toggleFamily(fam.householdId)}
                        className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 transition-colors hover:bg-slate-100/80 sm:px-5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
                            <Home className="size-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold text-slate-900">{fam.headName}'s Family</h2>
                              {fam.houseNumber && (
                                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  #{fam.houseNumber}
                                </span>
                              )}
                              {hasHighRiskInFamily && (
                                <Badge tone="red">
                                  <AlertTriangle className="mr-1 size-3" />
                                  High Risk Alert
                                </Badge>
                              )}
                              {hasPregnantInFamily && (
                                <Badge tone="orange">
                                  <Heart className="mr-1 size-3" />
                                  ANC Care Active
                                </Badge>
                              )}
                              {scannedCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-200">
                                  <Camera className="mr-1 size-3" />
                                  {scannedCount} Scanned Record{scannedCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <MapPin className="size-3 text-slate-400" />
                                {fam.villageName ?? 'General Ward'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="size-3 text-brand-600" />
                                ASHA: <strong className="text-slate-800">{fam.ashaName ?? 'Unassigned'}</strong>
                                {fam.ashaPhone && (
                                  <a
                                    href={`tel:${fam.ashaPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="ml-1 inline-flex items-center text-brand-600 hover:underline"
                                  >
                                    <Phone className="size-2.5" />
                                  </a>
                                )}
                              </span>
                              <span>•</span>
                              <span>Updated {formatRelative(fam.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                            {fam.members.length} Member{fam.members.length > 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            aria-label="Toggle details"
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60"
                          >
                            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Members List Inside Household */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-100">
                          {fam.members.map((member) => (
                            <MemberCardRow
                              key={member.id}
                              member={member}
                              onSelect={() => setSelectedPatient(member)}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            );
          }

          // Flat Table View
          return (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[55rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Patient & Demographics</th>
                      <th className="px-4 py-3">Family & Household</th>
                      <th className="px-4 py-3">Jurisdiction (Village/City)</th>
                      <th className="px-4 py-3">Assigned ASHA Worker</th>
                      <th className="px-4 py-3">Clinical Condition</th>
                      <th className="px-4 py-3">Latest Vitals</th>
                      <th className="px-4 py-3">Entry Source</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((p) => {
                      const vitals = p.latestVitals;
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                          {/* Patient & Demographics */}
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{p.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {p.relationToHead ?? 'Member'} • {p.age ? `${p.age} yrs` : '—'} • {p.gender ?? '—'}
                            </p>
                            {p.abhaId && (
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">{p.abhaId}</p>
                            )}
                          </td>

                          {/* Family & Household */}
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{p.headName}</p>
                            <p className="text-xs text-slate-500">House #{p.houseNumber ?? '—'}</p>
                          </td>

                          {/* Village / City */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              <MapPin className="size-3 text-slate-400" />
                              {p.villageName ?? '—'}
                            </span>
                          </td>

                          {/* ASHA Worker */}
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{p.ashaName ?? '—'}</p>
                            {p.ashaPhone && (
                              <a href={`tel:${p.ashaPhone}`} className="text-xs text-brand-600 hover:underline">
                                {p.ashaPhone}
                              </a>
                            )}
                          </td>

                          {/* Clinical Condition */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {p.isHighRisk && <Badge tone="red">⚠️ High Risk</Badge>}
                              {p.isPregnant && <Badge tone="orange">🤰 Pregnant (ANC)</Badge>}
                              {p.hasChronic && (
                                <Badge tone="neutral">
                                  💊 {p.chronicNotes ? p.chronicNotes.split(';')[0] : 'Chronic Care'}
                                </Badge>
                              )}
                              {!p.isHighRisk && !p.isPregnant && !p.hasChronic && (
                                <span className="text-xs text-slate-400">Normal</span>
                              )}
                            </div>
                          </td>

                          {/* Latest Vitals */}
                          <td className="px-4 py-3">
                            {vitals ? (
                              <VitalsSummaryChip vitals={vitals} />
                            ) : (
                              <span className="text-xs text-slate-400 italic">No vitals logged</span>
                            )}
                          </td>

                          {/* Entry Source */}
                          <td className="px-4 py-3">
                            {vitals?.entrySource ? (
                              <EntrySourceBadge source={vitals.entrySource} />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Updated */}
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {formatRelative(vitals?.recordedAt ?? p.updatedAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPatient(p)}
                              className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors shadow-2xs"
                            >
                              <Clock className="size-3" />
                              History
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                Showing {filtered.length} of {allPatients.length} patients
              </div>
            </Card>
          );
        }}
      </QueryView>

      {/* Patient Health History Modal */}
      {selectedPatient && (
        <PatientHistoryModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Card Row Component (Family View)
// ─────────────────────────────────────────────────────────────────────────────
function MemberCardRow({
  member,
  onSelect,
}: {
  member: PatientMember;
  onSelect?: () => void;
}) {
  const vitals = member.latestVitals;

  return (
    <div className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-slate-50/60 lg:flex-row lg:items-center sm:px-5">
      {/* Left: Demographics & Identity */}
      <div className="min-w-64">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{member.fullName}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {member.relationToHead ?? 'Member'}
          </span>
          {member.gender && (
            <span className="text-xs text-slate-400">({member.gender.slice(0, 1).toUpperCase()})</span>
          )}
          {member.age && (
            <span className="text-xs text-slate-500 font-medium">{member.age} yrs</span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {member.abhaId && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
              ABHA: {member.abhaId}
            </span>
          )}
          {member.mobileNumber && (
            <span className="text-slate-400">📞 {member.mobileNumber}</span>
          )}
        </div>

        {/* Clinical Flags */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {member.isHighRisk && (
            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
              <AlertTriangle className="mr-1 size-3 text-red-600" />
              High Risk
            </span>
          )}
          {member.isPregnant && (
            <span className="inline-flex items-center rounded-md bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-800">
              <Heart className="mr-1 size-3 text-pink-600" />
              Pregnant (ANC)
            </span>
          )}
          {member.isLactating && (
            <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Lactating Mother
            </span>
          )}
          {member.hasChronic && (
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              💊 {member.chronicNotes ?? 'Chronic Care'}
            </span>
          )}
        </div>
      </div>

      {/* Right: Vitals Display & Source */}
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3 lg:justify-end">
        {vitals ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* BP */}
            {vitals.bpSystolic && vitals.bpDiastolic ? (
              <div
                className={`flex flex-col rounded-lg px-2.5 py-1 text-center ${
                  vitals.bpSystolic >= 140 || vitals.bpDiastolic >= 90
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : vitals.bpSystolic >= 120
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">BP</span>
                <span className="text-sm font-bold tabular-nums">
                  {vitals.bpSystolic}/{vitals.bpDiastolic}
                </span>
              </div>
            ) : null}

            {/* Pulse */}
            {vitals.pulseRate ? (
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-center shadow-2xs">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pulse</span>
                <span className="text-sm font-bold tabular-nums text-slate-800">{vitals.pulseRate} bpm</span>
              </div>
            ) : null}

            {/* SpO2 */}
            {vitals.spo2 ? (
              <div
                className={`flex flex-col rounded-lg px-2.5 py-1 text-center ${
                  vitals.spo2 < 94
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">SpO₂</span>
                <span className="text-sm font-bold tabular-nums">{vitals.spo2}%</span>
              </div>
            ) : null}

            {/* Temp */}
            {vitals.temperatureC ? (
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-center shadow-2xs">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Temp</span>
                <span className="text-sm font-bold tabular-nums text-slate-800">
                  {vitals.temperatureC.toFixed(1)}°C
                </span>
              </div>
            ) : null}

            {/* Blood Sugar */}
            {vitals.bloodSugarFasting || vitals.bloodSugarPostprandial ? (
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-center shadow-2xs">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Sugar</span>
                <span className="text-sm font-bold tabular-nums text-slate-800">
                  {vitals.bloodSugarFasting ?? '—'} / {vitals.bloodSugarPostprandial ?? '—'}
                </span>
              </div>
            ) : null}

            {/* Source & Timestamp */}
            <div className="flex flex-col items-end gap-1">
              <EntrySourceBadge source={vitals.entrySource ?? 'manual'} />
              <span className="text-[11px] text-slate-400">{formatRelative(vitals.recordedAt)}</span>
            </div>

            {/* View History Action */}
            {onSelect && (
              <button
                type="button"
                onClick={onSelect}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors shadow-2xs"
              >
                <Clock className="size-3.5 text-brand-600" />
                History
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FileText className="size-3.5" />
              <span>No clinical vitals logged yet</span>
            </div>
            {onSelect && (
              <button
                type="button"
                onClick={onSelect}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Clock className="size-3 text-slate-400" />
                History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Health History Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function PatientHistoryModal({
  patient,
  onClose,
}: {
  patient: PatientMember;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PatientVitals[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    repository
      .getPatientVitalsHistory(patient.id)
      .then((records) => {
        if (active) {
          setHistory(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load vitals history', err);
        if (active) {
          setHistory([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [patient.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">{patient.fullName}</h2>
              <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {patient.relationToHead ?? 'Member'}
              </span>
              {patient.gender && (
                <span className="text-xs text-slate-500">
                  {patient.gender} • {patient.age ? `${patient.age} yrs` : '—'}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              {patient.abhaId && (
                <span className="font-mono text-slate-600">ABHA: {patient.abhaId}</span>
              )}
              <span>📍 {patient.villageName ?? 'Unknown Village'}</span>
              <span>🏠 Family Head: {patient.headName}</span>
              {patient.ashaName && <span>👩‍⚕️ ASHA: {patient.ashaName}</span>}
            </div>

            {/* Clinical flags */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {patient.isHighRisk && (
                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                  <AlertTriangle className="mr-1 size-3 text-red-600" />
                  High Risk Patient
                </span>
              )}
              {patient.isPregnant && (
                <span className="inline-flex items-center rounded-md bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-800">
                  <Heart className="mr-1 size-3 text-pink-600" />
                  Pregnant Mother (ANC)
                </span>
              )}
              {patient.hasChronic && (
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  💊 {patient.chronicNotes ?? 'Chronic Care'}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body / Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-brand-700" />
              <h3 className="text-sm font-bold text-slate-800">Health Inputs & Vitals History</h3>
            </div>
            <span className="text-xs text-slate-500">
              {history ? `${history.length} visit record${history.length === 1 ? '' : 's'} found` : 'Loading...'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="size-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-700 mb-3" />
              <p className="text-xs">Fetching clinical records from Supabase...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <FileText className="mx-auto size-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Vitals History Yet</p>
              <p className="mt-1 text-xs text-slate-500">
                When an ASHA worker records vitals (via OCR Camera scan or manual typing) and syncs, the full timeline will appear here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:bottom-2 before:top-2 before:left-2 before:w-0.5 before:bg-slate-200">
              {history.map((record, idx) => {
                const isAbnormalBP =
                  (record.bpSystolic && record.bpSystolic >= 140) ||
                  (record.bpDiastolic && record.bpDiastolic >= 90);
                const isHypotensive =
                  (record.bpSystolic && record.bpSystolic < 90) ||
                  (record.bpDiastolic && record.bpDiastolic < 60);
                const isLowOxygen = record.spo2 !== null && record.spo2 < 95;

                return (
                  <div key={record.id ?? idx} className="relative">
                    {/* Timeline bullet */}
                    <div
                      className={`absolute -left-6 top-1.5 size-4 rounded-full border-2 bg-white ${
                        isAbnormalBP || isLowOxygen ? 'border-red-500' : 'border-brand-600'
                      }`}
                    />

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                      {/* Top row: timestamp & entry source */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800">
                            {new Date(record.recordedAt).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({formatRelative(record.recordedAt)})
                          </span>
                        </div>
                        <EntrySourceBadge source={record.entrySource ?? 'manual'} />
                      </div>

                      {/* Vitals grid */}
                      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {/* Blood Pressure */}
                        <div
                          className={`rounded-lg p-2 text-center ${
                            isAbnormalBP
                              ? 'bg-red-50 text-red-900 border border-red-200'
                              : isHypotensive
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-50 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Blood Pressure
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {record.bpSystolic && record.bpDiastolic
                              ? `${record.bpSystolic}/${record.bpDiastolic} mmHg`
                              : '—'}
                          </span>
                        </div>

                        {/* Pulse Rate */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Pulse
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-800">
                            {record.pulseRate ? `${record.pulseRate} bpm` : '—'}
                          </span>
                        </div>

                        {/* SpO2 */}
                        <div
                          className={`rounded-lg p-2 text-center ${
                            isLowOxygen
                              ? 'bg-red-50 text-red-900 border border-red-200'
                              : 'bg-slate-50 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            SpO₂
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {record.spo2 ? `${record.spo2}%` : '—'}
                          </span>
                        </div>

                        {/* Temperature */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Temp
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-800">
                            {record.temperatureC ? `${record.temperatureC.toFixed(1)}°C` : '—'}
                          </span>
                        </div>

                        {/* Respiratory Rate */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Respiration
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-800">
                            {record.respiratoryRate ? `${record.respiratoryRate}/min` : '—'}
                          </span>
                        </div>

                        {/* Fasting Sugar */}
                        <div
                          className={`rounded-lg p-2 text-center ${
                            record.bloodSugarFasting && record.bloodSugarFasting > 126
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-50 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Sugar (Fasting)
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {record.bloodSugarFasting ? `${record.bloodSugarFasting} mg/dL` : '—'}
                          </span>
                        </div>

                        {/* Postprandial Sugar */}
                        <div
                          className={`rounded-lg p-2 text-center ${
                            record.bloodSugarPostprandial && record.bloodSugarPostprandial > 200
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-50 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Sugar (PP)
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {record.bloodSugarPostprandial ? `${record.bloodSugarPostprandial} mg/dL` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Notes if any */}
                      {record.notes && (
                        <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-800">Clinical Notes: </span>
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vitals Summary Chip (for Table View)
// ─────────────────────────────────────────────────────────────────────────────
function VitalsSummaryChip({ vitals }: { vitals: NonNullable<PatientMember['latestVitals']> }) {
  const parts: string[] = [];
  if (vitals.bpSystolic && vitals.bpDiastolic) parts.push(`BP ${vitals.bpSystolic}/${vitals.bpDiastolic}`);
  if (vitals.pulseRate) parts.push(`Pulse ${vitals.pulseRate}`);
  if (vitals.spo2) parts.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.temperatureC) parts.push(`${vitals.temperatureC.toFixed(1)}°C`);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-slate-800">{parts.slice(0, 2).join(' • ')}</span>
      {parts.length > 2 && (
        <span className="text-xs text-slate-500">{parts.slice(2).join(' • ')}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Source Badge
// ─────────────────────────────────────────────────────────────────────────────
function EntrySourceBadge({ source }: { source: string }) {
  if (source === 'scan') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-200">
        <Camera className="size-3" />
        Scanned Sheet (OCR)
      </span>
    );
  }
  if (source === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 ring-1 ring-teal-200">
        <FileText className="size-3" />
        Field Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      <CheckCircle2 className="size-3 text-slate-400" />
      Cloud Synced
    </span>
  );
}
