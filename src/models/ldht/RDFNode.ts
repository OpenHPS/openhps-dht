import { DHTNode } from '../DHTNode';
import { IriString } from '@openhps/rdf';
import { LDHTAction } from '.';

export interface RDFNode extends DHTNode {
    uri: IriString;
    actions: LDHTAction[];
    /**
     * URI where the data is stored
     */
    dataUri: IriString;
    /**
     * URI where the neigbouring nodes are stored
     */
    nodesUri: IriString;
}
