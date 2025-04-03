const fs= require('fs');
const TelegramBot = require('node-telegram-bot-api');
const conf = JSON.parse(fs.readFileSync('conf.json'));
const https = require('https');
const token = conf.key;

const bot = new TelegramBot(token, {polling: true});

const getNHLTeamInfo = async (teamName) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'https://statsapi.web.nhl.com/api/v1/teams',
            method: 'GET',
            timeout: 5000 // Timeout di 5 secondi
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const teams = JSON.parse(data).teams;
                    const team = teams.find(t => t.name.toLowerCase().includes(teamName.toLowerCase()));

                    if (!team) {
                        resolve(` Squadra \"${teamName}\" non trovata. Prova con un altro nome.`);
                    } else {
                        resolve(`🏒 *${team.name}*
                        Sede: ${team.locationName}
                        Arena: ${team.venue.name}
                        Fondazione: ${team.firstYearOfPlay}
                        [Sito ufficiale](${team.officialSiteUrl})`);
                    }
                } catch (error) {
                    console.error('Errore nel parsing dei dati:', error);
                    resolve('Errore nel recupero delle informazioni. Riprova più tardi.');
                }
            });
        });

        req.on('error', (error) => {
            console.error('Errore nella richiesta HTTP:', error);
            resolve('Errore di connessione all\'API NHL. Controlla la tua rete o riprova più tardi.');
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('Errore: richiesta scaduta.');
            resolve('⏳ Il server NHL non ha risposto in tempo. Riprova più tardi.');
        });

        req.end();
    });
};

// Gestione dei comandi e messaggi
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start") {
        bot.sendMessage(chatId, "👋 Benvenuto! Invia il nome di una squadra NHL per ottenere informazioni. 🏒");
    } else if (text === "/help") {
        bot.sendMessage(chatId, "📌 *Comandi disponibili:*\n/start - Avvia il bot\n/help - Mostra questo elenco di comandi\n[Nome Squadra] - Ottieni informazioni su una squadra NHL", { parse_mode: "Markdown" });
    } else {
        const teamInfo = await getNHLTeamInfo(text);
        bot.sendMessage(chatId, teamInfo, { parse_mode: "Markdown" });
    }
});