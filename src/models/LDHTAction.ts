import { SerializableMember, SerializableObject } from "@openhps/core";
import { IriString, schema } from "@openhps/rdf";
import { ldht } from "../terms";

@SerializableObject({
    rdf: {
        type: schema.Action,
    },
})
export class LDHTAction {
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
}

export class ActionStatus {
    static readonly CompletedActionStatus = schema.CompletedActionStatus;
    static readonly FailedActionStatus = schema.FailedActionStatus;
    static readonly ActiveActionStatus = schema.ActiveActionStatus;
    static readonly PotentialActionStatus = schema.PotentialActionStatus;
}
