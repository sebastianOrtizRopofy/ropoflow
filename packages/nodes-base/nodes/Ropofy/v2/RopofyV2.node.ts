import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeProperties,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { calendarFields, calendarOperations } from './description/CalendarDescription';
import { contactFields, contactNotes, contactOperations } from './description/ContactDescription';
import { conversationOperations, conversationFields } from './description/ConversationDescription';
import { messageOperations, messageFields } from './description/MessageDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { taskFields, taskOperations } from './description/TaskDescription';
import {
	getContacts,
	getPipelines,
	getPipelineStages,
	getUsers,
	ropofyApiPagination,
} from './GenericFunctions';

console.log('[Ropofy][DEBUG] RopofyV2.node.ts loaded');

const resources: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Calendar',
				value: 'calendar',
			},
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Conversation',
				value: 'conversation',
			},
			{
				name: 'Message',
				value: 'message',
			},
			{
				name: 'Opportunity',
				value: 'opportunity',
			},
			{
				name: 'Task',
				value: 'task',
			},
		],
		default: 'contact',
		required: true,
	},
];

const versionDescription: INodeTypeDescription = {
	displayName: 'Ropofy',
	name: 'ropofy',
	icon: 'file:ropofy.svg',
	group: ['transform'],
	version: 2,
	description: 'Consume Ropofy API v2',
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	defaults: {
		name: 'Ropofy',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'ropofyOAuth2Api',
			required: true,
		},
	],
	requestDefaults: {
		baseURL: 'https://services.leadconnectorhq.com',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Version: '2021-07-28',
		},
	},
	requestOperations: {
		pagination: ropofyApiPagination,
	},
	properties: [
		...resources,
		...contactOperations,
		...contactNotes,
		...contactFields,
		...opportunityOperations,
		...opportunityFields,
		...taskOperations,
		...taskFields,
		...calendarOperations,
		...calendarFields,
		...conversationOperations,
		...conversationFields,
		...messageOperations,
		...messageFields,
	],
};

export class RopofyV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		console.log('[Ropofy][DEBUG] RopofyV2 node loaded');
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			getPipelines,
			getContacts,
			getPipelineStages,
			getUsers,
		},
		listSearch: {
			async searchCustomFields(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const { locationId } =
					((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

				const responseData: IDataObject = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'ropofyOAuth2Api',
					{
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						url: `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Version: '2021-07-28',
						},
					},
				)) as IDataObject;

				const customFields = responseData.customFields as Array<{ name: string; id: string }>;

				const results: INodeListSearchItems[] = customFields
					.map((a) => ({
						name: a.name,
						value: a.id,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results };
			},
			async searchTimezones(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const { locationId } =
					((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

				const responseData: IDataObject = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'ropofyOAuth2Api',
					{
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						url: `https://services.leadconnectorhq.com/locations/${locationId}/timezones`,
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Version: '2021-07-28',
						},
					},
				)) as IDataObject;

				const timezones = responseData.timeZones as string[];

				const results: INodeListSearchItems[] = timezones
					.map((zone) => ({
						name: zone.trim(),
						value: zone.trim(),
					}))
					.filter((zone) => !filter || zone.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results };
			},
		},
	};
}
