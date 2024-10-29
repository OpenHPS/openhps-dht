import { NodeID } from "./DHTNode";
import { RemoteDHTNode } from "./RemoteDHTNode";

export class RemoteRDFNode extends RemoteDHTNode {
    
    addNode(nodeID: NodeID): Promise<void> {
        throw new Error("Method not implemented.");
    }
    removeNode(nodeID: NodeID): Promise<void> {
        throw new Error("Method not implemented.");
    }
    store(key: number, value: string | string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    hasValue(key: number): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    findValue(key: number): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    ping(): Promise<void> {
        throw new Error("Method not implemented.");
    }

}
