import express from 'express';

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY)
    throw new Error('Supabase environment variables missing.');

const now = () => {
    let local = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    let date = new Date(local);
 
    return {
        day: date.getDay(),
        hour: date.getHours(),
        mins: date.getMinutes()
    };
}

const getNearestFiveMin = (mins: number) => Math.floor(mins / 5) * 5;

const app = express();
const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.post('/metrics', async (req, res) => {
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
    const nearestMin = getNearestFiveMin(mins);

    const { data, error } = await client
        .from('rec')
        .select('count')
        .eq('day', day)
        .eq('hour', hour)
        .eq('mins', nearestMin);

    // if row doesn't exist for the current day, hour, min pair, insert a new row
    if (!data || data.length === 0) {
        const { error } = await client
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
    const { error: updateError } = await client
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

app.use('*', (_req, res) => res
    .status(404)
    .send(`
        <pre style="color: red; font-weight: bold; font-size: 20px; padding: 30px; padding-bottom: 0px;">404 - Not Found</pre>
        <pre style="font-size: 19px; padding: 30px; padding-top: 5px;">Those aren't the droids you're looking for..</pre>
    `));

app.use((err, _req, res, _next) => {
    console.error('Uncaught fatal exception:', err);
    res
        .status(500)
        .json({ message: 'Internal Server Error' });
});

app.listen(process.env.PORT, () => console.log('Fitpulse ready on port 3000.'));

export default app;