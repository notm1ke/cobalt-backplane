import axios from 'axios';
import Parser from 'rss-parser';

const parser = new Parser();

type SignMeta = {
    name: string;
    slug: string;
    items: number;
}

export const getSignMeta = async (): Promise<SignMeta[]> =>
    await axios
        .get('http://aitstatus.uconn.edu/roomSignageAll/_meta.json')
        .then(res => res.data)
        .catch(() => []);

export const resolveSignFeed = async (slug: string) =>
    await axios
        .get(`http://aitstatus.uconn.edu/roomSignageAll/${slug}.xml`)
        .then(res => res.data)
        .then(xml => parser.parseString(xml))
        .catch(() => []);