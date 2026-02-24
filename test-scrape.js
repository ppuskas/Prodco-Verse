import * as cheerio from 'cheerio';
import https from 'https';

async function fetchRealProjects(targetName) {
    try {
        const query = encodeURIComponent(`${targetName} production agency "work" OR "projects" OR "commercial"`);
        const url = `https://html.duckduckgo.com/html/?q=${query}`;
        console.log('Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        const projects = [];

        $('.result__title .result__a').each((i, el) => {
            if (projects.length >= 3) return;
            const title = $(el).text();
            let link = $(el).attr('href');
            if (link && link.startsWith('//duckduckgo.com/l/?uddg=')) {
                link = decodeURIComponent(link.split('uddg=')[1].split('&')[0]);
            }

            // Clean up the title
            let cleanTitle = title.replace(/[-|].*$/, '').trim();
            if (cleanTitle.toLowerCase().includes(targetName.toLowerCase())) {
                cleanTitle = cleanTitle.replace(new RegExp(targetName, 'ig'), '').trim();
            }
            if (cleanTitle.length > 3) {
                projects.push({ name: cleanTitle, url: link, isNotable: true, isViral: false });
            } else {
                projects.push({ name: title, url: link, isNotable: true, isViral: false });
            }
        });

        return projects;
    } catch (e) {
        console.error('Error fetching real projects:', e);
        return [];
    }
}

async function test() {
    console.log(await fetchRealProjects('Droga5'));
    console.log(await fetchRealProjects('Mschf'));
}

test();
