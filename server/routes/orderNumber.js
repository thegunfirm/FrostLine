// /server/routes/orderNumber.js
// POST /api/orders/number  -> { outcomes: [...] } => { main, parts: [{outcome, orderNumber}] }

import express from 'express';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';

const router = express.Router();

router.post('/api/orders/number', express.json(), (req, res) => {
  try {
    const outcomes = splitOutcomes(req.body?.outcomes || []);
    if (outcomes.length === 0) {
      return res.status(400).json({ error: 'Provide at least one valid outcome' });
    }
    const minted = mintOrderNumber(outcomes);
    return res.json(minted);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Bad Request' });
  }
});

export default router;