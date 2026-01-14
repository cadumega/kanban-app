const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

const router = express.Router();

// Get all contacts
router.get('/', (req, res) => {
  const contacts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count
    FROM contacts c
    ORDER BY c.name ASC
  `).all();
  res.json(contacts);
});

// Get single contact with notes
router.get('/:id', (req, res) => {
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
  const { name, email, phone, company, role } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO contacts (id, name, email, phone, company, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), email || null, phone || null, company || null, role || null);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// Update contact
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, role } = req.body;

  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  db.prepare(`
    UPDATE contacts
    SET name = ?, email = ?, phone = ?, company = ?, role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name?.trim() || existing.name,
    email || existing.email,
    phone || existing.phone,
    company || existing.company,
    role || existing.role,
    id
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.json(contact);
});

// Delete contact
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  res.status(204).send();
});

// Add note to contact
router.post('/:id/notes', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Conteúdo é obrigatório' });
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  const noteId = uuidv4();

  db.prepare(`
    INSERT INTO contact_notes (id, contact_id, content)
    VALUES (?, ?, ?)
  `).run(noteId, id, content.trim());

  const note = db.prepare('SELECT * FROM contact_notes WHERE id = ?').get(noteId);
  res.status(201).json(note);
});

// Delete note
router.delete('/:contactId/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  db.prepare('DELETE FROM contact_notes WHERE id = ?').run(noteId);
  res.status(204).send();
});

module.exports = router;
