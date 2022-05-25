const customFees = require('./helpers/fees')
const { logger } = require('./logger')

require('dotenv').config();

const {
    EnigmaUtils,
    Secp256k1Pen,
    SigningCosmWasmClient,
    pubkeyToAddress,
    encodeSecp256k1Pubkey
} = require("secretjs");

const {
    CONTRACT,
    MNEMONIC,
    PUBLIC_IP,
    SECRET_REST_URL
} = process.env;

async function init() {
    panic(CONTRACT, 'No CONTRACT Set')
    panic(MNEMONIC, 'No MNEMONIC Set')
    panic(PUBLIC_IP, 'No PUBLIC_IP Set')
    panic(SECRET_REST_URL, 'No SECRET_REST_URL Set')

    await Secp256k1Pen.fromMnemonic(MNEMONIC)
        .then((signingPen) => {
            const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
            const accAddress = pubkeyToAddress(pubkey, 'secret');
            const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();

            const secretjs = new SigningCosmWasmClient(
                SECRET_REST_URL,
                accAddress,
                (signBytes) => signingPen.sign(signBytes),
                txEncryptionSeed, customFees
            );

            let msg = {
                init_node: {
                    address: accAddress,
                    ip: PUBLIC_IP
                }
            };
            secretjs.execute(CONTRACT, msg)
                .then(() => logger.info('init() complete'))
                // .catch((err) => logger.error(err));
                .catch((err) => console.error(err));
    });
}

function panic(thing, msg) {
    if (!thing) {
        // logger.error(msg)
        console.error(msg)
        return process.exit(418)
    }
}

init()
