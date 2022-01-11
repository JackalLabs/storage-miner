const filecoin = require("../../dingo");
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

    let p = "\\mnt\\c" + f.path.substring(2);
    p= p.replaceAll('\\', '/');
    console.log(p);

    filecoin.client.import(p).then((d) => {

        console.log(d);


        
        filecoin.client.dealPieceCID(d.result.Root['/']).then((s) => {
            // filecoin.client.calcCommP(p).then((s2) => {
            //     console.log(s2);
            // }).catch((e) => {
            //     console.error(e);
            // });
            console.log(s);
            let CID = s.result.PieceCID['/'];
            console.log(CID);

            filecoin.client.startDeal(d.result.Root['/'], "t3vooeg3synqqbbfibluumnke2dwqgrg4nfb5es2znh36yx4t7eoxtdy6phzmamq2qyenmfbnpzckth5ibympa", "t01000", s.result.PieceCID['/'], /**filecoin.utils.calculatePaddedSize(*/s.result.PayloadSize/**)*/, filecoin.utils.monthsToBlocks(6)).then((g) => {
                return res.send(g);
            }).catch((e) => {
                console.error(e);
                return res.send(e);
            });

        }).catch((e) => {

            console.error(e);
            return res.send(e);
        });

            
    }).catch((e) => {
        console.error(e);
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

    app.get('/listImports', (req, res) => {
        filecoin.client.listImports().then((d) => {
            return res.json(d);
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