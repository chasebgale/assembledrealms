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
    
    <div style="display: none;" class="alert alert-danger" id="errorMessage"></div>

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
        </div>
    </section>

    
    <section id="existingRealms" style="display: none;">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="realm-panel-title">Your Realms</h3>
            </div>
            <div class="panel-body">
                <table id="existingRealmsTable" class="table table-hover">
                    <thead>
                        <tr>
                            <th></th>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Published</th>
                            <th>Funds</th>
                            <th>Likes</th>
                            <th>Tools</th>
                        </tr>
                    </thead>
                    <tbody id="existingRealmsTableBody">
                        
                    </tbody>
                </table>
            </div>
        </div>
    </section>
    
    

</div>

<script id="realms_template" type="text/template">
    <% _.each( realms, function( realm ){ %>
    
        <% if (realm.status == 0) { %>
        <tr>
        <% } else { %>
        <tr class="success">
        <% } %>
        
            <td>
            <% if (realm.status == 0) { %>
                <i class="fa fa-power-off light"></i>
            <% } else { %>
                <i class="fa fa-power-off online"></i>
            <% } %>
            </td>
            
            <td><%- realm.id %></td>
            <td><%- realm.title %></td>
            <td><%- realm.published %></td>
            <td><%- realm.funds %></td>
            <td><%- realm.likes %></td>
            <td>
                <a class="btn btn-default btn-xs" href="editor.php?<%- realm.id %>"><span class="glyphicon glyphicon-fire"></span> Edit</a>
                <a class="btn btn-default btn-xs" href="manager.php?<%- realm.id %>"><span class="glyphicon glyphicon-eye-open"></span> Manage</a>
            </td>
        
        </tr>
        
    <% }); %>
</script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/index.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
</body>
</html>


