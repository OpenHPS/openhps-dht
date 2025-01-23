import { SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
import { LDHTAction } from './LDHTAction';
import { IriString, schema } from '@openhps/rdf';
import { LDHTEntry } from './LDHTEntry';

@SerializableObject({
    rdf: {
        type: ldht.StoreValueAction,
    },
})
export class LDHTStoreValueAction extends LDHTAction {
    type: IriString = ldht.StoreValueAction;

    @SerializableMember({
        rdf: {
            predicate: schema.object,
        },
    })
    object: LDHTEntry;
}
