require("dotenv").config();
const axios = require('axios');

const RPC_ENDPOINT = 'http://172.17.0.2:7777/rpc/v0';

function postJSON(method, params = null) {
    return new Promise((resolve, reject) => {
        axios({
            method: 'post',
            url: RPC_ENDPOINT,
            data: {
                jsonrpc: "2.0",
                method: method,
                id: 1,
                params: params
            }
        }).then((res) => {
            resolve(res.data);
        }).catch((err) => {
            reject(err);
        });
    });
}


let Wallet = {};

Wallet.balance = () => {
    return new Promise((resolve, reject) => {
        postJSON(method="Filecoin.WalletBalance", params=["t1jdlfl73voaiblrvn2yfivvn5ifucwwv5f26nfza"]).then(resolve).catch(reject);
    });
};



let Client = {};

Client.import = (path) => {
    return new Promise((resolve, reject) => {
        postJSON(method="Filecoin.ClientImport", params=[{Path: path, IsCAR: true}]).then(resolve).catch(reject);
    });
}

let FileCoin = {client: Client, wallet: Wallet};

FileCoin.version = () => {
    return new Promise((resolve, reject) => {
        postJSON(method="Filecoin.Version").then(resolve).catch(reject);
    });
};


function test() {
    const fs = require('fs');
    const path = require('path');

   
    FileCoin.wallet.balance().then((res) => {
        console.log(res);
    });
    
    FileCoin.client.import(path.join(__dirname, '..', "testimg.png")).then((res) => {
        console.log(res);
    });

    

}

module.exports = FileCoin;

test();