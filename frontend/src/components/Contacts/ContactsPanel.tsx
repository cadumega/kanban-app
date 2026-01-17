import { useState, useEffect } from 'react';
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
  ChevronLeft,
  Image,
  Loader2,
  Calendar,
  Clock,
  Check,
  Bell,
} from 'lucide-react';
import type { Contact, ContactFollowup } from '../../types';
import * as api from '../../services/api';
import './ContactsPanel.css';

interface ContactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactsPanel({ isOpen, onClose }: ContactsPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingNote, setSendingNote] = useState(false);

  // Follow-up state
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupDescription, setFollowupDescription] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadContacts();
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

  const handleNewContact = () => {
    setFormData({ name: '', email: '', phone: '', company: '', role: '' });
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
    } catch (err) {
      console.error('Erro ao atualizar follow-up:', err);
    }
  };

  const handleDeleteFollowup = async (followupId: string) => {
    if (!selectedContact) return;
    try {
      await api.deleteFollowup(selectedContact.id, followupId);
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
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');

    // Aplica máscara progressivamente: (XX) XXXXX-XXXX
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    // Limita a 11 dígitos
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getWhatsAppLink = (phone: string) => {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    // Adiciona código do Brasil se não tiver
    const fullNumber = numbers.length <= 11 ? `55${numbers}` : numbers;
    return `https://wa.me/${fullNumber}`;
  };

  const handlePhoneChange = (value: string) => {
    // Remove caracteres não numéricos para salvar só números
    const numbers = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos
    setFormData({ ...formData, phone: numbers });
  };

  if (!isOpen) return null;

  return (
    <div className="contacts-panel-overlay" onClick={onClose}>
      <div className="contacts-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="contacts-panel__header">
          <h2>
            <User size={20} />
            Contatos CRM
          </h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="contacts-panel__body">
          {/* Lista de Contatos */}
          <div className="contacts-panel__list">
            <div className="contacts-panel__list-header">
              <span>{contacts.length} contatos</span>
              <button onClick={handleNewContact} className="btn btn-primary btn-sm">
                <Plus size={14} />
                Novo
              </button>
            </div>

            <div className="contacts-panel__list-items">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`contacts-panel__list-item ${
                    selectedContact?.id === contact.id ? 'contacts-panel__list-item--active' : ''
                  }`}
                >
                  <div className="contacts-panel__list-item-avatar">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contacts-panel__list-item-info">
                    <span className="contacts-panel__list-item-name">{contact.name}</span>
                    {contact.company && (
                      <span className="contacts-panel__list-item-company">{contact.company}</span>
                    )}
                  </div>
                  {(contact.notes_count ?? 0) > 0 && (
                    <span className="contacts-panel__list-item-notes">
                      <MessageSquare size={12} />
                      {contact.notes_count}
                    </span>
                  )}
                </button>
              ))}

              {contacts.length === 0 && !loading && (
                <div className="contacts-panel__empty">
                  <User size={32} />
                  <p>Nenhum contato ainda</p>
                  <button onClick={handleNewContact} className="btn btn-primary btn-sm">
                    <Plus size={14} />
                    Criar primeiro contato
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Detalhe / Formulário */}
          <div className="contacts-panel__detail">
            {isEditing ? (
              // Formulário de edição
              <div className="contacts-panel__form">
                <h3>{selectedContact ? 'Editar Contato' : 'Novo Contato'}</h3>

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

                <div className="form-group">
                  <label className="label">
                    <Mail size={14} /> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label className="label">
                    <Phone size={14} /> Telefone
                  </label>
                  <input
                    type="tel"
                    value={formatPhone(formData.phone)}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="input"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="label">
                    <Building size={14} /> Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className="input"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="form-group">
                  <label className="label">
                    <Briefcase size={14} /> Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="input"
                    placeholder="Cargo/Função"
                  />
                </div>

                <div className="contacts-panel__form-actions">
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={handleSaveContact} className="btn btn-primary">
                    Salvar
                  </button>
                </div>
              </div>
            ) : selectedContact ? (
              // Detalhes do contato
              <div className="contacts-panel__contact">
                <div className="contacts-panel__contact-header">
                  <button onClick={() => setSelectedContact(null)} className="btn btn-ghost btn-sm">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="contacts-panel__contact-avatar">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contacts-panel__contact-info">
                    <h3>{selectedContact.name}</h3>
                    {selectedContact.role && selectedContact.company && (
                      <p>
                        {selectedContact.role} @ {selectedContact.company}
                      </p>
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
                        <a
                          href={`tel:${selectedContact.phone}`}
                          className="contacts-panel__phone-btn"
                          title="Ligar"
                        >
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
                </div>

                {/* Follow-ups */}
                <div className="contacts-panel__followups">
                  <div className="contacts-panel__followups-header">
                    <h4>
                      <Bell size={16} />
                      Follow-ups
                    </h4>
                    <div className="contacts-panel__followups-quick">
                      <button onClick={() => handleQuickFollowup(7)} className="btn btn-ghost btn-xs">7d</button>
                      <button onClick={() => handleQuickFollowup(15)} className="btn btn-ghost btn-xs">15d</button>
                      <button onClick={() => handleQuickFollowup(30)} className="btn btn-ghost btn-xs">30d</button>
                      <button onClick={() => handleQuickFollowup(90)} className="btn btn-ghost btn-xs">3m</button>
                      <button onClick={() => handleQuickFollowup(180)} className="btn btn-ghost btn-xs">6m</button>
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
                        <button onClick={() => setShowFollowupForm(false)} className="btn btn-ghost btn-xs">
                          Cancelar
                        </button>
                        <button onClick={handleCreateFollowup} disabled={!followupDate} className="btn btn-primary btn-xs">
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="contacts-panel__followups-list">
                    {followups.map(followup => {
                      const status = getFollowupStatus(followup.date, followup.completed);
                      return (
                        <div
                          key={followup.id}
                          className={`contacts-panel__followup contacts-panel__followup--${status}`}
                        >
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
                          <button
                            onClick={() => handleDeleteFollowup(followup.id)}
                            className="contacts-panel__followup-delete"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {followups.length === 0 && (
                      <p className="contacts-panel__followups-empty">
                        Nenhum follow-up agendado
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico de notas */}
                <div className="contacts-panel__notes">
                  <h4>
                    <MessageSquare size={16} />
                    Histórico de Notas
                  </h4>

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
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleImageSelect}
                          hidden
                        />
                      </label>
                      <button
                        onClick={handleAddNote}
                        disabled={(!newNote.trim() && !selectedImage) || sendingNote}
                        className="btn btn-primary"
                      >
                        {sendingNote ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="contacts-panel__notes-list">
                    {selectedContact.notes?.map(note => (
                      <div key={note.id} className="contacts-panel__note">
                        <div className="contacts-panel__note-header">
                          <span className="contacts-panel__note-date">
                            {formatDate(note.created_at)}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="contacts-panel__note-delete"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {note.content && (
                          <p className="contacts-panel__note-content">{note.content}</p>
                        )}
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
                      <p className="contacts-panel__notes-empty">
                        Nenhuma nota ainda. Adicione a primeira!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Estado vazio
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
