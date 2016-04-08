# **WELCOME!**  
***
This file, **welcome.md**, is the first file another user sees when checking out your source code. You can use it to give a little head's up to some issues in the code, common gotchas or anything else you feel is important. Personally, 
I'm going to use this file to give you a brief overview of the IDE itself and the default file structure I've provided you with, *hold tight!*  

## Use The IDE

On the command bar at the top of this window, furtherst to the right, you'll notice a drop-down button with an eye logo labeled "Rendered Markdown." This button will change it's text depending on what file you are viewing but will always retain the eye logo. If you click it, you'll be able to change the view mode, usually from a display mode to an edit mode. 

![Markdown View Dropdown](/img/welcome/rendered_markdown_button.png)

Go ahead and try clicking the dropdown button on the toolbar above, then selecting the "Text Editor" option to see the source of this very file. You can make changes to it and click back to "Rendered Markdown" to see your edits rendered immediately.

There are two other very important buttons on the command bar and they are right next to the view button we just discussed, "Commit" and "Debug." As you edit files in your project, the changes are stored locally inside of your web browser. Once you are ready to see how the changes you've made will effect your game, you'll want to debug - and to see your changes in action, the server needs to know about them, so you'll need to commit the changes to the server. If you click the "Commit" button, you'll be presented with this dialog:

![Commit Window](/img/welcome/commit_window.png)

After (optionally) adding a description to the changes you have made, clicking the "commit" button will upload them to the server. [Please note, adding notes to your commit is an *excellent* habit to develop](http://alistapart.com/article/the-art-of-the-commit).

> [![Commit Window](/img/welcome/git_logo.png)](https://git-scm.com/)
>
> Assembled Realms uses GIT as it's source control system - [check it out](https://git-scm.com/). 

Now that the server is synced with your local work, you can click the "Debug" button on the command bar - once it is finished deploying your realm to the least congested debug server, you'll be given a link to view your game.

## Inform Your Players

Firstly, you'll notice three other **.md** files to the left, namely **CREDITS.md, FUNDING.md** and **README.md**. These files are written in a lightweight markup language called markdown and are unique in that they are not used directly
by the game, but rather by the page containing your game. 

| | |
| ------------- | ------------- |
| CREDITS.md    | Contains attribution to other authors/creators/developers who have been nice enough to license their work for use in the public domain. If you use someone's work, give them the credit they deserve. |
| FUNDING.md    | If you decide to accept donations from people who play your game, this file lays out the benefits you award, if any at all. |
| README.md     | Simplified instructions for playing your game - this is the first file a player will see under the game itself and a quick skim should allow someone to play your game! |

## Build Your Vision

Above the markdown files we've already discussed, you'll see two folders: client and server. The source code, media and json data files contained within the "client" folder are what create the player's experience in the browser window. 
The source code within the "server" folder is what runs *on the server* and whose main goal is to keep all the clients synced. Explore both of these folders and figure out how everything works, as a hint, the "engine.js" 
file is the main starting point for both the client and server, respectively. (TODO: Linked or inline overview of the engine)

## Experiment!

Once you've made a code change and want to see the effect, click 'commit' on the toolbar above. This will update the source code on your GIT server and create a waypoint that you can return to in the future. Next, click the "debug" 
button right next to commit. This will copy the latest committed source code from your GIT server to a live debug server where you can test your changes. Have fun!