import React, { useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { EmptyState } from '../common/UIStates';

export const LeaderboardView: React.FC = () => {
  const { candidates, users } = useData();
  const [activeTab, setActiveTab] = useState<'recruiters' | 'leaders' | 'units'>('recruiters');

  const acceptedCandidates = candidates.filter((c) =>
    ['Accepted Voice Note', 'Interview Scheduled', 'Interview Rescheduled', 'Accepted Interview', 'Start Training', 'Commission Done'].includes(c.status)
  );

  // 1. Recruiter Rankings
  const recruiterMap: Record<string, { id: string; name: string; photoUrl?: string; count: number; leaderName?: string }> = {};
  acceptedCandidates.forEach((c) => {
    const id = c.createdBy;
    if (!recruiterMap[id]) {
      const u = users.find((user) => user.id === id);
      recruiterMap[id] = {
        id,
        name: c.createdByName || u?.name || 'Recruiter',
        photoUrl: u?.photoUrl,
        leaderName: c.leaderName || u?.leaderName,
        count: 0
      };
    }
    recruiterMap[id].count++;
  });
  const topRecruiters = Object.values(recruiterMap).sort((a, b) => b.count - a.count);

  // 2. Leader Rankings
  const leaderMap: Record<string, { id: string; name: string; count: number; recruitersCount: Set<string> }> = {};
  acceptedCandidates.forEach((c) => {
    const lId = c.leaderId || 'direct-ceo';
    const lName = c.leaderName || 'Direct under CEO';
    if (!leaderMap[lId]) {
      leaderMap[lId] = { id: lId, name: lName, count: 0, recruitersCount: new Set() };
    }
    leaderMap[lId].count++;
    leaderMap[lId].recruitersCount.add(c.createdBy);
  });
  const topLeaders = Object.values(leaderMap).sort((a, b) => b.count - a.count);

  // 3. Unit Rankings
  const unitMap: Record<string, { id: string; name: string; count: number; teamsCount: Set<string> }> = {};
  acceptedCandidates.forEach((c) => {
    const uId = c.unitManagerId || 'direct-agency';
    const uName = c.unitManagerName || 'General Agency Unit';
    if (!unitMap[uId]) {
      unitMap[uId] = { id: uId, name: uName, count: 0, teamsCount: new Set() };
    }
    unitMap[uId].count++;
    if (c.leaderId) unitMap[uId].teamsCount.add(c.leaderId);
  });
  const topUnits = Object.values(unitMap).sort((a, b) => b.count - a.count);

  const first = topRecruiters[0];
  const second = topRecruiters[1];
  const third = topRecruiters[2];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Agency Performance Leaderboard &amp; Podium
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live competitive ranking based on total qualified candidates &amp; voice notes accepted for client accounts
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          {(['recruiters', 'leaders', 'units'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#D93A30] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Top {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Recruiters Tab */}
      {activeTab === 'recruiters' && (
        <div className="space-y-8">
          {/* Podium */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
              {/* Silver: Rank #2 */}
              <div className="order-2 md:order-1 flex flex-col items-center">
                {second ? (
                  <div className="w-full bg-white dark:bg-[#131826] border border-slate-300 dark:border-slate-600 rounded-2xl p-5 text-center space-y-3 shadow-xs hover:shadow-md transition-all">
                    <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center mx-auto tabular-nums">
                      #2
                    </span>
                    <div className="w-16 h-16 rounded-2xl mx-auto bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center text-2xl font-black text-white shadow-sm">
                      {(second.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" dir="auto" title={second.name}>
                        {second.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {second.leaderName || 'Direct under CEO'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0B0F19] rounded-xl py-2.5 px-3 border border-slate-200 dark:border-slate-800">
                      <span className="text-2xl font-black text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                        {second.count}
                      </span>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Accepted Notes</span>
                    </div>
                    <div className="h-14 bg-linear-to-t from-slate-200/70 dark:from-slate-500/20 to-transparent rounded-b-xl flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      Silver Medalist
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-full border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    Awaiting 2nd Place
                  </div>
                )}
              </div>

              {/* Gold: Rank #1 */}
              <div className="order-1 md:order-2 flex flex-col items-center md:-mt-6">
                {first ? (
                  <div className="w-full bg-linear-to-b from-amber-50 via-white to-white dark:from-amber-950/35 dark:via-[#131826] dark:to-[#131826] border-2 border-amber-400 rounded-2xl p-6 text-center space-y-3 relative shadow-lg shadow-amber-500/10">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
                      <Crown className="w-3.5 h-3.5 fill-slate-950" /> Top Performer
                    </div>
                    <span className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center mx-auto tabular-nums">
                      #1
                    </span>
                    <div className="w-20 h-20 rounded-2xl mx-auto bg-linear-to-br from-[#D93A30] to-amber-500 flex items-center justify-center text-3xl font-black text-white shadow-md border border-amber-300/60">
                      {(first.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate" dir="auto" title={first.name}>
                        {first.name}
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                        {first.leaderName || 'Redz Direct Team'}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl py-3 px-4 border border-amber-200 dark:border-amber-500/30">
                      <span className="text-3xl font-black text-amber-600 dark:text-amber-300 font-mono tabular-nums">
                        {first.count}
                      </span>
                      <span className="block text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider mt-0.5">
                        Qualified Voice Notes
                      </span>
                    </div>
                    <div className="h-20 bg-linear-to-t from-amber-200/60 dark:from-amber-500/20 to-transparent rounded-b-xl flex items-center justify-center text-xs font-black text-amber-700 dark:text-amber-300">
                      Champion Gold
                    </div>
                  </div>
                ) : (
                  <div className="h-60 w-full border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    Awaiting Champion
                  </div>
                )}
              </div>

              {/* Bronze: Rank #3 */}
              <div className="order-3 flex flex-col items-center">
                {third ? (
                  <div className="w-full bg-white dark:bg-[#131826] border border-orange-300 dark:border-amber-700/60 rounded-2xl p-5 text-center space-y-3 shadow-xs hover:shadow-md transition-all">
                    <span className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center mx-auto tabular-nums">
                      #3
                    </span>
                    <div className="w-16 h-16 rounded-2xl mx-auto bg-linear-to-br from-amber-700 to-amber-900 flex items-center justify-center text-2xl font-black text-amber-100 shadow-sm">
                      {(third.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" dir="auto" title={third.name}>
                        {third.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {third.leaderName || 'Direct under CEO'}
                      </p>
                    </div>
                    <div className="bg-orange-50/70 dark:bg-[#0B0F19] rounded-xl py-2.5 px-3 border border-orange-200/80 dark:border-slate-800">
                      <span className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                        {third.count}
                      </span>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Accepted Notes</span>
                    </div>
                    <div className="h-12 bg-linear-to-t from-orange-200/60 dark:from-amber-800/20 to-transparent rounded-b-xl flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400">
                      Bronze Medalist
                    </div>
                  </div>
                ) : (
                  <div className="h-44 w-full border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    Awaiting 3rd Place
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Recruiter Standings Table */}
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0F1420]">
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                Complete Recruiter Performance Directory
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {topRecruiters.length} Active Recruiters
              </span>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Recruiter</th>
                    <th className="py-3.5 px-4">Team Leader</th>
                    <th className="py-3.5 px-4 text-right">Qualified Voice Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topRecruiters.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState
                          icon={Trophy}
                          title="No Qualified Candidates Yet"
                          description="Rankings update live as voice notes are accepted for client interviews."
                        />
                      </td>
                    </tr>
                  ) : (
                    topRecruiters.map((rec, i) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {i + 1 <= 3 ? (
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold ${
                                i === 0
                                  ? 'bg-amber-400 text-slate-950'
                                  : i === 1
                                  ? 'bg-slate-300 text-slate-900'
                                  : 'bg-amber-700 text-white'
                              }`}
                            >
                              {i + 1}
                            </span>
                          ) : (
                            `#${i + 1}`
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white truncate max-w-[200px]" dir="auto" title={rec.name}>
                          {rec.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {rec.leaderName || 'Direct under CEO'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono tabular-nums">
                          {rec.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leaders Tab */}
      {activeTab === 'leaders' && (
        topLeaders.length === 0 ? (
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <EmptyState
              icon={Trophy}
              title="No Team Leader Data Yet"
              description="Leader standings appear as teams qualify candidates."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {topLeaders.map((lead, idx) => (
              <div
                key={lead.id}
                className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-xs font-black tabular-nums">
                    #{idx + 1}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {lead.recruitersCount.size} Active Recruiters
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{lead.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recruitment Team Leader</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                    {lead.count}
                  </div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold mt-1">
                    Team Accepted Candidates
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Units Tab */}
      {activeTab === 'units' && (
        topUnits.length === 0 ? (
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <EmptyState
              icon={Trophy}
              title="No Unit Manager Data Yet"
              description="Unit rankings populate once units qualify candidates."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {topUnits.map((unit, idx) => (
              <div
                key={unit.id}
                className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-xs font-black tabular-nums">
                    #{idx + 1}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {unit.teamsCount.size} Sub-Teams
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{unit.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Agency Unit Division</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                    {unit.count}
                  </div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold mt-1">
                    Unit Total Accepted Candidates
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
