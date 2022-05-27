import {config} from "dotenv";
import Express from "express";
import * as os from "os";
import Multer from "multer";
import Axios from "axios";
import Winston, {format} from "winston";
import * as IPFS from "ipfs-http-client";
import CIDs from "cids";
import CORS from "cors";
import Dingo from "dingojs";
import {Worker} from "worker_threads";

import Logger, {myformat} from "./logger";
import RewardBlock from "./interfaces/IRewardBlock";
import BlockBundle from "./interfaces/IBlockBundle";
import {checkCache, handleError, harvest} from "./helpers/utils";
import SecretContract from "./helpers/contractFuncs";

if (process.env.JKL_NODE_ENV !== 'production') {
    Logger.add(new Winston.transports.Console({
        format: format.combine(
            format.colorize(),
            myformat
        ),
    }))
}

config()
const jklNodePort = process.env.PORT || 3000;

const app = Express();
app.use(CORS());

const grumpy = new Worker(__dirname + '/helpers/TxWorker.js')

const filecoin = new Dingo(process.env.FIL_RPC_ENDPOINT || '', process.env.AUTH_TOKEN || '');
const ipfsNode = IPFS.create({host: process.env.IPFS_HOST || '', port: 5001});
const scrt = new SecretContract()
const reward_blocks: BlockBundle = {}

const storage = Multer.diskStorage({
    destination: os.tmpdir(),
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

const upload = Multer({
    storage: storage
});

//prev secretjs


app.get('/', (req, res) => {
    return res.status(200).json({
        jcode: 2000,
        status: "online"
    });
});
app.get('/docs', (req, res) => {
    const url = 'https://jackal-wiki.notion.site/JACKAL-API-576a08f446f0488589607c73bfb8552e'
    res.redirect(url);
});
app.get('/connectIPFS', (req, res) => {
    ipfsNode.swarm.connect(req.query.address as string || '')
        .then(() => res.status(200).json({jcode: 2000, status: 'OK'}))
        .catch((err) => {
            handleError(`Couldn't join swarm.`, err, 5050, res)
        });
});
app.get('/ipfs', (req, res) => {
    ipfsNode.swarm.addrs()
        .then((data) => {
            res.status(200).json({data, jcode: 1001});
        });
});
app.get('/pinipfs', (req, res) => {
    ipfsNode.pin.add(req.query.cid as string || '')
        .then(() => {
            return res.status(200).json({jcode: 1010, status: 'Success'})
        })
        .catch((err) => {
            handleError(`Couldn't pin file.`, err, 5051, res)
        });
});

app.get('/lotus_version', (req, res) => {
    filecoin.version()
        .then(resp => {
            // @ts-ignore todo
            res.status(200).json({data: resp.result, jcode: 1002})
        })
});
app.get('/balance', async (req, res) => {
    const increments = 1000000000000000000

    const addressRes = await filecoin.wallet.defaultAddress()
    const balanceRes = await filecoin.wallet.balance(addressRes.result)
    const safeNum = Number(balanceRes.result)
    const balance = parseFloat(safeNum.toString()) / increments

    return res.status(200).json({
        jcode: 2000,
        data: {
            FILBalance: balance
        }
    });
});
app.get('/listImports', (req, res) => {
    // todo
    filecoin.client.listImports('')
        .then((resp: any) => {
            res.status(200).json({
                data: resp.result,
                jcode: 2000
            })
        });
});
app.get('/listDeals', (req, res) => {
    // todo
    filecoin.client.listDeals('')
        .then((resp: any) => {
            res.status(200).json({
                data: resp.result,
                jcode: 2000
            })
        });
});
app.get('/queryContract', (req, res) => {
    let query = "e";
    let url = [
        process.env.REST_API,
        '/wasm/contract/',
        process.env.CONTRACT,
        '/query/',
        query
    ].join('')

    Axios({url})
        .then((resp) => {
            res.status(200).json({
                data: resp.data.result,
                jcode: 2000
            })
        })
        .catch((err) => {
            Logger.error(err);
            res.status(500).json({
                jcode: 5501,
                message: "Error querying contract for public data. Please try again later, the REST API provider could just be down."
            });
        })
});

app.get('/download', (req, res) => {
    let {cid, dataid} = req.query
    cid = cid && cid.toString() || ''
    dataid = dataid && dataid.toString() || ''

    if (cid) {
        const stream = ipfsNode.cat(cid)
        harvest(stream)
            .then(dataArr => {
                res.status(200)
                for (const data of dataArr) {
                    res.write(data)
                }
                res.end()
            })
    } else if (dataid) {
        // todo
        // filecoin goes here
    } else {
        res.status(404).json({
            jcode: 4400,
            message: "Resource is not found on the JACKAL system. This is most likely because the data has not been pinned to any IPFS nodes, and it has not been pushed to Filecoin. If you know for sure it has been, please contact the JACKAL team."
        });
    }
});

app.post('/upload', upload.single('upload_file'), (req, res) => {
    const miners = ["t01000"]
    const {file} = req

    const block: RewardBlock = {
        address: req.body.address,
        key: req.body.skey
    }
    reward_blocks[req.body.pkey] = block
    // todo convert to .fields() for Multer
    // todo figure out miners
    if (file?.buffer) {
        ipfsNode.add(file.buffer)
            .then(rawCid => {
                const v1Cid = new CIDs(rawCid.path).toV1().toBaseEncodedString("base32")
                const jsonRes = {
                    cid: v1Cid,
                    miners: miners,
                    dataId: "empty",
                    node: process.env.JKL_NODE_PUBLIC_ADDRESS
                }

                scrt.topNodes(20)
                    .then(nodes => {
                        nodes.forEach(node => {
                            if (node === process.env.JKL_NODE_PUBLIC_ADDRESS) {
                                return true
                            } else {
                                Axios.get(`https://${node}/pinipfs?cid=${v1Cid}`)
                                    .then(resp => {
                                        Logger.info(`${node} response: ${resp.data.jcode}`)
                                    })
                                    .catch((err) => {
                                        handleError(`Couldn't reach ${node}`, err)
                                    })
                            }
                        })
                        return res.send(jsonRes);
                    })
                    .catch(err => {
                        handleError('topNodes() aborted', err, 5152, res)
                    })
            })
            .catch(err => {
                handleError('IFPS Failure', err, 5151, res)
            })
    }
    checkCache()
});

app.post('/finish_upload', upload.none(), (req, res) => {
    const {pkey} = req.body
    const {address, key} = reward_blocks[pkey];

    let block = {
            address,
            key,
            path: pkey
        }

    grumpy.postMessage(block)
    grumpy.on('message', (pkey) => {
        delete reward_blocks[pkey]
        return res.status(200).json({jcode: 2020, status: 'OK'});

    })
});

app.listen(jklNodePort, () => {
    const fanceh = [
        'JKLNET',
        '    __   ______   ______   __  __   ______   __        ',
        '   /\\ \\ /\\  __ \\ /\\  ___\\ /\\ \\/ /  /\\  __ \\ /\\ \\       ',
        '  _\\_\\ \\\\ \\  __ \\\\ \\ \\____\\ \\  _"-.\\ \\  __ \\\\ \\ \\____  ',
        ' /\\_____\\\\ \\_\\ \\_\\\\ \\_____\\\\ \\_\\ \\_\\\\ \\_\\ \\_\\\\ \\_____\\ ',
        ' \\/_____/ \\/_/\\/_/ \\/_____/ \\/_/\\/_/ \\/_/\\/_/ \\/_____/ ',
        ''
    ].join('\n\t')

    Logger.info('Starting...')
    Logger.info(fanceh)
    Logger.info(`Now listening on port: ${jklNodePort}`);

})










// function handleUpload(req, res, ipfs, secretjs, rwb) {
//
//     let f = req.file;
//
//     let miners = ["t01000"];
//
//     let new_block = {
//         address: req.body.address,
//         key: req.body.skey
//     };
//
//     rwb[req.body.pkey] = new_block;
//
//
//     Fs.readFile(f.path, (err, data) => {
//         if (err) {
//             return res.status(500).send({
//                 location: 'fs.readFile()',
//                 error: e
//             });
//         }
//
//         ipfsNode.add(data)
//         .then((cid) => {
//
//             let cd = new CIDs(cid.path);
//             const v1Cid = cd.toV1().toBaseEncodedString("base32")
//             let jsonRes = {
//                 cid: v1Cid,
//                 miners: miners,
//                 dataId: "empty",
//                 node: process.env.PUBLIC_IP
//             };
//
//             getTopNodes(secretjs, 20)
//             .then((data) => {
//                 for (const i of data) {
//                     if(i == process.env.PUBLIC_IP){
//                         continue;
//                     }
//                     console.log(i);
//                     Axios.get('https://' + i + '/pinipfs?cid=' + v1Cid)
//                     .catch((err) => {
//                         Logger.info("Couldn't reach the external node.");
//                     });
//                 }
//             })
//             .catch((err) => {
//                 Logger.error(err);
//             });
//             return res.send(jsonRes);
//
//         })
//         .catch((err: Error) => {
//             Logger.error(err);
//             return res.status(500).send({
//                 location: 'ipfs.add()',
//                 error: err
//             });
//         });
//     });
// }
//
// function pinIPFS(ipfs, cid) {
//     ipfs.pin.add(cid).catch((err) => {
//         Logger.error("Couldn't pin file.");
//     });
// }
//
// function handleDownload(req, res, ipfs) {
//     let fname = req.query.cid;
//     let dataid = req.query.dataid;
//
//     if (fname) {
//         const stream = ipfs.cat(fname);
//
//         let f = function () {
//             return new Promise(async (resolve, reject) => {
//                 let buf = [];
//                 for await (const chunk of stream) {
//                     buf.push(chunk);
//                 }
//                 resolve(buf);
//             });
//         }
//
//         f().then((buffer) => {
//             for (c of buffer) {
//                 res.write(c);
//             }
//             res.end();
//         });
//
//         return 0;
//     }
//
//     res.status(404).json({
//         code: 1400,
//         message: "Resource is not found on the JACKAL system. This is most likely because the data has not been pinned to any IPFS nodes, and it has not been pushed to Filecoin. If you know for sure it has been, please contact the JACKAL team."
//     });
// }
//
// function getTopNodes(secretjs, total) {
//     return new Promise((resolve, reject) => {
//         let msg = {
//             get_node_list: {
//                 size: total
//             }
//         };
//         secretjs.queryContractSmart(process.env.CONTRACT, msg).then((res) => {
//             resolve(JSON.parse(Buffer.from(res.data, "base64").toString()));
//         }).catch((err) => {
//             Logger.error(err);
//         });
//     })
//
// }
//
// function startEndPoints(ipfs, signingPen, txqueue) {
//
//     let args = process.argv;
//
//     const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
//     const accAddress = pubkeyToAddress(pubkey, 'secret');
//     const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();
//
//     const secretjs = new SigningCosmWasmClient(
//         process.env.SECRET_REST_URL,
//         accAddress,
//         (signBytes) => signingPen.sign(signBytes),
//         txEncryptionSeed, CustomFees
//     );
//
//     getTopNodes(secretjs, 10)
//     .then((data) => {
//         ipfs.swarm.localAddrs()
//         .then((multiaddrs) => {
//             for (const i of data) {
//                 for(const ad of multiaddrs) {
//                     let url = 'https://' + i + '/connectIPFS?address=' + ad.toString();
//                     Axios.get(url)
//                     .then((r) => {
//                         Logger.debug(r.status);
//                     })
//                     .catch((err) => {
//                         Logger.debug("Couldn't reach the external node.");
//                     });
//                 }
//             }
//
//         })
//         .catch((err) => {
//             Logger.error(err);
//         });
//         Logger.info(JSON.stringify(data));
//     });
//
//     let reward_blocks = {};
//
//     let running = false;
//     setInterval(() => {
//         if(running == false){
//             if(txqueue.length > 0) {
//                 running = true;
//                 let m = txqueue.shift();
//
//                 secretjs.execute(process.env.CONTRACT, m.msg).then((res) => {
//                     running = false;
//                     delete reward_blocks[m.pkey];
//
//                 }).catch((err) => {
//                     running = false;
//                 });
//             }
//         }
//     }, 500);
//
//     app.use(CORS());
//
//
//
//     filecoin.endpoint = process.env.RPC_ENDPOINT;
//
//     app.post('/finish_upload', upload.none(), (req, res) => {
//
//         let pkey = req.body.pkey;
//
//         let block = reward_blocks[pkey];
//
//         let msg = {
//             claim_reward: {
//                 address: block.address,
//                 key: block.key,
//                 path: pkey
//             }
//         };
//
//         pushTXN(txqueue, msg, pkey);
//
//         return res.status(200).json({status: 'OK'});
//
//
//     });
//
//     app.post('/upload', upload.single('upload_file'), (req, res) => {
//         return handleUpload(req, res, ipfs, secretjs, reward_blocks);
//     });
//
//     app.get('/pinipfs', (req, res) => {
//         pinIPFS(ipfs, req.query.cid);
//
//         return res.status(200).json({status: 'OK'});
//     });
//
//     app.get('/connectIPFS', (req, res) => {
//         let adrr = req.query.address;
//         ipfs.swarm.connect(adrr).then((response) => {
//         }).catch((err) => {
//             Logger.info("Couldn't join swarm.");
//         });
//
//         return res.status(200).json({status: 'OK'});
//     });
//
//     app.get('/balance', (req, res) => {
//         filecoin.wallet.defaultAddress().then((address) => {
//             filecoin.wallet.balance(address.result).then((d) => {
//                 let b = d.result;
//                 let bal = parseFloat(b) / 1000000000000000000;
//                 return res.json({
//                     code: 1000,
//                     FILBalance: bal
//                 });
//             });
//         });
//     });
//
//     app.get('/listImports', (req, res) => {
//         filecoin.client.listImports().then((d) => {
//             d.code = 1000;
//             return res.json(d);
//         });
//     });
//
//     app.get('/listDeals', (req, res) => {
//         filecoin.client.listDeals().then((d) => {
//             d.code = 1000;
//             return res.json(d);
//         });
//     });
//
//     app.get('/lotus_version', (req, res) => {
//         filecoin.version().then((d) => {
//             d.result.code = 1000;
//             return res.json(d.result);
//         });
//     });
//
//     app.get('/', (req, res) => {
//         return res.json({
//             code: 1000,
//             status: "online"
//         });
//     });
//
//     app.get('/ipfs', (req, res) => {
//         ipfs.swarm.addrs().then((data) => {
//             res.send(data);
//         });
//     });
//
//     app.get('/queryContract', (req, res) => {
//
//         let query = "e";
//         let txt = process.env.REST_API + '/wasm/contract/' + process.env.CONTRACT + '/query/' + query;
//
//
//         Axios.get(txt).then((data) => {
//             res.send(data);
//         }).catch((err) => {
//             Logger.error(err);
//             res.status(500).json({
//                 code: 1501,
//                 message: "Error querying contract for public data. Please try again later, the REST API provider could just be down."
//             });
//         })
//     });
//
//     app.get('/download', (req, res) => {
//
//         handleDownload(req, res, ipfs);
//
//     });
//
//     app.get('/docs', (req, res) => {
//
//         res.redirect('https://jackal-wiki.notion.site/JACKAL-API-576a08f446f0488589607c73bfb8552e');
//
//     });
//
//     let httpServer = http.createServer(app);
//
//     // httpsServer.listen(8080);
//     httpServer.listen(jklNodePort, () => {
//         let s1 = '    __   ______   ______   __  __   ______   __        ';
//         let s2 = '   /\\ \\ /\\  __ \\ /\\  ___\\ /\\ \\/ /  /\\  __ \\ /\\ \\       ';
//         let s3 = '  _\\_\\ \\\\ \\  __ \\\\ \\ \\____\\ \\  _"-.\\ \\  __ \\\\ \\ \\____  ';
//         let s4 = ' /\\_____\\\\ \\_\\ \\_\\\\ \\_____\\\\ \\_\\ \\_\\\\ \\_\\ \\_\\\\ \\_____\\ ';
//         let s5 = ' \\/_____/ \\/_/\\/_/ \\/_____/ \\/_/\\/_/ \\/_/\\/_/ \\/_____/ ';
//
//         Logger.info("Starting up: \n\t" + s1 + "\n\t" + s2 + "\n\t" + s3 + "\n\t" + s4 + "\n\t" + s5 + "\n.");
//
//         Logger.info(`Now listening at https://localhost:${jklNodePort}`);
//
//         Logger.info(`Client's Secret address is ${accAddress}`);
//
//         console.log(`running on port: ${jklNodePort}`)
//     });
//
// }
//
// function pushTXN(queue, msg, pkey) {
//     queue.push({msg: msg, pkey: pkey});
// }
//
// function main() {
//
//     if (process.env.NODE_ENV !== 'production') {
//         Logger.add(new Winston.transports.Console({
//             format: format.combine(
//                 format.colorize(),
//                 Logger.myformat
//             ),
//         }));
//     }
//
//     const node = IPFS.create({host: "ipfs-jkl", port: "5001"});
//
//     let txnQueue = [];
//
//
//
//     const mnemonic = process.env.MNEMONIC;
//     const signingPen = Secp256k1Pen.fromMnemonic(mnemonic).then((signingPen) => {
//         startEndPoints(node, signingPen, txnQueue);
//     });
//
//
// }
//
//
//
// main();
