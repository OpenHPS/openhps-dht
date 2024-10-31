import { SerializableMember, SerializableObject } from "@openhps/core";
import { IriString, SerializableThing, schema } from "@openhps/rdf";
import { ldht } from "../terms";

@SerializableObject({
    rdf: {
        type: schema.Action,
    },
})
export abstract class LDHTAction extends SerializableThing {
    type: IriString = schema.Action;

    @SerializableMember({
        rdf: {
            predicate: ldht.timeout
        }
    })
    timeout?: number;

    @SerializableMember({
        rdf: {
            predicate: schema.actionStatus
        }
    })
    actionStatus?: IriString;

    @SerializableMember({
        rdf: {
            predicate: schema.agent
        }
    })
    agent: IriString;
}

export class ActionStatus {
    static readonly CompletedActionStatus = schema.CompletedActionStatus;
    static readonly FailedActionStatus = schema.FailedActionStatus;
    static readonly ActiveActionStatus = schema.ActiveActionStatus;
    static readonly PotentialActionStatus = schema.PotentialActionStatus;
}
