import {exec} from 'child_process'
import * as os from 'os'
import {Response} from "express";
import Logger from "./logger";
import MFile from "@/interfaces/IMFile";
import CIDs from "cids";
import Axios from "axios";
import {IPFSHTTPClient} from "ipfs-http-client";
import SecretContract from "@/helpers/contractFuncs";
import ProcessIpfsAddResult from "@/interfaces/IProcessIpfsAddResult";

let ticker = 0

export function harvest (stream: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
    return new Promise(async (resolve, reject) => {
        const arr = []
        try {
            for await (const chunk of stream) {
                arr.push(chunk)
            }
            resolve(arr)
        } catch (err) {
            reject(err)
        }
    })
}

export function handleError (notice: string, err: Error, jcode?: number, res?: Response): void {
    Logger.info(notice)
    Logger.error(err)
    if (jcode && res) {
        res.status(Number(`${jcode.toString()[0]}00`))
            .json({jcode, status: notice})
    } else {
        // do nothing
    }
}

export async function readFileArrayBuffer (file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as ArrayBuffer || new ArrayBuffer(0)
            resolve(result)
        }
        reader.onerror = reject;
        reader.readAsArrayBuffer(file)
    })
}

export function checkCache () {
    const limit = 1000
    if (ticker < limit) {
        ticker++
    } else {
        const cmd = `find ${os.tmpdir()} -mmin +10 -fype f -iname "*.jkl" -delete`
        execPromised(cmd)
            .catch(err => console.error(err))
        ticker = 0
    }
}

export function processIpfsAdd (ipfsNode: IPFSHTTPClient, scrt: SecretContract, file: MFile | File): Promise<ProcessIpfsAddResult> {
    return ipfsNode.add(file)
        .then(rawCid => new CIDs(rawCid.path).toV1().toBaseEncodedString("base32"))
        .then(cid => {
            scrt.topNodes(20)
                .then(nodes => {
                    nodes.forEach(node => {
                        if (node === process.env.JKL_NODE_PUBLIC_ADDRESS) {
                            return true
                        } else {
                            Axios.get(`https://${node}/pinipfs?cid=${cid}`)
                                .then(resp => {
                                    Logger.info(`${node} response: ${resp.data.jcode}`)
                                })
                                .catch((err) => {
                                    handleError(`Couldn't reach ${node}`, err)
                                })
                        }
                    })
                })
            return {cid, dataId: 'tbd'}
        })
}

// internals
function execPromised (cmd: string) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err)
            } else {
                resolve({
                    stdout,
                    stderr
                })
            }
        })

    })
}