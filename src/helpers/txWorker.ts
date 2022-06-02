import {parentPort} from "worker_threads";

import SecretContract from "./contractFuncs";
import {handleError} from "./utils";

import RewardBlock from "../interfaces/IRewardBlock";

const scrt = new SecretContract()

if (parentPort) {
    const parent = parentPort

    parent.on('message', (block: RewardBlock) => {
        scrt.claimRewards(block)
            .then(() => {
                parent.postMessage(block.path)
            })
            .catch((err) => {
                handleError('Worker invalid scrt session', err)
            })
    })
}
