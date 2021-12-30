const filecoin = require("../../lotus_interface/interface");
const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, 'uploads') });


function handleUpload(req, res) {

    let f = req.file;

    console.log(f.path);

    filecoin.client.import(f.path).then((d) => {
        return res.send(d);
    }).catch((d) => {
        return res.send(d);
    });
}

function main() {

    app.post('/upload', upload.single('upload_file'), (req, res) => {
        return handleUpload(req, res);
    });

    app.get('/', (req, res) => {
        
        let readstream = fs.createReadStream(path.join(__dirname, "www", "index.html"));

        readstream.on('open', function () {
            readstream.pipe(res);
        });
        
        readstream.on('error', function(err) {
            res.end(err);
        });

    });

    
      
    app.listen(port, () => {
        console.log(`JACKAL listening at http://localhost:${port}`);
    });

}



main();