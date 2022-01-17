const filecoin = require("../../lotus_interface");
const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const IPFS = require('ipfs-core');

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

const upload = multer({ storage: storage });



function handleUpload(req, res, ipfs) {

    let f = req.file;

    console.log(f);

    let p = "\\mnt\\c" + f.path.substring(2);
    p= p.replaceAll('\\', '/');

    fs.readFile(f.path, (err, data) => {
        if(err) {
            return res.status(500).send(err);
        }

        ipfs.add(data).then((cid) => {
    
            filecoin.client.import(p).then((d) => {
                filecoin.client.dealPieceCID(d.result.Root['/']).then((s) => {
                    console.log(s);
                    let CID = s.result.PieceCID['/'];
                    console.log(CID);
        
                    filecoin.client.startDeal(d.result.Root['/'], "t3vooeg3synqqbbfibluumnke2dwqgrg4nfb5es2znh36yx4t7eoxtdy6phzmamq2qyenmfbnpzckth5ibympa", "t01000", s.result.PieceCID['/'], /**filecoin.utils.calculatePaddedSize(*/s.result.PayloadSize/**)*/, filecoin.utils.monthsToBlocks(6)).then((g) => {
                       
                        g.cid = cid;
                        return res.send(g);
                        
                    }).catch((e) => {
                        console.error(e);
                        return res.status(500).send(e);
                    });
        
                }).catch((e) => {
        
                    console.error(e);
                    return res.status(500).send(e);
                });
        
                    
            }).catch((e) => {
                console.error(e);
                return res.status(500).send(e);
            });
    
        }).catch((err) => {
            console.error(err);
            return res.status(500).send(err);
        });
    });
}

function startEndPoints(ipfs) {

    app.post('/upload', upload.single('upload_file'), (req, res) => {
        return handleUpload(req, res, ipfs);
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
            const stream = ipfs.cat(fname);
                
            let f = function () {

                return new Promise(async (resolve, reject) => {
                    let buf = [];
                    for await (const chunk of stream) {
                        buf.push(chunk);
                    }
                    resolve(buf);
                });
                
                
            }

            f().then((buffer) => {
                for(c of buffer) {
                   res.write(c); 
                }
                res.end();
            });
            
            

            // res.sendFile(path.join(__dirname, "uploads", fname))
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

function main() {

    const ipfs = IPFS.create().then((ipfs) => {
        startEndPoints(ipfs);
    }).catch((error) => {
        console.error(error);
    });

    

}



main();