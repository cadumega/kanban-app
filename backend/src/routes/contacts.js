const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUserImagesDir } = require('../database/userDb');
const { logAction } = require('../utils/audit');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imagesDir = getUserImagesDir(req.user.email);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get all contacts
router.get('/', (req, res) => {
  const db = req.db;
  const contacts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_contact_at
    FROM contacts c
    ORDER BY c.name ASC
  `).all();
  res.json(contacts);
});

// Get single contact with notes
router.get('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  const notes = db.prepare(`
    SELECT * FROM contact_notes
    WHERE contact_id = ?
    ORDER BY created_at DESC
  `).all(id);

  res.json({ ...contact, notes });
});

// Create contact
router.post('/', (req, res) => {
  const db = req.db;
  const { name, email, phone, phone_robot, whatsapp_redirect, company, role, tag, city, segments, valor_implementacao, valor_mensal, is_robot, presente, board_id, column_id } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  // Get board and column for new contact
  let boardId = board_id;
  let columnId = column_id;

  // If not provided, get first board and first column (Lead)
  if (!boardId) {
    const firstBoard = db.prepare('SELECT id FROM boards ORDER BY position ASC LIMIT 1').get();
    boardId = firstBoard?.id;
  }

  if (!columnId && boardId) {
    const firstColumn = db.prepare('SELECT id FROM columns WHERE board_id = ? ORDER BY position ASC LIMIT 1').get(boardId);
    columnId = firstColumn?.id;
  }

  // Get max position in column
  let position = 0;
  if (columnId) {
    const maxPos = db.prepare('SELECT MAX(position) as max FROM contacts WHERE column_id = ?').get(columnId);
    position = (maxPos.max ?? -1) + 1;
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO contacts (id, name, email, phone, phone_robot, whatsapp_redirect, company, role, tag, city, segments, valor_implementacao, valor_mensal, is_robot, presente, board_id, column_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    email || null,
    phone || null,
    phone_robot || null,
    whatsapp_redirect || null,
    company || null,
    role || null,
    tag || null,
    city || null,
    segments || null,
    valor_implementacao || 0,
    valor_mensal || 0,
    is_robot ? 1 : 0,
    presente ? 1 : 0,
    boardId || null,
    columnId || null,
    position
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);

  // Audit log
  if (req.actingUser) {
    logAction(db, req.actingUser, 'create', 'contact', id, name.trim());
  }

  res.status(201).json(contact);
});

// Update contact
router.put('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { name, email, phone, phone_robot, whatsapp_redirect, company, role, tag, city, segments, valor_implementacao, valor_mensal, is_robot, presente } = req.body;

  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  // Track tag changes for pipeline velocity
  const newTag = tag !== undefined ? tag : existing.tag;
  if (newTag !== existing.tag) {
    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO contact_tag_history (id, contact_id, old_tag, new_tag, changed_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(historyId, id, existing.tag, newTag);
  }

  db.prepare(`
    UPDATE contacts
    SET name = ?, email = ?, phone = ?, phone_robot = ?, whatsapp_redirect = ?, company = ?, role = ?, tag = ?, city = ?, segments = ?,
        valor_implementacao = ?, valor_mensal = ?, is_robot = ?, presente = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name?.trim() || existing.name,
    email !== undefined ? email : existing.email,
    phone !== undefined ? phone : existing.phone,
    phone_robot !== undefined ? phone_robot : existing.phone_robot,
    whatsapp_redirect !== undefined ? whatsapp_redirect : existing.whatsapp_redirect,
    company !== undefined ? company : existing.company,
    role !== undefined ? role : existing.role,
    newTag,
    city !== undefined ? city : existing.city,
    segments !== undefined ? segments : existing.segments,
    valor_implementacao !== undefined ? valor_implementacao : existing.valor_implementacao,
    valor_mensal !== undefined ? valor_mensal : existing.valor_mensal,
    is_robot !== undefined ? (is_robot ? 1 : 0) : existing.is_robot,
    presente !== undefined ? (presente ? 1 : 0) : existing.presente,
    id
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);

  // Audit log
  if (req.actingUser) {
    logAction(db, req.actingUser, 'update', 'contact', id, contact.name);
  }

  res.json(contact);
});

// Delete contact
router.delete('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;

  // Get contact info before deleting for audit log
  const contact = db.prepare('SELECT name FROM contacts WHERE id = ?').get(id);

  // Get all notes with images to delete the image files
  const notes = db.prepare('SELECT image_path FROM contact_notes WHERE contact_id = ? AND image_path IS NOT NULL').all(id);
  const imagesDir = getUserImagesDir(req.workspaceOwner || req.user.email);

  notes.forEach(note => {
    if (note.image_path) {
      const imagePath = path.join(imagesDir, note.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  });

  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

  // Audit log
  if (req.actingUser && contact) {
    logAction(db, req.actingUser, 'delete', 'contact', id, contact.name);
  }

  res.status(204).send();
});

// Add note to contact (with optional image and custom date)
router.post('/:id/notes', upload.single('image'), (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { content, note_date } = req.body;
  const imagePath = req.file ? req.file.filename : null;

  // Must have either content or image
  if (!content?.trim() && !imagePath) {
    return res.status(400).json({ error: 'Conteúdo ou imagem é obrigatório' });
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) {
    // Delete uploaded image if contact not found
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  const noteId = uuidv4();
  // Use custom date if provided, otherwise use current timestamp
  const createdAt = note_date ? new Date(note_date + 'T12:00:00').toISOString() : new Date().toISOString();

  db.prepare(`
    INSERT INTO contact_notes (id, contact_id, content, image_path, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(noteId, id, content?.trim() || null, imagePath, createdAt);

  const note = db.prepare('SELECT * FROM contact_notes WHERE id = ?').get(noteId);

  // Audit log
  if (req.actingUser) {
    logAction(db, req.actingUser, 'create', 'note', noteId, contact.name, JSON.stringify({ contact_id: id }));
  }

  res.status(201).json(note);
});

// Update note
router.put('/:contactId/notes/:noteId', (req, res) => {
  const db = req.db;
  const { noteId } = req.params;
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required' });
  }

  db.prepare('UPDATE contact_notes SET content = ? WHERE id = ?').run(content, noteId);
  const note = db.prepare('SELECT * FROM contact_notes WHERE id = ?').get(noteId);

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  res.json(note);
});

// Delete note
router.delete('/:contactId/notes/:noteId', (req, res) => {
  const db = req.db;
  const { noteId } = req.params;

  // Get note to check for image
  const note = db.prepare('SELECT image_path FROM contact_notes WHERE id = ?').get(noteId);

  if (note && note.image_path) {
    const imagesDir = getUserImagesDir(req.user.email);
    const imagePath = path.join(imagesDir, note.image_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  db.prepare('DELETE FROM contact_notes WHERE id = ?').run(noteId);
  res.status(204).send();
});

// Serve uploaded images (with path traversal protection)
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;

  // Sanitize filename to prevent path traversal attacks
  // Only allow alphanumeric, dash, underscore, dot (for extension)
  const sanitizedFilename = path.basename(filename);

  // Extra validation: reject any path components
  if (filename !== sanitizedFilename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Nome de arquivo inválido' });
  }

  const imagesDir = getUserImagesDir(req.user.email);
  const imagePath = path.join(imagesDir, sanitizedFilename);

  // Verify the resolved path is still within the images directory
  const resolvedPath = path.resolve(imagePath);
  const resolvedImagesDir = path.resolve(imagesDir);

  if (!resolvedPath.startsWith(resolvedImagesDir)) {
    return res.status(400).json({ error: 'Acesso negado' });
  }

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Imagem não encontrada' });
  }

  res.sendFile(imagePath);
});

// ==================== FOLLOW-UPS ====================

// Get all pending follow-ups (for the panel)
router.get('/followups/pending', (req, res) => {
  const db = req.db;

  const followups = db.prepare(`
    SELECT f.*, c.name as contact_name, c.company as contact_company, c.city as contact_city, c.tag as contact_tag
    FROM contact_followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.completed = 0
    ORDER BY f.date ASC
  `).all();

  res.json(followups);
});

// Get follow-ups for a contact
router.get('/:id/followups', (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const followups = db.prepare(`
    SELECT * FROM contact_followups
    WHERE contact_id = ?
    ORDER BY completed ASC, date ASC
  `).all(id);

  res.json(followups);
});

// Create follow-up
router.post('/:id/followups', (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { date, description } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Data é obrigatória' });
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  const followupId = uuidv4();

  db.prepare(`
    INSERT INTO contact_followups (id, contact_id, date, description)
    VALUES (?, ?, ?, ?)
  `).run(followupId, id, date, description || '');

  const followup = db.prepare('SELECT * FROM contact_followups WHERE id = ?').get(followupId);

  // Audit log
  if (req.actingUser) {
    logAction(db, req.actingUser, 'create', 'followup', followupId, contact.name, JSON.stringify({ contact_id: id, date }));
  }

  res.status(201).json(followup);
});

// Update follow-up (mark complete or edit)
router.put('/:contactId/followups/:followupId', (req, res) => {
  const db = req.db;
  const { followupId } = req.params;
  const { date, description, completed } = req.body;

  const existing = db.prepare('SELECT * FROM contact_followups WHERE id = ?').get(followupId);
  if (!existing) {
    return res.status(404).json({ error: 'Follow-up não encontrado' });
  }

  const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;
  const completedAt = newCompleted === 1 && existing.completed === 0 ? new Date().toISOString() : existing.completed_at;

  db.prepare(`
    UPDATE contact_followups
    SET date = ?, description = ?, completed = ?, completed_at = ?
    WHERE id = ?
  `).run(
    date || existing.date,
    description !== undefined ? description : existing.description,
    newCompleted,
    completedAt,
    followupId
  );

  const followup = db.prepare('SELECT * FROM contact_followups WHERE id = ?').get(followupId);
  res.json(followup);
});

// Delete follow-up
router.delete('/:contactId/followups/:followupId', (req, res) => {
  const db = req.db;
  const { followupId } = req.params;

  db.prepare('DELETE FROM contact_followups WHERE id = ?').run(followupId);
  res.status(204).send();
});

// ============================================
// REPORTS / STATISTICS
// ============================================

// Get weekly digest report - contacts with follow-ups this week + their history
router.get('/reports/weekly-digest', (req, res) => {
  const db = req.db;

  // Get date range for this week (today to 7 days ahead)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekEndStr = weekFromNow.toISOString().split('T')[0];

  // Also include overdue (past follow-ups)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30); // Look back 30 days for overdue
  const pastStr = pastDate.toISOString().split('T')[0];

  // Get follow-ups for this week (including overdue)
  const followups = db.prepare(`
    SELECT
      f.*,
      c.id as contact_id,
      c.name as contact_name,
      c.company as contact_company,
      c.role as contact_role,
      c.city as contact_city,
      c.tag as contact_tag,
      c.segments as contact_segments,
      c.valor_implementacao,
      c.valor_mensal
    FROM contact_followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.completed = 0 AND f.date >= ? AND f.date <= ?
    ORDER BY f.date ASC
  `).all(pastStr, weekEndStr);

  // Get contact IDs from followups
  const contactIds = [...new Set(followups.map(f => f.contact_id))];

  // Get recent notes for these contacts (last 5 per contact)
  const contactNotes = {};
  contactIds.forEach(contactId => {
    const notes = db.prepare(`
      SELECT content, created_at
      FROM contact_notes
      WHERE contact_id = ? AND content IS NOT NULL AND content != ''
      ORDER BY created_at DESC
      LIMIT 5
    `).all(contactId);
    contactNotes[contactId] = notes;
  });

  // Group followups by segment
  const bySegment = {};
  followups.forEach(f => {
    const segments = f.contact_segments ? f.contact_segments.split(',').filter(Boolean) : ['sem_segmento'];
    segments.forEach(seg => {
      if (!bySegment[seg]) bySegment[seg] = [];
      // Avoid duplicates if contact has multiple followups
      const existing = bySegment[seg].find(item => item.contact_id === f.contact_id);
      if (existing) {
        // Add this followup to existing
        existing.followups.push({
          id: f.id,
          date: f.date,
          description: f.description,
        });
      } else {
        bySegment[seg].push({
          contact_id: f.contact_id,
          contact_name: f.contact_name,
          contact_company: f.contact_company,
          contact_role: f.contact_role,
          contact_city: f.contact_city,
          contact_tag: f.contact_tag,
          contact_segments: f.contact_segments,
          valor_implementacao: f.valor_implementacao,
          valor_mensal: f.valor_mensal,
          followups: [{
            id: f.id,
            date: f.date,
            description: f.description,
          }],
          notes: contactNotes[f.contact_id] || [],
        });
      }
    });
  });

  // Also get contacts with no segments
  if (bySegment['sem_segmento']) {
    bySegment['Sem Segmento'] = bySegment['sem_segmento'];
    delete bySegment['sem_segmento'];
  }

  // Summary stats
  const totalContacts = contactIds.length;
  const totalFollowups = followups.length;
  const overdueCount = followups.filter(f => f.date < todayStr).length;
  const todayCount = followups.filter(f => f.date === todayStr).length;
  const upcomingCount = followups.filter(f => f.date > todayStr).length;

  // ============================================
  // LEAD INTELLIGENCE - Scoring & Alerts
  // ============================================

  // Buying signals keywords (positive indicators)
  const BUYING_SIGNALS = {
    budget: ['orçamento', 'budget', 'quanto custa', 'investimento', 'valor', 'preço', 'proposta'],
    urgency: ['urgente', 'preciso até', 'deadline', 'rápido', 'logo', 'amanhã', 'essa semana'],
    decision: ['decisão', 'aprovar', 'fechar', 'contratar', 'começar', 'vamos fazer'],
    interest: ['interessado', 'gostei', 'perfeito', 'excelente', 'ótimo', 'quero'],
  };

  // Objection keywords (needs attention)
  const OBJECTION_SIGNALS = {
    price: ['caro', 'muito caro', 'acima do orçamento', 'não tenho verba'],
    timing: ['agora não', 'depois', 'próximo mês', 'próximo ano', 'mais tarde'],
    competitor: ['concorrente', 'outra empresa', 'comparando', 'cotação'],
    doubt: ['não sei', 'preciso pensar', 'vou avaliar', 'consultar'],
  };

  // Calculate lead score and classification
  const calculateLeadScore = (contact, notes, followups, lastNoteDate, lastFollowupDate) => {
    let score = 50; // Base score
    const alerts = [];
    const signals = [];

    // 1. ENGAGEMENT SCORE (based on note count)
    const notesCount = notes.length;
    if (notesCount >= 10) score += 20;
    else if (notesCount >= 5) score += 15;
    else if (notesCount >= 2) score += 10;
    else if (notesCount === 0) score -= 10;

    // 2. RECENCY SCORE (days since last interaction)
    const daysSinceNote = lastNoteDate ? Math.floor((today - new Date(lastNoteDate)) / (1000 * 60 * 60 * 24)) : 999;
    const daysSinceFollowup = lastFollowupDate ? Math.floor((today - new Date(lastFollowupDate)) / (1000 * 60 * 60 * 24)) : 999;
    const daysSinceContact = Math.min(daysSinceNote, daysSinceFollowup);

    if (daysSinceContact <= 3) score += 15;
    else if (daysSinceContact <= 7) score += 10;
    else if (daysSinceContact <= 14) score += 0;
    else if (daysSinceContact <= 30) {
      score -= 10;
      alerts.push({ type: 'cooling', severity: 'medium', message: `${daysSinceContact} dias sem contato` });
    } else {
      score -= 20;
      alerts.push({ type: 'cold', severity: 'high', message: `${daysSinceContact} dias sem contato - URGENTE` });
    }

    // 3. FUNNEL POSITION SCORE
    const tagScores = {
      'lead': 5,
      'qualificado': 15,
      'proposta': 25,
      'negociacao': 30,
      'cliente': 10, // Already converted
      'perdido': -30,
    };
    score += tagScores[contact.tag] || 0;

    // 4. VALUE SCORE
    if (contact.valor_mensal > 0 || contact.valor_implementacao > 0) {
      score += 10;
    }

    // 5. BUYING SIGNALS DETECTION (analyze recent notes)
    const recentNotesText = notes.slice(0, 3).map(n => (n.content || '').toLowerCase()).join(' ');

    Object.entries(BUYING_SIGNALS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        if (recentNotesText.includes(keyword.toLowerCase())) {
          signals.push({ type: 'buying', category: type, keyword });
          score += 5;
        }
      });
    });

    // 6. OBJECTION DETECTION
    Object.entries(OBJECTION_SIGNALS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        if (recentNotesText.includes(keyword.toLowerCase())) {
          alerts.push({ type: 'objection', severity: 'medium', category: type, message: `Objeção detectada: "${keyword}"` });
        }
      });
    });

    // 7. OVERDUE FOLLOWUPS
    const overdueFollowups = followups.filter(f => !f.completed && f.date < todayStr);
    if (overdueFollowups.length > 0) {
      alerts.push({ type: 'overdue', severity: 'high', message: `${overdueFollowups.length} follow-up(s) atrasado(s)` });
      score -= 5 * overdueFollowups.length;
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Classification
    let classification;
    if (score >= 80) classification = { label: 'HOT', color: '#EF4444', priority: 'CRÍTICA' };
    else if (score >= 60) classification = { label: 'WARM', color: '#F59E0B', priority: 'ALTA' };
    else if (score >= 40) classification = { label: 'COLD', color: '#3B82F6', priority: 'MÉDIA' };
    else classification = { label: 'AT_RISK', color: '#6B7280', priority: 'BAIXA' };

    return { score, classification, alerts, signals, daysSinceContact };
  };

  // Enrich each contact in by_segment with intelligence
  Object.keys(bySegment).forEach(segment => {
    bySegment[segment] = bySegment[segment].map(contact => {
      const contactNotesList = contactNotes[contact.contact_id] || [];
      const contactFollowups = followups.filter(f => f.contact_id === contact.contact_id);

      const lastNoteDate = contactNotesList.length > 0 ? contactNotesList[0].created_at : null;
      const lastFollowupDate = contact.followups.length > 0 ? contact.followups[0].date : null;

      const intelligence = calculateLeadScore(
        { tag: contact.contact_tag, valor_mensal: contact.valor_mensal, valor_implementacao: contact.valor_implementacao },
        contactNotesList,
        contactFollowups,
        lastNoteDate,
        lastFollowupDate
      );

      return {
        ...contact,
        intelligence,
      };
    });

    // Sort by score (highest first)
    bySegment[segment].sort((a, b) => b.intelligence.score - a.intelligence.score);
  });

  // Global alerts summary
  const allAlerts = [];
  Object.values(bySegment).flat().forEach(contact => {
    contact.intelligence.alerts.forEach(alert => {
      allAlerts.push({
        ...alert,
        contact_id: contact.contact_id,
        contact_name: contact.contact_name,
        contact_company: contact.contact_company,
      });
    });
  });

  // Hot leads (score >= 80)
  const hotLeads = Object.values(bySegment).flat().filter(c => c.intelligence.score >= 80);

  // At risk leads (score < 40)
  const atRiskLeads = Object.values(bySegment).flat().filter(c => c.intelligence.score < 40);

  res.json({
    period: {
      start: todayStr,
      end: weekEndStr,
    },
    summary: {
      total_contacts: totalContacts,
      total_followups: totalFollowups,
      overdue: overdueCount,
      today: todayCount,
      upcoming: upcomingCount,
      hot_leads: hotLeads.length,
      at_risk_leads: atRiskLeads.length,
    },
    alerts: allAlerts.filter(a => a.severity === 'high').slice(0, 10), // Top 10 critical alerts
    hot_leads: hotLeads.slice(0, 5), // Top 5 hot leads
    at_risk_leads: atRiskLeads.slice(0, 5), // Top 5 at risk
    by_segment: bySegment,
  });
});

// Get CRM reports/statistics
router.get('/reports/statistics', (req, res) => {
  const db = req.db;

  // Get current month's date range
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Notes created this month
  const notesThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM contact_notes
    WHERE created_at >= ? AND created_at <= ?
  `).get(firstDayOfMonth, lastDayOfMonth);

  // Follow-ups this month (completed)
  const followupsCompletedThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM contact_followups
    WHERE completed = 1 AND completed_at >= ? AND completed_at <= ?
  `).get(firstDayOfMonth, lastDayOfMonth);

  // Follow-ups scheduled this month
  const followupsScheduledThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM contact_followups
    WHERE date >= ? AND date <= ?
  `).get(firstDayOfMonth.split('T')[0], lastDayOfMonth.split('T')[0]);

  // Top 10 contacts with most interactions (notes + followups)
  const topContacts = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.company,
      c.city,
      c.tag,
      c.is_robot,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM contact_followups WHERE contact_id = c.id) as followups_count,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) +
      (SELECT COUNT(*) FROM contact_followups WHERE contact_id = c.id) as total_interactions
    FROM contacts c
    ORDER BY total_interactions DESC
    LIMIT 10
  `).all();

  // Contacts with robots (automação)
  const robotContacts = db.prepare(`
    SELECT COUNT(*) as count FROM contacts WHERE is_robot = 1
  `).get();

  // Contacts with gift (presente)
  const giftContacts = db.prepare(`
    SELECT COUNT(*) as count FROM contacts WHERE presente = 1
  `).get();

  // List of gift recipients
  const giftRecipientsList = db.prepare(`
    SELECT id, name, company, city, segments
    FROM contacts
    WHERE presente = 1
    ORDER BY company ASC, name ASC
  `).all();

  // List of robot clients
  const robotClientsList = db.prepare(`
    SELECT id, name, company, city, segments, valor_implementacao, valor_mensal
    FROM contacts
    WHERE is_robot = 1
    ORDER BY company ASC, name ASC
  `).all();

  // Total revenue (valor_implementacao + valor_mensal) - de todos os contatos com valores
  const revenue = db.prepare(`
    SELECT
      SUM(valor_implementacao) as total_implementacao,
      SUM(valor_mensal) as total_mensal
    FROM contacts
    WHERE valor_implementacao > 0 OR valor_mensal > 0
  `).get();

  // Contacts by tag (funnel)
  const contactsByTag = db.prepare(`
    SELECT tag, COUNT(*) as count FROM contacts
    GROUP BY tag
    ORDER BY count DESC
  `).all();

  // Contacts by city
  const contactsByCity = db.prepare(`
    SELECT city, COUNT(*) as count FROM contacts
    WHERE city IS NOT NULL AND city != ''
    GROUP BY city
    ORDER BY count DESC
    LIMIT 10
  `).all();

  // Recent activity (last 10 notes)
  const recentNotes = db.prepare(`
    SELECT
      n.id,
      n.content,
      n.created_at,
      c.id as contact_id,
      c.name as contact_name,
      c.company as contact_company
    FROM contact_notes n
    JOIN contacts c ON n.contact_id = c.id
    ORDER BY n.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    month: {
      notes: notesThisMonth.count,
      followups_completed: followupsCompletedThisMonth.count,
      followups_scheduled: followupsScheduledThisMonth.count,
    },
    totals: {
      robot_contacts: robotContacts.count,
      gift_contacts: giftContacts.count,
      valor_implementacao: revenue.total_implementacao || 0,
      valor_mensal: revenue.total_mensal || 0,
    },
    top_contacts: topContacts,
    contacts_by_tag: contactsByTag,
    contacts_by_city: contactsByCity,
    recent_activity: recentNotes,
    robot_clients: robotClientsList,
    gift_recipients: giftRecipientsList,
  });
});

// ============================================
// ANALYTICS DASHBOARD
// ============================================

router.get('/reports/analytics', (req, res) => {
  const db = req.db;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Funnel stages in order
  const FUNNEL_STAGES = [
    { tag: 'lead', label: 'Lead', color: '#3B82F6' },
    { tag: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
    { tag: 'proposta', label: 'Proposta', color: '#F59E0B' },
    { tag: 'negociacao', label: 'Negociação', color: '#EC4899' },
    { tag: 'cliente', label: 'Cliente', color: '#22C55E' },
    { tag: 'perdido', label: 'Perdido', color: '#EF4444' },
  ];

  // 1. FUNNEL DISTRIBUTION
  const funnelData = db.prepare(`
    SELECT tag, COUNT(*) as count,
           SUM(valor_mensal) as total_mensal,
           SUM(valor_implementacao) as total_impl
    FROM contacts
    GROUP BY tag
  `).all();

  const totalContacts = funnelData.reduce((sum, f) => sum + f.count, 0);

  const funnel = FUNNEL_STAGES.map(stage => {
    const data = funnelData.find(f => f.tag === stage.tag) || { count: 0, total_mensal: 0, total_impl: 0 };
    return {
      ...stage,
      count: data.count,
      percentage: totalContacts > 0 ? Math.round((data.count / totalContacts) * 100) : 0,
      valor_mensal: data.total_mensal || 0,
      valor_implementacao: data.total_impl || 0,
    };
  });

  // Add "Sem tag" for contacts without tag
  const noTagData = funnelData.find(f => f.tag === null) || { count: 0, total_mensal: 0, total_impl: 0 };
  if (noTagData.count > 0) {
    funnel.push({
      tag: null,
      label: 'Sem Tag',
      color: '#6B7280',
      count: noTagData.count,
      percentage: Math.round((noTagData.count / totalContacts) * 100),
      valor_mensal: noTagData.total_mensal || 0,
      valor_implementacao: noTagData.total_impl || 0,
    });
  }

  // 2. PIPELINE VELOCITY (average time in each stage)
  const tagHistory = db.prepare(`
    SELECT * FROM contact_tag_history
    ORDER BY contact_id, changed_at ASC
  `).all();

  // Calculate average days per stage transition
  const stageTransitions = {};
  const contactTransitions = {};

  tagHistory.forEach(record => {
    if (!contactTransitions[record.contact_id]) {
      contactTransitions[record.contact_id] = [];
    }
    contactTransitions[record.contact_id].push(record);
  });

  // Calculate time between transitions
  Object.values(contactTransitions).forEach(transitions => {
    for (let i = 0; i < transitions.length; i++) {
      const current = transitions[i];
      const prevDate = i === 0
        ? db.prepare('SELECT created_at FROM contacts WHERE id = ?').get(current.contact_id)?.created_at
        : transitions[i - 1].changed_at;

      if (prevDate && current.old_tag) {
        const days = Math.floor((new Date(current.changed_at) - new Date(prevDate)) / (1000 * 60 * 60 * 24));
        if (!stageTransitions[current.old_tag]) {
          stageTransitions[current.old_tag] = [];
        }
        stageTransitions[current.old_tag].push(days);
      }
    }
  });

  const velocity = FUNNEL_STAGES.slice(0, -1).map(stage => {
    const times = stageTransitions[stage.tag] || [];
    const avgDays = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    return {
      tag: stage.tag,
      label: stage.label,
      color: stage.color,
      avg_days: avgDays,
      transitions: times.length,
    };
  });

  // 3. CONVERSION METRICS
  const wonDeals = db.prepare(`SELECT COUNT(*) as count FROM contacts WHERE tag = 'cliente'`).get().count;
  const lostDeals = db.prepare(`SELECT COUNT(*) as count FROM contacts WHERE tag = 'perdido'`).get().count;
  const activeDeals = totalContacts - wonDeals - lostDeals;
  const conversionRate = (wonDeals + lostDeals) > 0 ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) : 0;

  // 4. MONTHLY ACTIVITY TRENDS (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    const notesCount = db.prepare(`
      SELECT COUNT(*) as count FROM contact_notes
      WHERE created_at >= ? AND created_at <= ?
    `).get(monthStart, monthEnd).count;

    const followupsCount = db.prepare(`
      SELECT COUNT(*) as count FROM contact_followups
      WHERE completed_at >= ? AND completed_at <= ?
    `).get(monthStart, monthEnd).count;

    const newContacts = db.prepare(`
      SELECT COUNT(*) as count FROM contacts
      WHERE created_at >= ? AND created_at <= ?
    `).get(monthStart, monthEnd).count;

    const conversions = db.prepare(`
      SELECT COUNT(*) as count FROM contact_tag_history
      WHERE new_tag = 'cliente' AND changed_at >= ? AND changed_at <= ?
    `).get(monthStart, monthEnd).count;

    months.push({
      month: monthLabel,
      notes: notesCount,
      followups: followupsCount,
      new_contacts: newContacts,
      conversions: conversions,
    });
  }

  // 5. SEGMENT PERFORMANCE
  const segmentData = db.prepare(`
    SELECT segments, COUNT(*) as count,
           SUM(CASE WHEN tag = 'cliente' THEN 1 ELSE 0 END) as won,
           SUM(CASE WHEN tag = 'perdido' THEN 1 ELSE 0 END) as lost,
           SUM(valor_mensal) as valor_mensal
    FROM contacts
    WHERE segments IS NOT NULL AND segments != ''
    GROUP BY segments
  `).all();

  // Parse segments (comma-separated)
  const segmentStats = {};
  segmentData.forEach(row => {
    const segs = row.segments.split(',').filter(Boolean);
    segs.forEach(seg => {
      if (!segmentStats[seg]) {
        segmentStats[seg] = { count: 0, won: 0, lost: 0, valor_mensal: 0 };
      }
      segmentStats[seg].count += row.count;
      segmentStats[seg].won += row.won;
      segmentStats[seg].lost += row.lost;
      segmentStats[seg].valor_mensal += row.valor_mensal || 0;
    });
  });

  const segments = Object.entries(segmentStats).map(([name, data]) => ({
    name,
    count: data.count,
    won: data.won,
    lost: data.lost,
    conversion_rate: (data.won + data.lost) > 0 ? Math.round((data.won / (data.won + data.lost)) * 100) : 0,
    valor_mensal: data.valor_mensal,
  }));

  // 6. RECENT ACTIVITY TIMELINE (last 20 activities)
  const recentActivity = db.prepare(`
    SELECT
      'note' as type,
      n.id,
      n.content as description,
      n.created_at as date,
      c.id as contact_id,
      c.name as contact_name,
      c.company as contact_company,
      c.tag as contact_tag
    FROM contact_notes n
    JOIN contacts c ON n.contact_id = c.id
    WHERE n.content IS NOT NULL AND n.content != ''
    UNION ALL
    SELECT
      'followup' as type,
      f.id,
      f.description,
      f.completed_at as date,
      c.id as contact_id,
      c.name as contact_name,
      c.company as contact_company,
      c.tag as contact_tag
    FROM contact_followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.completed = 1 AND f.completed_at IS NOT NULL
    UNION ALL
    SELECT
      'tag_change' as type,
      h.id,
      h.old_tag || ' → ' || h.new_tag as description,
      h.changed_at as date,
      c.id as contact_id,
      c.name as contact_name,
      c.company as contact_company,
      c.tag as contact_tag
    FROM contact_tag_history h
    JOIN contacts c ON h.contact_id = c.id
    ORDER BY date DESC
    LIMIT 20
  `).all();

  // 7. OVERVIEW STATS
  const overview = {
    total_contacts: totalContacts,
    active_deals: activeDeals,
    won_deals: wonDeals,
    lost_deals: lostDeals,
    conversion_rate: conversionRate,
    total_valor_mensal: funnelData.reduce((sum, f) => sum + (f.total_mensal || 0), 0),
    total_valor_impl: funnelData.reduce((sum, f) => sum + (f.total_impl || 0), 0),
    avg_deal_value: wonDeals > 0
      ? Math.round(db.prepare(`SELECT AVG(valor_mensal) as avg FROM contacts WHERE tag = 'cliente' AND valor_mensal > 0`).get().avg || 0)
      : 0,
  };

  // 8. TOP PERFORMERS (contacts closest to closing)
  const hotContacts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note_date
    FROM contacts c
    WHERE c.tag IN ('proposta', 'negociacao')
    ORDER BY
      CASE c.tag WHEN 'negociacao' THEN 1 WHEN 'proposta' THEN 2 END,
      notes_count DESC
    LIMIT 5
  `).all();

  res.json({
    overview,
    funnel,
    velocity,
    months,
    segments,
    recent_activity: recentActivity,
    hot_contacts: hotContacts,
  });
});

// ============================================
// AI INSIGHTS - Smart analysis and recommendations
// ============================================

router.get('/reports/insights', (req, res) => {
  const db = req.db;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const insights = [];

  // Helper to add insight
  const addInsight = (type, priority, title, description, contacts, action) => {
    insights.push({
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority, // 1 = critical, 2 = high, 3 = medium, 4 = low
      title,
      description,
      contacts,
      action,
      created_at: new Date().toISOString()
    });
  };

  // 1. STALLED DEALS - Contacts in proposta/negociacao for too long without activity
  const stalledDeals = db.prepare(`
    SELECT c.*,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note_date,
      julianday('now') - julianday(COALESCE(
        (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
        c.updated_at
      )) as days_without_activity
    FROM contacts c
    WHERE c.tag IN ('proposta', 'negociacao')
    AND julianday('now') - julianday(COALESCE(
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
      c.updated_at
    )) > 10
    ORDER BY days_without_activity DESC
    LIMIT 5
  `).all();

  if (stalledDeals.length > 0) {
    const totalValue = stalledDeals.reduce((sum, c) => sum + (c.valor_mensal || 0), 0);
    addInsight(
      'stalled_deals',
      1,
      `${stalledDeals.length} negocio(s) parado(s)`,
      `Contatos em proposta/negociacao sem atividade recente. Valor potencial em risco: R$ ${totalValue.toLocaleString('pt-BR')}/mes`,
      stalledDeals.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        days: Math.round(c.days_without_activity),
        valor_mensal: c.valor_mensal,
        last_note: c.last_note_date ? new Date(c.last_note_date).toLocaleDateString('pt-BR') : 'Nunca'
      })),
      'Entre em contato hoje para nao perder o momentum'
    );
  }

  // 2. BUYING SIGNALS - Detect buying intent keywords in recent notes
  const BUYING_KEYWORDS = [
    { word: 'urgente', weight: 3 },
    { word: 'orcamento', weight: 2 },
    { word: 'budget', weight: 2 },
    { word: 'fechar', weight: 3 },
    { word: 'aprovar', weight: 3 },
    { word: 'comecar', weight: 2 },
    { word: 'quando', weight: 1 },
    { word: 'prazo', weight: 2 },
    { word: 'pressa', weight: 3 },
    { word: 'decisao', weight: 3 },
    { word: 'contrato', weight: 3 },
    { word: 'vamos fazer', weight: 3 },
    { word: 'quero', weight: 2 },
    { word: 'preciso', weight: 2 },
  ];

  const recentNotes = db.prepare(`
    SELECT n.*, c.id as contact_id, c.name as contact_name, c.company as contact_company,
           c.tag as contact_tag, c.valor_mensal
    FROM contact_notes n
    JOIN contacts c ON n.contact_id = c.id
    WHERE n.created_at >= datetime('now', '-14 days')
    AND n.content IS NOT NULL AND n.content != ''
    AND c.tag NOT IN ('cliente', 'perdido')
  `).all();

  const buyingSignalContacts = [];
  recentNotes.forEach(note => {
    const content = (note.content || '').toLowerCase();
    const foundKeywords = [];
    let score = 0;

    BUYING_KEYWORDS.forEach(kw => {
      if (content.includes(kw.word)) {
        foundKeywords.push(kw.word);
        score += kw.weight;
      }
    });

    if (score >= 3) {
      const existing = buyingSignalContacts.find(c => c.id === note.contact_id);
      if (existing) {
        existing.keywords = [...new Set([...existing.keywords, ...foundKeywords])];
        existing.score += score;
      } else {
        buyingSignalContacts.push({
          id: note.contact_id,
          name: note.contact_name,
          company: note.contact_company,
          tag: note.contact_tag,
          valor_mensal: note.valor_mensal,
          keywords: foundKeywords,
          score,
          note_preview: note.content.substring(0, 100)
        });
      }
    }
  });

  if (buyingSignalContacts.length > 0) {
    buyingSignalContacts.sort((a, b) => b.score - a.score);
    addInsight(
      'buying_signals',
      2,
      `Sinais de compra em ${buyingSignalContacts.length} contato(s)`,
      `Palavras-chave indicando intencao de compra detectadas em notas recentes`,
      buyingSignalContacts.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal,
        keywords: c.keywords.join(', '),
        note_preview: c.note_preview
      })),
      'Priorize estes contatos - alta probabilidade de conversao'
    );
  }

  // 3. OVERDUE FOLLOWUPS - Missed follow-up dates
  const overdueFollowups = db.prepare(`
    SELECT f.*, c.id as contact_id, c.name as contact_name, c.company as contact_company,
           c.tag as contact_tag, c.valor_mensal,
           julianday('now') - julianday(f.date) as days_overdue
    FROM contact_followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.completed = 0 AND f.date < ?
    ORDER BY days_overdue DESC
    LIMIT 10
  `).all(todayStr);

  if (overdueFollowups.length > 0) {
    addInsight(
      'overdue_followups',
      1,
      `${overdueFollowups.length} follow-up(s) atrasado(s)`,
      `Follow-ups que passaram da data agendada e precisam de atencao imediata`,
      overdueFollowups.map(f => ({
        id: f.contact_id,
        name: f.contact_name,
        company: f.contact_company,
        tag: f.contact_tag,
        valor_mensal: f.valor_mensal,
        days: Math.round(f.days_overdue),
        followup_description: f.description || 'Sem descricao',
        scheduled_date: new Date(f.date).toLocaleDateString('pt-BR')
      })),
      'Complete ou reagende estes follow-ups hoje'
    );
  }

  // 4. COOLING LEADS - Contacts losing engagement
  const coolingLeads = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as total_notes,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id AND created_at >= datetime('now', '-30 days')) as recent_notes,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id AND created_at >= datetime('now', '-90 days') AND created_at < datetime('now', '-30 days')) as older_notes
    FROM contacts c
    WHERE c.tag NOT IN ('cliente', 'perdido')
    AND (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id AND created_at >= datetime('now', '-90 days') AND created_at < datetime('now', '-30 days')) > 2
    AND (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id AND created_at >= datetime('now', '-30 days')) = 0
  `).all();

  if (coolingLeads.length > 0) {
    addInsight(
      'cooling_leads',
      2,
      `${coolingLeads.length} lead(s) esfriando`,
      `Contatos que tinham engajamento ativo e pararam de interagir`,
      coolingLeads.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal,
        total_notes: c.total_notes,
        message: `${c.older_notes} notas nos ultimos 90 dias, 0 no ultimo mes`
      })),
      'Retome contato antes que percam interesse completamente'
    );
  }

  // 5. LEADS WITHOUT FOLLOWUP - Contacts in active stages with no scheduled followup
  const leadsWithoutFollowup = db.prepare(`
    SELECT c.*
    FROM contacts c
    WHERE c.tag IN ('lead', 'qualificado', 'proposta', 'negociacao')
    AND NOT EXISTS (
      SELECT 1 FROM contact_followups f
      WHERE f.contact_id = c.id AND f.completed = 0
    )
  `).all();

  if (leadsWithoutFollowup.length > 0) {
    const byTag = {};
    leadsWithoutFollowup.forEach(c => {
      byTag[c.tag] = (byTag[c.tag] || 0) + 1;
    });

    addInsight(
      'no_followup',
      3,
      `${leadsWithoutFollowup.length} contato(s) sem follow-up agendado`,
      `Contatos em etapas ativas do funil que nao tem proximo passo definido`,
      leadsWithoutFollowup.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal
      })),
      'Agende follow-ups para manter o pipeline em movimento'
    );
  }

  // 6. HIGH VALUE AT RISK - High value contacts that are stalling or cooling
  const highValueAtRisk = db.prepare(`
    SELECT c.*,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note,
      julianday('now') - julianday(COALESCE(
        (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
        c.created_at
      )) as days_inactive
    FROM contacts c
    WHERE c.tag NOT IN ('cliente', 'perdido')
    AND (c.valor_mensal >= 1000 OR c.valor_implementacao >= 5000)
    AND julianday('now') - julianday(COALESCE(
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
      c.created_at
    )) > 7
    ORDER BY c.valor_mensal DESC
    LIMIT 5
  `).all();

  if (highValueAtRisk.length > 0) {
    const totalValue = highValueAtRisk.reduce((sum, c) => sum + (c.valor_mensal || 0), 0);
    addInsight(
      'high_value_risk',
      1,
      `R$ ${totalValue.toLocaleString('pt-BR')}/mes em risco`,
      `Contatos de alto valor sem interacao recente - prioridade maxima`,
      highValueAtRisk.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal,
        valor_implementacao: c.valor_implementacao,
        days: Math.round(c.days_inactive),
        last_note: c.last_note ? new Date(c.last_note).toLocaleDateString('pt-BR') : 'Nunca'
      })),
      'Acao imediata necessaria - valor significativo em jogo'
    );
  }

  // 7. CONVERSION OPPORTUNITY - Contacts ready to advance in funnel
  const conversionOpportunity = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM contact_followups WHERE contact_id = c.id AND completed = 1) as completed_followups
    FROM contacts c
    WHERE c.tag IN ('lead', 'qualificado')
    AND (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) >= 3
    AND (SELECT COUNT(*) FROM contact_followups WHERE contact_id = c.id AND completed = 1) >= 1
    ORDER BY c.valor_mensal DESC
    LIMIT 5
  `).all();

  if (conversionOpportunity.length > 0) {
    addInsight(
      'conversion_ready',
      3,
      `${conversionOpportunity.length} contato(s) prontos para avancar`,
      `Leads e qualificados com bom engajamento - considere mover para proxima etapa`,
      conversionOpportunity.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal,
        notes_count: c.notes_count,
        completed_followups: c.completed_followups
      })),
      'Avalie se estao prontos para proposta ou qualificacao'
    );
  }

  // 8. OBJECTION DETECTED - Detect objection keywords
  const OBJECTION_KEYWORDS = [
    'caro', 'muito caro', 'sem verba', 'nao tenho', 'depois', 'mais tarde',
    'proximo mes', 'proximo ano', 'pensando', 'avaliar', 'concorrente',
    'outra proposta', 'comparar'
  ];

  const objectionContacts = [];
  recentNotes.forEach(note => {
    const content = (note.content || '').toLowerCase();
    const foundObjections = [];

    OBJECTION_KEYWORDS.forEach(kw => {
      if (content.includes(kw)) {
        foundObjections.push(kw);
      }
    });

    if (foundObjections.length > 0 && note.contact_tag !== 'cliente' && note.contact_tag !== 'perdido') {
      const existing = objectionContacts.find(c => c.id === note.contact_id);
      if (existing) {
        existing.objections = [...new Set([...existing.objections, ...foundObjections])];
      } else {
        objectionContacts.push({
          id: note.contact_id,
          name: note.contact_name,
          company: note.contact_company,
          tag: note.contact_tag,
          valor_mensal: note.valor_mensal,
          objections: foundObjections,
          note_preview: note.content.substring(0, 100)
        });
      }
    }
  });

  if (objectionContacts.length > 0) {
    addInsight(
      'objections',
      2,
      `Objecoes detectadas em ${objectionContacts.length} contato(s)`,
      `Palavras indicando resistencia ou objecoes foram encontradas`,
      objectionContacts.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        tag: c.tag,
        valor_mensal: c.valor_mensal,
        objections: c.objections.join(', '),
        note_preview: c.note_preview
      })),
      'Prepare argumentos para contornar essas objecoes'
    );
  }

  // 9. WEEKLY ACTIVITY CHECK
  const weeklyStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM contact_notes WHERE created_at >= datetime('now', '-7 days')) as notes_week,
      (SELECT COUNT(*) FROM contact_notes WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')) as notes_prev_week,
      (SELECT COUNT(*) FROM contact_followups WHERE completed_at >= datetime('now', '-7 days')) as followups_week,
      (SELECT COUNT(*) FROM contacts WHERE tag = 'cliente' AND updated_at >= datetime('now', '-7 days')) as new_clients_week
  `).get();

  if (weeklyStats.notes_week < weeklyStats.notes_prev_week * 0.5 && weeklyStats.notes_prev_week > 0) {
    addInsight(
      'activity_drop',
      3,
      'Queda na atividade semanal',
      `Notas criadas esta semana (${weeklyStats.notes_week}) vs semana passada (${weeklyStats.notes_prev_week})`,
      [],
      'Aumente as interacoes com contatos para manter o pipeline ativo'
    );
  }

  if (weeklyStats.new_clients_week > 0) {
    addInsight(
      'wins',
      4,
      `${weeklyStats.new_clients_week} nova(s) conversao(oes) esta semana!`,
      `Parabens! Contatos convertidos para cliente nos ultimos 7 dias`,
      [],
      'Continue o excelente trabalho'
    );
  }

  // Sort insights by priority
  insights.sort((a, b) => a.priority - b.priority);

  // Summary
  const summary = {
    total_insights: insights.length,
    critical: insights.filter(i => i.priority === 1).length,
    high: insights.filter(i => i.priority === 2).length,
    medium: insights.filter(i => i.priority === 3).length,
    low: insights.filter(i => i.priority === 4).length,
  };

  res.json({
    generated_at: new Date().toISOString(),
    summary,
    insights
  });
});

// ============================================
// CRM KANBAN - Visual Pipeline
// ============================================

// Get columns with contacts for Kanban view
router.get('/kanban/columns', (req, res) => {
  const db = req.db;
  const { board_id } = req.query;

  // Get board_id - use provided or first board
  let boardId = board_id;
  if (!boardId) {
    const firstBoard = db.prepare('SELECT id FROM boards ORDER BY position ASC LIMIT 1').get();
    boardId = firstBoard?.id;
  }

  if (!boardId) {
    return res.json([]);
  }

  // Get columns for this board
  const columns = db.prepare(`
    SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC
  `).all(boardId);

  // Get contacts for this board with additional info
  const contacts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note_at,
      julianday('now') - julianday(COALESCE(
        (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
        c.updated_at,
        c.created_at
      )) as days_since_contact
    FROM contacts c
    WHERE c.board_id = ?
    ORDER BY c.position ASC
  `).all(boardId);

  // Group contacts by column
  const columnsWithContacts = columns.map(col => ({
    ...col,
    contacts: contacts.filter(c => c.column_id === col.id)
  }));

  // Get all column IDs for this board
  const columnIds = columns.map(c => c.id);

  // Also include contacts without valid column (assign to first column)
  // This includes: NULL column_id, NULL board_id, or column_id that doesn't exist
  const orphanContacts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note_at,
      julianday('now') - julianday(COALESCE(
        (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id),
        c.updated_at,
        c.created_at
      )) as days_since_contact
    FROM contacts c
    WHERE c.column_id IS NULL
      OR c.board_id IS NULL
      OR c.column_id NOT IN (SELECT id FROM columns)
    ORDER BY c.position ASC
  `).all();

  // Add orphan contacts to first column if any
  if (orphanContacts.length > 0 && columnsWithContacts.length > 0) {
    const firstColumn = columnsWithContacts[0];

    // Update orphan contacts to be in first column
    const updateStmt = db.prepare('UPDATE contacts SET board_id = ?, column_id = ? WHERE id = ?');
    orphanContacts.forEach((contact, idx) => {
      updateStmt.run(boardId, firstColumn.id, contact.id);
      contact.board_id = boardId;
      contact.column_id = firstColumn.id;
      contact.position = firstColumn.contacts.length + idx;
    });

    // Add to response
    columnsWithContacts[0].contacts = [...columnsWithContacts[0].contacts, ...orphanContacts];
  }

  res.json(columnsWithContacts);
});

// Move contact to another column (with optional note)
router.put('/:id/move', (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { column_id, position, note } = req.body;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  const targetColumn = db.prepare('SELECT * FROM columns WHERE id = ?').get(column_id);
  if (!targetColumn) {
    return res.status(404).json({ error: 'Coluna não encontrada' });
  }

  const oldColumn = contact.column_id
    ? db.prepare('SELECT title FROM columns WHERE id = ?').get(contact.column_id)
    : null;

  const transaction = db.transaction(() => {
    // Update positions in old column (if moving from a column)
    if (contact.column_id && contact.column_id !== column_id) {
      db.prepare(`
        UPDATE contacts SET position = position - 1
        WHERE column_id = ? AND position > ?
      `).run(contact.column_id, contact.position || 0);
    }

    // Make room in target column
    if (position !== undefined) {
      db.prepare(`
        UPDATE contacts SET position = position + 1
        WHERE column_id = ? AND position >= ?
      `).run(column_id, position);
    }

    // Calculate new position if not provided
    let newPosition = position;
    if (newPosition === undefined) {
      const maxPos = db.prepare('SELECT MAX(position) as max FROM contacts WHERE column_id = ?').get(column_id);
      newPosition = (maxPos.max ?? -1) + 1;
    }

    // Update contact
    db.prepare(`
      UPDATE contacts SET
        column_id = ?,
        board_id = ?,
        position = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(column_id, targetColumn.board_id, newPosition, id);

    // Add note if provided
    if (note && note.trim()) {
      const noteId = uuidv4();
      const noteContent = `[Movido para ${targetColumn.title}] ${note.trim()}`;
      db.prepare(`
        INSERT INTO contact_notes (id, contact_id, content, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(noteId, id, noteContent);
    }

    // Track in tag history (for analytics)
    if (oldColumn && oldColumn.title !== targetColumn.title) {
      const historyId = uuidv4();
      db.prepare(`
        INSERT INTO contact_tag_history (id, contact_id, old_tag, new_tag, changed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(historyId, id, oldColumn.title.toLowerCase(), targetColumn.title.toLowerCase());
    }
  });

  transaction();

  // Get updated contact
  const updatedContact = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count,
      (SELECT MAX(created_at) FROM contact_notes WHERE contact_id = c.id) as last_note_at
    FROM contacts c
    WHERE c.id = ?
  `).get(id);

  // Audit log
  if (req.actingUser) {
    const details = JSON.stringify({
      from_column: oldColumn?.title || 'Sem coluna',
      to_column: targetColumn.title,
      note: note || null
    });
    logAction(db, req.actingUser, 'move', 'contact', id, contact.name, details);
  }

  res.json(updatedContact);
});

// Reorder contacts within a column
router.put('/kanban/reorder', (req, res) => {
  const db = req.db;
  const { column_id, contacts } = req.body;

  if (!column_id || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'column_id e contacts são obrigatórios' });
  }

  const updateStmt = db.prepare('UPDATE contacts SET position = ? WHERE id = ? AND column_id = ?');

  db.transaction(() => {
    contacts.forEach((contactId, index) => {
      updateStmt.run(index, contactId, column_id);
    });
  })();

  res.json({ success: true });
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
