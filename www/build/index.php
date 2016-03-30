<?php

require_once($_SERVER['DOCUMENT_ROOT'] . "models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}

if(!isUserLoggedIn()) { 
  header("Location: /account/register.php?0");
  die();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
  $directive = $_POST['directive'];
  
  if ($directive == 'create') {
    
    // Validation:
    if (!isset($_POST['title'])) {
      http_response_code(500);
      echo "Malformed or missing fields...";
      die();
    }
    if ($_POST['title'] == "") {
      http_response_code(500);
      echo "Malformed or missing fields...";
      die();
    }
    
    $result = $loggedInUser->createRealm($_POST['title'], $_POST['description'], $_POST['engine']);
    
    if ($result) {
      list($project_id, $source) = $result;
      echo json_encode(array ('project_id' => $project_id, 'source' => $source));
    } else {
      http_response_code(500);
      echo "Bad response from source...";
      die();
    }
  }
  
  if ($directive == 'list') {
    $realms = $loggedInUser->fetchRealmsExtended();
    
    if ($realms) {
      echo json_encode(array_values($realms));
    } else {
      echo 'null';
    }
  }
  
  die();
}

require_once($_SERVER['DOCUMENT_ROOT'] . "models/header.php");

?>

<div id="content" class="container">
    
    <div style="display: none;" class="alert alert-danger" id="errorMessage"></div>

    <section id="newRealm">
      <div class="panel panel-default">
        <div class="panel-heading">
          <h3 class="realm-panel-title">New Realm</h3>
        </div>
        <div class="panel-body">

          <div id="realm-engine-carousel" class="carousel slide new-realm-area" data-ride="carousel" data-interval="false">
              <!-- Indicators -->
              <!--
              <ol class="carousel-indicators">
                  <li data-target="#realm-engine-carousel" data-slide-to="0" class="active"></li>
                  <li data-target="#realm-engine-carousel" data-slide-to="1"></li>
              </ol>

              <!-- Wrapper for slides -->
              <div class="carousel-inner">
                  <div class="item active">
                      <img src="/build/img/topdown.jpg" alt="Top-down Engine">
                      <div class="carousel-caption caption-background">
                          <h3>"Barebones" <small>Top-down Engine</small></h3>
                          <p>Iconic style used in legends of gaming, from Zelda on the SNES and NES to Grand Theft Auto II on the PC. Simple and powerful, this is a great place to start if you're new.</p>
                      </div>
                  </div>
                  <!--
                  <div class="item">
                      <img src="/build/img/isometric.jpg" alt="Isometric Engine">
                      <div class="carousel-caption caption-background">
                          <h3>Isometric Engine</h3>
                          <p>RPG-centric style used in many popular games from Diablo to Age of Empires to Bastion. Much more complex than the top-down style, this  technique can take some time to wrap your brain around.</p>
                      </div>
                  </div>
                  -->
              </div>

              <!-- Controls -->
              <!--
              <a class="left carousel-control" href="#realm-engine-carousel" data-slide="prev">
                  <span class="glyphicon glyphicon-chevron-left"></span>
              </a>
              <a class="right carousel-control" href="#realm-engine-carousel" data-slide="next">
                  <span class="glyphicon glyphicon-chevron-right"></span>
              </a>
              -->
          </div>

          <div class="new-realm-area" id="new-realm-form">
            <form role="form" class="clearfix">
              <div class="form-group">
                <label class="control-label" for="realmName">Realm Name:</label>
                <input id="realmName" name="name" placeholder="Realm Name" type="text" class="form-control">
              </div>
              <div class="form-group">
                <label class="control-label" for="realmDescription">Realm Description:</label>
                <textarea id="realmDescription" name="description" placeholder="Realm Description (optional)" class="form-control" rows="2"></textarea>
              </div>
              <div class="form-group">
                <button type="submit" id="buttonCreateProject" class="btn btn-default pull-right"><span class="glyphicon glyphicon-flash"></span> Create</button>
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
                <div id="emptyAlert" class="text-center" role="alert" style="display: none;">
                    <strong>Time to get busy!</strong> You haven't created a realm yet...
                </div>
                <table id="existingRealmsTable" class="table table-hover">
                    <thead>
                        <tr>
                            <th></th>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Published to <a href="/play">/play</a></th>
                            <th>Funds</th>
                            <th>Loves</th>
                            <th></th>
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
    <% _.eachRight( realms, function( realm ){ %>
    
        <% if (realm.status < 1) { %>
        <tr>
        <% } else if (realm.status == 1) { %>
        <tr class="success">
        <% } else if (realm.status == 2) { %>
        <tr class="warning">
        <% } %>
            <td>
            <% if (realm.status == 1) { %>
                <i class="fa fa-power-off" style="color: white;"></i>
            <% } %>
            </td>
            
            <td><%- realm.id %></td>
            <td><%- realm.title %></td>
            <td>
                <% if (realm.published) { %>
                    <%- moment(realm.published + " +0000").format("MMMM Do YYYY, h:mm:ss a") %>
                <% } else { %>
                    N/A
                <% } %>
            </td>
            <td><%- accounting.formatMoney(realm.funds / 100) %></td>
            <td><%- realm.loves %></td>
            <td>
                <a class="btn btn-default btn-xs" target="_blank" href="editor/<%- realm.id %>/"><i class="fa fa-code"></i> Edit Code</a>
                <a class="btn btn-default btn-xs" href="manager/<%- realm.id %>"><span class="glyphicon glyphicon-eye-open"></span> Manage</a>
                <% if (realm.status === 1) { %>
                  <a class="btn btn-default btn-xs" href="/play/realm/<%- realm.id %>" target="_blank"><span class="glyphicon glyphicon-new-window"></span> Join Game</a>
                <% } %>
            </td>
        
        </tr>
        
    <% }); %>
</script>

<?php require_once($_SERVER['DOCUMENT_ROOT'] . "models/footer.php"); ?>

<script src="js/index.js" type="text/javascript" charset="utf-8"></script>
<script src="js/utilities.js" type="text/javascript" charset="utf-8"></script>
</body>
</html>


