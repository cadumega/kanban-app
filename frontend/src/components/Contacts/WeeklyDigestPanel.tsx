import { useState, useEffect, useMemo } from 'react';
import { X, FileText, Copy, Check, Calendar, Building, User, Clock, AlertTriangle, ChevronDown, ChevronRight, Send, List, Users, Download, Flame, Snowflake, Zap, CalendarPlus } from 'lucide-react';
import * as api from '../../services/api';
import type { WeeklyDigestResponse, WeeklyDigestContact } from '../../services/api';
import './WeeklyDigestPanel.css';

// WhatsApp number for sending digest
const WHATSAPP_NUMBER = '5521987282581';

const SEGMENT_LABELS: Record<string, string> = {
  n8n: 'N8N',
  chapeu: 'Chapéu',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
  'Sem Segmento': 'Sem Segmento',
};

const SEGMENT_EMOJI: Record<string, string> = {
  n8n: '🤖',
  chapeu: '🎩',
  parceria: '🤝',
  consultoria: '💼',
  'Sem Segmento': '📋',
};

const TAG_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  cliente: 'Cliente',
  perdido: 'Perdido',
};

interface WeeklyDigestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'segment' | 'timeline';

export function WeeklyDigestPanel({ isOpen, onClose }: WeeklyDigestPanelProps) {
  const [data, setData] = useState<WeeklyDigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [showCalendarLinks, setShowCalendarLinks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDigest();
    }
  }, [isOpen]);

  const loadDigest = async () => {
    setLoading(true);
    try {
      const result = await api.getWeeklyDigest();
      setData(result);
      // Expand all segments by default
      const expanded: Record<string, boolean> = {};
      Object.keys(result.by_segment).forEach(seg => {
        expanded[seg] = true;
      });
      setExpandedSegments(expanded);
    } catch (err) {
      console.error('Erro ao carregar digest:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSegment = (segment: string) => {
    setExpandedSegments(prev => ({ ...prev, [segment]: !prev[segment] }));
  };

  // Create timeline view - all follow-ups sorted by date
  const timelineItems = useMemo(() => {
    if (!data) return [];

    const items: {
      date: string;
      contact: WeeklyDigestContact;
      followup: { id: string; date: string; description: string };
      segment: string;
    }[] = [];

    Object.entries(data.by_segment).forEach(([segment, contacts]) => {
      contacts.forEach(contact => {
        contact.followups.forEach(followup => {
          items.push({ date: followup.date, contact, followup, segment });
        });
      });
    });

    // Sort by date
    items.sort((a, b) => a.date.localeCompare(b.date));

    return items;
  }, [data]);

  // Group timeline by date
  const timelineByDate = useMemo(() => {
    const grouped: Record<string, typeof timelineItems> = {};
    timelineItems.forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });
    return grouped;
  }, [timelineItems]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    if (diffDays === 0) return `hoje (${dayMonth})`;
    if (diffDays === 1) return `amanhã (${dayMonth})`;
    if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás (${dayMonth})`;
    return `${dayName} (${dayMonth})`;
  };

  // Format for full date display
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatNoteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format short date for notes (dd/mm)
  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Format date range
  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const startDay = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endFull = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${startDay} até ${endFull}`;
  };

  const generateTextReport = (mode: 'timeline' | 'segment' = 'timeline'): string => {
    if (!data) return '';

    const lines: string[] = [];
    const divider = '___________________________';
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Header
    lines.push('*RELATORIO DE NOTIFICACOES*');
    lines.push('');
    lines.push(`Gerado em: ${todayFormatted}`);
    lines.push(`Periodo: ${formatDateRange(data.period.start, data.period.end)}`);
    lines.push('');
    lines.push(`*Resumo:* ${data.summary.total_contacts} contatos | ${data.summary.total_followups} follow-ups`);
    if (data.summary.overdue > 0) {
      lines.push(`ATENCAO: ${data.summary.overdue} atrasados | ${data.summary.today} hoje | ${data.summary.upcoming} proximos`);
    }
    if (data.summary.hot_leads && data.summary.hot_leads > 0) {
      lines.push(`LEADS QUENTES: ${data.summary.hot_leads}`);
    }
    if (data.summary.at_risk_leads && data.summary.at_risk_leads > 0) {
      lines.push(`EM RISCO: ${data.summary.at_risk_leads}`);
    }
    lines.push('');
    lines.push(divider);

    // Critical Alerts
    if (data.alerts && data.alerts.length > 0) {
      lines.push('');
      lines.push('*ALERTAS CRITICOS*');
      lines.push('');
      data.alerts.slice(0, 5).forEach(alert => {
        const company = alert.contact_company ? ` (${alert.contact_company})` : '';
        lines.push(`- ${alert.contact_name}${company}: ${alert.message}`);
      });
      lines.push('');
      lines.push(divider);
    }

    // Hot Leads
    if (data.hot_leads && data.hot_leads.length > 0) {
      lines.push('');
      lines.push('*LEADS QUENTES - ACAO IMEDIATA*');
      lines.push('');
      data.hot_leads.forEach(lead => {
        const company = lead.contact_company ? ` @ ${lead.contact_company}` : '';
        const score = lead.intelligence?.score || 0;
        lines.push(`- [${score}] ${lead.contact_name}${company}`);
        if (lead.intelligence?.signals && lead.intelligence.signals.length > 0) {
          const keywords = lead.intelligence.signals.map(s => s.keyword).join(', ');
          lines.push(`  Sinais: ${keywords}`);
        }
      });
      lines.push('');
      lines.push(divider);
    }

    if (mode === 'timeline') {
      // Timeline view - grouped by date
      Object.entries(timelineByDate).forEach(([date, items]) => {
        const isOverdue = date < new Date().toISOString().split('T')[0];
        const isToday = date === new Date().toISOString().split('T')[0];
        const statusLabel = isOverdue ? ' [ATRASADO]' : isToday ? ' [HOJE]' : '';

        lines.push('');
        lines.push(`*${formatFullDate(date).toUpperCase()}*${statusLabel}`);
        lines.push('');

        items.forEach((item) => {
          const segmentLabel = SEGMENT_LABELS[item.segment] || item.segment;
          const companyInfo = item.contact.contact_company || 'Sem empresa';
          const roleInfo = item.contact.contact_role ? ` (${item.contact.contact_role})` : '';
          const intel = item.contact.intelligence;
          const scoreLabel = intel ? ` [${intel.classification.label}]` : '';

          lines.push(`Segmento: ${segmentLabel}`);
          lines.push(`Empresa: *${companyInfo}*`);
          lines.push(`Contato: *${item.contact.contact_name}*${roleInfo}${scoreLabel}`);

          if (item.followup.description) {
            lines.push(`Proxima acao: ${item.followup.description}`);
          }

          // Show FULL notes with dates
          if (item.contact.notes.length > 0) {
            lines.push('');
            lines.push('*Historico de Anotacoes:*');
            item.contact.notes.forEach((note) => {
              const noteDate = formatShortDate(note.created_at);
              lines.push(`- [${noteDate}] ${note.content}`);
              lines.push('');
            });
          }

          lines.push(divider);
          lines.push('');
        });
      });
    } else {
      // Segment view
      Object.entries(data.by_segment).forEach(([segment, contacts]) => {
        const label = SEGMENT_LABELS[segment] || segment;

        lines.push('');
        lines.push(`*${label.toUpperCase()}*`);
        lines.push('');

        contacts.forEach((contact) => {
          const companyInfo = contact.contact_company || 'Sem empresa';
          const roleInfo = contact.contact_role ? ` (${contact.contact_role})` : '';
          const intel = contact.intelligence;
          const scoreLabel = intel ? ` [${intel.classification.label}]` : '';

          lines.push(`Empresa: *${companyInfo}*`);
          lines.push(`Contato: *${contact.contact_name}*${roleInfo}${scoreLabel}`);

          contact.followups.forEach(f => {
            const isOverdue = new Date(f.date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
            const status = isOverdue ? ' [ATRASADO]' : '';
            lines.push(`Reuniao: ${formatFullDate(f.date)}${status}`);
            if (f.description) {
              lines.push(`Acao: ${f.description}`);
            }
          });

          // Show FULL notes with dates
          if (contact.notes.length > 0) {
            lines.push('');
            lines.push('*Historico de Anotacoes:*');
            contact.notes.forEach((note) => {
              const noteDate = formatShortDate(note.created_at);
              lines.push(`- [${noteDate}] ${note.content}`);
              lines.push('');
            });
          }

          lines.push(divider);
          lines.push('');
        });
      });
    }

    lines.push('Fim do relatorio');

    return lines.join('\n');
  };

  // Generate PDF
  const handleDownloadPDF = () => {
    const text = generateTextReport(viewMode);
    const today = new Date().toISOString().split('T')[0];

    // Create a simple HTML document for printing/PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatorio de Notificacoes - ${today}</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      margin: 0;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Give it time to load then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleSendWhatsApp = () => {
    const text = generateTextReport(viewMode);
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 3000);
  };

  const handleCopy = async () => {
    const text = generateTextReport(viewMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Generate Google Calendar URL for a single follow-up
  const generateGoogleCalendarUrl = (
    title: string,
    date: string,
    description: string,
    contactName?: string,
    company?: string
  ) => {
    // Format: YYYYMMDD
    const dateFormatted = date.replace(/-/g, '');
    // All-day event: dates are start/end (end is exclusive, so same day = next day)
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endFormatted = endDate.toISOString().split('T')[0].replace(/-/g, '');

    const fullTitle = `📞 ${title}${company ? ` - ${company}` : ''}`;
    const details = [
      contactName ? `Contato: ${contactName}` : '',
      company ? `Empresa: ${company}` : '',
      description ? `\nAção: ${description}` : '',
      '\n---',
      'Criado via Kanban CRM'
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: fullTitle,
      dates: `${dateFormatted}/${endFormatted}`,
      details: details,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Generate calendar links for all follow-ups
  const calendarLinks = useMemo(() => {
    return timelineItems.map(item => ({
      url: generateGoogleCalendarUrl(
        item.followup.description || 'Follow-up',
        item.followup.date,
        item.followup.description || '',
        item.contact.contact_name,
        item.contact.contact_company || undefined
      ),
      title: item.followup.description || 'Follow-up',
      contact: item.contact.contact_name,
      company: item.contact.contact_company,
      date: item.followup.date,
    }));
  }, [timelineItems]);

  // Show modal with calendar links
  const handleAddAllToCalendar = () => {
    setShowCalendarLinks(true);
  };

  // Add single follow-up to calendar
  const handleAddToCalendar = (
    date: string,
    description: string,
    contactName: string,
    company?: string
  ) => {
    const url = generateGoogleCalendarUrl(
      description || 'Follow-up',
      date,
      description,
      contactName,
      company
    );
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="weekly-digest-overlay" onClick={onClose}>
      <div className="weekly-digest-panel" onClick={e => e.stopPropagation()}>
        <div className="weekly-digest__header">
          <h2>
            <FileText size={20} />
            Agenda Semanal
          </h2>
          <div className="weekly-digest__header-actions">
            {/* View toggle */}
            <div className="weekly-digest__view-toggle">
              <button
                onClick={() => setViewMode('timeline')}
                className={`weekly-digest__view-btn ${viewMode === 'timeline' ? 'weekly-digest__view-btn--active' : ''}`}
                title="Por Data"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('segment')}
                className={`weekly-digest__view-btn ${viewMode === 'segment' ? 'weekly-digest__view-btn--active' : ''}`}
                title="Por Segmento"
              >
                <Users size={14} />
              </button>
            </div>
            <button
              onClick={handleCopy}
              className={`btn btn-sm ${copied ? 'btn-success' : 'btn-secondary'}`}
              disabled={!data || loading}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={handleSendWhatsApp}
              className={`btn btn-sm ${whatsappSent ? 'btn-success' : 'btn-whatsapp'}`}
              disabled={!data || loading}
              title="Enviar por WhatsApp"
            >
              <Send size={14} />
              {whatsappSent ? 'Enviado!' : 'WhatsApp'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn btn-sm btn-pdf"
              disabled={!data || loading}
              title="Salvar como PDF"
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={handleAddAllToCalendar}
              className="btn btn-sm btn-calendar"
              disabled={!data || loading || timelineItems.length === 0}
              title="Ver links para adicionar ao Google Calendar"
            >
              <CalendarPlus size={14} />
              Agenda
            </button>
            <button onClick={onClose} className="btn btn-icon btn-ghost">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="weekly-digest__body">
          {loading ? (
            <div className="weekly-digest__loading">Gerando relatório...</div>
          ) : !data ? (
            <div className="weekly-digest__empty">Erro ao carregar relatório</div>
          ) : Object.keys(data.by_segment).length === 0 ? (
            <div className="weekly-digest__empty">
              <FileText size={48} />
              <p>Nenhum follow-up para esta semana</p>
              <span>Adicione follow-ups nos contatos do CRM</span>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="weekly-digest__summary">
                <div className="weekly-digest__summary-card">
                  <span className="weekly-digest__summary-value">{data.summary.total_contacts}</span>
                  <span className="weekly-digest__summary-label">Contatos</span>
                </div>
                <div className="weekly-digest__summary-card">
                  <span className="weekly-digest__summary-value">{data.summary.total_followups}</span>
                  <span className="weekly-digest__summary-label">Follow-ups</span>
                </div>
                {data.summary.overdue > 0 && (
                  <div className="weekly-digest__summary-card weekly-digest__summary-card--danger">
                    <span className="weekly-digest__summary-value">{data.summary.overdue}</span>
                    <span className="weekly-digest__summary-label">Atrasados</span>
                  </div>
                )}
                {data.summary.hot_leads && data.summary.hot_leads > 0 && (
                  <div className="weekly-digest__summary-card weekly-digest__summary-card--hot">
                    <span className="weekly-digest__summary-value">{data.summary.hot_leads}</span>
                    <span className="weekly-digest__summary-label">HOT</span>
                  </div>
                )}
                {data.summary.at_risk_leads && data.summary.at_risk_leads > 0 && (
                  <div className="weekly-digest__summary-card weekly-digest__summary-card--cold">
                    <span className="weekly-digest__summary-value">{data.summary.at_risk_leads}</span>
                    <span className="weekly-digest__summary-label">Em Risco</span>
                  </div>
                )}
              </div>

              {/* Critical Alerts */}
              {data.alerts && data.alerts.length > 0 && (
                <div className="weekly-digest__alerts">
                  <h3 className="weekly-digest__section-title">
                    <AlertTriangle size={16} />
                    Alertas Críticos
                  </h3>
                  <div className="weekly-digest__alerts-list">
                    {data.alerts.slice(0, 5).map((alert, idx) => (
                      <div key={idx} className={`weekly-digest__alert weekly-digest__alert--${alert.severity}`}>
                        <div className="weekly-digest__alert-info">
                          <span className="weekly-digest__alert-contact">{alert.contact_name}</span>
                          {alert.contact_company && (
                            <span className="weekly-digest__alert-company">@ {alert.contact_company}</span>
                          )}
                        </div>
                        <span className="weekly-digest__alert-message">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hot Leads */}
              {data.hot_leads && data.hot_leads.length > 0 && (
                <div className="weekly-digest__hot-leads">
                  <h3 className="weekly-digest__section-title weekly-digest__section-title--hot">
                    <Flame size={16} />
                    Leads Quentes - Ação Imediata
                  </h3>
                  <div className="weekly-digest__hot-list">
                    {data.hot_leads.map((lead) => (
                      <div key={lead.contact_id} className="weekly-digest__hot-item">
                        <div className="weekly-digest__hot-header">
                          <span className="weekly-digest__hot-score">{lead.intelligence?.score}</span>
                          <div className="weekly-digest__hot-info">
                            <span className="weekly-digest__hot-name">{lead.contact_name}</span>
                            {lead.contact_company && (
                              <span className="weekly-digest__hot-company">{lead.contact_company}</span>
                            )}
                          </div>
                        </div>
                        {lead.intelligence?.signals && lead.intelligence.signals.length > 0 && (
                          <div className="weekly-digest__hot-signals">
                            <Zap size={12} />
                            {lead.intelligence.signals.slice(0, 3).map((s, i) => (
                              <span key={i} className="weekly-digest__hot-signal">{s.keyword}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* At Risk Leads */}
              {data.at_risk_leads && data.at_risk_leads.length > 0 && (
                <div className="weekly-digest__at-risk">
                  <h3 className="weekly-digest__section-title weekly-digest__section-title--risk">
                    <Snowflake size={16} />
                    Leads Esfriando - Reengajar
                  </h3>
                  <div className="weekly-digest__risk-list">
                    {data.at_risk_leads.map((lead) => (
                      <div key={lead.contact_id} className="weekly-digest__risk-item">
                        <span className="weekly-digest__risk-score">{lead.intelligence?.score}</span>
                        <div className="weekly-digest__risk-info">
                          <span className="weekly-digest__risk-name">{lead.contact_name}</span>
                          {lead.contact_company && (
                            <span className="weekly-digest__risk-company">{lead.contact_company}</span>
                          )}
                        </div>
                        {lead.intelligence?.daysSinceContact && lead.intelligence.daysSinceContact > 7 && (
                          <span className="weekly-digest__risk-days">{lead.intelligence.daysSinceContact}d sem contato</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'timeline' ? (
                /* Timeline View - By Date */
                <div className="weekly-digest__timeline">
                  {Object.entries(timelineByDate).map(([date, items]) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = date < todayStr;
                    const isToday = date === todayStr;

                    return (
                      <div key={date} className={`weekly-digest__timeline-day ${isOverdue ? 'weekly-digest__timeline-day--overdue' : isToday ? 'weekly-digest__timeline-day--today' : ''}`}>
                        <div className="weekly-digest__timeline-date">
                          {isOverdue && <AlertTriangle size={14} />}
                          {!isOverdue && <Calendar size={14} />}
                          <span>{formatDate(date)}</span>
                          <span className="weekly-digest__timeline-count">{items.length}</span>
                        </div>
                        <div className="weekly-digest__timeline-items">
                          {items.map((item, idx) => {
                            const intel = item.contact.intelligence;
                            return (
                            <div key={idx} className="weekly-digest__timeline-item">
                              <div className="weekly-digest__timeline-item-header">
                                <span className="weekly-digest__timeline-segment" title={SEGMENT_LABELS[item.segment] || item.segment}>
                                  {SEGMENT_EMOJI[item.segment] || '📣'}
                                </span>
                                <div className="weekly-digest__timeline-contact">
                                  <span className="weekly-digest__timeline-name">
                                    {item.contact.contact_name}
                                    {intel && (
                                      <span
                                        className={`weekly-digest__score-badge weekly-digest__score-badge--${intel.classification.label.toLowerCase()}`}
                                        title={`Score: ${intel.score}`}
                                      >
                                        {intel.classification.label}
                                      </span>
                                    )}
                                  </span>
                                  {item.contact.contact_company && (
                                    <span className="weekly-digest__timeline-company">{item.contact.contact_company}</span>
                                  )}
                                </div>
                              </div>
                              {/* Buying signals */}
                              {intel && intel.signals && intel.signals.length > 0 && (
                                <div className="weekly-digest__timeline-signals">
                                  <Zap size={10} />
                                  {intel.signals.slice(0, 2).map((s, i) => (
                                    <span key={i} className="weekly-digest__mini-signal">{s.keyword}</span>
                                  ))}
                                </div>
                              )}
                              <div className="weekly-digest__timeline-action">
                                {item.followup.description && (
                                  <span className="weekly-digest__timeline-desc">{item.followup.description}</span>
                                )}
                                <button
                                  className="weekly-digest__calendar-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCalendar(
                                      item.followup.date,
                                      item.followup.description || 'Follow-up',
                                      item.contact.contact_name,
                                      item.contact.contact_company || undefined
                                    );
                                  }}
                                  title="Adicionar ao Google Calendar"
                                >
                                  <CalendarPlus size={12} />
                                </button>
                              </div>
                              {item.contact.notes.length > 0 && (
                                <div className="weekly-digest__timeline-notes">
                                  <span className="weekly-digest__timeline-notes-label">Últimas notas:</span>
                                  {item.contact.notes.slice(0, 2).map((note, nidx) => (
                                    <div key={nidx} className="weekly-digest__timeline-note">
                                      {note.content.length > 60 ? note.content.substring(0, 60) + '...' : note.content}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Segment View */
                <div className="weekly-digest__segments">
                  {Object.entries(data.by_segment).map(([segment, contacts]) => (
                    <div key={segment} className="weekly-digest__segment">
                      <button
                        className="weekly-digest__segment-header"
                        onClick={() => toggleSegment(segment)}
                      >
                        <span className="weekly-digest__segment-emoji">
                          {SEGMENT_EMOJI[segment] || '📣'}
                        </span>
                        <span className="weekly-digest__segment-name">
                          {SEGMENT_LABELS[segment] || segment}
                        </span>
                        <span className="weekly-digest__segment-count">{contacts.length}</span>
                        {expandedSegments[segment] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {expandedSegments[segment] && (
                        <div className="weekly-digest__segment-content">
                          {contacts.map(contact => (
                            <ContactDigestCard key={contact.contact_id} contact={contact} formatDate={formatDate} formatNoteDate={formatNoteDate} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Calendar Links Modal */}
        {showCalendarLinks && (
          <div className="calendar-links-overlay" onClick={() => setShowCalendarLinks(false)}>
            <div className="calendar-links-modal" onClick={e => e.stopPropagation()}>
              <div className="calendar-links-header">
                <h3>
                  <CalendarPlus size={18} />
                  Adicionar ao Google Calendar
                </h3>
                <button onClick={() => setShowCalendarLinks(false)} className="btn btn-icon btn-ghost">
                  <X size={18} />
                </button>
              </div>
              <p className="calendar-links-hint">Clique em cada item para adicionar ao seu calendário:</p>
              <div className="calendar-links-list">
                {calendarLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="calendar-link-item"
                  >
                    <div className="calendar-link-date">
                      {new Date(link.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="calendar-link-info">
                      <span className="calendar-link-title">{link.title}</span>
                      <span className="calendar-link-contact">
                        {link.contact}{link.company ? ` @ ${link.company}` : ''}
                      </span>
                    </div>
                    <CalendarPlus size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContactDigestCardProps {
  contact: WeeklyDigestContact;
  formatDate: (date: string) => string;
  formatNoteDate: (date: string) => string;
}

function ContactDigestCard({ contact, formatDate, formatNoteDate }: ContactDigestCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const intel = contact.intelligence;

  return (
    <div className="weekly-digest__contact">
      <div className="weekly-digest__contact-header">
        <div className="weekly-digest__contact-info">
          <div className="weekly-digest__contact-name">
            <User size={14} />
            <span>{contact.contact_name}</span>
            {intel && (
              <span
                className={`weekly-digest__contact-score weekly-digest__contact-score--${intel.classification.label.toLowerCase()}`}
                title={`Score: ${intel.score} - ${intel.classification.priority}`}
              >
                {intel.classification.label}
              </span>
            )}
          </div>
          {contact.contact_company && (
            <div className="weekly-digest__contact-company">
              <Building size={12} />
              <span>{contact.contact_company}</span>
              {contact.contact_role && (
                <span className="weekly-digest__contact-role">({contact.contact_role})</span>
              )}
            </div>
          )}
        </div>
        {contact.contact_tag && TAG_LABELS[contact.contact_tag] && (
          <span className={`weekly-digest__contact-tag weekly-digest__contact-tag--${contact.contact_tag}`}>
            {TAG_LABELS[contact.contact_tag]}
          </span>
        )}
      </div>

      {/* Buying Signals */}
      {intel && intel.signals && intel.signals.length > 0 && (
        <div className="weekly-digest__contact-signals">
          <Zap size={12} />
          {intel.signals.map((s, i) => (
            <span key={i} className="weekly-digest__signal-badge">{s.keyword}</span>
          ))}
        </div>
      )}

      {/* Contact Alerts */}
      {intel && intel.alerts && intel.alerts.length > 0 && (
        <div className="weekly-digest__contact-alerts">
          {intel.alerts.map((alert, i) => (
            <span key={i} className={`weekly-digest__contact-alert weekly-digest__contact-alert--${alert.severity}`}>
              {alert.message}
            </span>
          ))}
        </div>
      )}

      {/* Follow-ups */}
      <div className="weekly-digest__followups">
        {contact.followups.map(f => {
          const isOverdue = f.date < todayStr;
          const isToday = f.date === todayStr;
          return (
            <div
              key={f.id}
              className={`weekly-digest__followup ${isOverdue ? 'weekly-digest__followup--overdue' : isToday ? 'weekly-digest__followup--today' : ''}`}
            >
              {isOverdue ? <AlertTriangle size={12} /> : <Calendar size={12} />}
              <span className="weekly-digest__followup-date">{formatDate(f.date)}</span>
              {f.description && (
                <span className="weekly-digest__followup-desc">{f.description}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes preview */}
      {contact.notes.length > 0 && (
        <div className="weekly-digest__notes">
          <button
            className="weekly-digest__notes-toggle"
            onClick={() => setNotesExpanded(!notesExpanded)}
          >
            <Clock size={12} />
            <span>Histórico ({contact.notes.length} notas)</span>
            {notesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {notesExpanded && (
            <div className="weekly-digest__notes-list">
              {contact.notes.map((note, idx) => (
                <div key={idx} className="weekly-digest__note">
                  <span className="weekly-digest__note-date">{formatNoteDate(note.created_at)}</span>
                  <span className="weekly-digest__note-content">{note.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
