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
}

export const SEGMENT_OPTIONS: SegmentOption[] = [
  { value: 'n8n', label: 'N8N' },
  { value: 'chapeu', label: 'Chapeu' },
  { value: 'parceria', label: 'Parceria' },
  { value: 'consultoria', label: 'Consultoria' }
];
