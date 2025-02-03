import { SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
import { dcterms, IriString, schema, SerializableThing } from '@openhps/rdf';

@SerializableObject({
    rdf: {
        type: ldht.Entry,
    },
})
export class LDHTEntry extends SerializableThing {
    @SerializableMember({
        rdf: {
            predicate: dcterms.identifier,
            identifier: true,
        },
    })
    identifier: number;

    @SerializableMember({
        rdf: {
            predicate: schema.value,
        },
    })
    value: IriString;
}
