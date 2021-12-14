const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const {NOISE, Noise} = require("@chainsafe/libp2p-noise");
const MPLEX = require('libp2p-mplex');
const process = require('process');
const DHT = require('libp2p-kad-dht');
const MulticastDNS = require('libp2p-mdns');
const Bootstrap = require('libp2p-bootstrap');
const crypto = require('libp2p-crypto');
const { CID } = require('multiformats/cid')


const ma = require('multiaddr');
const {multiaddr , Multiaddr, protocols, resolvers} = ma;

// const {LevelDatastore} = require('datastore-level');

// const datastore = new LevelDatastore('path/to/store');

let P2P = 
{
  name: "JACKAL NODE",
};

P2P.libmultiaddr = ma;
P2P.crypto = crypto;

P2P.buildNode = (genesis, peerId) => {
  return new Promise((resolve, reject) => {
  
      
      Libp2p.create({
        peerId: peerId,
        addresses: {
          // add a listen address (localhost) to accept TCP connections on a random port
          listen: ['/ip4/127.0.0.1/tcp/' + (genesis ? "50699" : "0")],
        },
        modules: {
          transport: [TCP],
          connEncryption: [NOISE],
          streamMuxer: [MPLEX],
          peerDiscovery: [MulticastDNS],
          dht: DHT,
        },
        config: {
          dht: {
            enabled: true,
          },
          peerDiscovery: {
            autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minConnections)
            // The `tag` property will be searched when creating the instance of your Peer Discovery service.
            // The associated object, will be passed to the service when it is instantiated.
            [Bootstrap.tag]: {
              enabled: true,
              list: [ // A list of bootstrap peers to connect to starting up the node
                "/ip4/127.0.0.1/tcp/50699/p2p/Qma2jQt2d2dbNANmaWjwfe5MGd4B7Git9sdpQU4WBq6jVP",
              ],
            }
          }
        }
      }).then((res) => {
        P2P.node = res;
        resolve();
      });
    });
}

P2P.start = (genesis = false, peerId=null) => {
  return new Promise((resolve, reject) => {

    P2P.buildNode(genesis = genesis, peerId = peerId).then(() => {

      P2P.node.start().then(() => {

        // print out listening addresses
        console.log('listening on addresses:')
        P2P.node.multiaddrs.forEach(addr => {
          console.log(`${addr.toString()}/p2p/${P2P.node.peerId.toB58String()}`);
        });
    
        const stop = () => {
          P2P.node.stop().then(() => {
            console.log('libp2p has stopped')
            process.exit(0);
          });
        }
    
        process.on('SIGTERM', stop);
        process.on('SIGINT', stop);

        resolve();
      });
      
  
  
    });
  });
  

  
}

module.exports = P2P;