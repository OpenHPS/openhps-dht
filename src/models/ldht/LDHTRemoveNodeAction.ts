import { SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
import { LDHTAction } from './LDHTAction';
import { IriString, schema } from '@openhps/rdf';

@SerializableObject({
    rdf: {
        type: ldht.RemoveNodeAction,
    },
})
export class LDHTRemoveNodeAction extends LDHTAction {
    type: IriString = ldht.RemoveNodeAction;

    @SerializableMember({
        rdf: {
            predicate: schema.object,
        },
    })
    object: IriString;
}
