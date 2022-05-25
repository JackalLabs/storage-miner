import {FeeAmount} from "./IFeeAmount";

export interface FeeDetails {
    amount: FeeAmount[],
    gas: string,
}
