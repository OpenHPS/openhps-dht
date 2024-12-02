import { Collection, Container } from "@openhps/solid";
import { DHTNode } from "./DHTNode";

export interface RDFNode extends DHTNode {
    actionContainer: Container;
    treeCollection: Collection;
}
