// const filecoin = require("../lotus_interface/interface.js");
const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const IPFS = require('ipfs-http-client');
const CIDs = require('cids');
const filecoin = require("dingojs");
const customFees = require('./fees')
const logger = require('./logger');
const winston = require('winston');
const { format } = winston;


const axios = require('axios');
const CORS = require('cors');

const {
    EnigmaUtils,
    Secp256k1Pen,
    SigningCosmWasmClient,
    pubkeyToAddress,
    encodeSecp256k1Pubkey
} = require("secretjs");

var http = require('http');
const { exit } = require('process');

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

const upload = multer({
    storage: storage
});


function handleUpload(req, res, ipfs, secretjs, rwb) {

    let f = req.file;

    let miners = ["t01000"];

    let new_block = {
        address: req.body.address,
        key: req.body.skey
    };

    rwb[req.body.pkey] = new_block;


    fs.readFile(f.path, (err, data) => {
        if (err) {
            return res.status(500).send({
                location: 'fs.readFile()',
                error: e
            });
        }

        ipfs.add(data)
        .then((cid) => {



            let cd = new CIDs(cid.path);
            const v1Cid = cd.toV1().toBaseEncodedString("base32")
            let jsonRes = {
                cid: v1Cid,
                miners: miners,
                dataId: "empty",
                node: process.env.PUBLIC_IP
            };

            getTopNodes(secretjs, 20)
            .then((data) => {
                for (const i of data) {
                    axios.get('https://' + i + '/pinipfs?cid=' + v1Cid)
                    .catch((err) => {
                        logger.info("Couldn't reach the external node.");
                    });
                }
            })
            .catch((err) => {
                logger.error(err);
            });
            return res.send(jsonRes);

            filecoin.client.import(f.path)
            .then((d) => {
                filecoin.client.dealPieceCID(d.result.Root['/'])
                .then((s) => {
                    let CID = s.result.PieceCID['/'];

                    let pad_size = filecoin.utils.calculatePaddedSize(s.result.PayloadSize);

                    let turn = 0;


                    let jsonRes = {
                        cid: cd.toV1().toBaseEncodedString("base32"),
                        miners: miners,
                        dataId: CID
                    };

                    let sDeal = function () {
                        filecoin.client.startDeal(d.result.Root['/'], "t3qxiodyvmnwx7yy7gioxdvw5fq5qvw5zw5mr7s5q6w7prtn3fqjf6uszplf2mjxh2anzzkchl4rqvhgysrzua", miners[turn], s.result.PieceCID['/'], pad_size, filecoin.utils.monthsToBlocks(6))
                        .then((g) => {


                            turn += 1;

                            if (turn < miners.length) {
                                sDeal();
                            } else {
                                return res.send(jsonRes);
                            }

                        })
                        .catch((e) => {
                            logger.error(e);
                            return res.status(500).send({
                                location: 'filecoin.client.startDeal()',
                                error: e
                            });
                        });
                    }
                    sDeal();

                })
                .catch((e) => {
                    logger.error(e);
                    return res.status(500).send({
                        location: 'filecoin.client.dealPieceCID()',
                        error: e
                    });
                });

            })
            .catch((e) => {
                logger.error(e);
                return res.status(500).send({
                    location: 'filecoin.client.import()',
                    error: e
                });
            });

        })
        .catch((err) => {
            logger.error(err);
            return res.status(500).send({
                location: 'ipfs.add()',
                error: err
            });
        });
    });
}

function pinIPFS(ipfs, cid) {
    ipfs.pin.add(cid).catch((err) => {
        logger.error("Couldn't pin file.");
    });
}

function handleDownload(req, res, ipfs) {
    let fname = req.query.cid;
    let dataid = req.query.dataid;

    if (fname) {
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
            for (c of buffer) {
                res.write(c);
            }
            res.end();
        });

        return 0;
    }

    res.status(404).json({
        code: 1400,
        message: "Resource is not found on the JACKAL system. This is most likely because the data has not been pinned to any IPFS nodes, and it has not been pushed to Filecoin. If you know for sure it has been, please contact the JACKAL team."
    });
}

function getTopNodes(secretjs, total) {
    return new Promise((resolve, reject) => {
        let msg = {
            get_node_list: {
                size: total
            }
        };
        secretjs.queryContractSmart(process.env.CONTRACT, msg).then((res) => {
            resolve(JSON.parse(Buffer.from(res.data, "base64").toString()));
        });
    })

}

function startEndPoints(ipfs, signingPen) {

    let args = process.argv;

    const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
    const accAddress = pubkeyToAddress(pubkey, 'secret');
    const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();

    const secretjs = new SigningCosmWasmClient(
        process.env.SECRET_REST_URL,
        accAddress,
        (signBytes) => signingPen.sign(signBytes),
        txEncryptionSeed, customFees
    );

    getTopNodes(secretjs, 10)
    .then((data) => {
        ipfs.swarm.localAddrs()
        .then((multiaddrs) => {
            for (const i of data) {
                for(const ad of multiaddrs) {
                    let url = 'https://' + i + '/connectIPFS?address=' + ad.toString();
                    axios.get(url)
                    .then((r) => {
                        logger.debug(r.status);
                    })
                    .catch((err) => {
                        logger.debug("Couldn't reach the external node.");
                    });
                }
            }

        })
        .catch((err) => {
            logger.error(err);
        });
        logger.info(JSON.stringify(data));
    });

    let reward_blocks = {};

    app.use(CORS());

    filecoin.endpoint = process.env.RPC_ENDPOINT;

    app.post('/finish_upload', upload.none(), (req, res) => {

        let pkey = req.body.pkey;

        let block = reward_blocks[pkey];

        let msg = {
            claim_reward: {
                address: block.address,
                key: block.key,
                path: pkey
            }
        };
        res.status(200).json({status: 'OK'});

        secretjs.execute(process.env.CONTRACT, msg).then((res) => {
            delete reward_blocks[pkey];
            
        }).catch((err) => {
        });
    });

    app.post('/upload', upload.single('upload_file'), (req, res) => {
        return handleUpload(req, res, ipfs, secretjs, reward_blocks);
    });

    app.get('/pinipfs', (req, res) => {
        pinIPFS(ipfs, req.query.cid);

        return res.sendStatus(200);
    });

    app.get('/connectIPFS', (req, res) => {
        let adrr = req.query.address;
        ipfs.swarm.connect(adrr).then((response) => {
        }).catch((err) => {
            logger.debug("Couldn't join swarm.");
        });
        
        return res.sendStatus(200);
    });

    app.get('/balance', (req, res) => {
        filecoin.wallet.defaultAddress().then((address) => {
            filecoin.wallet.balance(address.result).then((d) => {
                let b = d.result;
                let bal = parseFloat(b) / 1000000000000000000;
                return res.json({
                    code: 1000,
                    FILBalance: bal
                });
            });
        });
    });

    app.get('/listImports', (req, res) => {
        filecoin.client.listImports().then((d) => {
            d.code = 1000;
            return res.json(d);
        });
    });

    app.get('/listDeals', (req, res) => {
        filecoin.client.listDeals().then((d) => {
            d.code = 1000;
            return res.json(d);
        });
    });

    app.get('/lotus_version', (req, res) => {
        filecoin.version().then((d) => {
            d.result.code = 1000;
            return res.json(d.result);
        });
    });

    app.get('/status', (req, res) => {
        return res.json({
            code: 1000,
            status: "online"
        });
    });

    app.get('/ipfs', (req, res) => {
        ipfs.swarm.addrs().then((data) => {
            res.send(data);
        });
    });

    app.get('/queryContract', (req, res) => {

        let query = "e";
        let txt = process.env.REST_API + '/wasm/contract/' + process.env.CONTRACT + '/query/' + query;


        axios.get(txt).then((data) => {
            res.send(data);
        }).catch((err) => {
            logger.error(err);
            res.status(500).json({
                code: 1501,
                message: "Error querying contract for public data. Please try again later, the REST API provider could just be down."
            });
        })
    });

    app.get('/download', (req, res) => {

        handleDownload(req, res, ipfs);

    });

    app.get('/docs', (req, res) => {

        res.redirect('https://jackal-wiki.notion.site/JACKAL-API-576a08f446f0488589607c73bfb8552e');

    });

    let httpServer = http.createServer(app);

    // httpsServer.listen(8080);
    httpServer.listen(port, () => {
        let s1 = '    __   ______   ______   __  __   ______   __        ';
        let s2 = '   /\\ \\ /\\  __ \\ /\\  ___\\ /\\ \\/ /  /\\  __ \\ /\\ \\       ';
        let s3 = '  _\\_\\ \\\\ \\  __ \\\\ \\ \\____\\ \\  _"-.\\ \\  __ \\\\ \\ \\____  ';
        let s4 = ' /\\_____\\\\ \\_\\ \\_\\\\ \\_____\\\\ \\_\\ \\_\\\\ \\_\\ \\_\\\\ \\_____\\ ';
        let s5 = ' \\/_____/ \\/_/\\/_/ \\/_____/ \\/_/\\/_/ \\/_/\\/_/ \\/_____/ ';

        logger.info("Starting up: \n\t" + s1 + "\n\t" + s2 + "\n\t" + s3 + "\n\t" + s4 + "\n\t" + s5 + "\n.");

        logger.info(`Now listening at https://localhost:${port}`);

        logger.info(`Client's Secret address is ${accAddress}`);

    });

}

function main() {

    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                logger.myformat
            ),
        }));
    }

    const node = IPFS.create({host: "ipfs-jkl", port: "5001"});

    const mnemonic = process.env.MNEMONIC;
    const signingPen = Secp256k1Pen.fromMnemonic(mnemonic).then((signingPen) => {
        startEndPoints(node, signingPen);
    });
}



main();
