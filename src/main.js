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

    let miners = ["t01000"];
    fs.readFile(f.path, (err, data) => {
        if(err) {
            return res.status(500).send(err);
        }

        ipfs.add(data).then((cid) => {
    
            filecoin.client.import(f.path).then((d) => {
                filecoin.client.dealPieceCID(d.result.Root['/']).then((s) => {
                    let CID = s.result.PieceCID['/'];

                    let pad_size = filecoin.utils.calculatePaddedSize(s.result.PayloadSize);

                    let turn = 0;
                    let jsonRes = {cid: cid.path, filecoin: []};

                    let sDeal = function () {
                        filecoin.client.startDeal(d.result.Root['/'], "t3qxiodyvmnwx7yy7gioxdvw5fq5qvw5zw5mr7s5q6w7prtn3fqjf6uszplf2mjxh2anzzkchl4rqvhgysrzua", miners[turn], s.result.PieceCID['/'], pad_size, filecoin.utils.monthsToBlocks(6)).then((g) => {
                       
                            let block = {miner: miners[turn], dealId: g.result['/'], dataId: CID};
                            jsonRes.filecoin.push(block);

                            turn += 1;

                            if(turn < miners.length) {
                                sDeal();
                            }else{
                                return res.send(jsonRes);
                            }
                            
                        }).catch((e) => {
                            console.error(e);
                            return res.status(500).send(e);
                        });
                    } 
                    sDeal();
        
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
        filecoin.wallet.defaultAddress().then((address) => {
            filecoin.wallet.balance(address.result).then((d) => {
                let b = d.result;
                let bal = parseFloat(b) / 1000000000000000000;
                return res.json({FILBalance: bal});
            });
        });
    });

    app.get('/listImports', (req, res) => {
        filecoin.client.listImports().then((d) => {
            return res.json(d);
        });
    });

    app.get('/listDeals', (req, res) => {
        filecoin.client.listDeals().then((d) => {
            return res.json(d);
        });
    });

    app.get('/lotus_version', (req, res) => {
        filecoin.version().then((d) => {
            return res.json(d.result);
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

    app.get('/docs', (req, res) => {

        res.redirect('https://jackal-wiki.notion.site/JACKAL-API-576a08f446f0488589607c73bfb8552e');

    });

    app.get('/', (req, res) => { // file uploading home page. Nothing fancy, will remove when the time is right.
        
        let readstream = fs.createReadStream(path.join(__dirname, "www", "index.html"));

        readstream.on('open', function () {
            readstream.pipe(res);
        });
        
        readstream.on('error', function(err) {
            res.end(err);
        });

    });

    app.listen(port, () => {
        let s1='    __   ______   ______   __  __   ______   __        ';
        let s2='   /\\ \\ /\\  __ \\ /\\  ___\\ /\\ \\/ /  /\\  __ \\ /\\ \\       ';
        let s3='  _\\_\\ \\\\ \\  __ \\\\ \\ \\____\\ \\  _"-.\\ \\  __ \\\\ \\ \\____  ';
        let s4=' /\\_____\\\\ \\_\\ \\_\\\\ \\_____\\\\ \\_\\ \\_\\\\ \\_\\ \\_\\\\ \\_____\\ ';
        let s5=' \\/_____/ \\/_/\\/_/ \\/_____/ \\/_/\\/_/ \\/_/\\/_/ \\/_____/ ';

        console.log(s1 + "\n" + s2 + "\n" + s3 + "\n" + s4 + "\n" + s5);

        console.log(`\n\tnow listening at http://localhost:${port}`);
    });
}

function main() {

    IPFS.create().then((ipfs) => {

        startEndPoints(ipfs);

    }).catch((error) => {

        console.error(error);

    });    

}



main();
