const express = require('express');
const router = express.Router();

// GET /api/images/verify/<encodedURL>
// v1 rule: if it points to our own /images/*, consider it valid (200). Otherwise 404.
// This prevents the UI from marking images as invalid when they are local.
router.get('/api/images/verify/:encoded', (req, res) => {
  try {
    const raw = decodeURIComponent(req.params.encoded || '');
    if (typeof raw === 'string' && raw.startsWith('/images/')) {
      return res.status(200).json({ ok: true, url: raw });
    }
    return res.status(404).json({ ok: false, reason: 'non-local-url' });
  } catch {
    return res.status(400).json({ ok: false, reason: 'bad-encoding' });
  }
});

module.exports = router;