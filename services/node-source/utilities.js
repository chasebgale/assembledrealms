exports.logMessage = function(message) {
    console.log('');
    
    var currentdate = new Date(); 
    var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
                    
    console.log(datetime);
    console.log('-----------------------------------');
    console.log(message);
}