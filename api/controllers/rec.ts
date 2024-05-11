import express from 'express';
import moment from 'moment';

import { supabase } from '..';

import {
    getDailyStats,
    getNearest15Min,
    getTodayFittedAverage,
    getWeeklyStats,
    now,
    prependZero
} from '../lib/rec';

const router = express.Router();

router.post('/history/daily', async (req, res) => {
    if (!req.body || req.body.day === undefined || isNaN(req.body.day))
        return res
            .status(400)
            .json({ message: 'Missing or invalid request body' });

    let day = parseInt(req.body.day);
    if (req.body.start) {
        let start = moment(req.body.start);
        let compatWeekday = start.weekday() - 1;
        if (!start.isValid() || compatWeekday !== day)
            return res
                .status(400)
                .json({ message: 'Invalid start date' });

        let data = await getDailyStats(day, start);
        return res.json({ data });
    }

    let data = await getDailyStats(day);
    return res.json({ data });
});

router.post('/history/weekly', async (req, res) => {
    let data = await getWeeklyStats();
    return res.json({ data });
});

router.post('/now', async (_req, res) => {
    const { day, hour, mins } = now();
    const nearestMin = getNearest15Min(mins);

    const { data, error } = await supabase
        .from('rec')
        .select('count')
        .eq('day', day)
        .eq('hour', hour)
        .eq('mins', nearestMin);

    if (error) return res
        .status(500)
        .json({ message: 'Failed to fetch record' });

    if (!data || data.length === 0)
        return res
            .status(200)
            .json({ count: 0 });

    let { count } = data[0];
    if (!count) count = 0;

    return res
        .status(200)
        .json({ count });
});

router.post('/today', async (req, res) => {
    const { day } = now();
    const { data, error } = await supabase
        .from('rec')
        .select('*')
        .eq('day', day);

    if (error) return res
        .status(500)
        .json({ message: 'Failed to fetch record' });

    let patched = data
        .sort((a, b) => {
            if (a.hour === b.hour)
                return a.mins - b.mins;
            return a.hour - b.hour;
        })
        .map(item => {
            let am = item.hour < 12 ? 'AM' : 'PM';
            let hour = item.hour > 12 ? item.hour - 12 : item.hour;
            let time = `${hour}:${prependZero(item.mins)} ${am}`;
            let count = item.count;

            return { time, count }
        });

    return res.json({ data: patched });
});

router.post('/today/avg', async (req, res) => {
    const { day } = now();
    const { data, error } = await supabase
        .from('rec')
        .select('*')
        .eq('day', day);

    if (error) return res
        .status(500)
        .json({ message: 'Failed to fetch record' });

    let patched = data
        .sort((a, b) => {
            if (a.hour === b.hour)
                return a.mins - b.mins;
            return a.hour - b.hour;
        })
        .map(item => {
            let am = item.hour < 12 ? 'AM' : 'PM';
            let hour = item.hour > 12 ? item.hour - 12 : item.hour;
            let time = `${hour}:${prependZero(item.mins)} ${am}`;
            let count = item.count;

            return { time, count }
        });

    let adjusted = await getTodayFittedAverage(patched);
    return res.json({ data: adjusted });
});

router.post('/metrics', async (req, res) => {
    if (!req.headers['x-ilefa-key'] || req.headers['x-ilefa-key'] !== process.env.SERVICE_KEY)
        return res
            .status(401)
            .json({ message: 'Unauthorized' });

    if (!req.body || !req.body.count || isNaN(req.body.count))
        return res
            .status(400)
            .json({ message: 'Missing or invalid request body' });

    const { count } = req.body;
    const { day, hour, mins } = now();
    const nearestMin = getNearest15Min(mins);

    const { data, error } = await supabase
        .from('rec')
        .select('count')
        .eq('day', day)
        .eq('hour', hour)
        .eq('mins', nearestMin);

    // if row doesn't exist for the current day, hour, min pair, insert a new row
    if (!data || data.length === 0) {
        const { error } = await supabase
            .from('rec')
            .insert({
                count, day, hour,
                mins: nearestMin
            });

        if (error) return res
            .status(500)
            .json({ message: 'Failed to insert record' });

        return res
            .status(201)
            .json({ message: 'Created new marker' });
    }

    // if row exists, update the count
    const { error: updateError } = await supabase
        .from('rec')
        .update({ count })
        .eq('day', day)
        .eq('hour', hour)
        .eq('mins', nearestMin);

    if (updateError) return res
        .status(500)
        .json({ message: 'Failed to update record' });

    return res
        .status(200)
        .json({ message: 'Updated current marker' });
});

export { router as RecController };