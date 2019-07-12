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

const refineData = (data) => {
  const $ = cheerio.load(data);
  let resultsArray = []
  $('.search-result').each(function(){
    resultsArray.push($(this).html());  
  });
  
  const brisbaneResults = resultsArray.filter(item => {
    const $ = cheerio.load(item);
    return $('.show-brief__episode').text().includes('Brisbane'); 
  })

  console.log(brisbaneResults);
  console.log(brisbaneResults.length);
}



