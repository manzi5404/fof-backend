const settingsRepo = require('../repositories/settings.repository');

function coerceMaybeJson(value) {
  // keep strings as-is except when it's valid JSON
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed)) && trimmed.match(/^[-+]?\d+(\.\d+)?$/)) {
    // numeric-like
    return Number(trimmed);
  }
  return value;
}

function serializeValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function getSettings(req, res) {
  try {
    const settings = await settingsRepo.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[SETTINGS] getSettings failed:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
  }
}

async function updateSetting(req, res) {
  try {
    const { setting_key, setting_value } = req.body || {};

    if (typeof setting_key !== 'string' || !setting_key.trim()) {
      return res.status(400).json({ success: false, error: 'setting_key is required and must be a non-empty string' });
    }
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ success: false, error: 'setting_value is required' });
    }

    const success = await settingsRepo.updateSetting(setting_key.trim(), serializeValue(setting_value));
    return res.json({ success });
  } catch (err) {
    console.error('[SETTINGS] updateSetting failed:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to update setting' });
  }
}

module.exports = {
  getSettings,
  updateSetting,
};

