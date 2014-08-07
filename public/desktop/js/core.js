// RequestAnimFrame: a browser API for getting smooth animations
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     ||  
		function( callback ){
			return window.setTimeout(callback, 1000 / 60);
		};
})();

window.cancelRequestAnimFrame = ( function() {
	return window.cancelAnimationFrame          ||
		window.webkitCancelRequestAnimationFrame    ||
		window.mozCancelRequestAnimationFrame       ||
		window.oCancelRequestAnimationFrame     ||
		window.msCancelRequestAnimationFrame        ||
		clearTimeout
} )();


var players = [],
    balls = [],
    score = [],
    cwidth = 750,
    cheight = 750,
    canvas,
    ctx,
    ny, 
    nx,
    prevpaddlehit,
    socket,
    host;

var stats = new Stats();
stats.setMode(1); // 0: fps, 1: ms

// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

document.body.appendChild( stats.domElement );

var Pong = function(){
    var obj = this; // Catch this;
    // Init vars
    canvas = document.getElementById("pong");
    ctx = canvas.getContext("2d");
    obj.gameover = false;
    score = [];
    obj.running = false;
    
    // Set arrays that hold elements
    players = [];
    balls = [];
    
    // Set canvas width and height
    canvas.height = cheight;
    canvas.widdth = cwidth;

    obj.init = function(){
        balls.push(new Ball());
    };
    
    // Draw all elements
    obj.drawgame = function(){
        // Draw the balls
        balls.forEach(function(ball){
            ball.draw();
        });
        
        // Draw the paddles
        players.forEach(function(player){
            player.paddle.draw();
        });
    };
    
    // Clear the canvas
    obj.clear = function(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    
    var gameloop = function(){
        stats.begin();
        // Clear canvas
        obj.clear();
        
        // Draw everyting
        obj.drawgame();
        
        stats.end();
        // Repeat loop
        if(!obj.gameover)
            requestAnimFrame(gameloop);
    };
    
    obj.start = function(){
        // This sends the signal 'new room' to the server, along with data containing the room name id. 
        // For live deployment, this should be a random string. 
        // See the full documentation for example socket.emit('new room', { room: �lolcats�});
        obj.running = true;
        gameloop();
    }
    
    /* 
     * Game over stopts the game and shows the game over message
     */
    gameover = function(){
        obj.gameover = true;
    }
};

// Start game on document ready
window.onload = function(){
    var game = new Pong();
    
    var roomId = "dev";
    socket = io.connect("192.168.2.21");
    var roomURL = "192.168.2.21:8080/mobile.html?id=" + roomId;
    socket.emit('connect room', roomId, function(data){
        host = data.host;
    });
    
    
    // Listen for new players
    socket.on("new player", function(data){
        if(players.length < 4){
            var player = new Player(players.length, new Paddle(), false);
            player.socketid = data.id;
            
            players.push(player); 
            
            $("body").append("new player: " + data.id + "<br>");
        }
        else{
            $("body").append("new player: " + data.id + " <b>Can't play: room full</b><br>");
        }
    });
    
    // Listen for new players
    socket.on("user removed", function(pid){
        players.forEach(function(player){
            if(player.socketid == pid){
                player.changeToAI();
            }
        });
        $("body").append("Disconnected player: " + pid + "<br>");
        
    });
    
    socket.on("update movement", function(data){
        var pid = data.playerId;
        players.forEach(function(player){
            if(player.socketid == pid){
                var my = ((canvas.height / 35) * -data.ori.beta) + canvas.height / 2;
                var mx = ((canvas.width / 35) * data.ori.alpha) + canvas.width / 2;
            
                if(player.index == 0 || player.index == 1)
                    player.paddle.move(null, my);
                else
                    player.paddle.move(mx, null);
            }
        });
    });
    
    // Count down so players can add to the room
    var seconds = 5;
    var waitingInterval = setInterval(function(){
        $(".seconds").html("Waiting for other players. " + (seconds) + " Seconds left");
        
        if(!game.running && seconds == 0){
            for(var x = players.length; x < 4; x++){
                players.push(new Player(players.length, new Paddle(), true));        
            }
            
            game.init();
            game.start();
            
            clearInterval(waitingInterval);
        }
        
        seconds--;
    }, 1000);
};
