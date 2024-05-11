import express from 'express';

import { getRoomById, getRoomByName } from '@ilefa/bluestudy';
import { getAvailabilityForRoom, getGlobalAvailability } from '../lib/study';

const router = express.Router();

router.get('/available', async (_req, res) => {
    const available = await getGlobalAvailability();
    return res.json({ available });
});

router.get('/available/:room', async (req, res) => {
    const { room } = req.params;
    let resolved = getRoomByName(room) || getRoomById(parseInt(room));
    if (!resolved) return res
        .status(404)
        .json({ message: 'Room not found' });

    const available = await getAvailabilityForRoom(resolved.id);
    return res.json({ available });
})

export { router as StudyController };