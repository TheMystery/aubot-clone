const Discord = require("eris");
const { readdirSync } = require("fs");
const { sep } = require("path");
let config = require("./config");
const ms = require("ms");
const moment = require("moment");
const MongoClient = require('mongodb').MongoClient

const client = new MongoClient("mongodb+srv://among-us-bot:password@cluster0.daswr.mongodb.net/bot?retryWrites=true&w=majority", {useUnifiedTopology: true});
client.connect().then(connection => {
	database = connection.db("bot")
	bot.connection = connection
})


const bot = new Discord.Client(config.discord.token, {
	//intents: 4739,
	intents:4737,
	compress: true,
	maxShards:"auto",
	guildSubscriptions:false,
	messageLimit:0,
	largeThreshold: 0,
	disableEvents: [
		"CHANNEL_CREATE",
		"CHANNEL_DELETE",
		"CHANNEL_UPDATE",
		"GUILD_BAN_ADD",
		"GUILD_BAN_REMOVE",
		"GUILD_CREATE",
		"GUILD_MEMBER_ADD",
		"GUILD_MEMBER_REMOVE",
		"GUILD_MEMBER_UPDATE",
		'GUILD_ROLE_CREATE',
		'GUILD_ROLE_DELETE',
		'GUILD_ROLE_UPDATE',
		'GUILD_UPDATE',
		'MESSAGE_DELETE',
		'MESSAGE_DELETE_BULK',
		'MESSAGE_UPDATE',
		'PRESENCE_UPDATE',
		'TYPING_START',
		'USER_UPDATE'
	],
});

bot.config = config.discord;
bot.database = config.database;

// Creating command and aliases collection.
["commands", "aliases"].forEach((x) => (bot[x] = new Discord.Collection()));

const load = (dir = "./commands/") => {
	readdirSync(dir).forEach((dirs) => {
		// sub folder check
		const commands = readdirSync(`${dir}${sep}${dirs}${sep}`).filter((files) =>
			files.endsWith(".js")
		);
		// get all files in sub folder
		for (const file of commands) {
			// put all commands in collection
			const pull = require(`${dir}/${dirs}/${file}`);
			// check to see if command exists
			if (
				pull.info &&
				typeof pull.info.name === "string" &&
				typeof pull.info.category === "string"
			) {
				if (bot.commands.get(pull.info.name))
					return console.warn(
						`Two or more commands have the same name ${pull.info.name}.`
					);
				// get more info about command for help command
				bot.commands.set(pull.info.name, pull);
				//console.log(`Loaded command ${pull.info.name}.`);
			} else {
				console.log(
					`Error loading command in ${dir}${dirs}.${file} you have a missing info.name or info.name is not a string. or you have a missing info.category or info.category is not a string`
				);
				continue;
			}
			// command aliases
			if (pull.info.aliases && typeof pull.info.aliases === "object") {
				pull.info.aliases.forEach((alias) => {
					// check for conflict with other commands
					if (bot.aliases.get(alias))
						return console.warn(
							`Two commands or more commands have the same aliases ${alias}`
						);
					bot.aliases.set(alias, pull.info.name);
				});
			}
		}
	});
};
load();

bot
	.on("error",console.error)
	.on("warn", console.warn)
	.on("ready", () => {
		require("./discordEvents/ready").Run(bot, database);
	})
	.on("disconnect", () => {
		console.warn("Disconnected!");
	})
	.on("reconnecting", () => {
		console.warn(
			`${moment(Date.now()).format("hh/mm A, DD/MM/YYYY")}: Reconnecting...`
		);
	})
	.on("messageCreate", (message) => {
		require("./discordEvents/message").Run(bot, message, database);
	})

setTimeout(() => {
	bot.connect()
	require('./services/prefixFetch').Run(database)
}, 5*1000);
