import {REFCODES} from "../api/constants";

export default function searchRefCodeByREfID(refID: string | null): string  {
    if (refID === null) return '';
    for (const [key, value] of Object.entries(REFCODES)) {
        if (value === refID) return key;
    }
    return refID;
}