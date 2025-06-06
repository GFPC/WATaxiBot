import { Context } from "../index";
import { MultiUsersRefCodes } from "../ServiceMap";

export default function searchRefCodeByREfID(
    refID: string | null,
    ctx: Context,
): string {
    if (refID === null) return "";
    for (const [key, value] of Object.entries(MultiUsersRefCodes[ctx.botID])) {
        if (value === refID) return key;
    }
    return refID;
}
