const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUserImagesDir } = require('../database/userDb');

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
      (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as notes_count
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
  const db = req.db;
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
  const db = req.db;
  const { id } = req.params;

  // Get all notes with images to delete the image files
  const notes = db.prepare('SELECT image_path FROM contact_notes WHERE contact_id = ? AND image_path IS NOT NULL').all(id);
  const imagesDir = getUserImagesDir(req.user.email);

  notes.forEach(note => {
    if (note.image_path) {
      const imagePath = path.join(imagesDir, note.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  });

  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  res.status(204).send();
});

// Add note to contact (with optional image)
router.post('/:id/notes', upload.single('image'), (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { content } = req.body;
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

  db.prepare(`
    INSERT INTO contact_notes (id, contact_id, content, image_path)
    VALUES (?, ?, ?, ?)
  `).run(noteId, id, content?.trim() || null, imagePath);

  const note = db.prepare('SELECT * FROM contact_notes WHERE id = ?').get(noteId);
  res.status(201).json(note);
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

// Serve uploaded images
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  const imagesDir = getUserImagesDir(req.user.email);
  const imagePath = path.join(imagesDir, filename);

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Imagem não encontrada' });
  }

  res.sendFile(imagePath);
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
