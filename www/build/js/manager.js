var __removedScreenshots 	= [];

var __memory_series   		= undefined;
var __cpu_series      		= undefined;

var __memory_span			= undefined;
var __cpu_span				= undefined;

$(document).ready(function () {
   
    $('.monitored').on('change', function (e) {
        var prop = $(this).attr('data-id');
        __currentState[prop] = $(this).val();
        checkForChanges();
    });
   
    $("#destroyRealmConfirm").on("click", function (e) {

        e.preventDefault();
        var id = $(this).attr('data-id');

        $.ajax({
            url: 'http://source-01.assembledrealms.com/api/project/' + id + '/destroy',
            type: 'GET',
            dataType: 'json',
            success: function (data) {
            
                var parameters = {};
                parameters.directive = "destroy";
                parameters.realm_id = id;

                $.post("/build/manager.php", parameters, function (data) {
                    data = JSON.parse(data);
                    if (data.message == "OK") {
                        window.location = "http://www.assembledrealms.com/build";
                    }
                });

            }
        });
        
    });
   
    $("#takeRealmOffline").on('click', function (e) {
        var button = $(this);
      
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Yes');
        
        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'offline',
                realm_id: __realmID
            }
        })
        .done(function (data) {
            button.attr('disabled', false);
            button.html('Yes');
            
            if (data.message == "OK") {
                $("#onlineOfflineBtn").attr('data-target', '#modalTakeRealmOnline');
                $("#onlineOfflineBtn").text('Take Realm Online');
                $("#onlineOfflineDescription").html('Your realm is currently <strong>offline</strong>. Click this button to allow other users to connect to your realm and enjoy the fruits of your hard work!');
            }
        })
        .fail(function(data) {
            console.log(data);
            $('#realmOfflineAlert').text('Network Error: ' + data.statusText);
            button.attr('disabled', false);
            button.html('Yes');
            // Update DOM to reflect we messed up:
            //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        });
    });
    
    $("#takeRealmOnline").on('click', function (e) {
        var button = $(this);
      
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Bring Online');
        
        var server_type = $("input[name=serverTypeRadios]:checked").val();
        
        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'online',
                realm_id: __realmID,
                server: server_type
            }
        })
        .done(function (data) {
            button.attr('disabled', false);
            button.html('Bring Online');
            
            if (data.message == "OK") {
                $("#onlineOfflineBtn").attr('data-target', '#modalTakeRealmOnline');
                $("#onlineOfflineBtn").text('Take Realm Online');
                $("#onlineOfflineDescription").html('Your realm is currently <strong>offline</strong>. Click this button to allow other users to connect to your realm and enjoy the fruits of your hard work!');
            } else {
                alert("FAILURE!");
            }
        })
        .fail(function(data) {
            console.log(data);
            $('#realmOfflineAlert').text('Network Error: ' + data.statusText);
            button.attr('disabled', false);
            button.html('Bring Online');
            // Update DOM to reflect we messed up:
            //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        });
    });
   
    $("#savebutton").on('click', function (e) {
        var button = $(this);
      
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Save Changes!');
        
        var newOrder = [];
        
        $('.screenshotHolder').each( function(e) {
            newOrder.push($(this).attr('data-id'));
        });

        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'save',
                realm_id: __realmID,
                description: $("#details-description").val(),
                funding: $("#chkFunding").is(":checked"),
                shots: newOrder,
                shots_removed: __removedScreenshots
            }
        })
        .done(function (data) {
            __removedScreenshots = [];
            button.attr('disabled', false);
            button.html('Save Changes!');
        })
        .fail(function(data) {
            console.log(data);
            $('#newFileCreateAlert').text('Network Error: ' + data.statusText);
            $('#newFileCreateAlert').fadeIn();
            // Update DOM to reflect we messed up:
            //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
        });
    });
   
    $("#screenshotsCol").on('click', '.removeScreenshot', function (e) {
        e.preventDefault();
        var id = $(this).attr('data-id');
        
        if (id) {
            // We only need to report existing shots to be removed, the staging area server side gets wiped daily
            __removedScreenshots.push(id);
        }
        
        $(this).parent().parent().remove();
        
        if ($('.screenShotHolder').length < 6) {
            $('#addNewShot').fadeIn();
        }
    });
   
    $("#upfile").on('change', function (e) {
       
        $("#upfile").attr('disabled', true);
        $("#uploadProgress").fadeIn();
        
        var formData = new FormData();
        formData.append('upfile', e.target.files[0]);
        formData.append("directive", "upload");
        formData.append("realm_id", __realmID);
       
        $.ajax({
            url: "manager.php",
            type: "POST",
            data: formData,
            dataType: 'json',
            processData: false, // tell jQuery not to process the data
            contentType: false, // tell jQuery not to set contentType
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                // Upload progress
                xhr.upload.addEventListener("progress", function (evt) {
                    var percentComplete = Math.round((evt.loaded / evt.total) * 100);
                    $("#uploadProgressbar").attr('aria-valuenow', percentComplete).width(percentComplete + '%');
                }, false);
                return xhr;
            },
            success: function(data, textStatus, jqXHR) {
                if(data.message === 'OK') {
                    var newContent = '<div class="thumbnail screenshotHolder" data-id="staging/' + data.guid + '" style="display: inline-block; margin: 8px;">';
                    newContent += '<a href="/play/img/staging/' + data.guid + '.jpg" data-toggle="lightbox" data-title="NEW Screenshot" data-parent=".wrapper-parent" data-gallery="gallery-43">';
                    newContent += '<img src="/play/img/staging/' + data.guid + '-thumb.jpg"></a>';
                    newContent += '<div class="caption"><a href="#" class="btn removeScreenshot"><i class="fa fa-trash-o"></i> Remove</a></div></div>';
                    
                    $('#screenshotsCol').append(newContent);
                    
                    if ($('.screenshotHolder').length >= 6) {
                        $('#addNewShot').hide();
                    }
                    
                    $("#uploadScreenshotForm").get(0).reset();
                    $("#upfile").attr('disabled', false);
                    $("#uploadProgressbar").attr('aria-valuenow', 0).width('0%');
                    
                }
                else
                {
                    // Handle errors here
                    console.log('ERRORS: ' + data.error);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle errors here
                console.log('ERRORS: ' + textStatus);
            }
        });
    });
    
    $("#depositAmountSlider").on('input', function () {
        var floatDeposit = parseFloat($(this).val());
        var totalDeposit = __realmFunds + (floatDeposit * 100);
        var depositToHours = Math.floor(totalDeposit / 0.9);
        
        $("#depositAmount").val(floatDeposit);
        $("#realmFundsAfter").text(accounting.formatMoney(totalDeposit / 100));
        $("#realmLifespan").text(depositToHours + " hours, or about " + moment.duration(depositToHours, 'hours').humanize() );
    });
    
    $("#depositAmount").on('input', function () {
        var floatDeposit = parseFloat($(this).val());
        var totalDeposit = __realmFunds + (floatDeposit * 100);
        var depositToHours = Math.floor(totalDeposit / 0.9);
        
        $("#depositAmountSlider").val(floatDeposit);
        $("#realmFundsAfter").text(accounting.formatMoney(totalDeposit / 100));
        $("#realmLifespan").text(depositToHours + " hours, or about " + moment.duration(depositToHours, 'hours').humanize() );
    });
    
    $("#depositButton").on('click', function () {
        
        var button = $(this);
        
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Approve Deposit');
        
        var depositAmount = (parseFloat($("#depositAmountSlider").val()) * 100);
        
        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'deposit',
                realm_id: __realmID,
                amount: depositAmount
            }
        })
        .done(function (data) {
            button.attr('disabled', false);
            button.html('Approve Deposit');
            
            if (data.message == "OK") {
                $("#modalDeposit").modal('hide');
                __realmFunds += depositAmount;
                $("#realmFunds").text(accounting.formatMoney(__realmFunds / 100));
                
                var userFunds = (parseFloat($("#userFunds").text()) * 100) - depositAmount;
                $("#userFunds").text(accounting.formatMoney(userFunds / 100, {format: "%v"}));
            } else {
                $("#depositAlert").text('Deposit Failed!').show();
            }
        })
        .fail(function(data) {
            button.attr('disabled', false);
            button.html('Approve Deposit');
            
            // Update DOM to reflect we messed up:
            $("#depositAlert").text('Deposit Failed!').show();
        });
        
    });
   
    var depositToHours = Math.floor(__realmFunds / 0.9);
    $("#realmLifespan").text(depositToHours + " hours, or about " + moment.duration(depositToHours, 'hours').humanize() );
   
	var chart 	= new SmoothieChart({millisPerPixel: 100,
									grid: {fillStyle:'#4C4C4C',strokeStyle:'#777777'},
									yRangeFunction: function(range) { 
										return {min: 0, max: (range.max + 10 > 100) ? 100 : range.max + 10}; 
									},
									yMinFormatter: function(min, precision) {
										return parseFloat(min).toFixed(0) + " %";
									},
									yMaxFormatter: function(max, precision) {
										return parseFloat(max).toFixed(0) + " %";
									}});
									 
    var canvas 	= document.getElementById('chart-server');
	
	__memory_series = new TimeSeries();
	__cpu_series 	= new TimeSeries();
	
	__memory_span = document.getElementById('mem_display');
	__cpu_span = document.getElementById('cpu_display');
	
	chart.addTimeSeries(__memory_series, {lineWidth:2.3,strokeStyle:'#00ff00',fillStyle:'rgba(0,255,0,0.11)'});
	chart.addTimeSeries(__cpu_series, {lineWidth:2.3,strokeStyle:'#ffffff',fillStyle:'rgba(255,255,255,0.11)'});
	
	var socket = io('http://debug-01.assembledrealms.com/');
	socket.on('connect', function () {
		socket.emit('subscribe', {id: '99'});
	});
	socket.on('stats', function (data) {
		__memory_series.append(new Date().getTime(), data.memory / 1000000 / 512 * 100);
		__memory_span.textContent = parseFloat(data.memory / 1000000).toFixed(2);
		
		__cpu_series.append(new Date().getTime(), data.cpu);
		__cpu_span.textContent = data.cpu + ' %';
	});
	/*
	setInterval(function() {
		$.get( 'http://debug-01.assembledrealms.com/realms/99/stats', function( data ) {
			__memory_series.append(new Date().getTime(), data.memory / 1000000 / 512 * 100);
			__memory_span.textContent = parseFloat(data.memory / 1000000).toFixed(2);
			
			__cpu_series.append(new Date().getTime(), data.cpu);
			__cpu_span.textContent = data.cpu + ' %';
		});
	}, 2000);
	*/
	chart.streamTo(canvas, 2000);
   
});

function checkForChanges() {
   if (_.isEqual(__existingState, __currentState)) {
      disableSave();
   } else {
      enableSave();
   }
}

function enableSave() {
   var button = $('#savebutton');
      
   button.removeAttr('disabled');
   button.html('<i class="fa fa-exclamation-triangle"></i> Save Changes!');
}

function disableSave() {
   var button = $('#savebutton');
      
   button.attr('disabled', 'disabled');
   button.html('Save Changes!');
}