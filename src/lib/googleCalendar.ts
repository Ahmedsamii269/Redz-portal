import { Candidate } from '../types';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class CalendarAuthError extends Error {
  constructor(message = 'Google Calendar authorization expired. Please sign in with Google again.') {
    super(message);
    this.name = 'CalendarAuthError';
  }
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  timeZone?: string;
}

export interface GoogleCalendarEventDateTime {
  date?: string; // YYYY-MM-DD (all-day)
  dateTime?: string; // RFC3339
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  hangoutLink?: string;
}

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
}

async function calendarFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  if (res.status === 401) {
    throw new CalendarAuthError();
  }

  if (!res.ok) {
    let message = `Google Calendar request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        message = errData.error.message;
      }
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const data = await calendarFetch<{ items?: GoogleCalendarListEntry[] }>(
    '/users/me/calendarList?minAccessRole=reader',
    accessToken
  );
  return data.items || [];
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });
  const encodedCalId = encodeURIComponent(calendarId);
  const data = await calendarFetch<{ items?: GoogleCalendarEvent[] }>(
    `/calendars/${encodedCalId}/events?${params.toString()}`,
    accessToken
  );
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  payload: CalendarEventPayload
): Promise<GoogleCalendarEvent> {
  const encodedCalId = encodeURIComponent(calendarId);
  return calendarFetch<GoogleCalendarEvent>(
    `/calendars/${encodedCalId}/events`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  payload: Partial<CalendarEventPayload>
): Promise<GoogleCalendarEvent> {
  const encodedCalId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);
  return calendarFetch<GoogleCalendarEvent>(
    `/calendars/${encodedCalId}/events/${encodedEventId}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const encodedCalId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);
  await calendarFetch<void>(
    `/calendars/${encodedCalId}/events/${encodedEventId}`,
    accessToken,
    {
      method: 'DELETE'
    }
  );
}

const parseTimeToken = (token: string): { hours: number; minutes: number } | null => {
  const match = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

export function buildCandidateInterviewEvent(
  candidate: Candidate,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo'
): CalendarEventPayload {
  const datePart = candidate.interviewDate || new Date().toISOString().split('T')[0];
  const [year, month, day] = datePart.split('-').map((n) => parseInt(n, 10));

  let startHours = 11;
  let startMinutes = 0;
  let endHours = 12;
  let endMinutes = 0;

  if (candidate.interviewTime) {
    const parts = candidate.interviewTime.split('-').map((p) => p.trim());
    const parsedStart = parts[0] ? parseTimeToken(parts[0]) : null;
    if (parsedStart) {
      startHours = parsedStart.hours;
      startMinutes = parsedStart.minutes;
      const parsedEnd = parts[1] ? parseTimeToken(parts[1]) : null;
      if (parsedEnd) {
        endHours = parsedEnd.hours;
        endMinutes = parsedEnd.minutes;
      } else {
        endHours = (startHours + 1) % 24;
        endMinutes = startMinutes;
      }
    }
  }

  const startDate = new Date(year, (month || 1) - 1, day || 1, startHours, startMinutes, 0);
  const endDate = new Date(year, (month || 1) - 1, day || 1, endHours, endMinutes, 0);
  if (endDate <= startDate) {
    endDate.setTime(startDate.getTime() + 60 * 60 * 1000);
  }

  const summary = `Interview: ${candidate.fullName} — ${candidate.company} (${candidate.language || 'English'})`;
  const descriptionLines = [
    `Redz Recruitment Candidate Interview`,
    `Candidate: ${candidate.fullName}`,
    `Phone: ${candidate.phone}${candidate.phone2 ? ` / ${candidate.phone2}` : ''}`,
    `Client Account: ${candidate.company}`,
    `Language Track: ${candidate.language || 'English'}`,
    `Area: ${candidate.area || 'N/A'}`,
    `Status: ${candidate.status}`,
    candidate.vocarooUrl ? `Voice Note: ${candidate.vocarooUrl}` : '',
    `Recruiter: ${candidate.createdByName || 'Redz Team'}`
  ].filter(Boolean);

  return {
    summary,
    location: candidate.company,
    description: descriptionLines.join('\n'),
    start: {
      dateTime: startDate.toISOString(),
      timeZone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone
    }
  };
}
