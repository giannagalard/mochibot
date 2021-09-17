const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');


// global queue
// queue(message, guild.id
// queue_constructor object thats gonna hold vc, tc, con, and an array of songs
// each guild aka server that ur bot is in, it will create a key and a value pair inside of this map
const queue = new Map();

module.exports = {
    name: 'play',
    // skip and stop commands uwu
    aliases: ['skip', 'stop'], 
    cooldown: 0,
    description: 'mochi music bot',
    async execute(message,args, cmd, client, Discord){


        // permissions and vc checks
        const voice_channel = message.member.voice.channel;
        if (!voice_channel) return message.channel.send('join vc before using command dummy');
        const permissions = voice_channel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')) return message.channel.send('missing connect perms');
        if (!permissions.has('SPEAK')) return message.channel.send('missing speak perms');

        // server queue coming from global queue
        const server_queue = queue.get(message.guild.id);

        // if play
        if (cmd === 'play'){
            if (!args.length) return message.channel.send('missing second arg </3');
            // song object that will be placed into array inside of map
            let song = {};

            // check if argument is a link
            if (ytdl.validateURL(args[0])) {
                // get song info from url
                const song_info = await ytdl.getInfo(args[0]);
                // add this into song object
                song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url }
                // if vid was not a url, use keywords to find that vid
            } else {
                const video_finder = async (query) =>{
                    const video_result = await ytSearch(query);
                    // if there is more than one result, grab the very first video
                    return (video_result.videos.length > 1) ? video_result.videos[0] : null;
                }
                
                // getting the arguments, joining them, and passing them into query that searches for vid
                const video = await video_finder(args.join(' '));
                // if vid exists, grab song object 
                if (video){
                    song = { title: video.title, url: video.url }
                // if doesnt work, send an error message
                } else {
                     message.channel.send('oopsie woopsie uwu we made a fucky wucky, cant find vid >_<');
                }
            }

            // if the server has no queue :c
            if (!server_queue){
                // basic music bot constructor
                const queue_constructor = {
                    voice_channel: voice_channel,
                    text_channel: message.channel,
                    connection: null,
                    songs: [] // everytime a song is added, it gets added to this queue constructor inside of the song list
                }
            
                // grab global queue and set a key and constructor for guild
                queue.set(message.guild.id, queue_constructor);
                // push songs from if statements above into song list 
                queue_constructor.songs.push(song);
    
                try {
                    const connection = await voice_channel.join();  // establish connection
                    // pass in connection we just established by joining vc
                    // pass that into constructor which another constructor passes that into the global map 
                    queue_constructor.connection = connection; 
                    video_player(message.guild, queue_constructor.songs[0]);
                    // if cant connect send error message
                } catch (err) {
                    queue.delete(message.guild.id);
                    message.channel.send('oopsie woopsie uwu cant connect !');
                    throw err;
                }
                // if there is a server queue, push the current song being sent, dont create a new queue
            } else{
                server_queue.songs.push(song);
                // outputs song was added to queue
                return message.channel.send(`👍 **${song.title}** added to queue!`);
            }
        }
        else if(cmd === 'skip') skip_song(message, server_queue);
        else if(cmd === 'stop') stop_song(message, server_queue);
    }
    
}

const video_player = async (guild, song) => {
    // grab the song queue
    const song_queue = queue.get(guild.id);

    // if no songs remaining in server queue, leave vc
    if (!song) {
        song_queue.voice_channel.leave();
        queue.delete(guild.id);
        return;
    }

    // filtering just to get the audio only
    const stream = ytdl(song.url, { filter: 'audioonly' });
    song_queue.connection.play(stream, { seek: 0, volume: 0.5 })
    .on('finish', () => {
        song_queue.songs.shift(); // once current song is completed, shift to next song in queue
        video_player(guild, song_queue.songs[0]);
    });
    // outputs song currently playing
    await song_queue.text_channel.send(`🎶 Now playing **${song.title}**`)
}

// skip into next song
const skip_song = (message, server_queue) => {
    // check to see if member is in vc
    if (!message.member.voice.channel) return message.channel.send('join vc before using command dummy');
    // if the queue is empty after current song, output queue empty error
    if(!server_queue){
        return message.channel.send(`There are no songs in queue 😔`);
    }
    server_queue.connection.dispatcher.end();
}

// stop queue
const stop_song = (message, server_queue) => {
    // check to see if member is in vc
    if (!message.member.voice.channel) return message.channel.send('join vc before using command dummy');
    // clear the entire song list
    server_queue.songs = [];
    server_queue.connection.dispatcher.end();
}

// MUSIC BOT COMPLETED WOOP WOOP