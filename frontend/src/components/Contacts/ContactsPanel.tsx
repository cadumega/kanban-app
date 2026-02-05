import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  User,
  Building,
  Mail,
  Phone,
  Briefcase,
  Trash2,
  MessageSquare,
  Send,
  Image,
  Loader2,
  Calendar,
  Clock,
  Check,
  Bell,
  Search,
  Tag,
  MapPin,
  List,
  LayoutGrid,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import type { Contact, ContactFollowup, ContactTag } from '../../types';
import * as api from '../../services/api';
import './ContactsPanel.css';

interface ContactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'kanban';
type SortField = 'name' | 'company' | 'city' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

// Tag options for funnel stages
const TAG_OPTIONS: { value: ContactTag; label: string; color: string }[] = [
  { value: null, label: 'Sem tag', color: '#71717A' },
  { value: 'lead', label: 'Lead', color: '#3B82F6' },
  { value: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
  { value: 'proposta', label: 'Proposta', color: '#F59E0B' },
  { value: 'negociacao', label: 'Negociação', color: '#EC4899' },
  { value: 'cliente', label: 'Cliente', color: '#22C55E' },
  { value: 'perdido', label: 'Perdido', color: '#EF4444' },
];

// Funnel stages for Kanban (excluding null)
const FUNNEL_STAGES = TAG_OPTIONS.filter(t => t.value !== null);

const getTagInfo = (tag: ContactTag) => {
  return TAG_OPTIONS.find(t => t.value === tag) || TAG_OPTIONS[0];
};

export function ContactsPanel({ isOpen, onClose }: ContactsPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingNote, setSendingNote] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [followupFilter, setFollowupFilter] = useState<string>('all'); // all, has, none, overdue
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [, setShowBulkActions] = useState(false);
  const [bulkTag, setBulkTag] = useState<ContactTag>(null);
  const [bulkFollowupDays, setBulkFollowupDays] = useState<number | null>(null);

  // Follow-up state
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupDescription, setFollowupDescription] = useState('');

  // All pending followups for filtering
  const [allPendingFollowups, setAllPendingFollowups] = useState<ContactFollowup[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    tag: null as ContactTag,
    city: '',
  });

  // Drag state for Kanban
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      loadPendingFollowups();
    } else {
      // Reset state when closing
      setSelectedContact(null);
      setSelectedIds(new Set());
      setIsEditing(false);
    }
  }, [isOpen]);

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

  const loadContactDetails = async (id: string) => {
    try {
      const [contactData, followupsData] = await Promise.all([
        api.getContact(id),
        api.getContactFollowups(id),
      ]);
      setSelectedContact(contactData);
      setFollowups(followupsData);
    } catch (err) {
      console.error('Erro ao carregar contato:', err);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    loadContactDetails(contact.id);
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

      // Tag filter
      if (tagFilter !== 'all') {
        if (tagFilter === 'none' && contact.tag) return false;
        if (tagFilter !== 'none' && contact.tag !== tagFilter) return false;
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
          contact.city?.toLowerCase().includes(query) ||
          getTagInfo(contact.tag).label.toLowerCase().includes(query)
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
  }, [contacts, cityFilter, tagFilter, followupFilter, searchQuery, sortField, sortOrder, allPendingFollowups]);

  // Group contacts by tag for Kanban view
  const contactsByTag = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    FUNNEL_STAGES.forEach(stage => {
      groups[stage.value!] = filteredContacts.filter(c => c.tag === stage.value);
    });
    // Add "Sem tag" group
    groups['none'] = filteredContacts.filter(c => !c.tag);
    return groups;
  }, [filteredContacts]);

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
  const handleBulkApplyTag = async () => {
    if (selectedIds.size === 0) return;

    try {
      const promises = Array.from(selectedIds).map(id =>
        api.updateContact(id, { tag: bulkTag })
      );
      await Promise.all(promises);

      // Update local state
      setContacts(prev =>
        prev.map(c => selectedIds.has(c.id) ? { ...c, tag: bulkTag } : c)
      );

      setSelectedIds(new Set());
      setShowBulkActions(false);
      setBulkTag(null);
    } catch (err) {
      console.error('Erro ao aplicar tag em lote:', err);
    }
  };

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} contato(s)?`)) return;

    try {
      const promises = Array.from(selectedIds).map(id =>
        api.deleteContact(id)
      );
      await Promise.all(promises);

      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setShowBulkActions(false);

      if (selectedContact && selectedIds.has(selectedContact.id)) {
        setSelectedContact(null);
      }
    } catch (err) {
      console.error('Erro ao excluir contatos em lote:', err);
    }
  };

  // Drag and drop for Kanban
  const handleDragStart = (contact: Contact) => {
    setDraggedContact(contact);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newTag: ContactTag) => {
    if (!draggedContact || draggedContact.tag === newTag) {
      setDraggedContact(null);
      return;
    }

    try {
      await api.updateContact(draggedContact.id, { tag: newTag });
      setContacts(prev =>
        prev.map(c => c.id === draggedContact.id ? { ...c, tag: newTag } : c)
      );
    } catch (err) {
      console.error('Erro ao atualizar contato:', err);
    }

    setDraggedContact(null);
  };

  const handleNewContact = () => {
    setFormData({ name: '', email: '', phone: '', company: '', role: '', tag: null, city: '' });
    setIsEditing(true);
    setSelectedContact(null);
  };

  const handleEditContact = () => {
    if (selectedContact) {
      setFormData({
        name: selectedContact.name,
        email: selectedContact.email || '',
        phone: selectedContact.phone || '',
        company: selectedContact.company || '',
        role: selectedContact.role || '',
        tag: selectedContact.tag,
        city: selectedContact.city || '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) return;

    try {
      if (selectedContact) {
        const updated = await api.updateContact(selectedContact.id, formData);
        setContacts(prev => prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));
        setSelectedContact({ ...selectedContact, ...updated });
      } else {
        const created = await api.createContact(formData);
        setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedContact(created);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact || !confirm(`Excluir ${selectedContact.name}?`)) return;

    try {
      await api.deleteContact(selectedContact.id);
      setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
      setSelectedContact(null);
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
    }
  };

  const handleAddNote = async () => {
    if (!selectedContact || (!newNote.trim() && !selectedImage)) return;

    setSendingNote(true);
    try {
      const note = await api.addContactNote(selectedContact.id, newNote, selectedImage || undefined);
      setSelectedContact({
        ...selectedContact,
        notes: [note, ...(selectedContact.notes || [])],
      });
      setNewNote('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Erro ao adicionar nota:', err);
    } finally {
      setSendingNote(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. Máximo 5MB.');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedContact) return;

    try {
      await api.deleteContactNote(selectedContact.id, noteId);
      setSelectedContact({
        ...selectedContact,
        notes: selectedContact.notes?.filter(n => n.id !== noteId),
      });
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
    }
  };

  // Follow-up functions
  const addDaysToDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleQuickFollowup = async (days: number) => {
    if (!selectedContact) return;
    const date = addDaysToDate(days);
    try {
      const followup = await api.createFollowup(selectedContact.id, date, '');
      setFollowups(prev => [...prev, followup].sort((a, b) => a.date.localeCompare(b.date)));
      await loadPendingFollowups();
    } catch (err) {
      console.error('Erro ao criar follow-up:', err);
    }
  };

  const handleCreateFollowup = async () => {
    if (!selectedContact || !followupDate) return;
    try {
      const followup = await api.createFollowup(selectedContact.id, followupDate, followupDescription);
      setFollowups(prev => [...prev, followup].sort((a, b) => a.date.localeCompare(b.date)));
      setShowFollowupForm(false);
      setFollowupDate('');
      setFollowupDescription('');
      await loadPendingFollowups();
    } catch (err) {
      console.error('Erro ao criar follow-up:', err);
    }
  };

  const handleToggleFollowup = async (followup: ContactFollowup) => {
    if (!selectedContact) return;
    try {
      const updated = await api.updateFollowup(selectedContact.id, followup.id, {
        completed: !followup.completed,
      });
      setFollowups(prev => prev.map(f => (f.id === followup.id ? updated : f)));
      await loadPendingFollowups();
    } catch (err) {
      console.error('Erro ao atualizar follow-up:', err);
    }
  };

  const handleDeleteFollowup = async (followupId: string) => {
    if (!selectedContact) return;
    try {
      await api.deleteFollowup(selectedContact.id, followupId);
      setFollowups(prev => prev.filter(f => f.id !== followupId));
      await loadPendingFollowups();
    } catch (err) {
      console.error('Erro ao excluir follow-up:', err);
    }
  };

  const getFollowupStatus = (date: string, completed: number) => {
    if (completed) return 'completed';
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'overdue';
    if (date === today) return 'today';
    const weekFromNow = addDaysToDate(7);
    if (date <= weekFromNow) return 'soon';
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getWhatsAppLink = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    const fullNumber = numbers.length <= 11 ? `55${numbers}` : numbers;
    return `https://wa.me/${fullNumber}`;
  };

  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    setFormData({ ...formData, phone: numbers });
  };

  const activeFiltersCount = [
    cityFilter !== 'all',
    tagFilter !== 'all',
    followupFilter !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCityFilter('all');
    setTagFilter('all');
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
            {/* View toggle */}
            <div className="contacts-panel__view-toggle">
              <button
                onClick={() => setViewMode('list')}
                className={`contacts-panel__view-btn ${viewMode === 'list' ? 'contacts-panel__view-btn--active' : ''}`}
                title="Lista"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`contacts-panel__view-btn ${viewMode === 'kanban' ? 'contacts-panel__view-btn--active' : ''}`}
                title="Kanban do Funil"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

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
            >
              <Filter size={16} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="contacts-panel__filter-badge">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          <div className="contacts-panel__header-right">
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
              {/* Tag filter */}
              <div className="contacts-panel__filter-group">
                <label className="contacts-panel__filter-label"><Tag size={12} /> Etapa</label>
                <select className="contacts-panel__filter-select" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                  <option value="all">Todas</option>
                  <option value="none">Sem tag</option>
                  {FUNNEL_STAGES.map(stage => (
                    <option key={stage.value} value={stage.value!}>{stage.label}</option>
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
                <select value={bulkTag || ''} onChange={e => setBulkTag(e.target.value as ContactTag || null)}>
                  <option value="">Aplicar tag...</option>
                  {TAG_OPTIONS.map(opt => (
                    <option key={opt.value || 'none'} value={opt.value || ''}>{opt.label}</option>
                  ))}
                </select>
                <button onClick={handleBulkApplyTag} disabled={bulkTag === null && bulkTag !== null} className="btn btn-sm btn-secondary">
                  Aplicar
                </button>
              </div>
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
          {/* Contacts List/Kanban */}
          {viewMode === 'list' ? (
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
                  <span>Cidade</span>
                  <span>Etapa</span>
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
                          selectedContact?.id === contact.id ? 'contacts-panel__list-row--active' : ''
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
                          <span className="contacts-panel__col-city">
                            {contact.city || '—'}
                          </span>
                          <span className="contacts-panel__col-tag">
                            {contact.tag ? (
                              <span
                                className="contacts-panel__tag-badge"
                                style={{ background: getTagInfo(contact.tag).color }}
                              >
                                {getTagInfo(contact.tag).label}
                              </span>
                            ) : (
                              <span className="contacts-panel__tag-badge--empty">—</span>
                            )}
                          </span>
                          <span className="contacts-panel__col-status">
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
          ) : (
            /* Kanban View */
            <div className="contacts-panel__kanban">
              {/* Sem tag column */}
              <div
                className="contacts-panel__kanban-column"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(null)}
              >
                <div className="contacts-panel__kanban-column-header" style={{ borderColor: '#71717A' }}>
                  <span>Sem Tag</span>
                  <span className="contacts-panel__kanban-column-count">{contactsByTag['none']?.length || 0}</span>
                </div>
                <div className="contacts-panel__kanban-column-body">
                  {contactsByTag['none']?.map(contact => (
                    <KanbanCard
                      key={contact.id}
                      contact={contact}
                      onDragStart={() => handleDragStart(contact)}
                      onClick={() => handleSelectContact(contact)}
                      isSelected={selectedContact?.id === contact.id}
                      hasOverdue={contactHasOverdueFollowup(contact.id)}
                      hasPending={contactHasPendingFollowup(contact.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Funnel stage columns */}
              {FUNNEL_STAGES.map(stage => (
                <div
                  key={stage.value}
                  className="contacts-panel__kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.value)}
                >
                  <div className="contacts-panel__kanban-column-header" style={{ borderColor: stage.color }}>
                    <span style={{ color: stage.color }}>{stage.label}</span>
                    <span className="contacts-panel__kanban-column-count">{contactsByTag[stage.value!]?.length || 0}</span>
                  </div>
                  <div className="contacts-panel__kanban-column-body">
                    {contactsByTag[stage.value!]?.map(contact => (
                      <KanbanCard
                        key={contact.id}
                        contact={contact}
                        onDragStart={() => handleDragStart(contact)}
                        onClick={() => handleSelectContact(contact)}
                        isSelected={selectedContact?.id === contact.id}
                        hasOverdue={contactHasOverdueFollowup(contact.id)}
                        hasPending={contactHasPendingFollowup(contact.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Detail Panel */}
          <div className={`contacts-panel__detail ${selectedContact || isEditing ? 'contacts-panel__detail--open' : ''}`}>
            {isEditing ? (
              // Edit form
              <div className="contacts-panel__form">
                <div className="contacts-panel__form-header">
                  <h3>{selectedContact ? 'Editar Contato' : 'Novo Contato'}</h3>
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

                  <div className="form-group">
                    <label className="label"><Tag size={14} /> Etapa do Funil</label>
                    <div className="contacts-panel__tag-selector">
                      {TAG_OPTIONS.map(option => (
                        <button
                          key={option.value || 'none'}
                          type="button"
                          onClick={() => setFormData({ ...formData, tag: option.value })}
                          className={`contacts-panel__tag-option ${formData.tag === option.value ? 'contacts-panel__tag-option--active' : ''}`}
                          style={{
                            '--tag-color': option.color,
                            borderColor: formData.tag === option.value ? option.color : undefined,
                            background: formData.tag === option.value ? `${option.color}15` : undefined,
                          } as React.CSSProperties}
                        >
                          <span className="contacts-panel__tag-dot" style={{ background: option.color }} />
                          {option.label}
                        </button>
                      ))}
                    </div>
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
            ) : selectedContact ? (
              // Contact details
              <div className="contacts-panel__contact">
                <div className="contacts-panel__contact-header">
                  <button onClick={() => setSelectedContact(null)} className="btn btn-ghost btn-sm">
                    <X size={16} />
                  </button>
                  <div className="contacts-panel__contact-avatar">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contacts-panel__contact-info">
                    <h3>{selectedContact.name}</h3>
                    {selectedContact.role && selectedContact.company && (
                      <p>{selectedContact.role} @ {selectedContact.company}</p>
                    )}
                    {selectedContact.tag && (
                      <span
                        className="contacts-panel__tag-badge"
                        style={{ background: getTagInfo(selectedContact.tag).color }}
                      >
                        {getTagInfo(selectedContact.tag).label}
                      </span>
                    )}
                  </div>
                  <div className="contacts-panel__contact-actions">
                    <button onClick={handleEditContact} className="btn btn-ghost btn-sm">
                      Editar
                    </button>
                    <button onClick={handleDeleteContact} className="btn btn-ghost btn-sm btn-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Info cards */}
                <div className="contacts-panel__contact-details">
                  {selectedContact.email && (
                    <div className="contacts-panel__info-card">
                      <Mail size={14} />
                      <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="contacts-panel__info-card contacts-panel__info-card--phone">
                      <Phone size={14} />
                      <span className="contacts-panel__phone-number">{formatPhone(selectedContact.phone)}</span>
                      <div className="contacts-panel__phone-actions">
                        <a href={`tel:${selectedContact.phone}`} className="contacts-panel__phone-btn" title="Ligar">
                          <Phone size={14} />
                        </a>
                        <a
                          href={getWhatsAppLink(selectedContact.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contacts-panel__phone-btn contacts-panel__phone-btn--whatsapp"
                          title="Abrir WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedContact.company && (
                    <div className="contacts-panel__info-card">
                      <Building size={14} />
                      <span>{selectedContact.company}</span>
                    </div>
                  )}
                  {selectedContact.city && (
                    <div className="contacts-panel__info-card">
                      <MapPin size={14} />
                      <span>{selectedContact.city}</span>
                    </div>
                  )}
                </div>

                {/* Follow-ups */}
                <div className="contacts-panel__followups">
                  <div className="contacts-panel__followups-header">
                    <h4><Bell size={16} /> Follow-ups</h4>
                    <div className="contacts-panel__followups-quick">
                      <button onClick={() => handleQuickFollowup(7)} className="btn btn-ghost btn-xs">7d</button>
                      <button onClick={() => handleQuickFollowup(15)} className="btn btn-ghost btn-xs">15d</button>
                      <button onClick={() => handleQuickFollowup(30)} className="btn btn-ghost btn-xs">30d</button>
                      <button onClick={() => handleQuickFollowup(90)} className="btn btn-ghost btn-xs">3m</button>
                      <button onClick={() => setShowFollowupForm(true)} className="btn btn-ghost btn-xs">
                        <Calendar size={12} />
                      </button>
                    </div>
                  </div>

                  {showFollowupForm && (
                    <div className="contacts-panel__followup-form">
                      <input
                        type="date"
                        value={followupDate}
                        onChange={e => setFollowupDate(e.target.value)}
                        className="input input-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <input
                        type="text"
                        value={followupDescription}
                        onChange={e => setFollowupDescription(e.target.value)}
                        className="input input-sm"
                        placeholder="Descrição (opcional)"
                      />
                      <div className="contacts-panel__followup-form-actions">
                        <button onClick={() => setShowFollowupForm(false)} className="btn btn-ghost btn-xs">Cancelar</button>
                        <button onClick={handleCreateFollowup} disabled={!followupDate} className="btn btn-primary btn-xs">Adicionar</button>
                      </div>
                    </div>
                  )}

                  {/* Mini-timeline */}
                  {followups.length > 0 && (() => {
                    const pendingFollowups = followups.filter(f => !f.completed);
                    if (pendingFollowups.length === 0) return null;

                    const dates = pendingFollowups.map(f => new Date(f.date + 'T00:00:00').getTime());
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayTime = today.getTime();

                    const minDate = Math.min(todayTime, ...dates);
                    const maxDate = Math.max(todayTime, ...dates);
                    const range = maxDate - minDate || 1;
                    const padding = range * 0.05;
                    const start = minDate - padding;
                    const end = maxDate + padding;
                    const totalRange = end - start || 1;

                    const getPos = (time: number) => ((time - start) / totalRange) * 100;
                    const todayPos = getPos(todayTime);

                    return (
                      <div className="contacts-panel__mini-timeline">
                        <div className="contacts-panel__mini-timeline-bar">
                          <div className="contacts-panel__mini-timeline-today" style={{ left: `${todayPos}%` }} title="Hoje">
                            <span className="contacts-panel__mini-timeline-today-label">Hoje</span>
                          </div>
                          {pendingFollowups.map(f => {
                            const fTime = new Date(f.date + 'T00:00:00').getTime();
                            const pos = getPos(fTime);
                            const status = getFollowupStatus(f.date, 0);
                            return (
                              <div
                                key={f.id}
                                className={`contacts-panel__mini-timeline-marker contacts-panel__mini-timeline-marker--${status}`}
                                style={{ left: `${pos}%` }}
                                title={`${formatFollowupDate(f.date)}${f.description ? ': ' + f.description : ''}`}
                              />
                            );
                          })}
                        </div>
                        <div className="contacts-panel__mini-timeline-labels">
                          <span>{new Date(minDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                          <span>{new Date(maxDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="contacts-panel__followups-list">
                    {followups.map(followup => {
                      const status = getFollowupStatus(followup.date, followup.completed);
                      return (
                        <div key={followup.id} className={`contacts-panel__followup contacts-panel__followup--${status}`}>
                          <button
                            onClick={() => handleToggleFollowup(followup)}
                            className={`contacts-panel__followup-check ${followup.completed ? 'contacts-panel__followup-check--done' : ''}`}
                          >
                            {followup.completed ? <Check size={12} /> : null}
                          </button>
                          <div className="contacts-panel__followup-content">
                            <span className="contacts-panel__followup-date">
                              <Clock size={12} />
                              {formatFollowupDate(followup.date)}
                            </span>
                            {followup.description && (
                              <span className="contacts-panel__followup-desc">{followup.description}</span>
                            )}
                          </div>
                          <button onClick={() => handleDeleteFollowup(followup.id)} className="contacts-panel__followup-delete">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {followups.length === 0 && (
                      <p className="contacts-panel__followups-empty">Nenhum follow-up agendado</p>
                    )}
                  </div>
                </div>

                {/* Notes history */}
                <div className="contacts-panel__notes">
                  <h4><MessageSquare size={16} /> Histórico de Notas</h4>

                  <div className="contacts-panel__notes-input">
                    <div className="contacts-panel__notes-input-wrapper">
                      <textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Adicionar uma nota sobre este contato..."
                        rows={2}
                        className="input textarea"
                      />
                      {imagePreview && (
                        <div className="contacts-panel__image-preview">
                          <img src={imagePreview} alt="Preview" />
                          <button onClick={handleRemoveImage} className="contacts-panel__image-preview-remove">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="contacts-panel__notes-input-actions">
                      <label className="btn btn-ghost contacts-panel__image-btn">
                        <Image size={16} />
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageSelect} hidden />
                      </label>
                      <button onClick={handleAddNote} disabled={(!newNote.trim() && !selectedImage) || sendingNote} className="btn btn-primary">
                        {sendingNote ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="contacts-panel__notes-list">
                    {selectedContact.notes?.map(note => (
                      <div key={note.id} className="contacts-panel__note">
                        <div className="contacts-panel__note-header">
                          <span className="contacts-panel__note-date">{formatDate(note.created_at)}</span>
                          <button onClick={() => handleDeleteNote(note.id)} className="contacts-panel__note-delete">
                            <X size={12} />
                          </button>
                        </div>
                        {note.content && <p className="contacts-panel__note-content">{note.content}</p>}
                        {note.image_path && (
                          <div className="contacts-panel__note-image">
                            <img
                              src={api.getContactImageUrl(note.image_path)}
                              alt="Imagem da nota"
                              onClick={() => window.open(api.getContactImageUrl(note.image_path!), '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {(!selectedContact.notes || selectedContact.notes.length === 0) && (
                      <p className="contacts-panel__notes-empty">Nenhuma nota ainda. Adicione a primeira!</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="contacts-panel__placeholder">
                <User size={48} />
                <p>Selecione um contato para ver detalhes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kanban Card component
interface KanbanCardProps {
  contact: Contact;
  onDragStart: () => void;
  onClick: () => void;
  isSelected: boolean;
  hasOverdue: boolean;
  hasPending: boolean;
}

function KanbanCard({ contact, onDragStart, onClick, isSelected, hasOverdue, hasPending }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`contacts-panel__kanban-card ${isSelected ? 'contacts-panel__kanban-card--selected' : ''}`}
    >
      <div className="contacts-panel__kanban-card-header">
        <div className="contacts-panel__kanban-card-avatar">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="contacts-panel__kanban-card-info">
          <span className="contacts-panel__kanban-card-name">{contact.name}</span>
          {contact.company && (
            <span className="contacts-panel__kanban-card-company">{contact.company}</span>
          )}
        </div>
        {(hasOverdue || hasPending) && (
          <span className={`contacts-panel__kanban-card-indicator ${hasOverdue ? 'contacts-panel__kanban-card-indicator--overdue' : ''}`}>
            {hasOverdue ? <AlertCircle size={12} /> : <Bell size={12} />}
          </span>
        )}
      </div>
      {contact.city && (
        <div className="contacts-panel__kanban-card-footer">
          <MapPin size={10} />
          <span>{contact.city}</span>
        </div>
      )}
    </div>
  );
}
