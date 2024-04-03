import axios from 'axios';
import moment from 'moment';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const API_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const START_DATES = ['2022-01-31', '2022-02-01', '2022-02-02', '2022-02-03', '2022-02-04', '2022-02-05', '2022-02-06']

const client = axios.create({
    baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
});

// api url helper
const url = (path: string) => `${path}${path.includes('?') ? '&' : '?'}key=${API_TOKEN}`;

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
            let hourStart = moment(date).set({ hour: 6, minute: 15, second: 0 });
            let records = day.map((record, i) => {
                let time = hourStart.clone().add(i * 5, 'minutes');
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
        .catch(_ => []);

    return data;
}

export type WeeklyAverageKeypair = {
    time: string;
    occupants: number
};

export const getWeeklyStats = async () => {
    let data = await client
        .get(url(`/values/Average!A2:H66`))
        .then(res => res.data.values);

    let days = DAYS.map(day => ({
        day,
        values: Array<WeeklyAverageKeypair>(),
        average: 0
    }));

    for (let d of data) {
        let [time, ...raw] = d;
        let values = raw
            .map(v => parseInt(v))
            .filter(v => !isNaN(v));

        values.forEach((v: number, i: number) => days[i].values.push({ time, occupants: v }));
    }

    days.forEach(d => {
        d.values.forEach(v => d.average += v.occupants);
        d.average /= d.values.length;
    });

    return days;
}