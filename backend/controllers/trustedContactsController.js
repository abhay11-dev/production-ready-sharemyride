// controllers/trustedContactsController.js


const User = require('../models/User');
const { logAction } = require('../services/auditService');

const RELATIONSHIPS = ['primary', 'secondary', 'guardian', 'family', 'friend'];

// GET /api/trusted-contacts
exports.list = async (req, res) => {
  const user = await User.findById(req.user._id).select('trustedContacts').lean();
  res.json({ success: true, data: user.trustedContacts || [] });
};

// POST /api/trusted-contacts
// Body: { name, phone, relationship?, notifiable? }
exports.add = async (req, res) => {
  const { name, phone, relationship = 'primary', notifiable = true } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'name and phone are required' });
  }
  if (!RELATIONSHIPS.includes(relationship)) {
    return res.status(400).json({ success: false, message: 'Invalid relationship type' });
  }

  const user = await User.findById(req.user._id);
  user.trustedContacts.push({ name, phone, relationship, notifiable });
  await user.save();

  const added = user.trustedContacts[user.trustedContacts.length - 1];

  logAction({
    actor: req.user,
    action: 'contact.add',
    resource: 'User',
    resourceId: req.user._id,
    changes: { after: added.toObject() },
    req
  }).catch(() => {});

  res.status(201).json({ success: true, data: user.trustedContacts });
};

// PATCH /api/trusted-contacts/:contactId
exports.update = async (req, res) => {
  const user = await User.findById(req.user._id);
  const contact = user.trustedContacts.id(req.params.contactId);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

  const before = contact.toObject();
  const { name, phone, relationship, notifiable } = req.body || {};
  if (name !== undefined) contact.name = name;
  if (phone !== undefined) contact.phone = phone;
  if (relationship !== undefined) {
    if (!RELATIONSHIPS.includes(relationship)) {
      return res.status(400).json({ success: false, message: 'Invalid relationship type' });
    }
    contact.relationship = relationship;
  }
  if (notifiable !== undefined) contact.notifiable = !!notifiable;

  await user.save();

  logAction({
    actor: req.user,
    action: 'contact.update',
    resource: 'User',
    resourceId: req.user._id,
    changes: { before, after: contact.toObject() },
    req
  }).catch(() => {});

  res.json({ success: true, data: user.trustedContacts });
};

// DELETE /api/trusted-contacts/:contactId
exports.remove = async (req, res) => {
  const user = await User.findById(req.user._id);
  const contact = user.trustedContacts.id(req.params.contactId);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

  const before = contact.toObject();
  contact.deleteOne();
  await user.save();

  logAction({
    actor: req.user,
    action: 'contact.remove',
    resource: 'User',
    resourceId: req.user._id,
    changes: { before },
    req
  }).catch(() => {});

  res.json({ success: true, data: user.trustedContacts });
};