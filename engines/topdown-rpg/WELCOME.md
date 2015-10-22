# **WELCOME!**  
***
This file, **welcome.md**, is the first file another user sees when checking out your source code. You can use it to give a little head's up to some issues in the code, common gotchas or anything else you feel is important. Personally, 
I'm going to use this file to give you a brief overview of the IDE itself and the default file structure I've provided you with, *hold tight!*  

## Inform Your Players

Firstly, you'll notice three other **.md** files to the left, namely **CREDITS.md, FUNDING.md** and **README.md**. These files are written in a lightweight markup language called markdown and are unique in that they are not used directly
by the game, but rather by the page containing your game. 

| | |
| ------------- | ------------- |
| CREDITS.md    | Contains attribution to other authors/creators/developers who have been nice enough to liscense their work for use in the public domain. If you use someone's work, give them the credit they deserve. |
| FUNDING.md    | If you decide to accept donations from people who play your game, this file lays out the benefits you award, if any at all. |
| README.md     | Simplified instructions for playing your game - this is the first file a player will see under the game itself and a quick skim should allow someone to play your game! |

## Build Your Vision

Above the markdown files we've already discussed, you'll see two folders: client and server. The source code, media and json data files contained within the "client" folder are what create the player's experience in the browser window. 
The source code within the "server" folder is what runs, big surprise, on the server and whose main goal is to keep all the clients synced. Explore both of these folders and figure out how everything works, as a hint, the "engine.js" 
file is the main starting point for both the client and server, respectively.

## Experiment!

Once you've made a code change and want to see the effect, click 'commit' on the toolbar above. This will update the source code on our GIT server and create a waypoint that you can return to in the future. Next, click the "debug" 
button right next to commit. This will copy the latest committed source code from our GIT server to a live debug server where you can test your changes. Have fun!