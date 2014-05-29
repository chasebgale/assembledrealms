<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
    header("Location: /account/register.php?0");
    die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content">

    <section id="newRealm">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="realm-panel-title">New Realm</h3>
            </div>
            <div class="panel-body">

                <div id="realm-engine-carousel" class="carousel slide new-realm-area" data-ride="carousel" data-interval="false">
                    <!-- Indicators -->
                    <ol class="carousel-indicators">
                        <li data-target="#realm-engine-carousel" data-slide-to="0" class="active"></li>
                        <li data-target="#realm-engine-carousel" data-slide-to="1"></li>
                        <li data-target="#realm-engine-carousel" data-slide-to="2"></li>
                    </ol>

                    <!-- Wrapper for slides -->
                    <div class="carousel-inner">
                        <div class="item active">
                            <img src="../img/isometric.jpg" alt="Isometric Engine">
                            <div class="carousel-caption">
                                <h3>Isometric Engine</h3>
                                <p>Classic style used in many popular games from Diablo to Age of Empires to Bastion.</p>
                            </div>
                        </div>
                        <div class="item">
                            <img src="../img/isometric.jpg" alt="Isometric Engine">
                            <div class="carousel-caption">
                                <h3>Isometric Engine</h3>
                                <p>Classic style used in many popular games from Diablo to Age of Empires to Bastion.</p>
                            </div>
                        </div>
                        <div class="item">
                            <img src="../img/isometric.jpg" alt="Isometric Engine">
                            <div class="carousel-caption">
                                <h3>Isometric Engine</h3>
                                <p>Classic style used in many popular games from Diablo to Age of Empires to Bastion.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Controls -->
                    <a class="left carousel-control" href="#realm-engine-carousel" data-slide="prev">
                        <span class="glyphicon glyphicon-chevron-left"></span>
                    </a>
                    <a class="right carousel-control" href="#realm-engine-carousel" data-slide="next">
                        <span class="glyphicon glyphicon-chevron-right"></span>
                    </a>
                </div>

                <div class="new-realm-area" id="new-realm-form">
                    <form role="form">
                        <div class="form-group">
                            <label class="control-label" for="realmName">Realm Name:</label>
                            <input id="realmName" name="name" placeholder="Realm Name" type="text" class="form-control">
                        </div>
                        <div class="form-group">
                            <label class="control-label" for="realmDescription">Realm Description:</label>
                            <textarea id="realmDescription" name="description" placeholder="Realm Description (optional)" class="form-control" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <button type="submit" id="buttonCreateProject" class="btn btn-default"><span class="glyphicon glyphicon-flash"></span> Create</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <section id="existingRealms"></section>

</div>

<script id="realms_template" type="text/template">
    <% _.each( realms, function( realm ){ %>
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="realm-panel-title"><%- realm.title %> </h3><span class="realm-panel-title-right"> Published: 02/05/2014 09:49PM ET</span>
            </div>
            <div class="panel-body">

                <div style="float: left;">
                    <a class="btn btn-default" href="editor.php?<%- realm.gitlab_id %>"><span class="glyphicon glyphicon-fire"></span> Edit Codebase</a>
                    <a class="btn btn-default" href="manager.php?<%- realm.gitlab_id %>"><span class="glyphicon glyphicon-eye-open"></span> Manage</a>
                </div>

                <div style="float: right;">
                    <% if (realm.status == 0) { %>
                    <i class="fa fa-power-off fa-4x light"></i>
                    <% } else { %>
                    <i class="fa fa-power-off fa-4x online"></i>
                    <% } %>
                </div>

                <div style="float: right; width: 300px;">
                    <ul>
                        <li><span class="existingRealmsStatsLabel">Funds:</span><%- realm.funds %></li>
                        <li><span class="existingRealmsStatsLabel">Online:</span><%- realm.players %></li>
                        <li><span class="existingRealmsStatsLabel">Likes:</span><%- realm.likes %></li>
                    </ul>
                </div>

            </div>
        </div>
    <% }); %>
</script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/dashboard.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
</body>
</html>


