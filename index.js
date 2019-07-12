const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const { google } = require('googleapis');

/******CREATE GOOGLE CALENDAR EVENTS ****/


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), getLionsGames);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

const getData = async (fetch, url) => {
    const getRequest = await fetch(url);
    const data = await getRequest.text();
    return data;
}

const getLionsGames = async (auth) => getData(fetch, 'https://www.yourtv.com.au/search?q=AFL&region=75').then(data => refineData(data, auth));

const refineData = (data, auth) => {
    const calendar = google.calendar({version: 'v3', auth});

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

    lionsGames.forEach(game => {
        const date = game.date;
        const year = new Date().getFullYear();
        game.games.forEach(game => {
            const time = game.time;
            const duration = game.duration.replace(" min", "");
            const eventDate = new Date(`${date} ${year} ${time}`);
            if((eventDate.getTime() - new Date().getTime()) < 604800000) { // 1 week in milliseconds
                const event = {
                    'summary': `AFL: ${game.title}`,
                    'location': 'Australia',
                    'description': game.description,
                    'colorId': '7',
                    'start': {
                        'dateTime': eventDate,
                        'timeZone': 'Australia/Brisbane',
                    },
                    'end': {
                        'dateTime': new Date(eventDate.getTime() + (duration * 60000)),
                        'timeZone': 'Australia/Brisbane',
                    },
                    'reminders': {
                        'useDefault': true,
                    }
                }
                calendar.events.insert({
                    auth: auth,
                    calendarId: 'primary',
                    resource: event,
                }, function(err, event) {
                    if (err) {
                        console.log('There was an error:' + err);
                        return;
                    }
                    console.log('Event Created')
                });
            }
        })
    })
}


