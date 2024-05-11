import express from 'express';

import { createClient } from '@supabase/supabase-js';

import { RecController } from './controllers/rec';
import { SignController } from './controllers/sign';
import { StudyController } from './controllers/study';
import { DiningController } from './controllers/dining';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.SERVICE_KEY)
    throw new Error('Supabase environment variables missing.');

export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/dining', DiningController);
app.use('/rec', RecController);
app.use('/sign', SignController);
app.use('/study', StudyController);

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

app.listen(port, () => console.log(`Cobalt Backplane ready on port ${port}.`));

export default app;