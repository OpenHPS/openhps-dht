import { DHTNode } from "./DHTNode";
import { IriString } from "@openhps/rdf";
import { LDHTAction } from "./LDHTAction";

export interface RDFNode extends DHTNode {
    uri: IriString;
    actions: LDHTAction[];
}
