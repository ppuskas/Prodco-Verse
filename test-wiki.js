async function fetchWikiProjects(targetName) {
    try {
        console.log('Fetching Wiki for:', targetName);
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="${encodeURIComponent(targetName)}"&utf8=&format=json`);
        const searchData = await searchRes.json();

        if (!searchData.query.search.length) {
            console.log('No wiki page found for', targetName);
            return [];
        }

        const title = searchData.query.search[0].title;
        console.log('Found article:', title);

        const pageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&titles=${encodeURIComponent(title)}&format=json`);
        const pageData = await pageRes.json();
        const pages = pageData.query.pages;
        const pageId = Object.keys(pages)[0];
        console.log('Summary:', pages[pageId].extract);

        return [];
    } catch (e) {
        console.error('Error:', e);
        return [];
    }
}

fetchWikiProjects('Droga5');
fetchWikiProjects('Mother (advertising agency)');
