import { SerializableMember, SerializableObject } from "@openhps/core";
import { ldht } from "../terms";
import { dcterms, IriString, schema } from "@openhps/rdf";

@SerializableObject({
    rdf: {
        type: ldht.Entry
    }
})
export class LDHTEntry {
    @SerializableMember({
        rdf: {
            predicate: dcterms.identifier,
            identifier: true
        }
    })
    identifier: number;

    @SerializableMember({
        rdf: {
            predicate: schema.value
        }
    })
    value: IriString;
}
