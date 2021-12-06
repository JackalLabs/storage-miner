const _ = require("underscore");
require('dotenv').config();
const env = process.env;
const express = require("express");
const app = express();

function hello(req, res) {
    res.send('Hello World!');
}

function defineRoutes(app) {
    app.get('/', hello);
}

function startApp(app, port) {
    app.listen(port, () => {
        console.log(`Listening at http://localhost:${port}`)
    });
}

function main() {

    defineRoutes(app);
    startApp(app, env.PORT);
    
}


main();