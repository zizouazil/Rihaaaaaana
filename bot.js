const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4";
const prefix = 'R';
client.on('ready', function() {
    console.log(`i am ready ${client.user.username}`);
});

client.on('guildCreate', (guild) => {
    if(client.guilds.size > 2) {
        guild.leave();
    }
})
var servers = [];
var queue = [];
var guilds = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var now_playing = [];

client.on('ready', () => {});
var download = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

client.on('message', function(message) {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(' ');

    if (mess.startsWith(prefix + 'play')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        // if user is not insert the URL or song title
        if (args.length == 0) {
message.channel.send('Add a song name or song link :drum: ')
            return;
        }
        if (queue.length > 0 || isPlaying) {
            getID(args, function(id) {
                add_to_queue(id);
                fetchVideoInfo(id, function(err, videoInfo) {
                    if (err) throw new Error(err);
message.channel.send(`aded : **( ${videoInfo.title} )** on the list :musical_note:`)
                    queueNames.push(videoInfo.title);
                    now_playing.push(videoInfo.title);

                });
            });
        }
        else {

            isPlaying = true;
            getID(args, function(id) {
                queue.push('placeholder');
                playMusic(id, message);
                fetchVideoInfo(id, function(err, videoInfo) {
                    if (err) throw new Error(err);
message.channel.send(`Now playing : **( ${videoInfo.title} )** :musical_note: `)
                    // client.user.setGame(videoInfo.title,'https://www.twitch.tv/Abdulmohsen');
                });
            });
        }
    }
    else if (mess.startsWith(prefix + 'skip')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        message.channel.send('**Done , :white_check_mark: **').then(() => {
            skip_song(message);
            var server = server = servers[message.guild.id];
            if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
        });
    }
    else if (message.content.startsWith(prefix + 'vol')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        // console.log(args)
        if (args > 100) return message.channel.send('Only : 1 || 100 :microphone2:')
        if (args < 1) return message.channel.send('Only : 1 || 100 :microphone2:')
        dispatcher.setVolume(1 * args / 50);
        message.channel.sendMessage(`Now vol : ${dispatcher.volume*50}% :musical_note: `);
    }
    else if (mess.startsWith(prefix + 'pause')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        message.channel.send('**Done , :white_check_mark: **').then(() => {
            dispatcher.pause();
        });
    }
    else if (mess.startsWith(prefix + 'resume')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
            message.channel.send('**Done , :white_check_mark: **').then(() => {
            dispatcher.resume();
        });
    }
    else if (mess.startsWith(prefix + 'stop')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        message.channel.send('**k :cry:**');
        var server = server = servers[message.guild.id];
        if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
    }
    else if (mess.startsWith(prefix + 'join')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        message.member.voiceChannel.join().then(message.channel.send('**Done , ::white_check_mark: **'));
    }
    else if (mess.startsWith(prefix + 'play')) {
        if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
        if (isPlaying == false) return message.channel.send('**Done , :white_check_mark: **');
message.channel.send('Now playing : ${videoInfo.title} :musical_note:')
    }
});

function skip_song(message) {
    if (!message.member.voiceChannel) return message.channel.send('You must be in my audio room :microphone2:');
    dispatcher.end();
}

function playMusic(id, message) {
    voiceChannel = message.member.voiceChannel;


    voiceChannel.join().then(function(connectoin) {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });
        skipReq = 0;
        skippers = [];

        dispatcher = connectoin.playStream(stream);
        dispatcher.on('end', function() {
            skipReq = 0;
            skippers = [];
            queue.shift();
            queueNames.shift();
            if (queue.length === 0) {
                queue = [];
                queueNames = [];
                isPlaying = false;
            }
            else {
                setTimeout(function() {
                    playMusic(queue[0], message);
                }, 500);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYoutubeID(str));
    }
    else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID) {
    if (isYoutube(strID)) {
        queue.push(getYoutubeID(strID));
    }
    else {
        queue.push(strID);
    }
}

function search_video(query, cb) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        cb(json.items[0].id.videoId);
    });
}


function isYoutube(str) {
    return str.toLowerCase().indexOf('youtube.com') > -1;
}
 client.on('message', message => {
  if (message.content === `${prefix}`) {
    const embed = new Discord.RichEmbed()
     .setColor("RANDOM")
.setFooter('Thank You For use this bot ! .')
      message.channel.send({embed});
     }
    });
  client.on('message', message => {
    if (!message.content.startsWith(prefix)) return;
    var args = message.content.split(' ').slice(1);
    var argresult = args.join(' ');
    if (message.author.id !== "389100615432929290") return;
  
    
    if (message.content.startsWith(prefix + 'set i')) {
    client.user.setStatus('idle')
       console.log('idle be');
      message.channel.sendMessage(`idle Now`)
  } 
  
    if (message.content.startsWith(prefix + 'set d')) {
        client.user.setStatus("Do Not Disturb")
       console.log('DND be');
      message.channel.sendMessage(`DND Now`)
  } 
  if (message.content.startsWith(prefix + 'set o')) {
    client.user.setStatus('Online')
    console.log('Online be');
   message.channel.sendMessage(`Online Now`)
  }
  
  });
client.on('message', message => {
  if (!message.content.startsWith(prefix)) return;
  var args = message.content.split(' ').slice(1);
  var argresult = args.join(' ');
  if (message.author.id !== "389100615432929290") return;

  
  if (message.content.startsWith(prefix + 'setwat')) {
  client.user.setActivity(argresult, {type: 'WATCHING'})
     console.log('watching be' + argresult);
    message.channel.sendMessage(`Watch Now: **${argresult}**`)
} 

 
  if (message.content.startsWith(prefix + 'setlis')) {
  client.user.setActivity(argresult, {type: 'LISTENING'})
     console.log('LISTENING be' + argresult);
    message.channel.sendMessage(`LISTENING Now: **${argresult}**`)
} 


if (message.content.startsWith(prefix + 'setname')) {
  client.user.setUsername(argresult).then
      message.channel.sendMessage(`Username Changed To **${argresult}**`)
  return message.reply("You Can change the username 2 times per hour");
} 

if (message.content.startsWith(prefix + 'setavatar')) {
  client.user.setAvatar(argresult);
   message.channel.sendMessage(`Avatar Changed Successfully To **${argresult}**`);
}

if (message.content.startsWith(prefix + 'setstream')) {
  client.user.setGame(argresult, "https://www.twitch.tv/PlatinumBot");
     console.log('Streaming be' + argresult);
    message.channel.sendMessage(`Streaming: **${argresult}**`)
} 
if (message.content.startsWith(prefix + 'setplay')) {
  client.user.setGame(argresult);
     console.log('Playing be' + argresult);
    message.channel.sendMessage(`Playing: **${argresult}**`)
} 



});

});
      client.on('ready', () => {
              client.user.setActivity("Rihaaaaaaana ||Rhelp", {type: 'LISTENING'});
      
      });


client.on('message', message => {
  if (true) {
if (message.content === 'Rinvite') {
      message.author.send(`**بامكانك دعوة البوت الى سيرفرك عن طريق الرابط
 https://discordapp.com/api/oauth2/authorize?client_id=500710815519866881&permissions=8&scope=bot
  سرفر الدعم : 
 https://discord.gg/ArGwWfH**`).catch(e => console.log(e.stack));

    }
   } 
if (message.content === 'Rsupport') {
      message.author.send('**سيرفر المساعده :\n https://discord.gg/ArGwWfH**').catch(e => console.log(e.stack));

    }
  });
   client.on('message', message =>{
    if(message.content === 'Rping'){
let start = Date.now(); message.channel.send('pong').then(message => { 
message.edit(`\`\`\`js
Time taken: ${Date.now() - start} ms
Discord API: ${client.ping.toFixed(0)} ms\`\`\``);
    });
    }
});
 client.on('guildCreate', guild => {
  client.channels.get("499213385750282244").send(`:white_check_mark:** ${client.user.id} join
Server name: __${guild.name}__
Server owner: __${guild.owner}__
Server id: __${guild.id}__ 
Server Count: __${guild.memberCount}__
**`)
});

client.on('guildDelete', guild => {
  client.channels.get("499213385750282244").send(`:negative_squared_cross_mark:** ${client.user.id} leave
Server name: __${guild.name}__
Server owner: __${guild.owner}__
Server id: __${guild.id}__ 
Server Count: __${guild.memberCount}__**`)
});

client.login(process.env.BOT_TOKEN);
