import { useState, useEffect } from 'react';
import {
  X,
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
  MapPin,
  Edit3,
  ExternalLink,
  Bot,
  Link,
  DollarSign,
} from 'lucide-react';
import type { Contact, ContactFollowup, ContactTag } from '../../types';
import * as api from '../../services/api';

interface ContactDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdated: (contact: Contact) => void;
  onContactDeleted: (contactId: string) => void;
}

const TAG_OPTIONS: { value: ContactTag; label: string; color: string }[] = [
  { value: null, label: 'Sem tag', color: '#71717A' },
  { value: 'lead', label: 'Lead', color: '#3B82F6' },
  { value: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
  { value: 'proposta', label: 'Proposta', color: '#F59E0B' },
  { value: 'negociacao', label: 'Negociação', color: '#EC4899' },
  { value: 'cliente', label: 'Cliente', color: '#22C55E' },
  { value: 'perdido', label: 'Perdido', color: '#EF4444' },
];

const getTagInfo = (tag: ContactTag) => {
  return TAG_OPTIONS.find(t => t.value === tag) || TAG_OPTIONS[0];
};

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
  onContactUpdated,
  onContactDeleted,
}: ContactDetailModalProps) {
  const [contactData, setContactData] = useState<Contact | null>(null);
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingNote, setSendingNote] = useState(false);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupDescription, setFollowupDescription] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phone_robot: '',
    whatsapp_redirect: '',
    company: '',
    role: '',
    tag: null as ContactTag,
    city: '',
    valor_implementacao: 0,
    valor_mensal: 0,
    is_robot: false,
  });

  useEffect(() => {
    if (isOpen && contact) {
      loadContactDetails(contact.id);
    } else {
      setContactData(null);
      setFollowups([]);
      setIsEditing(false);
    }
  }, [isOpen, contact]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isEditing, onClose]);

  const loadContactDetails = async (id: string) => {
    try {
      const [data, followupsData] = await Promise.all([
        api.getContact(id),
        api.getContactFollowups(id),
      ]);
      setContactData(data);
      setFollowups(followupsData);
    } catch (err) {
      console.error('Erro ao carregar contato:', err);
    }
  };

  const handleEditContact = () => {
    if (contactData) {
      setFormData({
        name: contactData.name,
        email: contactData.email || '',
        phone: contactData.phone || '',
        phone_robot: contactData.phone_robot || '',
        whatsapp_redirect: contactData.whatsapp_redirect || '',
        company: contactData.company || '',
        role: contactData.role || '',
        tag: contactData.tag,
        city: contactData.city || '',
        valor_implementacao: contactData.valor_implementacao || 0,
        valor_mensal: contactData.valor_mensal || 0,
        is_robot: !!contactData.is_robot,
      });
      setIsEditing(true);
    }
  };

  const handleSaveContact = async () => {
    if (!contactData || !formData.name.trim()) return;

    try {
      const dataToSave = {
        ...formData,
        is_robot: formData.is_robot ? 1 : 0, // Convert boolean to number for API
      };
      const updated = await api.updateContact(contactData.id, dataToSave);
      setContactData({ ...contactData, ...updated });
      onContactUpdated({ ...contactData, ...updated });
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactData || !confirm(`Excluir ${contactData.name}?`)) return;

    try {
      await api.deleteContact(contactData.id);
      onContactDeleted(contactData.id);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
    }
  };

  const handleAddNote = async () => {
    if (!contactData || (!newNote.trim() && !selectedImage)) return;

    setSendingNote(true);
    try {
      const note = await api.addContactNote(contactData.id, newNote, selectedImage || undefined, noteDate);
      setContactData({
        ...contactData,
        notes: [note, ...(contactData.notes || [])].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      });
      setNewNote('');
      setNoteDate(new Date().toISOString().split('T')[0]);
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
    if (!contactData) return;

    try {
      await api.deleteContactNote(contactData.id, noteId);
      setContactData({
        ...contactData,
        notes: contactData.notes?.filter(n => n.id !== noteId),
      });
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
    }
  };

  const addDaysToDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleQuickFollowup = async (days: number) => {
    if (!contactData) return;
    const date = addDaysToDate(days);
    try {
      const followup = await api.createFollowup(contactData.id, date, '');
      setFollowups(prev => [...prev, followup].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      console.error('Erro ao criar follow-up:', err);
    }
  };

  const handleCreateFollowup = async () => {
    if (!contactData || !followupDate) return;
    try {
      const followup = await api.createFollowup(contactData.id, followupDate, followupDescription);
      setFollowups(prev => [...prev, followup].sort((a, b) => a.date.localeCompare(b.date)));
      setShowFollowupForm(false);
      setFollowupDate('');
      setFollowupDescription('');
    } catch (err) {
      console.error('Erro ao criar follow-up:', err);
    }
  };

  const handleToggleFollowup = async (followup: ContactFollowup) => {
    if (!contactData) return;
    try {
      const updated = await api.updateFollowup(contactData.id, followup.id, {
        completed: !followup.completed,
      });
      setFollowups(prev => prev.map(f => (f.id === followup.id ? updated : f)));
    } catch (err) {
      console.error('Erro ao atualizar follow-up:', err);
    }
  };

  const handleDeleteFollowup = async (followupId: string) => {
    if (!contactData) return;
    try {
      await api.deleteFollowup(contactData.id, followupId);
      setFollowups(prev => prev.filter(f => f.id !== followupId));
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
    const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Atrasado - ${formattedDate}`;
    if (diffDays === 0) return `Retornar hoje - ${formattedDate}`;
    return `Retornar em ${formattedDate}`;
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

  if (!isOpen || !contact) return null;

  return (
    <div className="contact-detail-modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="contact-detail-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="contact-detail-modal__header">
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={20} />
          </button>
        </div>

        {!contactData ? (
          <div className="contact-detail-modal__loading">
            <Loader2 size={32} className="spin" />
            <span>Carregando...</span>
          </div>
        ) : isEditing ? (
          /* Edit Form */
          <div className="contact-detail-modal__edit">
            <div className="contact-detail-modal__edit-header">
              <h3>Editar Contato</h3>
            </div>

            <div className="contact-detail-modal__edit-body">
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
                />
              </div>

              {/* Robô / Automação */}
              <div className="contact-detail-modal__section-divider">
                <span><Bot size={14} /> Automação / Robô</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label"><Phone size={14} /> Tel. Robô</label>
                  <input
                    type="tel"
                    value={formatPhone(formData.phone_robot)}
                    onChange={e => {
                      const numbers = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, phone_robot: numbers });
                    }}
                    className="input"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="label"><Link size={14} /> Link WhatsApp</label>
                  <input
                    type="url"
                    value={formData.whatsapp_redirect}
                    onChange={e => setFormData({ ...formData, whatsapp_redirect: e.target.value })}
                    className="input"
                    placeholder="https://wa.me/..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="contact-detail-modal__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_robot}
                    onChange={e => setFormData({ ...formData, is_robot: e.target.checked })}
                  />
                  <Bot size={16} />
                  <span>Cliente com Robô/Automação ativo</span>
                </label>
              </div>

              {/* Valores */}
              <div className="contact-detail-modal__section-divider">
                <span><DollarSign size={14} /> Valores</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Implementação (R$)</label>
                  <input
                    type="number"
                    value={formData.valor_implementacao || ''}
                    onChange={e => setFormData({ ...formData, valor_implementacao: parseFloat(e.target.value) || 0 })}
                    className="input"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Mensal (R$)</label>
                  <input
                    type="number"
                    value={formData.valor_mensal || ''}
                    onChange={e => setFormData({ ...formData, valor_mensal: parseFloat(e.target.value) || 0 })}
                    className="input"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Etapa do Funil</label>
                <div className="contact-detail-modal__tag-selector">
                  {TAG_OPTIONS.map(option => (
                    <button
                      key={option.value || 'none'}
                      type="button"
                      onClick={() => setFormData({ ...formData, tag: option.value })}
                      className={`contact-detail-modal__tag-option ${formData.tag === option.value ? 'contact-detail-modal__tag-option--active' : ''}`}
                      style={{
                        '--tag-color': option.color,
                        borderColor: formData.tag === option.value ? option.color : undefined,
                        background: formData.tag === option.value ? `${option.color}15` : undefined,
                      } as React.CSSProperties}
                    >
                      <span className="contact-detail-modal__tag-dot" style={{ background: option.color }} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="contact-detail-modal__edit-actions">
              <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-lg">
                Cancelar
              </button>
              <button onClick={handleSaveContact} className="btn btn-primary btn-lg" disabled={!formData.name.trim()}>
                Salvar
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="contact-detail-modal__content">
            {/* Profile Section */}
            <div className="contact-detail-modal__profile">
              <div className="contact-detail-modal__avatar">
                {contactData.name.charAt(0).toUpperCase()}
              </div>
              <div className="contact-detail-modal__profile-info">
                <h2>{contactData.name}</h2>
                {contactData.role && contactData.company && (
                  <p className="contact-detail-modal__role">
                    {contactData.role} @ {contactData.company}
                  </p>
                )}
                {contactData.tag && (
                  <span
                    className="contact-detail-modal__tag-badge"
                    style={{ background: getTagInfo(contactData.tag).color }}
                  >
                    {getTagInfo(contactData.tag).label}
                  </span>
                )}
              </div>
              <div className="contact-detail-modal__profile-actions">
                <button onClick={handleEditContact} className="btn btn-secondary">
                  <Edit3 size={14} /> Editar
                </button>
                <button onClick={handleDeleteContact} className="btn btn-ghost btn-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="contact-detail-modal__info-grid">
              {contactData.email && (
                <a href={`mailto:${contactData.email}`} className="contact-detail-modal__info-card">
                  <Mail size={18} />
                  <div>
                    <span className="contact-detail-modal__info-label">Email</span>
                    <span className="contact-detail-modal__info-value">{contactData.email}</span>
                  </div>
                  <ExternalLink size={14} className="contact-detail-modal__info-link" />
                </a>
              )}

              {contactData.phone && (
                <div className="contact-detail-modal__info-card contact-detail-modal__info-card--phone">
                  <Phone size={18} />
                  <div>
                    <span className="contact-detail-modal__info-label">Telefone</span>
                    <span className="contact-detail-modal__info-value">{formatPhone(contactData.phone)}</span>
                  </div>
                  <div className="contact-detail-modal__phone-actions">
                    <a href={`tel:${contactData.phone}`} className="contact-detail-modal__phone-btn" title="Ligar">
                      <Phone size={16} />
                    </a>
                    <a
                      href={getWhatsAppLink(contactData.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-detail-modal__phone-btn contact-detail-modal__phone-btn--whatsapp"
                      title="WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {contactData.company && (
                <div className="contact-detail-modal__info-card">
                  <Building size={18} />
                  <div>
                    <span className="contact-detail-modal__info-label">Empresa</span>
                    <span className="contact-detail-modal__info-value">{contactData.company}</span>
                  </div>
                </div>
              )}

              {contactData.city && (
                <div className="contact-detail-modal__info-card">
                  <MapPin size={18} />
                  <div>
                    <span className="contact-detail-modal__info-label">Cidade</span>
                    <span className="contact-detail-modal__info-value">{contactData.city}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="contact-detail-modal__columns">
              {/* Left: Follow-ups */}
              <div className="contact-detail-modal__column">
                <div className="contact-detail-modal__section">
                  <div className="contact-detail-modal__section-header">
                    <h4><Bell size={16} /> Follow-ups</h4>
                    <div className="contact-detail-modal__followup-quick">
                      <button onClick={() => handleQuickFollowup(7)} className="btn btn-ghost btn-xs">7d</button>
                      <button onClick={() => handleQuickFollowup(15)} className="btn btn-ghost btn-xs">15d</button>
                      <button onClick={() => handleQuickFollowup(30)} className="btn btn-ghost btn-xs">30d</button>
                      <button onClick={() => setShowFollowupForm(true)} className="btn btn-ghost btn-xs">
                        <Calendar size={12} />
                      </button>
                    </div>
                  </div>

                  {showFollowupForm && (
                    <div className="contact-detail-modal__followup-form">
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
                      <div className="contact-detail-modal__followup-form-actions">
                        <button onClick={() => setShowFollowupForm(false)} className="btn btn-ghost btn-xs">Cancelar</button>
                        <button onClick={handleCreateFollowup} disabled={!followupDate} className="btn btn-primary btn-xs">Adicionar</button>
                      </div>
                    </div>
                  )}

                  <div className="contact-detail-modal__followups-list">
                    {followups.map(followup => {
                      const status = getFollowupStatus(followup.date, followup.completed);
                      return (
                        <div key={followup.id} className={`contact-detail-modal__followup contact-detail-modal__followup--${status}`}>
                          <button
                            onClick={() => handleToggleFollowup(followup)}
                            className={`contact-detail-modal__followup-check ${followup.completed ? 'contact-detail-modal__followup-check--done' : ''}`}
                          >
                            {followup.completed ? <Check size={12} /> : null}
                          </button>
                          <div className="contact-detail-modal__followup-content">
                            <span className="contact-detail-modal__followup-date">
                              <Clock size={12} />
                              {formatFollowupDate(followup.date)}
                            </span>
                            {followup.description && (
                              <span className="contact-detail-modal__followup-desc">{followup.description}</span>
                            )}
                          </div>
                          <button onClick={() => handleDeleteFollowup(followup.id)} className="contact-detail-modal__followup-delete">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {followups.length === 0 && (
                      <p className="contact-detail-modal__empty">Nenhum follow-up agendado</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Notes */}
              <div className="contact-detail-modal__column">
                <div className="contact-detail-modal__section contact-detail-modal__section--notes">
                  <div className="contact-detail-modal__section-header">
                    <h4><MessageSquare size={16} /> Notas</h4>
                  </div>

                  <div className="contact-detail-modal__notes-input">
                    <div className="contact-detail-modal__notes-input-wrapper">
                      <textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Adicionar uma nota..."
                        rows={3}
                        className="input textarea"
                      />
                      {imagePreview && (
                        <div className="contact-detail-modal__image-preview">
                          <img src={imagePreview} alt="Preview" />
                          <button onClick={handleRemoveImage} className="contact-detail-modal__image-preview-remove">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="contact-detail-modal__notes-input-actions">
                      <div className="contact-detail-modal__notes-date">
                        <Calendar size={14} />
                        <input
                          type="date"
                          value={noteDate}
                          onChange={e => setNoteDate(e.target.value)}
                          className="input input-sm"
                        />
                      </div>
                      <label className="btn btn-ghost contact-detail-modal__image-btn">
                        <Image size={16} />
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageSelect} hidden />
                      </label>
                      <button onClick={handleAddNote} disabled={(!newNote.trim() && !selectedImage) || sendingNote} className="btn btn-primary">
                        {sendingNote ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="contact-detail-modal__notes-list">
                    {contactData.notes?.map(note => (
                      <div key={note.id} className="contact-detail-modal__note">
                        <div className="contact-detail-modal__note-header">
                          <span className="contact-detail-modal__note-date">{formatDate(note.created_at)}</span>
                          <button onClick={() => handleDeleteNote(note.id)} className="contact-detail-modal__note-delete">
                            <X size={12} />
                          </button>
                        </div>
                        {note.content && <p className="contact-detail-modal__note-content">{note.content}</p>}
                        {note.image_path && (
                          <div className="contact-detail-modal__note-image">
                            <img
                              src={api.getContactImageUrl(note.image_path)}
                              alt="Imagem da nota"
                              onClick={() => window.open(api.getContactImageUrl(note.image_path!), '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {(!contactData.notes || contactData.notes.length === 0) && (
                      <p className="contact-detail-modal__empty">Nenhuma nota ainda</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="contact-detail-modal__footer">
              <span className="contact-detail-modal__meta">
                Criado em {formatDate(contactData.created_at)}
              </span>
              <span className="contact-detail-modal__meta">
                Atualizado em {formatDate(contactData.updated_at)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
