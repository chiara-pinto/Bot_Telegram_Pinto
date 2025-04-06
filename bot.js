const fs= require('fs');
const TelegramBot = require('node-telegram-bot-api');
const conf = JSON.parse(fs.readFileSync('conf.json'));
const https = require('https');
const token = conf.key;

const bot = new TelegramBot(token, {polling: true});

const getTeamStandings = async (teamQuery) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api-web.nhle.com',
            path: '/v1/standings/2025-04-05',
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const teams = json.standings;

                    // Cerca squadra per nome (case insensitive)
                    const team = teams.find(t =>
                        t.teamName.default.toLowerCase().includes(teamQuery.toLowerCase())
                    );

                    if (!team) {
                        resolve(`Squadra "${teamQuery}" non trovata nelle classifiche NHL.`);
                    } else {
                        const msg = ` *${team.teamName.default}* - Statistiche (05 Aprile 2025)

                        Punti: ${team.points}
                        Vittorie (Reg + OT): ${team.regulationPlusOtWins}
                        Gol in trasferta: ${team.roadGoalsFor}
                        Gol subiti in trasferta: ${team.roadGoalsAgainst}
                        Serie attuale: ${team.streakCode}${team.streakCount}`;

                        resolve(msg);
                    }
                } catch (err) {
                    console.error("Errore parsing JSON:", err);
                    resolve(" Errore nella lettura dei dati della classifica.");
                }
            });
        });

        req.on('error', (err) => {
            console.error("Errore richiesta:", err);
            resolve(" Errore nella richiesta all'API NHL.");
        });

        req.end();
    });
};

// Gestione dei messaggi del bot
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start") {
        bot.sendMessage(chatId, "Benvenuto! Scrivi il nome di una squadra NHL per vedere la sua posizione in classifica.");
    } else if (text === "/help") {
        bot.sendMessage(chatId, " *Comandi disponibili:*\n/start - Avvia il bot\n/help - Mostra questo messaggio\n\nOppure invia il nome di una squadra NHL, es: `Boston Bruins`, `Toronto`", { parse_mode: "Markdown" });
    } else {
        const info = await getTeamStandings(text);
        bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
    }
});