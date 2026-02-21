const { v4: uuidv4 } = require('uuid');

/**
 * Log an action to the audit log
 * @param {Object} db - The user database connection
 * @param {Object} user - The acting user { id, email, name }
 * @param {string} action - The action performed (create, update, delete)
 * @param {string} entityType - The type of entity (contact, task, board, column, note, followup)
 * @param {string} entityId - The ID of the entity
 * @param {string|null} entityName - The name/title of the entity (optional)
 * @param {string|null} details - Additional details as JSON string (optional)
 */
function logAction(db, user, action, entityType, entityId, entityName = null, details = null) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, user_name, action, entity_type, entity_id, entity_name, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      user.id,
      user.email,
      user.name || null,
      action,
      entityType,
      entityId,
      entityName,
      details
    );
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Error logging audit action:', error);
  }
}

module.exports = { logAction };
