import Winston, {format} from "winston";

import Logger, {myformat} from "./helpers/logger";
import SecretContract from "./helpers/contractFuncs";

if (process.env.JKL_NODE_ENV !== 'production') {
    Logger.add(new Winston.transports.Console({
        format: format.combine(
            format.colorize(),
            myformat
        ),
    }))
}

const scrt = new SecretContract()

scrt.initNode({address: '', ip: process.env.JKL_NODE_PUBLIC_ADDRESS || ''})
    .then(() => {
        Logger.info('Genesis init() complete')
    })
