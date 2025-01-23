import { SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
import { LDHTAction } from './LDHTAction';
import { IriString } from '@openhps/rdf';

@SerializableObject({
    rdf: {
        type: ldht.RemoveNodeAction,
    },
})
export class LDHTRemoveNodeAction extends LDHTAction {
    type: IriString = ldht.RemoveNodeAction;
}
