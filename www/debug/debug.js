var engine;
var stats;
var chartSeriesMemory;
var chartSeriesCPU;
var chartSpanMemory;
var chartSpanCPU;
var loadingBar;
var displayClientStats	= false;
var displayServerStats  = false;
var isLoading           = false;

$("#btnFPS").on("click", function (e) {
  var self = $(this);

  if (displayClientStats) {
    // Turn off:
    $("#stats").hide();
    displayClientStats = false;
    self.removeClass("active");
    self.html('<i class="fa fa-square-o fa-fw"></i> FPS');
  } else {
    // Turn on:
    $("#stats").show();
    displayClientStats = true;
    self.addClass("active");
    self.html('<i class="fa fa-check-square-o fa-fw"></i> FPS');
  }
});

$("#btnServerDiagnostics").on("click", function (e) {

  var self = $(this);

  if (displayServerStats) {
    // Turn off:
    $("#serverStats").hide();
    displayServerStats = false;
    self.removeClass("active");
    self.html('<i class="fa fa-square-o fa-fw"></i> Server CPU MB');
  } else {
    // Turn on:
    $("#serverStats").show();
    displayServerStats = true;
    self.addClass("active");
    self.html('<i class="fa fa-check-square-o fa-fw"></i> Server CPU MB');
  }
  
  engine.debug(displayServerStats);
});
    
function allReady() {

  engine 	= new Engine();
  stats 	= new Stats();
  
  // create a renderer instance (w/h taken from engine constants)
  var queueRenderer = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, {
    backgroundColor : 0x000000
  });
  // create an new instance of a pixi stage
  var queueStage = new PIXI.Container();
  // add the renderer view element to the DOM
  document.getElementById('queue').appendChild(queueRenderer.view);

  engine.loaded = function () {
    if (DEBUG) {			
      stats.setMode(0); // 0: fps, 1: ms
      document.getElementById("realmStats").appendChild( stats.domElement );
      engine.debug(true);
    }
            
    $("#queue").fadeOut(function () {
      $("#realm").fadeIn();
    });
        
    animate();
  };
   
  engine.loading = function (e) {
    /*
        _numToLoad: 70
        _progressChunk: 1.4285714285714286
    */
    if (!isLoading) {
        isLoading = true;
        $("#loading_text").text("Downloading realm assets...");
    }
    
    /*
    var string_width = Math.floor(e.progress) + "%";
    
    $("#loading_progress").width(string_width);
    $("#loading_progress").text(string_width)
    $("#loading_progress").attr("aria-valuenow", Math.floor(e.progress));
    */
    
    if (loadingBar) {
      loadingBar.clear();
      loadingBar.beginFill(0xFFFFFF, 0.4);
      loadingBar.drawRect(-50, 0, Math.floor(e.progress), 12);
      loadingBar.endFill();
      
      loadingBar.lineStyle(2, 0xFFFFFF, 1.0);
      loadingBar.drawRect(-50, 0, 100, 12);
    }
    
  }
  
  function animate() {
    if (displayClientStats) {
      stats.begin();
    }
    
    engine.render();
    
    if (displayClientStats) {
      stats.end();
    }
    
    requestAnimationFrame(animate);
  }

  engine.debugging = function (data) {
  };
  
  if (OWNER) {
    displayClientStats = true;
    displayServerStats = true;
    
    var chart = new SmoothieChart({
      millisPerPixel: 100,
      grid: {
        fillStyle:'#4C4C4C',
        strokeStyle:'#777777'
      },
      yRangeFunction: function (range) { 
        return {
          min: 0, 
          max: (range.max + 10 > 100) ? 100 : range.max + 10
        }; 
      },
      yMinFormatter: function(min, precision) {
        return parseFloat(min).toFixed(0) + " %";
      },
      yMaxFormatter: function(max, precision) {
        return parseFloat(max).toFixed(0) + " %";
      }
    });
                 
    var canvas 	= document.getElementById('chart-server');
    
    chartSeriesMemory = new TimeSeries();
    chartSeriesCPU 	= new TimeSeries();
    
    chartSpanMemory = document.getElementById('mem_display');
    chartSpanCPU = document.getElementById('cpu_display');
    
    chart.addTimeSeries(chartSeriesMemory, {
      lineWidth:2.3,
      strokeStyle:'#00ff00',
      fillStyle:'rgba(0,255,0,0.11)'
    });
    
    chart.addTimeSeries(chartSeriesCPU, {
      lineWidth:2.3,
      strokeStyle:'#ffffff',
      fillStyle:'rgba(255,255,255,0.11)'
    });
    
    chart.streamTo(canvas, 2000);
    
    engine.debugging = function (data) {
      chartSeriesMemory.append(new Date().getTime(), data.memory / 1000000 / 512 * 100);
      chartSpanMemory.textContent = parseFloat(data.memory / 1000000).toFixed(2);
      
      chartSeriesCPU.append(new Date().getTime(), data.cpu);
      chartSpanCPU.textContent = data.cpu + ' %';
    };
  }
  
  
  if (QUEUE) {
    
    var countingText = new PIXI.Text("00", {
      font: "bold 60px Arial", 
      fill: "#FFFFFF", 
      align: "center", 
      stroke: "#FFFFFF", 
      strokeThickness: 2
    });
    countingText.position.x = CANVAS_WIDTH / 2;
    countingText.position.y = CANVAS_HEIGHT / 2;
    countingText.anchor.x = 0.5;
    countingText.anchor.y = 0.5;
    //countingText.alpha = 0;
    queueStage.addChild(countingText);
    
    var socket = io('http://' + RAWHOST);
    socket.on('info', function (data) {
      var fullList = data.list;
      var pos = data.list.indexOf(USERID) + 1;
      countingText.text = pos;
    });
    socket.on('ready', function (data) {
      // Join game
      document.getElementById('realm').innerHTML = '';
      engine.initialize( document.getElementById("realm") );
    });
  } else {
    queueStage.removeChildren();
    loadingBar = new PIXI.Graphics();
    queueStage.addChild(loadingBar);
    loadingBar.position.x = CANVAS_WIDTH / 2;
    loadingBar.position.y = CANVAS_HEIGHT / 2;
    //loadingBar.anchor.x = 0.5;
    //loadingBar.anchor.y = 0.5;
    
    engine.initialize( document.getElementById("realm") );
  }
  
  function animateQueue() {
    requestAnimationFrame(animateQueue);
    // render the root container
    queueRenderer.render(queueStage);
  }
  
  animateQueue();
}