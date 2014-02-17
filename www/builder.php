<?php

require_once("models/config.php");
if (!securePage($_SERVER['PHP_SELF'])){die();}
require_once("models/header.php");

/*
echo "
<div id='main'>
Hey, $loggedInUser->displayname. This is an example secure page designed to demonstrate some of the basic features of UserCake. Just so you know, your title at the moment is $loggedInUser->title, and that can be changed in the admin panel. You registered this account on " . date("M d, Y", $loggedInUser->signupTimeStamp()) . ".
</div>
<div id='bottom'></div>

 
</div>
*/

?>

<div id="editor-top-panel">
    <a href="#" class="ui-button" id="new-realm"><i class="fa fa-cloud-upload"></i> Create New Realm</a>
</div>

<div id="editor-panel">
    <div id="editor-files"></div>
</div>

<div id="editor">function foo(items) {
    var x = "All this is syntax highlighted";
    return x;
}</div>

<script src="/js/jqTree/tree.jquery.js" type="text/javascript" charset="utf-8"></script>
<script src="/js/ace/src-min-noconflict/ace.js" type="text/javascript" charset="utf-8"></script>
<script>

    $(function(){

        var editor = ace.edit("editor");
        //editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/javascript");

        var data = [
            {
                label: 'node1',
                children: [
                    { label: 'child1' },
                    { label: 'child2' }
                ]
            },
            {
                label: 'node2',
                children: [
                    { label: 'child3' }
                ]
            }
        ];

        $('#editor-files').tree({
            data: data
        });


    });
</script>

</body>
</html>


