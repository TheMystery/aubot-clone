const ms = require("ms")
const Discord = require("eris")

const cooldowns = new Discord.Collection()

messageCount = 0

async function getPrefix(guild){
	prefixes = require('../services/prefixFetch').prefixes
	if (!guild) return null
	guildID = guild.id
	if (!prefixes){
		return null
	}
	if (!prefixes[guildID]){
		return null
	}else{
		return prefixes[guildID]
	}
}

module.exports.Run = async function(bot,message, database){
	var prefixes = bot.config.prefix
	prefixes.push(await getPrefix(message.channel.guild))
	let prefix = false;
	for(const thisPrefix of prefixes) {
		if(message.content.startsWith(thisPrefix)) prefix = thisPrefix;
	}
	if(!prefix) return;
	var args = message.content.slice(prefix.length).trim().split(/ +/g)
	const cmd = args.shift().toLowerCase()
	let command

	//Check if starts with prefix
	if (!message.content.startsWith(prefix) || message.author == bot.user) return

	if (cmd.length === 0) return
	if (bot.commands.has(cmd)) command = bot.commands.get(cmd)
	else if (bot.aliases.has(cmd)) command = bot.commands.get(bot.aliases.get(cmd))
	
	//Check if a command is being run.
	if (!command) return

	//Check to see if bot is offline and if owner not running command
	if (bot.presence.status == "invisible" && !bot.config.devs.includes(message.author.id)) return

	//Check dev mode and if owner not running command
	if (bot.presence.status == "dnd" && !bot.config.devs.includes(message.author.id)) return

	//For command info like command description.
	info = command.info

	//Check to see if command is disabled
	if(info.disabled){
		return message.channel.createMessage('This command is disabled currently. Join the support server for more info')
	}

	//Check if command is webhook only
	if (info.WebhookOnly && !message.webhookID) {
		return message.channel.createMessage('This is a command for webhooks only')
	}
	
	if (!info.WebhookOnly && message.author.bot) return

	//Check if command is GuildOnly.
	if (info.GuildOnly && !message.channel.guild) {
		return message.channel.createMessage('I can\'t execute that command inside DMs!')
	}

	//Check if args are required.
	if (info.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`

		if (info.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${info.name} ${info.usage}\``
		}
		return message.channel.createMessage(reply)
	}
	//Command cooldowns
	if (!cooldowns.has(info.name)) {
		cooldowns.set(info.name, new Discord.Collection())
	}

	const now = Date.now()
	const timestamps = cooldowns.get(info.name)
	const cooldownAmount = ms(info.cooldown || 0) //info.cooldown * 1000

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now)
			return message.channel.createMessage(`please wait ${ms(timeLeft, {long:true})} before reusing the \`${info.name}\` command.`)
		}
	}

	timestamps.set(message.author.id, now)
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)

	try {
		//Run command.
		await command.run(bot, message, args, database)
		
	} catch (error) {
		//Get errors and log them and tell the user.
		channel = await bot.getChannel("755883889876140062")
		if(args.length < 1) args = ["None"]
		guild = message.channel.guild
		timestring = new Date
		var embedObject = {embed: {
			title:"ERROR",
			description:`${error.name}\n${error.message}`,
			color:0xff0000,
			timestamp: timestring.toISOString(),
			fields:[
				{
					name:"Guild/DM",
					value:guild.name ? guild.name : `${message.author.username}'s DMS`,
					inline:true
				},
				{
					name:"Runner",
					value:message.author.username,
					inline:true
				},
				{
					name:"Command",
					value:info.name,
					inline:true
				},
				{
					name:"Arguments",
					value:args.join(" "),
					inline:true
				}
			]
		}}
		console.log(error)
		//channel.createMessage(embedObject)
		message.channel.createMessage("There was an error. A message has been sent to the TheMystery to alert them of this problem.\nIf this continues to happen please join the Support Server")   
	}
}