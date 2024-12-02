import { Action } from "@openhps/rdf";
import { NodeID } from "./DHTNode";
import { RemoteDHTNode } from "./RemoteDHTNode";
import { RDFNode } from "./RDFNode";
import { Container, Collection } from "@openhps/solid";

export class RemoteRDFNode extends RemoteDHTNode implements RDFNode {
    actionContainer: Container;
    treeCollection: Collection;
    
    addNode(nodeID: NodeID): Promise<void> {
        throw new Error("Method not implemented.");
    }

    removeNode(nodeID: NodeID): Promise<void> {
        throw new Error("Method not implemented.");
    }

    store(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {

        });
    }

    hasValue(key: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Access the online sources to determine if the collection contains the data

        });
    }

    findValue(key: number): Promise<string[]> {
        throw new Error("Method not implemented.");
    }

    ping(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    protected createAction<T extends Action>(action: T): Promise<T> {
        return new Promise((resolve, reject) => {
            resolve(action);
        });
    }
}
