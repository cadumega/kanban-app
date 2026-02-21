import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  User,
  Building,
  Mail,
  Phone,
  Briefcase,
  Loader2,
  Bell,
  Search,
  MapPin,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowUpDown,
  Upload,
  Download,
  Trash2,
  MessageSquare,
  BarChart3,
  CalendarDays,
  FileText,
  Sparkles,
  Clock,
  RefreshCw,
  Gift,
} from 'lucide-react';
import type { Contact, ContactFollowup, ContactSegment } from '../../types';
import * as api from '../../services/api';
import { ImportModal, exportContactsToCSV } from './ContactImportExport';
import { ConfirmDialog, useToast } from '../shared';
import { ContactDetailModal } from './ContactDetailModal';
import { ReportsPanel } from './ReportsPanel';
import { FollowupsPanel } from './FollowupsPanel';
import { WeeklyDigestPanel } from './WeeklyDigestPanel';
import { InsightsPanel } from './InsightsPanel';
import './ContactsPanel.css';

interface ContactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated?: (contact: Contact) => void;
}

type SortField = 'name' | 'company' | 'city' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

// Segment options for filtering
const SEGMENT_OPTIONS: { value: ContactSegment; label: string; color: string }[] = [
  { value: 'n8n', label: 'N8N', color: '#EA4B71' },
  { value: 'chapeu', label: 'Chapéu', color: '#8B5CF6' },
  { value: 'parceria', label: 'Parceria', color: '#22C55E' },
  { value: 'consultoria', label: 'Consultoria', color: '#F59E0B' },
];

// Helper to add days to current date
const addDaysToDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Helper to calculate days since last contact
const getDaysSinceLastContact = (lastContactAt: string | null | undefined): number | null => {
  if (!lastContactAt) return null;
  const lastDate = new Date(lastContactAt);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to get color based on days since last contact
const getLastContactColor = (days: number | null): string => {
  if (days === null) return 'var(--text-muted)';
  if (days <= 7) return '#22C55E'; // Verde - recente
  if (days <= 14) return '#F59E0B'; // Amarelo - atenção
  if (days <= 30) return '#F97316'; // Laranja - precisa contato
  return '#EF4444'; // Vermelho - urgente
};

export function ContactsPanel({ isOpen, onClose, onContactCreated }: ContactsPanelProps) {
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all'); // all or specific segment
  const [followupFilter, setFollowupFilter] = useState<string>('all'); // all, has, none, overdue
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [, setShowBulkActions] = useState(false);
  const [bulkFollowupDays, setBulkFollowupDays] = useState<number | null>(null);


  // All pending followups for filtering
  const [allPendingFollowups, setAllPendingFollowups] = useState<ContactFollowup[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    city: '',
  });

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [showFollowupsPanel, setShowFollowupsPanel] = useState(false);
  const [showDigestPanel, setShowDigestPanel] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      loadPendingFollowups();
    } else {
      // Reset state when closing
      setDetailContact(null);
      setSelectedIds(new Set());
      setIsEditing(false);
    }
  }, [isOpen]);

  // ESC key to close panel (only if no modal is open)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showImportModal && !showDetailModal && !showReportsPanel && !showFollowupsPanel && !showDigestPanel && !showInsightsPanel && !isEditing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, showImportModal, showDetailModal, showReportsPanel, showFollowupsPanel, showDigestPanel, showInsightsPanel, isEditing, onClose]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingFollowups = async () => {
    try {
      const data = await api.getPendingFollowups();
      setAllPendingFollowups(data);
    } catch (err) {
      console.error('Erro ao carregar follow-ups:', err);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    // Abre o modal de detalhes diretamente
    setDetailContact(contact);
    setShowDetailModal(true);
  };

  // Handle contact updated from modal
  const handleContactUpdated = (updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? { ...c, ...updatedContact } : c));
  };

  // Handle contact deleted from modal
  const handleContactDeleted = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    if (detailContact?.id === contactId) {
      setDetailContact(null);
    }
  };

  // Export contacts
  const handleExport = (filtered: boolean = false) => {
    const contactsToExport = filtered ? filteredContacts : contacts;
    const filename = filtered ? 'contatos-filtrados.csv' : 'todos-contatos.csv';
    exportContactsToCSV(contactsToExport, filename);
  };

  // Get unique cities for the filter
  const availableCities = useMemo(() =>
    Array.from(new Set(contacts.map(c => c.city).filter(Boolean))).sort() as string[],
    [contacts]
  );

  // Check if contact has pending followup
  const contactHasPendingFollowup = (contactId: string) => {
    return allPendingFollowups.some(f => f.contact_id === contactId);
  };

  // Check if contact has overdue followup
  const contactHasOverdueFollowup = (contactId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return allPendingFollowups.some(f => f.contact_id === contactId && f.date < today);
  };

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = contacts.filter(contact => {
      // City filter
      if (cityFilter !== 'all') {
        if (cityFilter === 'none' && contact.city) return false;
        if (cityFilter !== 'none' && contact.city !== cityFilter) return false;
      }

      // Segment filter
      if (segmentFilter !== 'all') {
        if (segmentFilter === 'none' && contact.segments) return false;
        if (segmentFilter !== 'none') {
          if (!contact.segments) return false;
          if (!contact.segments.split(',').includes(segmentFilter)) return false;
        }
      }

      // Follow-up filter
      if (followupFilter !== 'all') {
        const hasPending = contactHasPendingFollowup(contact.id);
        const hasOverdue = contactHasOverdueFollowup(contact.id);
        if (followupFilter === 'has' && !hasPending) return false;
        if (followupFilter === 'none' && hasPending) return false;
        if (followupFilter === 'overdue' && !hasOverdue) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          contact.name.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.role?.toLowerCase().includes(query) ||
          contact.city?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: string | null = null;
      let bVal: string | null = null;

      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'company':
          aVal = a.company;
          bVal = b.company;
          break;
        case 'city':
          aVal = a.city;
          bVal = b.city;
          break;
        case 'updated_at':
          aVal = a.updated_at;
          bVal = b.updated_at;
          break;
        case 'created_at':
          aVal = a.created_at;
          bVal = b.created_at;
          break;
      }

      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      const cmp = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [contacts, cityFilter, segmentFilter, followupFilter, searchQuery, sortField, sortOrder, allPendingFollowups]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk actions
  const handleBulkCreateFollowup = async () => {
    if (selectedIds.size === 0 || !bulkFollowupDays) return;

    const date = addDaysToDate(bulkFollowupDays);

    try {
      const promises = Array.from(selectedIds).map(id =>
        api.createFollowup(id, date, '')
      );
      await Promise.all(promises);

      await loadPendingFollowups();

      setSelectedIds(new Set());
      setShowBulkActions(false);
      setBulkFollowupDays(null);
    } catch (err) {
      console.error('Erro ao criar follow-ups em lote:', err);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const promises = Array.from(selectedIds).map(id =>
        api.deleteContact(id)
      );
      await Promise.all(promises);

      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setShowBulkActions(false);
      toast.success(`${selectedIds.size} contato(s) excluído(s)`);

      if (detailContact && selectedIds.has(detailContact.id)) {
        setDetailContact(null);
      }
    } catch (err) {
      console.error('Erro ao excluir contatos em lote:', err);
      toast.error('Erro ao excluir contatos');
    }
    setShowDeleteConfirm(false);
  };

  const handleNewContact = () => {
    setFormData({ name: '', email: '', phone: '', company: '', role: '', city: '' });
    setIsEditing(true);
    setDetailContact(null);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) return;

    try {
      const created = await api.createContact(formData);
      setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setIsEditing(false);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        city: '',
      });
      // Call callback if provided
      if (onContactCreated) {
        onContactCreated(created);
      }
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
    }
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    setFormData({ ...formData, phone: numbers });
  };

  const activeFiltersCount = [
    cityFilter !== 'all',
    segmentFilter !== 'all',
    followupFilter !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCityFilter('all');
    setSegmentFilter('all');
    setFollowupFilter('all');
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="contacts-panel-overlay" onClick={onClose}>
      <div className="contacts-panel contacts-panel--fullscreen" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="contacts-panel__header">
          <div className="contacts-panel__header-left">
            <User size={22} />
            <h2>Contatos CRM</h2>
            <span className="contacts-panel__header-count">{filteredContacts.length}</span>
          </div>

          <div className="contacts-panel__header-center">

            {/* Search */}
            <div className="contacts-panel__search">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar contatos..."
                className="contacts-panel__search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="contacts-panel__search-clear">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`contacts-panel__filter-btn ${showFilters || activeFiltersCount > 0 ? 'contacts-panel__filter-btn--active' : ''}`}
              title="Filtros"
            >
              <Filter size={16} />
              {activeFiltersCount > 0 && (
                <span className="contacts-panel__filter-badge">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          <div className="contacts-panel__header-right">
            {/* AI - Destaque */}
            <button onClick={() => setShowInsightsPanel(true)} className="btn btn-insights" title="AI Insights e Acoes">
              <Sparkles size={16} />
              AI
            </button>

            {/* Separador visual */}
            <div className="contacts-panel__header-divider" />

            {/* Analises */}
            <button onClick={() => setShowDigestPanel(true)} className="btn btn-secondary" title="Agenda Semanal">
              <FileText size={16} />
              Agenda
            </button>
            <button onClick={() => setShowFollowupsPanel(true)} className="btn btn-secondary" title="Calendario de Follow-ups">
              <CalendarDays size={16} />
              Calendario
            </button>
            <button onClick={() => setShowReportsPanel(true)} className="btn btn-secondary" title="Relatorios">
              <BarChart3 size={16} />
              Relatorios
            </button>

            {/* Separador visual */}
            <div className="contacts-panel__header-divider" />

            {/* Import/Export/Refresh */}
            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary btn-sm" title="Importar CSV">
              <Upload size={14} />
            </button>
            <button onClick={() => handleExport(filteredContacts.length !== contacts.length)} className="btn btn-secondary btn-sm" title="Exportar CSV">
              <Download size={14} />
            </button>
            <button
              onClick={() => { loadContacts(); loadPendingFollowups(); toast.success('Dados atualizados'); }}
              className={`btn btn-secondary btn-sm ${loading ? 'btn-loading' : ''}`}
              title="Atualizar dados"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            {/* Acoes principais */}
            <button onClick={handleNewContact} className="btn btn-primary">
              <Plus size={16} />
              Novo Contato
            </button>
            <button onClick={onClose} className="btn btn-icon btn-ghost">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {showFilters && (
          <div className="contacts-panel__filters">
            <div className="contacts-panel__filters-row">
              {/* Segment filter */}
              <div className="contacts-panel__filter-group">
                <label className="contacts-panel__filter-label">Segmento</label>
                <select className="contacts-panel__filter-select" value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="none">Sem segmento</option>
                  {SEGMENT_OPTIONS.map(seg => (
                    <option key={seg.value} value={seg.value}>{seg.label}</option>
                  ))}
                </select>
              </div>

              {/* City filter */}
              <div className="contacts-panel__filter-group">
                <label className="contacts-panel__filter-label"><MapPin size={12} /> Cidade</label>
                <select className="contacts-panel__filter-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                  <option value="all">Todas</option>
                  <option value="none">Sem cidade</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Follow-up filter */}
              <div className="contacts-panel__filter-group">
                <label className="contacts-panel__filter-label"><Bell size={12} /> Follow-up</label>
                <select className="contacts-panel__filter-select" value={followupFilter} onChange={e => setFollowupFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="has">Com follow-up</option>
                  <option value="none">Sem follow-up</option>
                  <option value="overdue">Atrasados</option>
                </select>
              </div>

              {/* Sort */}
              <div className="contacts-panel__filter-group">
                <label className="contacts-panel__filter-label"><ArrowUpDown size={12} /> Ordenar</label>
                <select className="contacts-panel__filter-select" value={`${sortField}-${sortOrder}`} onChange={e => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}>
                  <option value="name-asc">Nome A-Z</option>
                  <option value="name-desc">Nome Z-A</option>
                  <option value="company-asc">Empresa A-Z</option>
                  <option value="city-asc">Cidade A-Z</option>
                  <option value="updated_at-desc">Atualizado recente</option>
                  <option value="created_at-desc">Criado recente</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className="contacts-panel__clear-filters">
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="contacts-panel__bulk-bar">
            <div className="contacts-panel__bulk-info">
              <button onClick={handleClearSelection} className="btn btn-ghost btn-sm">
                <X size={14} />
              </button>
              <span>{selectedIds.size} selecionado(s)</span>
            </div>
            <div className="contacts-panel__bulk-actions">
              <div className="contacts-panel__bulk-action">
                <select value={bulkFollowupDays || ''} onChange={e => setBulkFollowupDays(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Follow-up em...</option>
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">3 meses</option>
                </select>
                <button onClick={handleBulkCreateFollowup} disabled={!bulkFollowupDays} className="btn btn-sm btn-secondary">
                  Criar
                </button>
              </div>
              <button onClick={handleBulkDelete} className="btn btn-sm btn-danger">
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        )}

        <div className="contacts-panel__body">
          {/* Contacts List */}
            <div className="contacts-panel__list-container">
              {/* List header */}
              <div className="contacts-panel__list-header">
                <button onClick={handleSelectAll} className="contacts-panel__select-all" title="Selecionar todos">
                  {selectedIds.size === filteredContacts.length && filteredContacts.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
                <div className="contacts-panel__list-header-cols">
                  <span>Nome</span>
                  <span>Empresa</span>
                  <span>Telefone</span>
                  <span>Cidade</span>
                  <span>Segmento</span>
                  <span>Etapa</span>
                  <span>Últ. Contato</span>
                  <span>Status</span>
                </div>
              </div>

              {/* List items */}
              <div className="contacts-panel__list-items">
                {loading ? (
                  <div className="contacts-panel__loading">
                    <Loader2 size={24} className="spin" />
                    <span>Carregando contatos...</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="contacts-panel__empty">
                    <User size={48} />
                    <p>{contacts.length === 0 ? 'Nenhum contato ainda' : 'Nenhum contato encontrado'}</p>
                    {contacts.length === 0 && (
                      <button onClick={handleNewContact} className="btn btn-primary">
                        <Plus size={16} /> Criar primeiro contato
                      </button>
                    )}
                  </div>
                ) : (
                  filteredContacts.map(contact => {
                    const hasOverdue = contactHasOverdueFollowup(contact.id);
                    const hasPending = contactHasPendingFollowup(contact.id);

                    return (
                      <div
                        key={contact.id}
                        className={`contacts-panel__list-row ${
                          detailContact?.id === contact.id ? 'contacts-panel__list-row--active' : ''
                        } ${selectedIds.has(contact.id) ? 'contacts-panel__list-row--selected' : ''}`}
                      >
                        <button
                          onClick={() => handleToggleSelect(contact.id)}
                          className="contacts-panel__row-checkbox"
                        >
                          {selectedIds.has(contact.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <button
                          onClick={() => handleSelectContact(contact)}
                          className="contacts-panel__list-row-content"
                        >
                          <div className="contacts-panel__col-name">
                            <div className="contacts-panel__row-avatar">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{contact.name}</span>
                          </div>
                          <span className="contacts-panel__col-company">
                            {contact.company || '—'}
                          </span>
                          <span className="contacts-panel__col-phone">
                            {contact.phone ? formatPhone(contact.phone) : '—'}
                          </span>
                          <span className="contacts-panel__col-city">
                            {contact.city || '—'}
                          </span>
                          <span className="contacts-panel__col-segment">
                            {contact.segments ? (
                              <div className="contacts-panel__segment-badges">
                                {contact.segments.split(',').filter(Boolean).map(seg => {
                                  const segInfo = SEGMENT_OPTIONS.find(s => s.value === seg);
                                  if (!segInfo) return null;
                                  return (
                                    <span
                                      key={seg}
                                      className={`contacts-panel__segment-badge contacts-panel__segment-badge--clickable ${segmentFilter === seg ? 'contacts-panel__segment-badge--active' : ''}`}
                                      style={{ background: `${segInfo.color}20`, color: segInfo.color }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSegmentFilter(segmentFilter === seg ? 'all' : seg);
                                      }}
                                      title={segmentFilter === seg ? 'Clique para remover filtro' : `Filtrar por ${segInfo.label}`}
                                    >
                                      {segInfo.label}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : '—'}
                          </span>
                          <span className="contacts-panel__col-last-contact">
                            {(() => {
                              const days = getDaysSinceLastContact(contact.last_contact_at);
                              if (days === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                              return (
                                <span
                                  className="contacts-panel__last-contact-badge"
                                  style={{ color: getLastContactColor(days) }}
                                  title={contact.last_contact_at ? new Date(contact.last_contact_at).toLocaleDateString('pt-BR') : ''}
                                >
                                  <Clock size={12} />
                                  {days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias`}
                                </span>
                              );
                            })()}
                          </span>
                          <span className="contacts-panel__col-status">
                            {contact.presente === 1 && (
                              <span className="contacts-panel__status-icon contacts-panel__status-icon--gift" title="Recebeu presente/brinde">
                                <Gift size={14} />
                              </span>
                            )}
                            {hasOverdue && (
                              <span className="contacts-panel__status-icon contacts-panel__status-icon--overdue" title="Follow-up atrasado">
                                <AlertCircle size={14} />
                              </span>
                            )}
                            {hasPending && !hasOverdue && (
                              <span className="contacts-panel__status-icon contacts-panel__status-icon--pending" title="Follow-up pendente">
                                <Bell size={14} />
                              </span>
                            )}
                            {(contact.notes_count ?? 0) > 0 && (
                              <span className="contacts-panel__status-icon" title={`${contact.notes_count} nota(s)`}>
                                <MessageSquare size={14} />
                              </span>
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          {/* New Contact Form Panel */}
          {isEditing && (
          <div className="contacts-panel__new-form-container">
              <div className="contacts-panel__form">
                <div className="contacts-panel__form-header">
                  <h3>Novo Contato</h3>
                  <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm">
                    <X size={16} />
                  </button>
                </div>

                <div className="contacts-panel__form-body">
                  <div className="form-group">
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Nome do contato"
                      autoFocus
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="label"><Mail size={14} /> Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="input"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div className="form-group">
                      <label className="label"><Phone size={14} /> Telefone</label>
                      <input
                        type="tel"
                        value={formatPhone(formData.phone)}
                        onChange={e => handlePhoneChange(e.target.value)}
                        className="input"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="label"><Building size={14} /> Empresa</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        className="input"
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div className="form-group">
                      <label className="label"><Briefcase size={14} /> Cargo</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className="input"
                        placeholder="Cargo/Função"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label"><MapPin size={14} /> Cidade</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="input"
                      placeholder="Cidade"
                      list="city-suggestions"
                    />
                    <datalist id="city-suggestions">
                      <option value="Gramado" />
                      <option value="Balneário Camboriú" />
                      <option value="São Paulo" />
                      <option value="Rio de Janeiro" />
                      <option value="Curitiba" />
                      <option value="Porto Alegre" />
                    </datalist>
                  </div>

                </div>

                <div className="contacts-panel__form-actions">
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={handleSaveContact} className="btn btn-primary" disabled={!formData.name.trim()}>
                    Salvar
                  </button>
                </div>
              </div>
          </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          loadContacts();
          loadPendingFollowups();
        }}
      />

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={detailContact}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailContact(null);
        }}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
      />

      {/* Reports Panel */}
      <ReportsPanel
        isOpen={showReportsPanel}
        onClose={() => setShowReportsPanel(false)}
      />

      {/* Follow-ups Calendar Panel */}
      <FollowupsPanel
        isOpen={showFollowupsPanel}
        onClose={() => setShowFollowupsPanel(false)}
        onOpenContact={(contactId) => {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            setDetailContact(contact);
            setShowDetailModal(true);
            setShowFollowupsPanel(false);
          }
        }}
      />

      {/* Agenda (Weekly Digest) Panel */}
      <WeeklyDigestPanel
        isOpen={showDigestPanel}
        onClose={() => setShowDigestPanel(false)}
      />

      {/* AI Insights Panel */}
      <InsightsPanel
        isOpen={showInsightsPanel}
        onClose={() => setShowInsightsPanel(false)}
        onOpenContact={(contactId) => {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            setDetailContact(contact);
            setShowDetailModal(true);
            setShowInsightsPanel(false);
          }
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir contatos?"
        message={`${selectedIds.size} contato(s) serão excluídos permanentemente. Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

