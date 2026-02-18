import { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type { Contact, ContactTag, ContactSegment } from '../../types';
import * as api from '../../services/api';
import { useToast } from '../shared';

// ============================================
// IMPORT MODAL
// ============================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

// Mapeamento inteligente de colunas
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'nome', 'nome completo', 'full name', 'fullname', 'contact', 'contato'],
  email: ['email', 'e-mail', 'mail', 'correio'],
  phone: ['phone', 'telefone', 'tel', 'celular', 'mobile', 'whatsapp', 'fone'],
  company: ['company', 'empresa', 'organization', 'organizacao', 'org', 'companhia'],
  role: ['role', 'cargo', 'funcao', 'position', 'titulo', 'title', 'job'],
  city: ['city', 'cidade', 'localidade', 'location', 'local'],
  tag: ['tag', 'etapa', 'stage', 'status', 'funil', 'funnel', 'fase'],
  segments: ['segments', 'segmentos', 'projetos', 'projects', 'segment', 'segmento'],
};

// Segmentos válidos
const VALID_SEGMENTS: ContactSegment[] = ['n8n', 'chapeu', 'parceria', 'consultoria'];

// Mapeamento de valores de tag
const TAG_VALUE_MAPPINGS: Record<string, ContactTag> = {
  'lead': 'lead',
  'qualificado': 'qualificado',
  'qualified': 'qualificado',
  'proposta': 'proposta',
  'proposal': 'proposta',
  'negociacao': 'negociacao',
  'negociação': 'negociacao',
  'negotiation': 'negociacao',
  'cliente': 'cliente',
  'client': 'cliente',
  'customer': 'cliente',
  'perdido': 'perdido',
  'lost': 'perdido',
};

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  city: string;
  tag: ContactTag;
  segments: string | null;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf: Contact | null;
  action: 'create' | 'update' | 'skip';
}

function parseSegments(value: string): string | null {
  if (!value) return null;
  const segments = value.split(/[,;|]/)
    .map(s => s.toLowerCase().trim())
    .filter(s => VALID_SEGMENTS.includes(s as ContactSegment));
  return segments.length > 0 ? segments.join(',') : null;
}

// Normaliza telefone para comparação
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// Verifica se é duplicado
function findDuplicate(row: { email: string; phone: string; name: string }, existingContacts: Contact[]): Contact | null {
  const normalizedPhone = normalizePhone(row.phone);
  const normalizedEmail = row.email.toLowerCase().trim();
  const normalizedName = row.name.toLowerCase().trim();

  // Primeiro tenta por email (mais confiável)
  if (normalizedEmail) {
    const byEmail = existingContacts.find(c =>
      c.email && c.email.toLowerCase().trim() === normalizedEmail
    );
    if (byEmail) return byEmail;
  }

  // Depois por telefone
  if (normalizedPhone && normalizedPhone.length >= 8) {
    const byPhone = existingContacts.find(c =>
      normalizePhone(c.phone) === normalizedPhone
    );
    if (byPhone) return byPhone;
  }

  // Por último, por nome + empresa (menos confiável)
  if (normalizedName) {
    const byName = existingContacts.find(c =>
      c.name.toLowerCase().trim() === normalizedName
    );
    if (byName) return byName;
  }

  return null;
}

function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (aliases.some(alias => normalizedHeader.includes(alias))) {
        if (!(field in mapping)) {
          mapping[field] = index;
        }
        break;
      }
    }
  });

  return mapping;
}

function parseTagValue(value: string): ContactTag {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  return TAG_VALUE_MAPPINGS[normalized] || null;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

function formatPhone(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  return numbers.slice(0, 11);
}

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showMappingDetails, setShowMappingDetails] = useState(false);
  const [existingContacts, setExistingContacts] = useState<Contact[]>([]);

  // Carrega contatos existentes quando o modal abre
  useEffect(() => {
    if (isOpen && existingContacts.length === 0) {
      api.getContacts()
        .then(contacts => setExistingContacts(contacts))
        .catch(err => console.error('Erro ao carregar contatos:', err));
    }
  }, [isOpen]);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setColumnMapping({});
    setParsedData([]);
    setImportProgress({ done: 0, total: 0 });
    setImportErrors([]);
    setShowMappingDetails(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers: parsedHeaders, rows } = parseCSV(content);

      if (parsedHeaders.length === 0) {
        toast.error('Arquivo CSV vazio ou inválido');
        return;
      }

      setHeaders(parsedHeaders);
      const mapping = detectColumnMapping(parsedHeaders);
      setColumnMapping(mapping);

      // Parse rows with mapping
      const parsed: ParsedRow[] = rows.map(row => {
        const name = mapping.name !== undefined ? row[mapping.name] || '' : '';
        const email = mapping.email !== undefined ? row[mapping.email] || '' : '';
        const phone = mapping.phone !== undefined ? formatPhone(row[mapping.phone] || '') : '';
        const company = mapping.company !== undefined ? row[mapping.company] || '' : '';
        const role = mapping.role !== undefined ? row[mapping.role] || '' : '';
        const city = mapping.city !== undefined ? row[mapping.city] || '' : '';
        const tagRaw = mapping.tag !== undefined ? row[mapping.tag] || '' : '';
        const tag = parseTagValue(tagRaw);
        const segmentsRaw = mapping.segments !== undefined ? row[mapping.segments] || '' : '';
        const segments = parseSegments(segmentsRaw);

        const errors: string[] = [];
        if (!name.trim()) errors.push('Nome é obrigatório');

        // Verifica duplicados
        const duplicate = findDuplicate({ email, phone, name: name.trim() }, existingContacts);

        return {
          name: name.trim(),
          email: email.trim(),
          phone,
          company: company.trim(),
          role: role.trim(),
          city: city.trim(),
          tag,
          segments,
          isValid: errors.length === 0,
          errors,
          isDuplicate: !!duplicate,
          duplicateOf: duplicate,
          action: duplicate ? 'skip' as const : 'create' as const, // Por padrão, pula duplicados
        };
      }).filter(row => row.name || row.email || row.company); // Filter empty rows

      setParsedData(parsed);
      setStep('preview');
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleMappingChange = (field: string, columnIndex: number) => {
    const newMapping = { ...columnMapping };
    if (columnIndex === -1) {
      delete newMapping[field];
    } else {
      newMapping[field] = columnIndex;
    }
    setColumnMapping(newMapping);

    // Re-parse data with new mapping
    // This would require storing the raw rows, for now we'll keep it simple
  };

  const handleRemoveRow = (index: number) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeAction = (index: number, action: 'create' | 'update' | 'skip') => {
    setParsedData(prev => prev.map((row, i) =>
      i === index ? { ...row, action } : row
    ));
  };

  const handleSetAllDuplicatesAction = (action: 'update' | 'skip') => {
    setParsedData(prev => prev.map(row =>
      row.isDuplicate ? { ...row, action } : row
    ));
  };

  const handleImport = async () => {
    const rowsToProcess = parsedData.filter(row => row.isValid && row.action !== 'skip');
    if (rowsToProcess.length === 0) {
      toast.warning('Nenhum contato para importar');
      return;
    }

    setStep('importing');
    setImportProgress({ done: 0, total: rowsToProcess.length });
    setImportErrors([]);

    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      try {
        if (row.action === 'update' && row.duplicateOf) {
          // Atualiza o contato existente
          await api.updateContact(row.duplicateOf.id, {
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            company: row.company || null,
            role: row.role || null,
            city: row.city || null,
            tag: row.tag,
            segments: row.segments,
          });
          updated++;
        } else {
          // Cria novo contato
          await api.createContact({
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            company: row.company || null,
            role: row.role || null,
            city: row.city || null,
            tag: row.tag,
            segments: row.segments,
          });
          created++;
        }
      } catch (err) {
        errors.push(`Erro ao ${row.action === 'update' ? 'atualizar' : 'importar'} "${row.name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
      setImportProgress({ done: i + 1, total: rowsToProcess.length });
    }

    setImportErrors(errors);
    setImportProgress(prev => ({ ...prev, created, updated }));
    setStep('done');
  };

  const invalidCount = parsedData.filter(r => !r.isValid).length;
  const duplicateCount = parsedData.filter(r => r.isDuplicate).length;
  const toCreateCount = parsedData.filter(r => r.isValid && r.action === 'create').length;
  const toUpdateCount = parsedData.filter(r => r.isValid && r.action === 'update').length;
  const toSkipCount = parsedData.filter(r => r.isValid && r.action === 'skip').length;

  if (!isOpen) return null;

  return (
    <div className="import-modal-overlay" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal__header">
          <h3><Upload size={18} /> Importar Contatos (CSV)</h3>
          <button onClick={handleClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="import-modal__body">
          {step === 'upload' && (
            <div className="import-modal__upload">
              <div
                className="import-modal__dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={48} />
                <p>Clique para selecionar um arquivo CSV</p>
                <span>ou arraste e solte aqui</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                hidden
              />

              <div className="import-modal__help">
                <h4>Formato esperado do CSV:</h4>
                <p>O sistema detecta automaticamente as colunas. Colunas aceitas:</p>
                <ul>
                  <li><strong>Nome</strong> (obrigatório): name, nome, nome completo</li>
                  <li><strong>Email</strong>: email, e-mail</li>
                  <li><strong>Telefone</strong>: phone, telefone, celular, whatsapp</li>
                  <li><strong>Empresa</strong>: company, empresa</li>
                  <li><strong>Cargo</strong>: role, cargo, funcao</li>
                  <li><strong>Cidade</strong>: city, cidade</li>
                  <li><strong>Segmentos</strong>: segments, segmentos, projetos (n8n, chapeu, parceria, consultoria)</li>
                  <li><strong>Tag</strong>: tag, etapa (lead, qualificado, proposta, negociacao, cliente, perdido)</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="import-modal__preview">
              <div className="import-modal__preview-header">
                <div className="import-modal__file-info">
                  <FileSpreadsheet size={16} />
                  <span>{fileName}</span>
                </div>
                <div className="import-modal__stats">
                  <span className="import-modal__stat import-modal__stat--valid">
                    <Check size={14} /> {toCreateCount} novos
                  </span>
                  {toUpdateCount > 0 && (
                    <span className="import-modal__stat import-modal__stat--update">
                      ↻ {toUpdateCount} atualizar
                    </span>
                  )}
                  {toSkipCount > 0 && (
                    <span className="import-modal__stat import-modal__stat--skip">
                      ⊘ {toSkipCount} pular
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="import-modal__stat import-modal__stat--invalid">
                      <AlertCircle size={14} /> {invalidCount} inválidos
                    </span>
                  )}
                </div>
              </div>

              {/* Aviso de duplicados */}
              {duplicateCount > 0 && (
                <div className="import-modal__duplicates-warning">
                  <AlertCircle size={16} />
                  <span><strong>{duplicateCount}</strong> contato(s) já existem no sistema. O que deseja fazer?</span>
                  <div className="import-modal__duplicates-actions">
                    <button
                      onClick={() => handleSetAllDuplicatesAction('skip')}
                      className={`btn btn-sm ${toSkipCount >= duplicateCount ? 'btn-secondary' : 'btn-ghost'}`}
                    >
                      Pular todos
                    </button>
                    <button
                      onClick={() => handleSetAllDuplicatesAction('update')}
                      className={`btn btn-sm ${toUpdateCount >= duplicateCount ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Atualizar todos
                    </button>
                  </div>
                </div>
              )}

              {/* Mapping section */}
              <div className="import-modal__mapping">
                <button
                  className="import-modal__mapping-toggle"
                  onClick={() => setShowMappingDetails(!showMappingDetails)}
                >
                  {showMappingDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Mapeamento de colunas detectado
                </button>

                {showMappingDetails && (
                  <div className="import-modal__mapping-details">
                    {Object.entries(COLUMN_MAPPINGS).map(([field]) => (
                      <div key={field} className="import-modal__mapping-row">
                        <label>{field === 'name' ? 'Nome *' : field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                        <select
                          value={columnMapping[field] ?? -1}
                          onChange={e => handleMappingChange(field, parseInt(e.target.value))}
                        >
                          <option value={-1}>-- Não mapeado --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>{h}</option>
                          ))}
                        </select>
                        {columnMapping[field] !== undefined && (
                          <Check size={14} className="import-modal__mapping-check" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data preview table */}
              <div className="import-modal__table-wrapper">
                <table className="import-modal__table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Status</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Empresa</th>
                      <th>Cidade</th>
                      <th>Tag</th>
                      <th style={{ width: '90px' }}>Ação</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, index) => (
                      <tr key={index} className={`
                        ${!row.isValid ? 'import-modal__row--invalid' : ''}
                        ${row.isDuplicate ? 'import-modal__row--duplicate' : ''}
                        ${row.action === 'skip' ? 'import-modal__row--skip' : ''}
                      `}>
                        <td>
                          {!row.isValid ? (
                            <span title={row.errors.join(', ')} className="import-modal__status import-modal__status--invalid">
                              <AlertCircle size={14} /> Erro
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="import-modal__status import-modal__status--duplicate" title={`Já existe: ${row.duplicateOf?.name}`}>
                              ⚠️ Existe
                            </span>
                          ) : (
                            <span className="import-modal__status import-modal__status--new">
                              <Check size={14} /> Novo
                            </span>
                          )}
                        </td>
                        <td className={!row.name ? 'import-modal__cell--empty' : ''}>
                          {row.name || '(vazio)'}
                          {row.isDuplicate && row.duplicateOf && (
                            <span className="import-modal__duplicate-hint">
                              ↳ {row.duplicateOf.name}
                            </span>
                          )}
                        </td>
                        <td>{row.email || '—'}</td>
                        <td>{row.phone || '—'}</td>
                        <td>{row.company || '—'}</td>
                        <td>{row.city || '—'}</td>
                        <td>
                          {row.tag ? (
                            <span className={`import-modal__tag import-modal__tag--${row.tag}`}>
                              {row.tag}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {row.isValid && (
                            <select
                              value={row.action}
                              onChange={e => handleChangeAction(index, e.target.value as 'create' | 'update' | 'skip')}
                              className="import-modal__action-select"
                            >
                              {!row.isDuplicate && <option value="create">Criar</option>}
                              {row.isDuplicate && <option value="update">Atualizar</option>}
                              <option value="skip">Pular</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveRow(index)}
                            className="import-modal__remove-btn"
                            title="Remover linha"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="import-modal__importing">
              <Loader2 size={48} className="spin" />
              <p>Importando contatos...</p>
              <div className="import-modal__progress">
                <div
                  className="import-modal__progress-bar"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
              <span>{importProgress.done} / {importProgress.total}</span>
            </div>
          )}

          {step === 'done' && (
            <div className="import-modal__done">
              <Check size={48} className="import-modal__done-icon" />
              <h4>Importação concluída!</h4>
              <div className="import-modal__done-stats">
                {(importProgress as any).created > 0 && (
                  <p><Check size={14} className="import-modal__row-icon--valid" /> {(importProgress as any).created} contato(s) criado(s)</p>
                )}
                {(importProgress as any).updated > 0 && (
                  <p>↻ {(importProgress as any).updated} contato(s) atualizado(s)</p>
                )}
              </div>

              {importErrors.length > 0 && (
                <div className="import-modal__errors">
                  <p><AlertCircle size={14} /> {importErrors.length} erro(s):</p>
                  <ul>
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="import-modal__footer">
          {step === 'upload' && (
            <button onClick={handleClose} className="btn btn-secondary">
              Cancelar
            </button>
          )}

          {step === 'preview' && (
            <>
              <button onClick={resetState} className="btn btn-secondary">
                Voltar
              </button>
              <button
                onClick={handleImport}
                className="btn btn-primary"
                disabled={toCreateCount + toUpdateCount === 0}
              >
                <Upload size={14} />
                {toCreateCount > 0 && toUpdateCount > 0
                  ? `Criar ${toCreateCount} + Atualizar ${toUpdateCount}`
                  : toUpdateCount > 0
                    ? `Atualizar ${toUpdateCount} contato${toUpdateCount !== 1 ? 's' : ''}`
                    : `Importar ${toCreateCount} contato${toCreateCount !== 1 ? 's' : ''}`}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={() => {
                handleClose();
                onImportComplete();
              }}
              className="btn btn-primary"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT FUNCTION
// ============================================

export function exportContactsToCSV(contacts: Contact[], filename: string = 'contatos.csv') {
  const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Cargo', 'Cidade', 'Segmentos', 'Etapa', 'Criado em', 'Atualizado em'];

  const formatPhone = (phone: string | null): string => {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return numbers;
  };

  const tagLabels: Record<string, string> = {
    lead: 'Lead',
    qualificado: 'Qualificado',
    proposta: 'Proposta',
    negociacao: 'Negociação',
    cliente: 'Cliente',
    perdido: 'Perdido',
  };

  const segmentLabels: Record<string, string> = {
    n8n: 'N8N',
    chapeu: 'Chapéu',
    parceria: 'Parceria',
    consultoria: 'Consultoria',
  };

  const formatSegments = (segments: string | null): string => {
    if (!segments) return '';
    return segments.split(',').filter(Boolean).map(s => segmentLabels[s] || s).join(', ');
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = contacts.map(contact => [
    escapeCSV(contact.name),
    escapeCSV(contact.email || ''),
    escapeCSV(formatPhone(contact.phone)),
    escapeCSV(contact.company || ''),
    escapeCSV(contact.role || ''),
    escapeCSV(contact.city || ''),
    escapeCSV(formatSegments(contact.segments)),
    escapeCSV(contact.tag ? tagLabels[contact.tag] || contact.tag : ''),
    escapeCSV(formatDate(contact.created_at)),
    escapeCSV(formatDate(contact.updated_at)),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// EXPORT BUTTON COMPONENT
// ============================================

interface ExportButtonProps {
  contacts: Contact[];
  filteredCount?: number;
}

export function ExportButton({ contacts, filteredCount }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleExportAll = () => {
    exportContactsToCSV(contacts, 'todos-contatos.csv');
    setShowMenu(false);
  };

  const handleExportFiltered = () => {
    exportContactsToCSV(contacts, 'contatos-filtrados.csv');
    setShowMenu(false);
  };

  return (
    <div className="export-button-wrapper">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn btn-secondary"
        title="Exportar contatos"
      >
        <Download size={16} />
        Exportar
      </button>

      {showMenu && (
        <>
          <div className="export-button-backdrop" onClick={() => setShowMenu(false)} />
          <div className="export-button-menu">
            <button onClick={handleExportAll}>
              <FileSpreadsheet size={14} />
              Exportar todos ({contacts.length})
            </button>
            {filteredCount !== undefined && filteredCount !== contacts.length && (
              <button onClick={handleExportFiltered}>
                <FileSpreadsheet size={14} />
                Exportar filtrados ({filteredCount})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
