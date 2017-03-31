var express = require('express');
var app = express();
var session = require('express-session');
var cookieParser = require('cookie-parser');
var path = require('path');
server = require('http').createServer(app);

var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var dir = path.join(__dirname, 'public');

app.use(express.static(dir));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: "jbjcbjbdjbjbdc",resave: false,saveUninitialized: true}));
mongoose.connect('mongodb://localhost/notifdb');

io = require('socket.io').listen(server);
console.log('server running at 3000...');

usernames = [];
dispname = '';
server.listen(process.env.PORT || 3000);

var User = mongoose.model('User',{name: {type: String, index: { unique: true }}, email: String,pass: String,id: String,roomname: String});
var _id = '';

//generate random id
function getRandomId(){
    var chars = 'acdefhiklmnoqrstuvwxyz0123456789'.split('');
    var result = '';
    for(var i=0; i<6; i++){
        var x = Math.floor(Math.random() * chars.length);
        result += chars[x];
    }
    console.log('id output : '+result+' '+String(result));
    return String(result);
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var name;
var email;
var passw;
var originalid;
var eid;

app.post('/idinput',function(req,res){
    name = req.body.name;
    email = req.body.email;
    passw = req.body.pass;
    var id = getRandomId();
    _id = id;        
    res.cookie('oname',id);
    var user1 = new User({name: name, email: email, pass: passw, id: _id,roomname: ''});
    console.log(user1);
    user1.save(function(err,userObj){
        if(err)
            console.log(err);
        else
            console.log('Saved Successfully');
    });
    res.sendFile(__dirname + '/idinput.html');
});

app.get('/idinput', function(req, res){
    //res.cookie('oname',originalid);
    res.sendFile(__dirname + '/idinput.html');
});


app.get('/reg',function(req,res){    
    res.sendFile(__dirname+'/reg.html');     
});

app.post('/reg',function(req,res){    
    res.sendFile(__dirname+'/reg.html');     
});

io.sockets.on('connection', function(socket){

    // Send Message
    socket.on('notif-emit', function(data){
        User.find({id: data.id},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results.length);
                if(results.length>0)
                    io.sockets.emit('notif-broadcast', {id: data.id, type: data.type, user: results[0].name});                    
            }
        });        
    });    

    //check User credentials
    socket.on('checkUser',function(data,callback){
        console.log(data.name+' '+data.password);   
        var tmpflag;     
        User.find({email: data.name , pass: data.password},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0){
                    console.log('id from back: '+ results[0].id);
                    name = results[0].name;
                    email = results[0].email;
                    passw = results[0].pass;       
                    originalid = results[0].id;   
                    tmpflag = true;                                                                      
                }
                else{
                    tmpflag =false;                    
                }
                callback({id: originalid});
                io.sockets.emit('validateUser',{ status: tmpflag});
            }

        });
        console.log(tmpflag);
    });

    // Disconnect
    socket.on('disconnect', function(data){
        if(!socket.username) return;
        usernames.splice(usernames.indexOf(socket.username), 1);
        updateUsernames();
    });
});
