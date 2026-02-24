import * as cheerio from 'cheerio';

async function test() {
    const q = encodeURIComponent('Native Foreign');
    const url = `https://www.promonews.tv/search/videos?search_api_views_fulltext=${q}`;
    console.log('Fetching', url);
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    $('.views-row').each((i, el) => {
        const titleEl = $(el).find('h3 a, .title a, h2 a, a').filter((_, e) => $(e).text().trim().length > 0).first();
        const title = titleEl.text().trim();
        const link = titleEl.attr('href');
        if (title && link) {
            results.push({ title, link: `https://www.promonews.tv${link}` });
        }
    });

    console.log('Found', results.length, 'projects.');
    console.log(results.slice(0, 3));
}
test();
