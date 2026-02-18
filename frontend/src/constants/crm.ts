/**
 * CRM Constants
 * Centralized constants for contact management
 */

export type ContactTag = 'lead' | 'qualificado' | 'proposta' | 'negociacao' | 'cliente' | 'perdido';

export interface TagOption {
  value: ContactTag;
  label: string;
  color: string;
}

export const TAG_OPTIONS: TagOption[] = [
  { value: 'lead', label: 'Lead', color: '#3B82F6' },
  { value: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
  { value: 'proposta', label: 'Proposta', color: '#F59E0B' },
  { value: 'negociacao', label: 'Negociacao', color: '#EC4899' },
  { value: 'cliente', label: 'Cliente', color: '#22C55E' },
  { value: 'perdido', label: 'Perdido', color: '#EF4444' }
];

export const TAG_COLORS: Record<ContactTag, string> = {
  lead: '#3B82F6',
  qualificado: '#8B5CF6',
  proposta: '#F59E0B',
  negociacao: '#EC4899',
  cliente: '#22C55E',
  perdido: '#EF4444'
};

export const getTagLabel = (tag: ContactTag): string => {
  const option = TAG_OPTIONS.find(t => t.value === tag);
  return option?.label || tag;
};

export const getTagColor = (tag: ContactTag): string => {
  return TAG_COLORS[tag] || '#6B7280';
};

export type Segment = 'n8n' | 'chapeu' | 'parceria' | 'consultoria';

export interface SegmentOption {
  value: Segment;
  label: string;
  color: string;
}

export const SEGMENT_OPTIONS: SegmentOption[] = [
  { value: 'n8n', label: 'N8N', color: '#EA4B71' },
  { value: 'chapeu', label: 'Chapéu', color: '#8B5CF6' },
  { value: 'parceria', label: 'Parceria', color: '#22C55E' },
  { value: 'consultoria', label: 'Consultoria', color: '#F59E0B' }
];

export const getSegmentInfo = (segment: Segment) => {
  return SEGMENT_OPTIONS.find(s => s.value === segment);
};

// Helper to calculate days since last contact
export const getDaysSinceLastContact = (lastContactAt: string | null | undefined): number | null => {
  if (!lastContactAt) return null;
  const lastDate = new Date(lastContactAt);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to get color based on days since last contact
export const getLastContactColor = (days: number | null): string => {
  if (days === null) return 'var(--text-muted)';
  if (days <= 7) return '#22C55E'; // Verde - recente
  if (days <= 14) return '#F59E0B'; // Amarelo - atenção
  if (days <= 30) return '#F97316'; // Laranja - precisa contato
  return '#EF4444'; // Vermelho - urgente
};

// Helper to format last contact text
export const formatLastContactText = (days: number | null): string => {
  if (days === null) return '—';
  if (days === 0) return 'Hoje';
  if (days === 1) return '1 dia';
  return `${days} dias`;
};

// Helper to add days to current date
export const addDaysToDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Google Calendar URL generator for follow-ups
export const generateGoogleCalendarUrl = (event: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
}): string => {
  const formatDateForGCal = (dateStr: string, allDay: boolean = true) => {
    const date = new Date(dateStr);
    if (allDay) {
      // Format: YYYYMMDD for all-day events
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    // Format: YYYYMMDDTHHmmssZ for timed events
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const startFormatted = formatDateForGCal(event.startDate);
  const endDate = event.endDate || event.startDate;
  // For all-day events, end date should be next day
  const endDateObj = new Date(endDate);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endFormatted = formatDateForGCal(endDateObj.toISOString());

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startFormatted}/${endFormatted}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }
  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
