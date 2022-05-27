import * as SecretJs from "secretjs";
import CustomFees from "./fees";
import {handleError} from "./utils";
import RewardBlock from "../interfaces/IRewardBlock";

export default class SecretContract {
    private session?: SecretJs.SigningCosmWasmClient

    constructor() {
        this.init()
    }

    private async init () {
        this.session = await this.createSession()
    }
    private async createSession (): Promise<SecretJs.SigningCosmWasmClient> {
        const pen = await SecretJs.Secp256k1Pen.fromMnemonic(process.env.SCRT_MNEMONIC || 'Missing SCRT_MNEMONIC');
        const pubkey = SecretJs.encodeSecp256k1Pubkey(pen.pubkey);

        return new SecretJs.SigningCosmWasmClient(
            process.env.SECRET_REST_URL || 'Missing SECRET_REST_URL',
            SecretJs.pubkeyToAddress(pubkey, 'secret'),
            (signBytes) => pen.sign(signBytes),
            SecretJs.EnigmaUtils.GenerateNewSeed(),
            CustomFees
        )
    }

    // contract routes
    topNodes (limit: number): Promise<string[]> {
        const msg = {
            get_node_list: { size: limit }
        }
        if (this.session) {
            return this.session.queryContractSmart(process.env.SCRT_CONTRACT || 'Missing SCRT_CONTRACT', msg)
                .then(res => {
                    return JSON.parse(Buffer.from(res.data, "base64").toString()) || []
                })
                .catch((err) => {
                    handleError('get_node_list failed', err)
                })
        } else {
            throw new Error('No Active Session')
        }
    }
    async claimRewards (claimBlock: RewardBlock): Promise<boolean> {
        const msg = {
            claim_reward: claimBlock
        }
        if (this.session) {
            await this.session.execute(process.env.SCRT_CONTRACT || 'Missing SCRT_CONTRACT', msg)
                .catch((err) => {
                    handleError('claim_reward failed', err)
                })
            return true
        } else {
            throw new Error('No Active Session')
        }
    }
}
