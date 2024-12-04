import { Action, IriString, schema } from "@openhps/rdf";
import { NodeID } from "./DHTNode";
import { RemoteDHTNode } from "./RemoteDHTNode";
import { RDFNode } from "./RDFNode";
import { Container } from "@openhps/solid";
import { SerializableArrayMember, SerializableMember, SerializableObject } from "@openhps/core";
import { ldht } from "../terms";
import { DHTRDFNetwork } from "../services/DHTRDFNetwork";
import { LDHTAction } from "./LDHTAction";

@SerializableObject({
    rdf: {
        type: ldht.Node
    }
})
export class RemoteRDFNode extends RemoteDHTNode implements RDFNode {
    @SerializableMember({
        rdf: {
            identifier: true
        }
    })
    uri: IriString;
    @SerializableArrayMember(LDHTAction, {
        rdf: {
            predicate: schema.potentialAction,
        }
    })
    actions: LDHTAction[];
    network: DHTRDFNetwork;

    addNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
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
        return new Promise((resolve, reject) => {
            // Find the key in the collection online
            fetch(this.uri).then((response) => {
                return response.text();
            }).catch(reject);
        });
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    protected createAction<T extends Action>(action: T): Promise<T> {
        return new Promise((resolve, reject) => {
            resolve(action);
        });
    }
}
