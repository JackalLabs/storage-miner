import {FeeDetails} from "./IFeeDetails";

export interface Fees {
    exec: FeeDetails,
    init: FeeDetails,
    send: FeeDetails,
    upload: FeeDetails
}
