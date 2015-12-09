var engine;
var stats;
var chartSeriesMemory;
var chartSeriesCPU;
var chartSpanMemory;
var chartSpanCPU;
var loadingBar;
var loadingText;
var blurFilter;
var displayClientStats	= false;
var displayServerStats  = false;
var isLoading           = true;
var isBooting           = false;
var loadingBarSpeed     = 0.1;

var CANVAS_WIDTH   = 896;
var CANVAS_HEIGHT  = 504;

function setup() {
  // create a renderer instance (w/h taken from engine constants)
  var queueRenderer = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, {
    backgroundColor : 0x000000
  });
  // create an new instance of a pixi stage
  var queueStage = new PIXI.Container();
  // add the renderer view element to the DOM
  document.getElementById('queue').appendChild(queueRenderer.view);
  
  blurFilter = new PIXI.filters.BlurFilter();
  blurFilter.blur = 0;
  
  var yeehaw = function () {
    queueStage.removeChildren();
    
    loadingBar = new PIXI.Graphics();
    queueStage.addChild(loadingBar);
    
    loadingText = new PIXI.Text("Loading realm code...", {
      font: "bold 10px Arial", 
      fill: "#FFFFFF", 
      align: "left"
    });
    queueStage.addChild(loadingText);
    
    loadingText.position.x = (CANVAS_WIDTH / 2) - 50;
    loadingText.position.y = (CANVAS_HEIGHT / 2) + 14;
    loadingText.anchor.x = 0;
    loadingText.anchor.y = 0;
    loadingText.filters  = [blurFilter];
    
    loadingBar.position.x = CANVAS_WIDTH / 2;
    loadingBar.position.y = CANVAS_HEIGHT / 2;
    loadingBar.filters  = [blurFilter];
    
    // Add this late as we might not have the PORT until now (realm was queued for launch)
    SCRIPTS.push("//" + HOST + ":" + PORT + "/socket.io/socket.io.js");
    
    var l = new Loader();
    l.require(SCRIPTS, function onLoading() {
      loadingBar.clear();
      loadingBar.beginFill(0xFFFFFF, 0.4);
      loadingBar.drawRect(-50, 0, Math.floor((l.loadCount / l.totalRequired) * 100), 12);
      loadingBar.endFill();
      
      loadingBar.lineStyle(2, 0xFFFFFF, 1.0);
      loadingBar.drawRect(-50, 0, 100, 12);
    }, function onComplete() {
      console.log('All Scripts Loaded');
      
      loadingBar.clear();
      loadingBar.lineStyle(2, 0xFFFFFF, 1.0);
      loadingBar.drawRect(-50, 0, 100, 12);
 
      loadingText.text = "Loading realm assets...";
      
      loadEngine();
    });
  };
  
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
      var fullList = data.queue;
      var realmQueue = data.realm_queue;
      var pos = fullList.indexOf(USER_ID);
      
      if (pos > -1) {
        // User is queued to play
        pos++;
        countingText.text = "User Queue, #" + pos;
      } else {
        // Realm is queued to launch
        pos = realmQueue.indexOf(REALM_ID);
        
        if (pos > -1) {
          pos++;
          countingText.text = "Realm Queue, #" + pos;
        } else {
          countingText.text = "...";
        }
      }
    });
    socket.on('ready', function (data) {
      // Join game
      PORT = data.port;
      document.getElementById('realm').innerHTML = '';
      yeehaw();
    });
  } else {
    yeehaw();
  }
  
  function animateQueue() {
    if (isLoading) {
      requestAnimationFrame(animateQueue);
    }
    
    if (isBooting) {
      blurFilter.blur = loadingBarSpeed;
      loadingBarSpeed += Math.random() * 5;
    }
    
    // render the root container
    queueRenderer.render(queueStage);
  }
  
  animateQueue();
}

function loadEngine() {

  engine 	= new Engine();
  stats 	= new Stats();

  engine.ready = function () {
    if (OWNER) {			
      stats.setMode(0); // 0: fps, 1: ms
      document.getElementById("statsClient").appendChild( stats.domElement );
      engine.debug(true);
    }
            
    $("#queue").fadeOut(function () {
      $("#realm").fadeIn();
    });
    
    isLoading = false;
        
    animate();
  };
  
  engine.loaded = function () {
    loadingText.text = "Starting engine...";
    isBooting = true;
  };
   
  engine.loading = function (e) {
   
    if (loadingBar) {
      loadingBar.clear();
      loadingBar.beginFill(0xFFFFFF, 0.4);
      loadingBar.drawRect(-50, 0, Math.floor(e.progress), 12);
      loadingBar.endFill();
      
      loadingBar.lineStyle(2, 0xFFFFFF, 1.0);
      loadingBar.drawRect(-50, 0, 100, 12);
    }
    
    console.log(e.progress);
    
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
  
  engine.initialize(document.getElementById('realm'),
                    HOST,
                    PORT,
                    '/realms/' + REALM_ID + '/');
};