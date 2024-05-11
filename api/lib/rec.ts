import axios from 'axios';
import moment from 'moment';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const API_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const START_DATES = ['2022-01-31', '2022-02-01', '2022-02-02', '2022-02-03', '2022-02-04', '2022-02-05', '2022-02-06']

const client = axios.create({
    baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
});

const url = (path: string) => `${path}${path.includes('?') ? '&' : '?'}key=${API_TOKEN}`;

export const now = () => {
    let local = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    let date = new Date(local);

    return {
        day: date.getDay(),
        hour: date.getHours(),
        mins: date.getMinutes()
    };
}

export const getNearest15Min = (mins: number) => prependZero(Math.floor(mins / 15) * 15);

export const prependZero = (num: number) => num < 10 ? `0${num}` : num;

export const calculateStartOffset = (start: moment.Moment): [number, string] => {
    let offset = 0;
    let day = start.weekday() - 1;
    let date = moment(START_DATES[day]);

    while (date.isBefore(start)) {
        date.add(1, 'week');
        offset++;
    }

    let col = '';
    let i = offset;
    while (i >= 0) {
        col = String.fromCharCode(65 + (i % 26)) + col;
        i = Math.floor(i / 26) - 1;
    }

    return [offset, col];
}

export const getDailyStats = async (day: number, start = moment(START_DATES[day])) => {
    let date = moment(start);
    let dayName = DAYS[day];
    let offset = 0;

    if (!start.isSame(moment(START_DATES[day])))
        offset = calculateStartOffset(start)[0];

    let data = await client
        .get(url(`/values/${dayName}!B2:ZZZ9999?majorDimension=COLUMNS`))
        .then(res => res.data.values)
        .then(res => res.slice(offset).map((day, i) => {
            if (i > 0) date.add(1, 'week');

            // compile records
            let hourStart = moment(date).set({ hour: 6, minute: 0, second: 0 });
            let records = day.map((record, i) => {
                let time = hourStart.clone().add(i * 15, 'minutes');
                let am = time.hours() < 12;
                let str = `${time.hours()}:${time.minutes() < 10 ? '0' + time.minutes() : time.minutes()} ${am ? 'AM' : 'PM'}`;

                return {
                    time: str,
                    count: parseInt(record)
                };
            });

            return {
                date: date.format('YYYY-MM-DD'),
                records
            };
        }))
        .catch(_ => console.error(_));

    return data;
}

export type OccupantRecord = {
    time: string;
    count: number
};

export const getWeeklyStats = async () => {
    let data = await client
        .get(url(`/values/Average!A2:H66`))
        .then(res => res.data.values)
        .catch(_ => []);

    let days = DAYS.map(day => ({
        day,
        values: Array<OccupantRecord>(),
        average: 0
    }));

    for (let d of data) {
        let [time, ...raw] = d;
        let values = raw
            .map(v => parseInt(v))
            .filter(v => !isNaN(v));

        values.forEach((v: number, i: number) => days[i].values.push({ time, count: v }));
    }

    days.forEach(d => {
        d.values.forEach(v => d.average += v.count);
        d.average /= d.values.length;
    });

    return days;
}

export const findTrendFitMultiplier = (today: OccupantRecord[], avgs: OccupantRecord[]) => {
    let bestMultiplier = 1;
    let bestDiff = Infinity;

    for (let i = 0.1; i <= 2; i += 0.1) {
        let diff = avgs.reduce((acc, avg) => {
            let live = today.find(live => live.time === avg.time);
            if (!live) return acc;

            let diff = Math.abs(live.count - (avg.count * i));
            return acc + diff;
        }, 0);

        if (diff < bestDiff) {
            bestDiff = diff;
            bestMultiplier = i;
        }
    }

    return bestMultiplier;
}

export const getAdjustedAvgLine = (today: OccupantRecord[], avgs: OccupantRecord[]) => {
    let multiplier = findTrendFitMultiplier(today, avgs);
    return avgs.map(avg => ({ ...avg, count: Math.round(avg.count * multiplier) }));
}

export const getTodayFittedAverage = async (live: OccupantRecord[]) => {
    let day = moment().format('dddd');
    let stats = await getWeeklyStats();
    let avg = stats.find(s => s.day === day);
    if (!avg) return [];

    return getAdjustedAvgLine(live, avg.values);
}