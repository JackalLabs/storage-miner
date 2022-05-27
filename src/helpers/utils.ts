import {exec} from 'child_process'
import * as os from 'os'
import {Response} from "express";
import Logger from "./logger";

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