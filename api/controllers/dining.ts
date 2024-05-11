import express from 'express';

import { getMenus } from '../lib/dining';

const router = express.Router();

router.get('/menus', async (req, res) => {
    const menus = await getMenus();
    return res.json({ menus });
});

export { router as DiningController };