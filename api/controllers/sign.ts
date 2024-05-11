import express from 'express';

import { getSignMeta, resolveSignFeed } from '../lib/sign';

const router = express.Router();

router.get('/stats', async (req, res) => {
    let stats = await getSignMeta();
    return res.json({ stats });  
});

router.get('/room/:room', async (req, res) => {
    let { room } = req.params;
    if (!room) return res
        .status(400)
        .json({ message: 'Missing room parameter' });

    let sign = await resolveSignFeed(room);
    if (!sign) return res
        .status(404)
        .json({ message: 'Room not found' });

    return res.json({ sign });
})

router.get('/site/:site', async (req, res) => {
    let { site } = req.params;
    if (!site) return res
        .status(400)
        .json({ message: 'Missing site parameter' });

    let meta = await getSignMeta();
    let sites = await Promise.all(
        meta
            .filter(m => m.slug.toLowerCase().startsWith(site.toLowerCase()))
            .map(async ({ slug }) => await resolveSignFeed(slug))
    );

    return res.json({ sites });
})

export { router as SignController };