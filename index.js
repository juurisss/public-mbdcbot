const { Client, Intents, GatewayIntentBits, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const axios = require('axios');
const fs = require('fs');
const cnfg = require('./config.js');
const token = cnfg.token
const clientId = cnfg.botclientId;
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
console.log(`${cnfg.apiLink}`)
console.log('a')
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand())
        return;
    const { commandName } = interaction;
    if (commandName === 'stat') {
        const username = interaction.options.getString('username');
        console.log(`${username}`)
        const apiUrl = `${cnfg.apiLink}/api/stats/${username}`;
        try {
            const response = await axios.get(apiUrl);
            const data = response.data;
            console.log('API Response:', data);
            if (data.error === "Player not found.") {
                interaction.reply(`Error: ${data.error}`);
            }
            else {
                const cfStats = [
                    data.stats.kills.value,
                    data.stats.deaths.value,
                    data.stats.games.value,
                    data.stats.wins.value,
                    data.stats.beds.value,
                ].map((stat) => stat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                const cfPlacements = [
                    data.stats.kills.placement,
                    data.stats.deaths.placement,
                    data.stats.games.placement,
                    data.stats.wins.placement,
                    data.stats.beds.placement,
                ].map((placement) => placement.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                const kdRatio = (data.stats.kills.value / data.stats.deaths.value).toFixed(3);
                const killsPerGame = (data.stats.kills.value / data.stats.games.value).toFixed(2);
                const bedsPerGame = (data.stats.beds.value / data.stats.games.value).toFixed(2);
                const winRate = ((data.stats.wins.value / data.stats.games.value) * 100).toFixed(1);
                // ELO calculation
                const elo = (((data.stats.kills.value * 1) - (data.stats.deaths.value * 0.6)) +
                    ((data.stats.wins.value * 2.5) - (data.stats.games.value * 1.6)) *
                        (data.stats.kills.value / data.stats.deaths.value) *
                        (data.stats.wins.value) / (data.stats.games.value)).toFixed(2);
                const statsEmbed = createStatsEmbed(data.username, cfStats, cfPlacements, kdRatio, killsPerGame, bedsPerGame, winRate, elo);
                interaction.reply({ embeds: [statsEmbed] });
            }
        }
        catch (error) {
            console.error(error);
            interaction.reply('Player not found');
        }
    }
    else if (commandName === 'leaderboard') {
      const validLeaderboardTypes = ["kills", "deaths", "wins", "games", "beds"];
      const providedLeaderboardType = interaction.options.getString('statistic');
      const capitalizedLeaderboardType = providedLeaderboardType.charAt(0).toUpperCase() + providedLeaderboardType.slice(1);
      if (validLeaderboardTypes.includes(providedLeaderboardType)) {
          const durationChoice = interaction.options.getString('duration');
          const validDurations = ['week', 'month', 'lifetime'];
          const durationCasingMap = {
              'week': 'Weekly',
              'month': 'Monthly',
              'lifetime': 'Lifetime'
          };
          const selectedDuration = validDurations.includes(durationChoice) ? durationCasingMap[durationChoice] : 'Weekly';
          let apiUrl = `${cnfg.apiLink}/api/tops/${providedLeaderboardType}`;
          if (durationChoice) {
              apiUrl += `?duration=${durationChoice.toLowerCase()}`;
          }
          try {
              const response = await axios.get(apiUrl);
              const leaderboardData = response.data.leaderboardData;
              const leaderboardDescription = leaderboardData
                  .map(([username, value], index) => `${index + 1}.  **${username}** - \`${value}\``)
                  .join('\n');
              const embed = new MessageEmbed()
                  .setColor('#0099ff')
                  .setTitle(`Leaderboard ▸ ${capitalizedLeaderboardType}`)
                  .setAuthor(`${selectedDuration}`)
                  .setDescription(`\n${leaderboardDescription}`)
                  .setTimestamp(new Date());
              await interaction.reply({ embeds: [embed] });
          }
          catch (error) {
              console.error(error);
              await interaction.reply('Error fetching leaderboard data.');
          }
      }
      else {
          await interaction.reply('Invalid leaderboard type.');
      }
  }
});
const commands = [
    {
        name: 'stat',
        description: 'Fetch stats for a user',
        options: [
            {
                name: 'username',
                description: 'The username to fetch stats for',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'leaderboard',
        description: 'Display the leaderboard for a specific statistic',
        options: [
            {
                name: 'statistic',
                description: 'The statistic to show on the leaderboard',
                type: 3,
                required: true,
                choices: [
                    { name: 'Kills', value: 'kills' },
                    { name: 'Deaths', value: 'deaths' },
                    { name: 'Wins', value: 'wins' },
                    { name: 'Games Played', value: 'games' },
                    { name: 'Beds Broken', value: 'beds' },
                ],
            },
            {
                name: 'duration',
                description: 'The duration for the leaderboard (week, month, lifetime)',
                type: 3,
                required: false,
                choices: [
                    { name: 'Weekly', value: 'week' },
                    { name: 'Monthly', value: 'month' },
                    { name: 'Lifetime', value: 'lifetime' },
                ],
            },
        ],
    },
];
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
})();

client.on('guildCreate', (guild) => {
    const embed = new MessageEmbed()
        .setColor(0x0099ff)
        .setTitle('Credits')
        .addFields([
        {
            name: 'Developers',
            value: `- [EjurisYt](https://github.com/Ejuris96/) (Owner)\n- [Malkist](https://malkist.dev/) (Creator of the API system powering this bot and an important collaborator in its development)`,
        },
        {
            name: 'Commands:',
            value: `- /stats {username} - View the stats of a player\n- /leaderboard {type} {duration} - View the leaderboard\n- /compare {user1} {user2} - Compare the stats of 2 players\n\nJoin the Minecraft Bedwars community server now! https://discord.gg/KN6fScv6cs`,
        },
    ])
        .setTimestamp(new Date());
    if (guild.systemChannel) {
        guild.systemChannel
            .send({ embeds: [embed] })
            .catch((err) => console.error('Error sending message:', err));
    }
    else {
        console.error('Error sending message: System channel is not available.');
    }
});
// Functions ig
function createCompareEmbed(playerOneName, playerTwoName, playerOneStats, playerTwoStats, differences) {
    const avgKillsPerGame1 = playerOneStats[2] !== 0 ? playerOneStats[0] / playerOneStats[2] : 0;
    const avgKillsPerGame2 = playerTwoStats[2] !== 0 ? playerTwoStats[0] / playerTwoStats[2] : 0;
    const avgBedsPerGame1 = playerOneStats[2] !== 0 ? playerOneStats[4] / playerOneStats[2] : 0;
    const avgBedsPerGame2 = playerTwoStats[2] !== 0 ? playerTwoStats[4] / playerTwoStats[2] : 0;
    return new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Comparing ▸ ${playerOneName} & ${playerTwoName}`)
        .setDescription(`**${playerOneName}** : **${playerTwoName}**`)
        .addFields([
        {
            name: 'Kills',
            value: `\`${playerOneStats[0]}\` ${diffEmoji(differences[0])} \`${playerTwoStats[0]}\`
**${differences[0] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[0])}\`*)`,
        },
        {
            name: 'Deaths',
            value: `\`${playerOneStats[1]}\` ${diffEmoji(differences[1])} \`${playerTwoStats[1]}\`
**${differences[1] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[1])}\`*)`,
        },
        {
            name: 'Wins',
            value: `\`${playerOneStats[3]}\` ${diffEmoji(differences[2])} \`${playerTwoStats[3]}\`
**${differences[2] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[2])}\`*)`,
        },
        {
            name: 'Beds Broken',
            value: `\`${playerOneStats[4]}\` ${diffEmoji(differences[3])} \`${playerTwoStats[4]}\`
**${differences[3] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[3])}\`*)`,
        },
        {
            name: 'K/D Ratio',
            value: `\`${(playerOneStats[0] / playerOneStats[1]).toFixed(2)}\` ${diffEmoji(differences[4])} \`${(playerTwoStats[0] / playerTwoStats[1]).toFixed(2)}\`
**${differences[4] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[4]).toFixed(2)}\`*)`,
        },
        {
            name: 'Avg Kills/Game',
            value: `\`${avgKillsPerGame1.toFixed(2)}\` ${diffEmoji(differences[5])} \`${avgKillsPerGame2.toFixed(2)}\`
**${differences[5] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[5]).toFixed(2)}\`*)`,
        },
        {
            name: 'Avg Beds/Game',
            value: `\`${avgBedsPerGame1.toFixed(2)}\` ${diffEmoji(differences[6])} \`${avgBedsPerGame2.toFixed(2)}\`
**${differences[6] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[6]).toFixed(2)}\`*)`,
        },
        {
            name: 'Win Rate',
            value: `\`${((playerOneStats[3] / playerOneStats[2]) * 100).toPrecision(2)}%\` ${diffEmoji(differences[7])} \`${((playerTwoStats[3] / playerTwoStats[2]) * 100).toPrecision(2)}%\`
**${differences[7] > 0 ? playerOneName : playerTwoName}** (by *\`${Math.abs(differences[7]).toPrecision(2)}%\`*)`,
        },
    ])
        .setTimestamp(new Date());
}
function createStatsEmbed(username, cfStats, cfPlacements, kdRatio, killsPerGame, bedsPerGame, winRate, elo) {
    const statsText = `
- Kills: ${cfStats[0]} (#${cfPlacements[0]})
- Deaths: ${cfStats[1]} (#${cfPlacements[1]})
- Wins: ${cfStats[3]} (#${cfPlacements[3]})
- Games: ${cfStats[2]} (#${cfPlacements[2]})
- Beds Broken: ${cfStats[4]} (#${cfPlacements[4]})
- Estimated ELO (EjurisYTs): ${elo}
## Metrics:
- K/D Ratio: ${kdRatio}
- Kills/Game: ${killsPerGame}
- Beds/Game: ${bedsPerGame}
- Win Rate: ${winRate}%
`;
    const statsEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Stats ▸ ${username}`)
        .setDescription(statsText)
        .setThumbnail(`https://mc-heads.net/head/${username}/128`)
        .setTimestamp(new Date());
    return statsEmbed;
}
function getLeaderboardURL(leaderboardType) {
    const baseUrl = 'https://bedwars.malkist.dev/api/leaderboard';
    return `${baseUrl}/${leaderboardType}`;
}
async function fetchLeaderboardData(leaderboardType) {
    const apiUrl = getLeaderboardURL(leaderboardType);
    try {
        const response = await axios.get(apiUrl);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching leaderboard data:', error);
        return null;
    }
}
function createLeaderboardEmbed(leaderboardData, leaderboardType) {
    return new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`${capitalizeFirstLetter(leaderboardType)} Leaderboard`)
        .addFields([
        {
            name: 'Player',
            value: leaderboardData
                .slice(0, 10)
                .map((entry, index) => `**${index + 1}.** ${entry.username}`)
                .join('\n'),
        },
        {
            name: leaderboardType,
            value: leaderboardData.slice(0, 10).map((entry) => entry[leaderboardType]).join('\n'),
            inline: true,
        },
    ])
        .setTimestamp(new Date());
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
client.login(token);
