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
} from 'lucide-react';
import type { Contact } from '../../types';
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
      const data = await api.getContact(id);
      setSelectedContact(data);
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
    if (!selectedContact || !newNote.trim()) return;

    try {
      const note = await api.addContactNote(selectedContact.id, newNote);
      setSelectedContact({
        ...selectedContact,
        notes: [note, ...(selectedContact.notes || [])],
      });
      setNewNote('');
    } catch (err) {
      console.error('Erro ao adicionar nota:', err);
    }
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

    // Formata como (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone; // Retorna original se não conseguir formatar
  };

  const handlePhoneChange = (value: string) => {
    // Remove caracteres não numéricos para salvar só números
    const numbers = value.replace(/\D/g, '');
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
                    type="text"
                    value={formData.phone ? formatPhone(formData.phone) : ''}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="input"
                    placeholder="(11) 99999-9999"
                    maxLength={16}
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
                    <div className="contacts-panel__info-card">
                      <Phone size={14} />
                      <a href={`tel:${selectedContact.phone}`}>{formatPhone(selectedContact.phone)}</a>
                    </div>
                  )}
                  {selectedContact.company && (
                    <div className="contacts-panel__info-card">
                      <Building size={14} />
                      <span>{selectedContact.company}</span>
                    </div>
                  )}
                </div>

                {/* Histórico de notas */}
                <div className="contacts-panel__notes">
                  <h4>
                    <MessageSquare size={16} />
                    Histórico de Notas
                  </h4>

                  <div className="contacts-panel__notes-input">
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Adicionar uma nota sobre este contato..."
                      rows={2}
                      className="input textarea"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="btn btn-primary"
                    >
                      <Send size={14} />
                    </button>
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
                        <p className="contacts-panel__note-content">{note.content}</p>
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
