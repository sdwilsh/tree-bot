Tree-Bot
==========
afrosdwilsh's IRC manifestation -- IRC bot for watching trees for Mozilla.

Setup
==========
Requires nodejs. Use npm to install dependencies:
```
npm install irc shorturl pulse translate
```

Usage
==========
To test / emulate single-channel,
```node console.js```

To start the actual bot,
```node bot.js```

Configurations can be found in sessions.json. Settings are automatically saved.

You can invite the bot into a channel with
```/invite afrosdwilsh```
when you're in a particular channel.


Available Commands
==========
```watch <tree>``` starts watching a tree

```unwatch <tree>``` stops watching a tree

```watch <changset> on <tree> (for <person>)```

```unwatch <changset> on <tree> (for <person>)```

```<email> is <name>``` and ```I am <email>``` set name associations

```list``` or ```currently``` shows all current user-specific watches

```help``` displays help file

