// Import package
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');

// PASSWORD UTILS
// CREATE FUNCTION TO RANDOM SALT
var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex') // Convert to hex format
        .slice(0, length);
}

var sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt : salt, 
        passwordHash : value
    };
}

function saltHashPassword(userPassword){
    var salt = genRandomString(16); // Create 16 random character
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

function checkHashPassword(userPassword, salt){
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

// Create Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Create MongoDB Client
var MongoClient = mongodb.MongoClient;

// Connection URL
var url = 'mongodb://localhost:27017' // 27017 is default port

MongoClient.connect(url, {useNewUrlParser:true, useUnifiedTopology: true }, function (err, client){
    if (err) 
        console.log("Unable to connect to the MongoDB server. Error:", err);
    else{
        // Register
        app.post('/register', (request, response, next)=>{
            var post_data = request.body;
            var plain_password = post_data.password;
            var hash_data = saltHashPassword(plain_password);

            var password = hash_data.passwordHash; // Save password hash
            var salt = hash_data.salt; // Save salt

            var name = post_data.name;
            var email = post_data.email;

            var insertJson = {
                'email' : email,
                'password' : password,
                'salt': salt,
                'name': name
            };
            var db = client.db('kimeapp');
            
            // Check exists email
            db.collection('user')
                .find({'email' :email}).count(function(err, number){
                    if (number != 0){
                        response.json({result:"Email already exists"});
                        console.log("Email already exists");
                    }
                    else{
                        // Insert data
                        db.collection('user')
                            .insertOne(insertJson, function(error, res){
                                response.json({result:"Registration success"});
                                console.log("Registration success");
                            })
                    }
                })
        });

        app.post('/login', (request, response, next)=>{
            var post_data = request.body;
        
            var email = post_data.email;
            var userPassword = post_data.password;

            var db = client.db('kimeapp');
            
            // Check exists email
            db.collection('user')
                .find({'email' :email}).count(function(err, number){
                    if (number == 0){
                        response.send({result:"Email not exists"})
                        console.log("Email not exists");
                    }
                    else{
                        // Insert data
                        db.collection('user')
                            .findOne({"email": email}, function(err, user){
                                var salt = user.salt;
                                var hashed_password = checkHashPassword(userPassword, salt).passwordHash; // Hash password with salt
                                var encrypted_password = user.password; // Get password from user
                                if (hashed_password == encrypted_password){
                                    response.send({result: "Login success", name: user.name, email: user.email});
                                    console.log("Login success");
                                }
                                else{
                                    response.json({result: "Wrong password"});
                                    console.log("Wrong password");
                                }
                            })
                    }
                })
        });

        app.post('/history', (request, response, next)=>{
            var post_data = request.body;
        
            var speed = post_data.speed;
            var latitude = post_data.latitude;
            var longitude = post_data.longitude;
            var traffic_sign = post_data.traffic_sign;
            var created_at = new Date(post_data.created_at);

            
            var db = client.db('kimeapp');
            
            var insertJson = {
                'speed': speed,
                'latitude': latitude,
                'longitude': longitude,
                'traffic_sign': traffic_sign,
                'created_at': created_at
            }
            console.log(JSON.stringify(insertJson));

            // Insert data
            db.collection('history')
            .insertOne(insertJson, function(error, res){
                if (error) throw error;
                response.json({result:"Location inserted!"});
                console.log("Location inserted!");
            })
        });

        app.post('/result', (request, response, next)=>{
            var post_data = request.body;
        
            var time_start = new Date(post_data.time_start);
            var time_end = new Date(post_data.time_end);

            var db = client.db('kimeapp');

            db.collection('history')
            .find({
                "created_at": {
                    $gte: time_start,
                    $lt: time_end
                }
            })
            .toArray(function(err, data) {
                if (err) throw err;
                response.json({result: data});
                console.log({result: data});
            })
        });

        // Start Web Server
        app.listen(3000, () => {
            console.log("Connected to MongoDB Server, WebService running on port 3000");
        });
    }
})

