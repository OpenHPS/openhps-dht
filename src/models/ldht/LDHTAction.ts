import { NumberType, SerializableMember, SerializableObject } from '@openhps/core';
import { DataFactory, IriString, SerializableThing, Thing, schema } from '@openhps/rdf';
import { ldht } from '../../terms';

@SerializableObject({
    rdf: {
        type: schema.Action,
    },
})
export abstract class LDHTAction extends SerializableThing {
    type: IriString = schema.Action;

    @SerializableMember({
        rdf: {
            predicate: ldht.timeout,
        },
        numberType: NumberType.INTEGER
    })
    timeout?: number;

    @SerializableMember({
        rdf: {
            predicate: schema.actionStatus,
            serializer: (value: IriString) => DataFactory.namedNode(value),
            deserializer: (value: Thing) => value.value,
        },
    })
    actionStatus?: IriString;

    @SerializableMember({
        rdf: {
            predicate: schema.agent,
            serializer: (value: IriString) => DataFactory.namedNode(value),
            deserializer: (value: Thing) => value.value,
        },
    })
    agent?: IriString;

    @SerializableMember({
        rdf: {
            predicate: schema.target,
            serializer: (value: IriString) => DataFactory.namedNode(value),
            deserializer: (value: Thing) => value.value,
        },
    })
    target?: IriString;

    setTarget(target: IriString): this {
        this.target = target;
        return this;
    }
}

/**
 * Action status
 */
export class ActionStatus {
    static readonly CompletedActionStatus = schema.CompletedActionStatus;
    static readonly FailedActionStatus = schema.FailedActionStatus;
    static readonly ActiveActionStatus = schema.ActiveActionStatus;
    static readonly PotentialActionStatus = schema.PotentialActionStatus;
}
