import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { RopofyV1 } from './v1/RopofyV1.node';
import { RopofyV2 } from './v2/RopofyV2.node';

export class Ropofy extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Ropofy',
			name: 'ropofy',
			icon: 'file:ropofy.svg',
			group: ['transform'],
			defaultVersion: 2,
			description: 'Consume Ropofy API',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new RopofyV1(baseDescription),
			2: new RopofyV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
