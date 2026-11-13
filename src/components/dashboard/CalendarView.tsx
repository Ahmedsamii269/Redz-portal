import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  Loader2,
  X,
  CalendarPlus,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { safeParseDate } from '../../lib/dateUtils';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import {
  CalendarAuthError,
  CalendarEventPayload,
  GoogleCalendarEvent,
  GoogleCalendarListEntry,
  buildCandidateInterviewEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  listCalendars,
  updateCalendarEvent
} from '../../lib/googleCalendar';
import { Candidate } from '../../types';

interface EventFormState {
  mode: 'create' | 'edit';
  eventId?: string;
  summary: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

const getEventDateObj = (evt: GoogleCalendarEvent): Date | null => {
  if (evt.start.dateTime) return safeParseDate(evt.start.dateTime);
  if (evt.start.date) return safeParseDate(`${evt.start.date}T12:00:00`);
  return null;
};

const formatEventTimeLabel = (evt: GoogleCalendarEvent): string => {
  if (evt.start.date && !evt.start.dateTime) return 'All day';
  const start = safeParseDate(evt.start.dateTime);
  const end = safeParseDate(evt.end.dateTime);
  if (!start) return 'TBD';
  const startStr = format(start, 'HH:mm');
  const endStr = end ? format(end, 'HH:mm') : '';
  return endStr ? `${startStr} - ${endStr}` : startStr;
};

export const CalendarView: React.FC = () => {
  const { candidates } = useData();
  const { effectiveUser, activeRole, googleAccessToken, connectGoogleCalendar, clearGoogleAccessToken } = useAuth();
  const { showToast, confirmAction } = useToast();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Google Calendar live state
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState<EventFormState | null>(null);
  const [savingModal, setSavingModal] = useState<boolean>(false);

  const isManagement = activeRole === 'ceo' || activeRole === 'account_manager';

  const scopedCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (isManagement) return true;
      if (activeRole === 'unit_manager') return c.unitManagerId === effectiveUser.id || c.createdBy === effectiveUser.id;
      if (activeRole === 'leader') return c.leaderId === effectiveUser.id || c.createdBy === effectiveUser.id;
      return c.createdBy === effectiveUser.id;
    });
  }, [candidates, effectiveUser, activeRole, isManagement]);

  const interviews = useMemo(() => {
    return scopedCandidates.filter(
      (c) =>
        c.interviewDate &&
        ['Interview Scheduled', 'Interview Rescheduled', 'Accepted Interview', 'Rejected Interview'].includes(c.status)
    );
  }, [scopedCandidates]);

  const loadCalendarListAndEvents = useCallback(
    async (token: string, monthDate: Date, targetCalId: string) => {
      setLoadingEvents(true);
      try {
        let calList = calendars;
        if (calList.length === 0) {
          calList = await listCalendars(token);
          setCalendars(calList);
        }

        const primaryCal = calList.find((c) => c.primary)?.id || calList[0]?.id || 'primary';
        const effectiveCalId = targetCalId === 'primary' && primaryCal ? primaryCal : targetCalId;
        if (effectiveCalId !== targetCalId) {
          setSelectedCalendarId(effectiveCalId);
        }

        const monthStart = startOfWeek(startOfMonth(monthDate));
        const monthEnd = endOfWeek(endOfMonth(monthDate));
        monthEnd.setHours(23, 59, 59, 999);

        const items = await listCalendarEvents(
          token,
          effectiveCalId,
          monthStart.toISOString(),
          monthEnd.toISOString()
        );
        setGoogleEvents(items);
      } catch (err: any) {
        if (err instanceof CalendarAuthError) {
          clearGoogleAccessToken();
          setGoogleEvents([]);
          setCalendars([]);
          showToast('Google Calendar session expired. Please sign in with Google again.', 'warning');
        } else {
          showToast(err?.message || 'Failed to load Google Calendar events.', 'error');
        }
      } finally {
        setLoadingEvents(false);
      }
    },
    [calendars, clearGoogleAccessToken, showToast]
  );

  useEffect(() => {
    if (googleAccessToken) {
      loadCalendarListAndEvents(googleAccessToken, currentMonth, selectedCalendarId);
    } else {
      setGoogleEvents([]);
      setCalendars([]);
    }
  }, [googleAccessToken, currentMonth, selectedCalendarId]);

  const handleConnectGoogle = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await connectGoogleCalendar();
      showToast('Connected to Google Calendar.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to connect Google Calendar.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = () => {
    clearGoogleAccessToken();
    setGoogleEvents([]);
    setCalendars([]);
    showToast('Disconnected Google Calendar from this session.', 'info');
  };

  const selectedCalendarName = useMemo(() => {
    const found = calendars.find((c) => c.id === selectedCalendarId);
    return found?.summary || 'Primary Calendar';
  }, [calendars, selectedCalendarId]);

  const openCreateEventModal = (dateForModal: Date) => {
    setEventModal({
      mode: 'create',
      summary: '',
      date: format(dateForModal, 'yyyy-MM-dd'),
      allDay: false,
      startTime: '11:00',
      endTime: '12:00',
      location: '',
      description: ''
    });
  };

  const openEditEventModal = (evt: GoogleCalendarEvent) => {
    const isAllDay = Boolean(evt.start.date && !evt.start.dateTime);
    const startObj = getEventDateObj(evt) || selectedDay;
    const endObj = evt.end.dateTime ? safeParseDate(evt.end.dateTime) : null;

    setEventModal({
      mode: 'edit',
      eventId: evt.id,
      summary: evt.summary || '',
      date: evt.start.date || format(startObj, 'yyyy-MM-dd'),
      allDay: isAllDay,
      startTime: isAllDay ? '11:00' : format(startObj, 'HH:mm'),
      endTime: isAllDay || !endObj ? '12:00' : format(endObj, 'HH:mm'),
      location: evt.location || '',
      description: evt.description || ''
    });
  };

  const handleSaveEventModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventModal || savingModal || !googleAccessToken) return;
    const summaryTrimmed = eventModal.summary.trim();
    if (!summaryTrimmed) {
      showToast('Please enter an event title.', 'warning');
      return;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';
    let payload: CalendarEventPayload;

    if (eventModal.allDay) {
      const base = new Date(`${eventModal.date}T12:00:00`);
      const nextDay = new Date(base.getTime() + 24 * 60 * 60 * 1000);
      payload = {
        summary: summaryTrimmed,
        location: eventModal.location.trim() || undefined,
        description: eventModal.description.trim() || undefined,
        start: { date: eventModal.date },
        end: { date: format(nextDay, 'yyyy-MM-dd') }
      };
    } else {
      const startDt = new Date(`${eventModal.date}T${eventModal.startTime}:00`);
      const endDt = new Date(`${eventModal.date}T${eventModal.endTime}:00`);
      if (endDt <= startDt) {
        endDt.setTime(startDt.getTime() + 60 * 60 * 1000);
      }
      payload = {
        summary: summaryTrimmed,
        location: eventModal.location.trim() || undefined,
        description: eventModal.description.trim() || undefined,
        start: { dateTime: startDt.toISOString(), timeZone: tz },
        end: { dateTime: endDt.toISOString(), timeZone: tz }
      };
    }

    if (eventModal.mode === 'edit' && eventModal.eventId) {
      const confirmed = await confirmAction({
        title: 'Update Google Calendar Event?',
        message: `Update "${summaryTrimmed}" on ${eventModal.date} in calendar "${selectedCalendarName}"?`,
        confirmLabel: 'Update Event'
      });
      if (!confirmed) return;
    }

    setSavingModal(true);
    try {
      if (eventModal.mode === 'create') {
        await createCalendarEvent(googleAccessToken, selectedCalendarId, payload);
        showToast(`Event "${summaryTrimmed}" added to Google Calendar.`, 'success');
      } else if (eventModal.eventId) {
        await updateCalendarEvent(googleAccessToken, selectedCalendarId, eventModal.eventId, payload);
        showToast(`Event "${summaryTrimmed}" updated in Google Calendar.`, 'success');
      }
      setEventModal(null);
      await loadCalendarListAndEvents(googleAccessToken, currentMonth, selectedCalendarId);
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        clearGoogleAccessToken();
        setEventModal(null);
        showToast('Google Calendar authorization expired. Please sign in with Google again.', 'warning');
      } else {
        showToast(err?.message || 'Could not save Google Calendar event.', 'error');
      }
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteGoogleEvent = async (evt: GoogleCalendarEvent) => {
    if (!googleAccessToken || mutatingId) return;
    const eventLabel = evt.summary || 'Untitled Event';
    const timeLabel = formatEventTimeLabel(evt);
    const confirmed = await confirmAction({
      title: 'Delete Google Calendar Event?',
      message: `Permanently delete "${eventLabel}" (${timeLabel}) from "${selectedCalendarName}"? This cannot be undone.`,
      confirmLabel: 'Delete Event',
      dangerous: true
    });
    if (!confirmed) return;

    setMutatingId(evt.id);
    try {
      await deleteCalendarEvent(googleAccessToken, selectedCalendarId, evt.id);
      setGoogleEvents((prev) => prev.filter((item) => item.id !== evt.id));
      showToast(`Deleted "${eventLabel}" from Google Calendar.`, 'info');
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        clearGoogleAccessToken();
        showToast('Google Calendar authorization expired. Please sign in with Google again.', 'warning');
      } else {
        showToast(err?.message || 'Failed to delete event.', 'error');
      }
    } finally {
      setMutatingId(null);
    }
  };

  const handleSyncInterviewToGoogle = async (candidate: Candidate) => {
    if (mutatingId) return;
    let token = googleAccessToken;
    if (!token) {
      try {
        setConnecting(true);
        token = await connectGoogleCalendar();
      } catch (err: any) {
        showToast(err?.message || 'Google Calendar sign-in required to sync interview.', 'error');
        return;
      } finally {
        setConnecting(false);
      }
    }

    const confirmed = await confirmAction({
      title: 'Add Interview to Google Calendar?',
      message: `Create an event for ${candidate.fullName} (${candidate.company}) on ${candidate.interviewDate}${
        candidate.interviewTime ? ` (${candidate.interviewTime})` : ''
      } in "${selectedCalendarName}"?`,
      confirmLabel: 'Add to Calendar'
    });
    if (!confirmed) return;

    setMutatingId(candidate.id);
    try {
      const payload = buildCandidateInterviewEvent(candidate);
      await createCalendarEvent(token, selectedCalendarId, payload);
      showToast(`Interview for ${candidate.fullName} synced to Google Calendar.`, 'success');
      await loadCalendarListAndEvents(token, currentMonth, selectedCalendarId);
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        clearGoogleAccessToken();
        showToast('Google Calendar authorization expired. Please sign in with Google again.', 'warning');
      } else {
        showToast(err?.message || 'Failed to sync interview to Google Calendar.', 'error');
      }
    } finally {
      setMutatingId(null);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDayInterviews = useMemo(() => {
    return interviews.filter((c) => {
      const d = safeParseDate(c.interviewDate);
      return d ? isSameDay(d, selectedDay) : false;
    });
  }, [interviews, selectedDay]);

  const selectedDayGoogleEvents = useMemo(() => {
    return googleEvents.filter((evt) => {
      const d = getEventDateObj(evt);
      return d ? isSameDay(d, selectedDay) : false;
    });
  }, [googleEvents, selectedDay]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      rows.push(monthDays.slice(i, i + 7));
    }
    return rows;
  }, [monthDays]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Google Calendar Connection & Controls Bar */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/70 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Google Calendar Integration
              </h2>
              {googleAccessToken ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {googleAccessToken
                ? 'View, create, edit, or delete Google Calendar events and sync scheduled candidate interviews.'
                : 'Sign in with Google to view your Google Calendar events alongside Redz candidate interviews.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!googleAccessToken ? (
            <GoogleSignInButton
              onClick={handleConnectGoogle}
              loading={connecting}
              label="Sign in with Google"
            />
          ) : (
            <>
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full sm:w-52 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#D93A30]"
                aria-label="Select Google Calendar"
              >
                {calendars.length > 0 ? (
                  calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.primary ? `${cal.summary} (Primary)` : cal.summary}
                    </option>
                  ))
                ) : (
                  <option value="primary">Primary Calendar</option>
                )}
              </select>

              <button
                type="button"
                onClick={() => openCreateEventModal(selectedDay)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D93A30] hover:bg-[#b82e25] text-white flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> New Event
              </button>

              <button
                type="button"
                disabled={loadingEvents}
                onClick={() => loadCalendarListAndEvents(googleAccessToken, currentMonth, selectedCalendarId)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Refresh Google Calendar events"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                title="Disconnect Google Calendar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Responsive Split: Calendar Grid (8 cols) + Selected Day Agenda (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Month Calendar */}
        <div className="lg:col-span-8 min-w-0 space-y-4">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Calendar Month Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">
                  Interviews &amp; Google Calendar Events
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(today);
                    setSelectedDay(today);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-[#D93A30]/15 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-[#D93A30]/30 text-xs font-bold hover:bg-[#D93A30] hover:text-white transition-all cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop & Tablet Month Grid */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-[#0F1420] border-b border-slate-200 dark:border-slate-800">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {weeks.map((week, i) => (
                  <div key={i} className="grid grid-cols-7 border-b border-slate-200/70 dark:border-slate-800 last:border-b-0 min-h-[110px]">
                    {week.map((day, j) => {
                      const dayInterviews = interviews.filter((c) => {
                        const d = safeParseDate(c.interviewDate);
                        return d ? isSameDay(d, day) : false;
                      });
                      const dayGoogle = googleEvents.filter((evt) => {
                        const d = getEventDateObj(evt);
                        return d ? isSameDay(d, day) : false;
                      });
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isTodayDay = isToday(day);
                      const isSelected = isSameDay(day, selectedDay);

                      return (
                        <div
                          key={j}
                          onClick={() => setSelectedDay(day)}
                          className={`p-2 border-r border-slate-200/70 dark:border-slate-800 last:border-r-0 flex flex-col gap-1 transition-colors cursor-pointer ${
                            !isCurrentMonth
                              ? 'bg-slate-50/70 dark:bg-[#0B0F19]/60'
                              : 'hover:bg-slate-50/70 dark:hover:bg-[#1B2234]/40'
                          } ${isSelected ? 'ring-2 ring-inset ring-[#D93A30]/70 bg-red-50/30 dark:bg-red-950/15' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span
                              className={`text-xs font-mono font-bold tabular-nums ${
                                isTodayDay
                                  ? 'px-1.5 py-0.5 rounded-md bg-[#D93A30] text-white'
                                  : isCurrentMonth
                                  ? 'text-slate-700 dark:text-slate-300'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {dayInterviews.length + dayGoogle.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold tabular-nums">
                                {dayInterviews.length + dayGoogle.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 overflow-y-auto max-h-[78px] scrollbar-none">
                            {dayInterviews.map((c) => (
                              <div
                                key={`redz-${c.id}`}
                                className="px-1.5 py-1 rounded-md bg-red-50/80 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 text-[10px] truncate font-semibold text-slate-900 dark:text-slate-100"
                                title={`Redz Interview: ${c.fullName} (${c.company})`}
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D93A30] mr-1 align-middle" />
                                <span dir="auto">{(c.fullName || 'Candidate').split(' ')[0]}</span>
                              </div>
                            ))}

                            {dayGoogle.map((evt) => (
                              <div
                                key={`gcal-${evt.id}`}
                                className="px-1.5 py-1 rounded-md bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 text-[10px] truncate font-semibold text-sky-900 dark:text-sky-200"
                                title={`Google Calendar: ${evt.summary || 'Event'}`}
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-1 align-middle" />
                                <span>{evt.summary || 'Untitled'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile (<768px) Compact Day Picker Strip */}
            <div className="md:hidden p-4 space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <div key={idx}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, idx) => {
                  const hasInterview = interviews.some((c) => {
                    const d = safeParseDate(c.interviewDate);
                    return d ? isSameDay(d, day) : false;
                  });
                  const hasGoogle = googleEvents.some((evt) => {
                    const d = getEventDateObj(evt);
                    return d ? isSameDay(d, day) : false;
                  });
                  const isCur = isSameMonth(day, currentMonth);
                  const isSel = isSameDay(day, selectedDay);
                  const isTod = isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#D93A30] text-white shadow-xs'
                          : isTod
                          ? 'bg-red-50 dark:bg-red-950/50 text-[#D93A30] border border-red-200 dark:border-red-800'
                          : isCur
                          ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      <span>{format(day, 'd')}</span>
                      <div className="flex items-center gap-0.5 h-1.5">
                        {hasInterview && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-[#D93A30]'}`} />
                        )}
                        {hasGoogle && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-sky-200' : 'bg-sky-500'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Interviews Today</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  {
                    interviews.filter((c) => {
                      const d = safeParseDate(c.interviewDate);
                      return d ? isSameDay(d, new Date()) : false;
                    }).length
                  }
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  {googleAccessToken ? 'Google Events (Month)' : 'Interviews (Month)'}
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  {googleAccessToken
                    ? googleEvents.length
                    : interviews.filter((c) => {
                        const d = safeParseDate(c.interviewDate);
                        return d ? isSameMonth(d, currentMonth) : false;
                      }).length}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Interview Pass Rate</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  {interviews.length > 0
                    ? Math.round((interviews.filter((c) => c.status === 'Accepted Interview').length / interviews.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Day Agenda & Google Calendar Event Manager */}
        <div className="lg:col-span-4 min-w-0">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {format(selectedDay, 'EEEE, MMM d, yyyy')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDayInterviews.length} Redz interview(s) • {selectedDayGoogleEvents.length} Google event(s)
                </p>
              </div>
              {googleAccessToken && (
                <button
                  type="button"
                  onClick={() => openCreateEventModal(selectedDay)}
                  className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-red-800/70 hover:bg-[#D93A30] hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Add Google Calendar Event on this day"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Section 1: Redz Candidate Interviews */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D93A30]" />
                Redz Candidate Interviews ({selectedDayInterviews.length})
              </div>

              {selectedDayInterviews.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200/80 dark:border-slate-700/70 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div dir="auto" className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {c.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {c.company} ({c.language || 'English'})
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                      {c.interviewTime || 'TBD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {c.phone}
                    </span>
                    <button
                      type="button"
                      disabled={mutatingId === c.id || connecting}
                      onClick={() => handleSyncInterviewToGoogle(c)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70 hover:bg-sky-600 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {mutatingId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CalendarPlus className="w-3 h-3" />
                      )}
                      <span>Sync to Google</span>
                    </button>
                  </div>
                </div>
              ))}

              {selectedDayInterviews.length === 0 && (
                <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-[#1B2234]/40 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                  No Redz candidate interviews scheduled on this day.
                </div>
              )}
            </div>

            {/* Section 2: Google Calendar Events */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Google Calendar Events ({selectedDayGoogleEvents.length})
                </span>
                {loadingEvents && <Loader2 className="w-3 h-3 animate-spin text-sky-500" />}
              </div>

              {!googleAccessToken ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 text-center space-y-3">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Connect Google Calendar to view, edit, and create calendar events directly inside Redz.
                  </p>
                  <GoogleSignInButton
                    onClick={handleConnectGoogle}
                    loading={connecting}
                    label="Sign in with Google"
                    className="w-full"
                  />
                </div>
              ) : (
                <>
                  {selectedDayGoogleEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl bg-sky-50/50 dark:bg-[#1B2234] border border-sky-200/80 dark:border-sky-800/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div dir="auto" className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {evt.summary || 'Untitled Event'}
                          </div>
                          <div className="text-[11px] text-sky-700 dark:text-sky-300 font-mono tabular-nums mt-0.5">
                            {formatEventTimeLabel(evt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {evt.htmlLink && (
                            <a
                              href={evt.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                              title="Open in Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditEventModal(evt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Google Calendar event"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={mutatingId === evt.id}
                            onClick={() => handleDeleteGoogleEvent(evt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Google Calendar event"
                          >
                            {mutatingId === evt.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {evt.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <MapPin className="w-3 h-3 shrink-0 text-amber-500" />
                          <span dir="auto" className="truncate">{evt.location}</span>
                        </div>
                      )}

                      {evt.description && (
                        <p dir="auto" className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 whitespace-pre-line">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  ))}

                  {selectedDayGoogleEvents.length === 0 && !loadingEvents && (
                    <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-[#1B2234]/40 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                      No Google Calendar events on this day.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Google Calendar Event Modal */}
      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {eventModal.mode === 'create' ? 'New Google Calendar Event' : 'Edit Google Calendar Event'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calendar: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCalendarName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEventModal} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Event Title</label>
                <input
                  type="text"
                  required
                  dir="auto"
                  value={eventModal.summary}
                  onChange={(e) => setEventModal({ ...eventModal, summary: e.target.value })}
                  placeholder="e.g. Client Interview Batch — Teleperformance"
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={eventModal.date}
                    onChange={(e) => setEventModal({ ...eventModal, date: e.target.value })}
                    className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#D93A30]"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventModal.allDay}
                      onChange={(e) => setEventModal({ ...eventModal, allDay: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 text-[#D93A30] focus:ring-[#D93A30]"
                    />
                    <span>All-day event</span>
                  </label>
                </div>
              </div>

              {!eventModal.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      required
                      value={eventModal.startTime}
                      onChange={(e) => setEventModal({ ...eventModal, startTime: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#D93A30]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">End Time</label>
                    <input
                      type="time"
                      required
                      value={eventModal.endTime}
                      onChange={(e) => setEventModal({ ...eventModal, endTime: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#D93A30]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Location / Meeting Link</label>
                <input
                  type="text"
                  dir="auto"
                  value={eventModal.location}
                  onChange={(e) => setEventModal({ ...eventModal, location: e.target.value })}
                  placeholder="e.g. Maadi Site / Google Meet"
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Notes / Description</label>
                <textarea
                  rows={3}
                  dir="auto"
                  value={eventModal.description}
                  onChange={(e) => setEventModal({ ...eventModal, description: e.target.value })}
                  placeholder="Optional candidate or interview details..."
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEventModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingModal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingModal
                    ? 'Saving...'
                    : eventModal.mode === 'create'
                    ? 'Create Event'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
