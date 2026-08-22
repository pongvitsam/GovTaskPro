/** Shared styling + helpers for dual-contract parties */

export const PARTY_OPTIONS = [
  { id: 'contractor', label: 'สัญญาผู้รับเหมา', shortLabel: 'ผู้รับเหมา' },
  { id: 'customer', label: 'สัญญาลูกค้า', shortLabel: 'ลูกค้า' },
  { id: 'project', label: 'ช่วงบริหารโครงการ', shortLabel: 'บริหารโครงการ' },
];

export const PARTY_THEMES = {
  contractor: {
    id: 'contractor',
    label: 'สัญญาผู้รับเหมา',
    shortLabel: 'ผู้รับเหมา',
    barFill: 'bg-gradient-to-r from-amber-400 to-orange-500',
    barEnded: 'bg-orange-600',
    barIdle: 'bg-slate-300',
    border: 'border-amber-200',
    cardBg: 'from-amber-50',
    text: 'text-amber-800',
    badge: 'bg-amber-500',
    badgeText: 'text-amber-700',
    badgeBg: 'bg-amber-50 border-amber-100',
    articleBorder: 'border-amber-300',
    articleBg: 'from-amber-50/90',
    dot: 'bg-amber-500',
    line: 'bg-amber-200',
    ring: 'ring-amber-200',
  },
  customer: {
    id: 'customer',
    label: 'สัญญาลูกค้า',
    shortLabel: 'ลูกค้า',
    barFill: 'bg-gradient-to-r from-violet-400 to-purple-600',
    barEnded: 'bg-purple-700',
    barIdle: 'bg-slate-300',
    border: 'border-violet-200',
    cardBg: 'from-violet-50',
    text: 'text-violet-800',
    badge: 'bg-violet-500',
    badgeText: 'text-violet-700',
    badgeBg: 'bg-violet-50 border-violet-100',
    articleBorder: 'border-violet-300',
    articleBg: 'from-violet-50/90',
    dot: 'bg-violet-500',
    line: 'bg-violet-200',
    ring: 'ring-violet-200',
  },
  project: {
    id: 'project',
    label: 'ช่วงบริหารโครงการ',
    shortLabel: 'บริหารโครงการ',
    barFill: 'bg-gradient-to-r from-teal-400 to-cyan-600',
    barEnded: 'bg-teal-700',
    barIdle: 'bg-slate-300',
    border: 'border-teal-200',
    cardBg: 'from-teal-50',
    text: 'text-teal-800',
    badge: 'bg-teal-500',
    badgeText: 'text-teal-700',
    badgeBg: 'bg-teal-50 border-teal-100',
    articleBorder: 'border-teal-300',
    articleBg: 'from-teal-50/90',
    dot: 'bg-teal-500',
    line: 'bg-teal-200',
    ring: 'ring-teal-200',
  },
};

export function normalizeContractParty(party) {
  const p = String(party || 'contractor').trim().toLowerCase();
  if (p === 'customer' || p === 'project' || p === 'contractor') return p;
  return 'contractor';
}

export function partyLabel(party) {
  return PARTY_OPTIONS.find((p) => p.id === normalizeContractParty(party))?.label || 'สัญญาผู้รับเหมา';
}

export function partyTheme(party) {
  return PARTY_THEMES[normalizeContractParty(party)] || PARTY_THEMES.contractor;
}

export function getPartyDateRange(project, party) {
  const p = normalizeContractParty(party);
  if (p === 'customer') {
    return { start: project?.customerStartDate, end: project?.customerEndDate };
  }
  if (p === 'contractor') {
    return { start: project?.contractorStartDate, end: project?.contractorEndDate };
  }
  return { start: project?.startDate, end: project?.endDate };
}

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(`${String(fromDate).slice(0, 10)}T12:00:00`);
  const to = new Date(`${String(toDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(0, Math.round((to - from) / 86400000));
}

/** Sum extension span days for one party only */
export function sumExtensionDaysForParty(extensions, party) {
  const id = normalizeContractParty(party);
  return (extensions || [])
    .filter((x) => normalizeContractParty(x.party) === id)
    .reduce((sum, x) => sum + daysBetween(x.fromDate, x.toDate), 0);
}

/** Count extensions for one party */
export function countExtensionsForParty(extensions, party) {
  const id = normalizeContractParty(party);
  return (extensions || []).filter((x) => normalizeContractParty(x.party) === id).length;
}

/** Original end date before any extension for this party */
export function getOriginalPartyEnd(project, party, extensions) {
  const id = normalizeContractParty(party);
  const sorted = (extensions || [])
    .filter((x) => normalizeContractParty(x.party) === id)
    .sort((a, b) => (Number(a.extensionNo) || 0) - (Number(b.extensionNo) || 0));
  if (sorted.length && sorted[0].fromDate) return sorted[0].fromDate;
  return getPartyDateRange(project, id).end || null;
}

export function getCurrentPartyEnd(project, party) {
  return getPartyDateRange(project, party).end || null;
}
