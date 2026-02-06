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
import type { Contact, ContactTag } from '../../types';
import * as api from '../../services/api';

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
};

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
  isValid: boolean;
  errors: string[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showMappingDetails, setShowMappingDetails] = useState(false);

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
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers: parsedHeaders, rows } = parseCSV(content);

      if (parsedHeaders.length === 0) {
        alert('Arquivo CSV vazio ou inválido');
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

        const errors: string[] = [];
        if (!name.trim()) errors.push('Nome é obrigatório');

        return {
          name: name.trim(),
          email: email.trim(),
          phone,
          company: company.trim(),
          role: role.trim(),
          city: city.trim(),
          tag,
          isValid: errors.length === 0,
          errors,
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

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid);
    if (validRows.length === 0) {
      alert('Nenhum contato válido para importar');
      return;
    }

    setStep('importing');
    setImportProgress({ done: 0, total: validRows.length });
    setImportErrors([]);

    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await api.createContact({
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          company: row.company || null,
          role: row.role || null,
          city: row.city || null,
          tag: row.tag,
        });
      } catch (err) {
        errors.push(`Erro ao importar "${row.name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
      setImportProgress({ done: i + 1, total: validRows.length });
    }

    setImportErrors(errors);
    setStep('done');
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

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
                    <Check size={14} /> {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="import-modal__stat import-modal__stat--invalid">
                      <AlertCircle size={14} /> {invalidCount} inválidos
                    </span>
                  )}
                </div>
              </div>

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
                      <th style={{ width: '40px' }}></th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Empresa</th>
                      <th>Cidade</th>
                      <th>Tag</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, index) => (
                      <tr key={index} className={!row.isValid ? 'import-modal__row--invalid' : ''}>
                        <td>
                          {row.isValid ? (
                            <Check size={14} className="import-modal__row-icon--valid" />
                          ) : (
                            <span title={row.errors.join(', ')}>
                              <AlertCircle size={14} className="import-modal__row-icon--invalid" />
                            </span>
                          )}
                        </td>
                        <td className={!row.name ? 'import-modal__cell--empty' : ''}>
                          {row.name || '(vazio)'}
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
              <p>{importProgress.done - importErrors.length} contatos importados com sucesso</p>

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
                disabled={validCount === 0}
              >
                <Upload size={14} />
                Importar {validCount} contato{validCount !== 1 ? 's' : ''}
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
  const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Cargo', 'Cidade', 'Etapa', 'Criado em', 'Atualizado em'];

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
