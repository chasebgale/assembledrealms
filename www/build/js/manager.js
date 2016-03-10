var __removedScreenshots 	= [];

var __chart                 = undefined;
var __chart_canvas          = undefined;

var __memory_series   		= undefined;
var __cpu_series      		= undefined;

var __memory_span			= undefined;
var __cpu_span				= undefined;

$(document).ready(function () {
   
  $.ajaxSetup({
    crossDomain: true,
    xhrFields: {
      withCredentials: true
    }
  });
   
    $('.monitored').on('input', function (e) {
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
                $("#realmStatus").text('Offline');
                $("#modalTakeRealmOffline").modal('hide');
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
    var button = $("#onlineOfflineBtn");
  
    button.attr('disabled', true);
    button.html('<i class="fa fa-cog fa-spin"></i> Take Realm Online');
    
    var server_type = $("input[name=serverTypeRadios]:checked").val();
    
    $("#modalTakeRealmOnline").modal('hide');
    
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
      
      $.ajax({
        url: 'https://gatekeeper.assembledrealms.com/launch/play/shared/' + __realmID,
        type: 'post',
        dataType: 'json',
        data: {
        }
      })
      .done(function (data) {
        
        if (data.message == "OK") {
          button.attr('disabled', false);
          button.attr('data-target', '#modalTakeRealmOffline');
          button.html('Take Realm Offline');
          /*
          if (server_type > 0) {
            $("#realmStatus").html("<span class='label label-warning'><i class='fa fa-cog fa-spin'></i>  Booting</span>");
          } else {
          */
          $("#realmStatus").html("<span class='label label-success'><i class='fa fa-power-off'></i> Online</span>");
          //}
        }
      
      })
      .fail(function(data) {
        console.log(data);
        $('#realmOfflineAlert').text('Network Error: ' + data.statusText);
        button.attr('disabled', false);
        button.html('Take Realm Online');
        // Update DOM to reflect we messed up:
        //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
      });
      
    });
  });
   
    $("#savebutton").on('click', function (e) {
        var button = $(this);
      
        button.attr('disabled', true);
        button.html('<i class="fa fa-cog fa-spin"></i> Save Changes!');

        $.ajax({
            url: 'manager.php',
            type: 'post',
            dataType: 'json',
            data: {
                directive: 'save',
                realm_id: __realmID,
                description: $("#details-description").val(),
                funding: $("#chkFunding").is(":checked")
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
      
      var removeLink = $(this);
      var filename   = removeLink.attr('data-id');
      
      removeLink.html('<i class="fa fa-trash-o fa-spin"></i> Remove</a>');
      $("#screenshotsCol .removeScreenshot").attr('disabled', true);
      
      $.ajax({
        url: 'manager.php',
        type: 'post',
        dataType: 'json',
        data: {
          directive: 'remove_screenshot',
          realm_id: __realmID,
          filename: filename
        }
      })
      .done(function (data) {
        removeLink.parent().parent().fadeOut(function () {
          $(this).remove();
          $("#screenshotsCol .removeScreenshot").removeAttr('disabled');

          if ($('.screenShotHolder').length < 6) {
            $('#addNewShot').fadeIn();
          }
        });
      })
      .fail(function(data) {
        console.log(data);
        $('#newFileCreateAlert').text('Network Error: ' + data.statusText);
        $('#newFileCreateAlert').fadeIn();
        // Update DOM to reflect we messed up:
        //$('#' + id + ' span:last').html('<i class="fa fa-thumbs-down" style="color: red;"></i> ' + response.responseJSON.message);
      });
      
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
                    var newContent = '<div class="thumbnail screenshotHolder" data-id="' + data.filename + '" style="display: inline-block; margin: 8px;">';
                    newContent += '<a href="/play/img/' + data.filename + '.jpg" data-toggle="lightbox" data-title="NEW Screenshot" data-parent=".wrapper-parent" data-gallery="gallery-' + __realmID + '">';
                    newContent += '<img src="/play/img/' + data.filename + '-thumb.jpg"></a>';
                    newContent += '<div class="caption"><a href="#" class="btn removeScreenshot" data-id="' + data.filename + '"><i class="fa fa-trash-o"></i> Remove</a></div></div>';
                    
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
        
        $("#depositAmount").val(floatDeposit);
        $("#realmFundsAfter").text(accounting.formatMoney(totalDeposit / 100));
        $("#realmLifespan").text(totalDeposit + " hours, or about " + moment.duration(totalDeposit, 'hours').humanize() );
    });
    
    $("#depositAmount").on('input', function () {
        var floatDeposit = parseFloat($(this).val());
        var totalDeposit = __realmFunds + (floatDeposit * 100);
        
        $("#depositAmountSlider").val(floatDeposit);
        $("#realmFundsAfter").text(accounting.formatMoney(totalDeposit / 100));
        $("#realmLifespan").text(totalDeposit + " hours, or about " + moment.duration(totalDeposit, 'hours').humanize() );
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
   
   
    __chart 	    = new SmoothieChart({millisPerPixel: 100,
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
									 
    __chart_canvas  = document.getElementById('chart-server');
	
	__memory_series = new TimeSeries();
	__cpu_series 	= new TimeSeries();
	
	__memory_span = document.getElementById('mem_display');
	__cpu_span = document.getElementById('cpu_display');
	
	__chart.addTimeSeries(__memory_series, {lineWidth:2.3,strokeStyle:'#00ff00',fillStyle:'rgba(0,255,0,0.11)'});
	__chart.addTimeSeries(__cpu_series, {lineWidth:2.3,strokeStyle:'#ffffff',fillStyle:'rgba(255,255,255,0.11)'});
   
    if (__realmOnline && (__realmLevel > 0)) {
        enableChart();
    }
   
});

function enableChart() {
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
	__chart.streamTo(__chart_canvas, 2000);
   
    $("#chart-container").css('opacity', '1.0');
}

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