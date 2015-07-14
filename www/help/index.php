<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content" class="container">
    <div class="page-header">
        <h1>What Is This Place?<small></small></h1>
    </div>
    <p>
        Assembled Realms is a platform for creating <i>awesome</i> open-source, multiplayer, real-time HTML5 games. Taking advantage of modern browser technology, the platform exposes a completely web-based IDE where you can edit both server and client code in one ubiquitous language: Javascript. You have the ability to start your game from one of the templates provided <strong>or</strong> by forking a copy of anyone else's game. 
    </p>
    <p>
        The goal here is to create a tool for fun and for learning. Make changes to a game's code right in your browser and see the effect of that code change in real time! Reverse engineer games and figure out how they work! Express your artistic side by creating game art and content! Build a community around your game, engage with your players directly! You have full control of your game! 
    </p>
    
    <div class="page-header">
        <h1>Can I Contact You? <small>Please?</small></h1>
    </div>
    <blockquote>
        <p>outreach@assembledrealms.com</p>
        <footer>For 99.99% of your contacting needs.</footer>
    </blockquote>
    <blockquote>
        <p>suits@assembledrealms.com</p>
        <footer>Business inquires and whatnot.</footer>
    </blockquote>
    
</div>

</body>
</html>