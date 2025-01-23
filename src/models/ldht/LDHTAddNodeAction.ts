import { SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
import { LDHTAction } from './LDHTAction';
import { IriString } from '@openhps/rdf';

@SerializableObject({
    rdf: {
        type: ldht.AddNodeAction,
    },
})
export class LDHTAddNodeAction extends LDHTAction {
    type: IriString = ldht.AddNodeAction;
}
