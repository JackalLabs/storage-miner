const p2p = require("./p2p");
const args = require('easyarguments').argHandler;
const PeerId = require('peer-id');

const key = new Uint8Array("current_active_node");

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

function strToUInt(str) {
    return new TextEncoder().encode(str);
}

function UIntToStr(arr) {
    return new TextDecoder().decode(arr);
}

function overwriteActive(p2p, val) {
    p2p.node.contentRouting.put(key, val, {minPeers: 0}).then(() => {
        console.log("success!");

        p2p.node.contentRouting.get(key).then((res) => {
            console.log(UIntToStr(res.val));
        }).catch((err) => {
    
        });
    }).catch((err) => {

    });

    
}

function openNode(gen, id, debug=true) {
    p2p.start(genesis=gen, peerId=id).then(() => {
        
        
    
        const val = strToUInt(id._idB58String);

        setTimeout(() => {
            p2p.node.contentRouting.get(key).then((res) => {
                console.log(res);
                console.log("success!");
            }).catch((err) => {
                console.log(err);
                console.log("Must be genesis run...");
                overwriteActive(p2p, val);
            });
        }, 10000);

        if(debug) {
            p2p.node.on('peer:discovery', (peerId) => {
                console.log(`Found peer ${peerId.toB58String()}`)
            });
            p2p.node.connectionManager.on('peer:connect', (connection) => {
                console.log(`Connected to ${connection.remotePeer.toB58String()}`)
            });
            p2p.node.connectionManager.on('peer:disconnect', (connection) => {
                console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
            });
        }

        
    });
}

function start(fields) {
    let gen = false;

    let peerId = '';

    if('k' in fields){
        gen = true;
        PeerId.createFromPrivKey(fields.k).then((id) => {
            openNode(gen, id);

        });
    }else{
        PeerId.create({ bits: 1024, keyType: 'RSA' }).then((id => {
            openNode(gen, id);
        }));
    }
}

function main() {
    args.addParameter('k', 'Supplies a private-key to use', ['pkey']);

    args.start(start);

}

main();