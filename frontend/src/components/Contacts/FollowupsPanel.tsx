import { useState, useEffect, useMemo } from 'react';
import { X, Bell, Clock, Check, User, Building, ChevronRight, ChevronLeft, MapPin, List, CalendarDays, FileText } from 'lucide-react';
import type { ContactFollowup } from '../../types';
import * as api from '../../services/api';
import { WeeklyDigestPanel } from './WeeklyDigestPanel';
import './FollowupsPanel.css';

const TAG_COLORS: Record<string, string> = {
  lead: '#3B82F6',
  qualificado: '#8B5CF6',
  proposta: '#F59E0B',
  negociacao: '#EC4899',
  cliente: '#22C55E',
  perdido: '#EF4444',
};

const TAG_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  cliente: 'Cliente',
  perdido: 'Perdido',
};

interface FollowupsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: (contactId: string) => void;
}

type ViewMode = 'list' | 'calendar';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function FollowupsPanel({ isOpen, onClose, onOpenContact }: FollowupsPanelProps) {
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDigestPanel, setShowDigestPanel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFollowups();
      setCityFilter('all');
      setSelectedDay(null);
      const now = new Date();
      setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
    }
  }, [isOpen]);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingFollowups();
      setFollowups(data);
    } catch (err) {
      console.error('Erro ao carregar follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollowup = async (followup: ContactFollowup) => {
    try {
      await api.updateFollowup(followup.contact_id, followup.id, { completed: true });
      setFollowups(prev => prev.filter(f => f.id !== followup.id));
    } catch (err) {
      console.error('Erro ao completar follow-up:', err);
    }
  };

  const getFollowupStatus = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'overdue';
    if (date === today) return 'today';
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    if (date <= weekFromNow.toISOString().split('T')[0]) return 'soon';
    return 'future';
  };

  const formatFollowupDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays < -1) return `Há ${Math.abs(diffDays)} dias`;
    if (diffDays <= 7) return `Em ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Get unique cities for filter
  const availableCities = Array.from(
    new Set(followups.map(f => f.contact_city).filter(Boolean))
  ).sort() as string[];

  // City count map
  const cityCountMap = followups.reduce<Record<string, number>>((acc, f) => {
    const city = f.contact_city || 'Sem cidade';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  // Apply city filter
  const filteredFollowups = followups.filter(f => {
    if (cityFilter === 'all') return true;
    if (cityFilter === 'none') return !f.contact_city;
    return f.contact_city === cityFilter;
  });

  // Group followups by status
  const overdueFollowups = filteredFollowups.filter(f => getFollowupStatus(f.date) === 'overdue');
  const todayFollowups = filteredFollowups.filter(f => getFollowupStatus(f.date) === 'today');
  const soonFollowups = filteredFollowups.filter(f => getFollowupStatus(f.date) === 'soon');
  const futureFollowups = filteredFollowups.filter(f => getFollowupStatus(f.date) === 'future');

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevLast - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding (fill to complete last week)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ date: dateStr, dayNum: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [calendarMonth]);

  // Map followups by date for calendar
  const followupsByDate = useMemo(() => {
    const map: Record<string, ContactFollowup[]> = {};
    filteredFollowups.forEach(f => {
      if (!map[f.date]) map[f.date] = [];
      map[f.date].push(f);
    });
    return map;
  }, [filteredFollowups]);

  const todayStr = new Date().toISOString().split('T')[0];

  const calendarMonthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDay(null);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(todayStr);
  };

  const selectedDayFollowups = selectedDay ? (followupsByDate[selectedDay] || []) : [];

  if (!isOpen) return null;

  return (
    <div className="followups-panel-overlay" onClick={onClose}>
      <div className={`followups-panel ${viewMode === 'calendar' ? 'followups-panel--wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="followups-panel__header">
          <h2>
            <Bell size={20} />
            Follow-ups Pendentes
            <span className="followups-panel__header-count">{filteredFollowups.length}</span>
          </h2>
          <div className="followups-panel__header-actions">
            <div className="followups-panel__view-toggle">
              <button
                onClick={() => setViewMode('list')}
                className={`followups-panel__view-btn ${viewMode === 'list' ? 'followups-panel__view-btn--active' : ''}`}
                title="Lista"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`followups-panel__view-btn ${viewMode === 'calendar' ? 'followups-panel__view-btn--active' : ''}`}
                title="Calendário"
              >
                <CalendarDays size={14} />
              </button>
            </div>
            <button
              onClick={() => setShowDigestPanel(true)}
              className="btn btn-sm btn-secondary"
              title="Gerar Briefing Semanal"
            >
              <FileText size={14} />
              Briefing
            </button>
            <button onClick={onClose} className="btn btn-icon btn-ghost">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* City filter and counters */}
        {followups.length > 0 && availableCities.length > 0 && (
          <div className="followups-panel__filters">
            <div className="followups-panel__city-filter">
              <MapPin size={12} />
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="followups-panel__city-filter-select"
              >
                <option value="all">Todas as cidades ({followups.length})</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city} ({cityCountMap[city] || 0})</option>
                ))}
                {cityCountMap['Sem cidade'] && (
                  <option value="none">Sem cidade ({cityCountMap['Sem cidade']})</option>
                )}
              </select>
            </div>
            <div className="followups-panel__city-badges">
              {availableCities.map(city => (
                <button
                  key={city}
                  onClick={() => setCityFilter(cityFilter === city ? 'all' : city)}
                  className={`followups-panel__city-badge ${cityFilter === city ? 'followups-panel__city-badge--active' : ''}`}
                >
                  {city} <span>{cityCountMap[city] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="followups-panel__body">
            {loading ? (
              <div className="followups-panel__loading">Carregando...</div>
            ) : followups.length === 0 ? (
              <div className="followups-panel__empty">
                <Bell size={48} />
                <p>Nenhum follow-up pendente</p>
                <span>Adicione follow-ups nos contatos do CRM</span>
              </div>
            ) : (
              <>
                {overdueFollowups.length > 0 && (
                  <div className="followups-panel__section">
                    <h3 className="followups-panel__section-title followups-panel__section-title--overdue">
                      <span className="followups-panel__section-dot" />
                      Atrasados ({overdueFollowups.length})
                    </h3>
                    <div className="followups-panel__list">
                      {overdueFollowups.map(followup => (
                        <FollowupItem
                          key={followup.id}
                          followup={followup}
                          status="overdue"
                          formatDate={formatFollowupDate}
                          onToggle={handleToggleFollowup}
                          onOpenContact={onOpenContact}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {todayFollowups.length > 0 && (
                  <div className="followups-panel__section">
                    <h3 className="followups-panel__section-title followups-panel__section-title--today">
                      <span className="followups-panel__section-dot" />
                      Hoje ({todayFollowups.length})
                    </h3>
                    <div className="followups-panel__list">
                      {todayFollowups.map(followup => (
                        <FollowupItem
                          key={followup.id}
                          followup={followup}
                          status="today"
                          formatDate={formatFollowupDate}
                          onToggle={handleToggleFollowup}
                          onOpenContact={onOpenContact}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {soonFollowups.length > 0 && (
                  <div className="followups-panel__section">
                    <h3 className="followups-panel__section-title followups-panel__section-title--soon">
                      <span className="followups-panel__section-dot" />
                      Esta Semana ({soonFollowups.length})
                    </h3>
                    <div className="followups-panel__list">
                      {soonFollowups.map(followup => (
                        <FollowupItem
                          key={followup.id}
                          followup={followup}
                          status="soon"
                          formatDate={formatFollowupDate}
                          onToggle={handleToggleFollowup}
                          onOpenContact={onOpenContact}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {futureFollowups.length > 0 && (
                  <div className="followups-panel__section">
                    <h3 className="followups-panel__section-title followups-panel__section-title--future">
                      <span className="followups-panel__section-dot" />
                      Próximos ({futureFollowups.length})
                    </h3>
                    <div className="followups-panel__list">
                      {futureFollowups.map(followup => (
                        <FollowupItem
                          key={followup.id}
                          followup={followup}
                          status="future"
                          formatDate={formatFollowupDate}
                          onToggle={handleToggleFollowup}
                          onOpenContact={onOpenContact}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className="followups-panel__calendar-wrapper">
            {loading ? (
              <div className="followups-panel__loading">Carregando...</div>
            ) : (
              <>
                {/* Calendar navigation */}
                <div className="followups-calendar__nav">
                  <button onClick={handlePrevMonth} className="btn btn-ghost btn-sm">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="followups-calendar__nav-label">{calendarMonthLabel}</span>
                  <button onClick={handleNextMonth} className="btn btn-ghost btn-sm">
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={handleGoToToday} className="followups-calendar__today-btn">
                    Hoje
                  </button>
                </div>

                {/* Calendar grid */}
                <div className="followups-calendar__grid">
                  {/* Weekday headers */}
                  {WEEKDAYS.map(day => (
                    <div key={day} className="followups-calendar__weekday">{day}</div>
                  ))}

                  {/* Day cells */}
                  {calendarDays.map((day, idx) => {
                    const dayFollowups = followupsByDate[day.date] || [];
                    const isToday = day.date === todayStr;
                    const isSelected = day.date === selectedDay;
                    const hasOverdue = dayFollowups.some(f => getFollowupStatus(f.date) === 'overdue');
                    const hasToday = dayFollowups.some(f => getFollowupStatus(f.date) === 'today');
                    const hasSoon = dayFollowups.some(f => getFollowupStatus(f.date) === 'soon');

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                        className={[
                          'followups-calendar__day',
                          !day.isCurrentMonth && 'followups-calendar__day--outside',
                          isToday && 'followups-calendar__day--today',
                          isSelected && 'followups-calendar__day--selected',
                          dayFollowups.length > 0 && 'followups-calendar__day--has-items',
                        ].filter(Boolean).join(' ')}
                      >
                        <span className="followups-calendar__day-num">{day.dayNum}</span>
                        {dayFollowups.length > 0 && (
                          <div className="followups-calendar__day-dots">
                            {dayFollowups.length <= 3 ? (
                              dayFollowups.map((f, i) => (
                                <span
                                  key={i}
                                  className={`followups-calendar__dot followups-calendar__dot--${getFollowupStatus(f.date)}`}
                                />
                              ))
                            ) : (
                              <span className={`followups-calendar__day-count ${hasOverdue ? 'followups-calendar__day-count--overdue' : hasToday ? 'followups-calendar__day-count--today' : hasSoon ? 'followups-calendar__day-count--soon' : ''}`}>
                                {dayFollowups.length}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected day detail */}
                {selectedDay && (
                  <div className="followups-calendar__detail">
                    <h4 className="followups-calendar__detail-title">
                      {new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                      {selectedDayFollowups.length > 0 && (
                        <span className="followups-calendar__detail-count">{selectedDayFollowups.length}</span>
                      )}
                    </h4>
                    {selectedDayFollowups.length === 0 ? (
                      <p className="followups-calendar__detail-empty">Nenhum follow-up neste dia</p>
                    ) : (
                      <div className="followups-calendar__detail-list">
                        {selectedDayFollowups.map(followup => (
                          <FollowupItem
                            key={followup.id}
                            followup={followup}
                            status={getFollowupStatus(followup.date)}
                            formatDate={formatFollowupDate}
                            onToggle={handleToggleFollowup}
                            onOpenContact={onOpenContact}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Legend */}
                <div className="followups-calendar__legend">
                  <span className="followups-calendar__legend-item">
                    <span className="followups-calendar__dot followups-calendar__dot--overdue" /> Atrasado
                  </span>
                  <span className="followups-calendar__legend-item">
                    <span className="followups-calendar__dot followups-calendar__dot--today" /> Hoje
                  </span>
                  <span className="followups-calendar__legend-item">
                    <span className="followups-calendar__dot followups-calendar__dot--soon" /> Esta semana
                  </span>
                  <span className="followups-calendar__legend-item">
                    <span className="followups-calendar__dot followups-calendar__dot--future" /> Futuro
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Weekly Digest Panel */}
      <WeeklyDigestPanel
        isOpen={showDigestPanel}
        onClose={() => setShowDigestPanel(false)}
      />
    </div>
  );
}

interface FollowupItemProps {
  followup: ContactFollowup;
  status: string;
  formatDate: (date: string) => string;
  onToggle: (followup: ContactFollowup) => void;
  onOpenContact?: (contactId: string) => void;
}

function FollowupItem({ followup, status, formatDate, onToggle, onOpenContact }: FollowupItemProps) {
  return (
    <div className={`followups-panel__item followups-panel__item--${status}`}>
      <button
        onClick={() => onToggle(followup)}
        className="followups-panel__item-check"
        title="Marcar como concluído"
      >
        <Check size={12} />
      </button>

      <div className="followups-panel__item-content">
        <div className="followups-panel__item-contact">
          <User size={14} />
          <span className="followups-panel__item-name">{followup.contact_name}</span>
          {followup.contact_company && (
            <>
              <span className="followups-panel__item-separator">•</span>
              <Building size={12} />
              <span className="followups-panel__item-company">{followup.contact_company}</span>
            </>
          )}
        </div>
        <div className="followups-panel__item-badges">
          {followup.contact_city && (
            <span className="followups-panel__item-city-badge">
              <MapPin size={10} />
              {followup.contact_city}
            </span>
          )}
          {followup.contact_tag && TAG_LABELS[followup.contact_tag] && (
            <span
              className="followups-panel__item-tag-badge"
              style={{ background: TAG_COLORS[followup.contact_tag] }}
            >
              {TAG_LABELS[followup.contact_tag]}
            </span>
          )}
        </div>
        <div className="followups-panel__item-info">
          <span className="followups-panel__item-date">
            <Clock size={12} />
            {formatDate(followup.date)}
          </span>
          {followup.description && (
            <span className="followups-panel__item-desc">{followup.description}</span>
          )}
        </div>
      </div>

      {onOpenContact && (
        <button
          onClick={() => onOpenContact(followup.contact_id)}
          className="followups-panel__item-open"
          title="Abrir contato"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
