const cheerio = require('cheerio');
const fetch = require('node-fetch');

const getData = async (fetch, url) => {
  const getRequest = await fetch(url);
  const data = await getRequest.text();
  return data;
}

getData(fetch, 'https://www.yourtv.com.au/search?q=AFL&region=75').then(data => {
  refineData(data);
});


const isShortText = (text) => text.length < 100;

const refineData = (data) => {
  const $ = cheerio.load(data);
  const items = $('.search-list__item');

  let games = [];
  let arrayPosition;
  let currentArrayId;

  for(let i = 0; i < items.length ; i++){
    const $ = cheerio.load(items[i]);
    if($.html().length < 200){
      games.push({
        date: $('h3').text(),
        id: i,
        games: []
      })
      currentArrayId = i;
      arrayPosition = games.length - 1;
    }
    if($('.search-result').html() !== null){
      $('.search-result').each((index, item) => {
        const parsedItem = cheerio.load(item);
        if(parsedItem('.show-brief__episode').text().includes('Brisbane')) {
          const title = parsedItem('.show-brief__episode').text();
          const time = parsedItem('.search-result__time h4').text();
          const description = parsedItem('.show-brief__description').text();
          const duration = parsedItem('.search-result__time p').text();
          games[arrayPosition].games.push({
            title,
            description,
            time,
            duration 
          })
        }
      });
    }
  }
  const lionsGames = games.filter(game => game.games.length > 0);
    console.log(JSON.stringify(lionsGames, null, 4));
}




