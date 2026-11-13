import React from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { extractDataFromNationalId } from '../../lib/eligibilityChecker';

interface NationalIdBadgeProps {
  idNumber?: string;
  age?: number;
  showDetails?: boolean;
  companyTarget?: string;
}

export const NationalIdBadge: React.FC<NationalIdBadgeProps> = ({
  idNumber,
  age: directAge,
  showDetails = false
}) => {
  if (!idNumber || idNumber.trim().length !== 14) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
        <CreditCard className="w-3 h-3 text-slate-400" />
        No ID
      </span>
    );
  }

  const clean = idNumber.trim();
  const data = extractDataFromNationalId(clean);
  const resolvedAge = directAge ?? data.age;

  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/80';

  if (resolvedAge !== undefined) {
    if (resolvedAge < 18) {
      statusColor = 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/80';
    } else if (resolvedAge > 40) {
      statusColor = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800/80';
    }
  }

  const govCode = clean.substring(7, 9);
  const govMap: Record<string, string> = {
    '01': 'Cairo',
    '02': 'Alexandria',
    '03': 'Port Said',
    '04': 'Suez',
    '11': 'Damietta',
    '12': 'Dakahlia',
    '13': 'Sharkia',
    '14': 'Kalyoubia',
    '15': 'Kafr El-Sheikh',
    '16': 'Gharbia',
    '17': 'Menoufia',
    '18': 'Beheira',
    '19': 'Ismailia',
    '21': 'Giza',
    '22': 'Beni Suef',
    '23': 'Fayoum',
    '24': 'Minya',
    '25': 'Assiut',
    '26': 'Sohag',
    '27': 'Qena',
    '28': 'Aswan',
    '29': 'Luxor',
    '31': 'Red Sea',
    '32': 'New Valley',
    '33': 'Matrouh',
    '34': 'North Sinai',
    '35': 'South Sinai'
  };

  const govName = govMap[govCode] || 'Egypt';

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all tabular-nums ${statusColor}`}
        title={`National ID: ${clean} | Birthdate: ${data.birthDateStr || 'N/A'} | Gov: ${govName}`}
      >
        <ShieldCheck className="w-3 h-3 shrink-0" />
        <span>{resolvedAge !== undefined ? `${resolvedAge} yrs` : '14-digit ID'}</span>
        <span className="opacity-75 font-normal">({govName})</span>
      </span>

      {showDetails && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {clean.slice(0, 7)}****{clean.slice(-3)}
        </span>
      )}
    </div>
  );
};
