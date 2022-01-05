const filecoin = require("../../lotus_interface");
const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

const upload = multer({ storage: storage });



function handleUpload(req, res) {

    let f = req.file;

    console.log(f.path);

    console.log(f);

    // res.sendStatus(200);



    filecoin.client.import(f.path).then((d) => {
        return res.send(d);
    }).catch((e) => {
        return res.send(e);
    });
}

function main() {

    app.post('/upload', upload.single('upload_file'), (req, res) => {
        return handleUpload(req, res);
    });

    app.get('/balance', (req, res) => {
        filecoin.wallet.balance().then((d) => {
            return res.send(d);
        });
        
    });

    app.get('/download', (req, res) => {
        let fname = req.query.file;
        if(fname) {
            res.sendFile(path.join(__dirname, "uploads", fname))
            return 0;
        }

        res.sendStatus(404);

        
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