import { SerializableObject } from "@openhps/core";
import { ldht } from "../terms";
import { LDHTAction } from "./LDHTAction";

@SerializableObject({
    rdf: {
        type: ldht.AddNodeAction
    }
})
export class LDHTAddNodeAction extends LDHTAction {
    
}
