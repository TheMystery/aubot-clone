module.exports.run = async (bot, message, args, database) => {
    let guild = message.channel.guild
    let guildID = message.guildID
    let userMention = message.mentions[0]
    if (!userMention) userMention = message.author
    let member = await guild.members.find(user => user.id == userMention.id)
    let channelID = message.member.voiceState.channelID
    if (!channelID){
        return message.channel.createMessage("Sorry but you or the mentioned user are not connected to a voice chat for me to manage.")
    }
    let channel = bot.getChannel(channelID)
    if (!channel.type == 2){
        return message.channel.createMessage("Sorry but you or the mentioned user are not connected to a voice chat for me to manage.")
    }

    const collection = database.collection("games");

    // create a filter for server id to find
    const filter = { "guildID": `${guild.id}` };
    
    const result = await collection.findOne(filter);
    if (!result){
        let failed = false
        try {
            if (member.bot){
                return message.channel.createMessage("Bot's are exempt from being set as dead")
            }
            await member.edit({mute:true}, "Among Us Game Chat Control")
        }
        catch (e){
            failed = true
            return message.channel.createMessage("Sorry but I need permissions to Mute Members")
        }
        if (!failed){
            dead = [member.id]
            const updateDoc = {
                $set:{
                    "guildID":guild.id,
                    "dead":dead,
                    "updatedAt":new Date
                }
            }
            await collection.updateOne(filter, updateDoc,{upsert:true}); 
            message.channel.createMessage(`${member.user.username} set as dead for round. When round is over use \`${bot.config.prefix[0][0]}end\` to unmute all players.\nIf you made a mistake in listing someone as dead use \`${bot.config.prefix[0]}revive\`.`).catch(()=>{})
        }
    }else{
        if(result.dead.includes(member.id)){
            return message.channel.createMessage(`${member.user.username} is already dead.`)
        }
        let failed = false
        try {
            if (member.bot){
                return message.channel.createMessage("Bot's are exempt from being set as dead")
            }
            await member.edit({mute:true}, "Among Us Game Chat Control")
        }
        catch (e){
            failed = true
            return message.channel.createMessage("Sorry but I need permissions to Mute Members")
        }
        if (!failed){
            dead = result.dead
            dead.push(member.id)
            const updateDoc = {
                $set:{
                    "dead":dead,
                    "updatedAt":new Date
                }
            }
            await collection.updateOne(filter, updateDoc,{upsert:true}); 
            message.channel.createMessage(`${member.user.username} set as dead for round. When round is over use \`${bot.config.prefix[0][0]}end\` to unmute all players.\nIf you made a mistake in listing someone as dead use \`${bot.config.prefix[0]}revive\`.`).catch(()=>{})
        }
    }
}

module.exports.info = {
    name: "dead",
    description: "Set yourself or someone else to dead so they don't get unmuted when running the unmute command",
    category: "Game",
    usage: "(@user)",
    aliases: ["d"],
    GuildOnly: true,
    disabled: false
}
