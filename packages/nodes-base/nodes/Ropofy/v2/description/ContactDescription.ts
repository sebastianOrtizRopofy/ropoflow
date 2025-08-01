import type { INodeProperties } from 'n8n-workflow';

import {
	addCustomFieldsPreSendAction,
	addLocationIdPreSendAction,
	addNotePostReceiveAction,
	splitTagsPreSendAction,
	validEmailAndPhonePreSendAction,
	contactSearchPreSendAction,
	ropofyApiSearchPagination,
} from '../GenericFunctions';

// --- PRUEBA MÍNIMA DE PAGINACIÓN PERSONALIZADA ---
export async function testPagination(this: any, requestData: any): Promise<any[]> {
	console.log('¡Paginación personalizada ejecutada!');
	return [];
}

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'create',
				routing: {
					request: {
						method: 'POST',
						url: '/contacts/upsert/',
					},
					send: {
						preSend: [
							validEmailAndPhonePreSendAction,
							splitTagsPreSendAction,
							addLocationIdPreSendAction,
							addCustomFieldsPreSendAction,
						],
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
								},
							},
							addNotePostReceiveAction,
						],
					},
				},
				action: 'Create or update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contacts/{{$parameter.contactId}}/',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/{{$parameter.contactId}}/',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
								},
							},
						],
					},
				},
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/',
					},
					send: {
						preSend: [addLocationIdPreSendAction],
						paginate: true,
					},
				},
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/contacts/{{$parameter.contactId}}/',
					},
					send: {
						preSend: [
							validEmailAndPhonePreSendAction,
							splitTagsPreSendAction,
							addLocationIdPreSendAction,
						],
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
								},
							},
						],
					},
				},
				action: 'Update a contact',
			},
			{
				name: 'Search Contacts',
				value: 'search',
				routing: {
					request: {
						method: 'POST',
						url: '=/contacts/search',
					},
					send: {
						preSend: [contactSearchPreSendAction],
					},
				},
				action: 'Search contacts con filtros avanzados',
			},
		],
		default: 'create',
	},
];

export const contactNotes: INodeProperties[] = [
	{
		displayName:
			'Create a new contact or update an existing one if email or phone matches (upsert)',
		name: 'contactCreateNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
	},
];

const customFields: INodeProperties = {
	displayName: 'Custom Fields',
	name: 'customFields',
	placeholder: 'Add Field',
	type: 'fixedCollection',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			name: 'values',
			displayName: 'Value',
			values: [
				{
					displayName: 'Field Name or ID',
					name: 'fieldId',
					required: true,
					type: 'resourceLocator',
					default: '',
					description: 'Choose from the list, or specify an ID using an expression',
					modes: [
						{
							displayName: 'List',
							name: 'list',
							type: 'list',
							typeOptions: {
								searchListMethod: 'searchCustomFields',
								searchable: true,
							},
						},
						{
							displayName: 'ID',
							name: 'id',
							type: 'string',
							placeholder: 'Enter Custom Field ID',
						},
					],
				},
				{
					displayName: 'Field Value',
					name: 'fieldValue',
					type: 'string',
					default: '',
					routing: {
						send: {
							type: 'body',
							property: 'customFields',
							value:
								'={{ $parent.values.map(field => ({ fieldId: { id: field.fieldId.id }, field_value: field.fieldValue })) }}',
						},
					},
				},
			],
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'customFields',
		},
	},
};

const createProperties: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		description: 'Email or Phone are required to create contact',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'email',
			},
		},
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description:
			'Phone or Email are required to create contact. Phone number has to start with a valid <a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes">country code</a> leading with + sign.',
		placeholder: '+491234567890',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'phone',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address1',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'address1',
					},
				},
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'city',
					},
				},
			},
			customFields,
			{
				displayName: 'Do Not Disturb',
				name: 'dnd',
				description:
					'Whether automated/manual outbound messages are permitted to go out or not. True means NO outbound messages are permitted.',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'dnd',
					},
				},
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'firstName',
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'lastName',
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: 'e.g. John Deo',
				description:
					"The full name of the contact, will be overwritten by 'First Name' and 'Last Name' if set",
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'postalCode',
					},
				},
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				placeholder: 'e.g. Public API',
				routing: {
					send: {
						type: 'body',
						property: 'source',
					},
				},
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'state',
					},
				},
			},
			{
				displayName: 'Note',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				hint: 'Comma separated list of tags, array of strings can be set in expression',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				placeholder: 'Select Timezone',
				type: 'resourceLocator',
				default: '',
				description: 'Choose from the list, or specify a timezone using an expression',
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchTimezones',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'Enter Timezone ID',
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'timezone',
					},
				},
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'website',
					},
				},
			},
		],
	},
];

const updateProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address1',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'address1',
					},
				},
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'city',
					},
				},
			},
			customFields,
			{
				displayName: 'Do Not Disturb',
				name: 'dnd',
				description:
					'Whether automated/manual outbound messages are permitted to go out or not. True means NO outbound messages are permitted.',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'dnd',
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'email',
					},
				},
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'firstName',
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'lastName',
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				description:
					"The full name of the contact, will be overwritten by 'First Name' and 'Last Name' if set",
				default: 'e.g. John Deo',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description:
					'Phone number has to start with a valid <a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes">country code</a> leading with + sign',
				placeholder: '+491234567890',
				routing: {
					send: {
						type: 'body',
						property: 'phone',
					},
				},
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'postalCode',
					},
				},
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'state',
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				hint: 'Comma separated list of tags, array of strings can be set in expression',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				placeholder: 'Select Timezone',
				type: 'resourceLocator',
				default: '',
				description: 'Choose from the list, or specify a timezone using an expression',
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchTimezones',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'Enter Timezone ID',
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'timezone',
					},
				},
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'website',
					},
				},
			},
		],
	},
];

const deleteProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		default: '',
	},
];

const getProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		default: '',
	},
];

const getAllProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Delay Pagination (ms)',
		name: 'delayPagination',
		type: 'number',
		default: 0,
		description: 'Delay in milliseconds between paginated requests',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Query will search on these fields: Name, Phone, Email, Tags, and Company Name',
				routing: {
					send: {
						type: 'query',
						property: 'query',
					},
				},
			},
			// NUEVOS CAMPOS DE FECHA Y CHECKS
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Fecha de inicio para filtrar contactos (formato ISO)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Fecha de fin para filtrar contactos (formato ISO)',
			},
			{
				displayName: 'Filtrar por fecha de creación (dateAdded)',
				name: 'filterByDateAdded',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Filtrar por fecha de actualización (dateUpdated)',
				name: 'filterByDateUpdated',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Descending',
						value: 'desc',
					},
					{
						name: 'Ascending',
						value: 'asc',
					},
				],
				default: 'desc',
				routing: {
					send: {
						type: 'query',
						property: 'order',
					},
				},
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Date Added',
						value: 'date_added',
					},
					{
						name: 'Date Updated',
						value: 'date_updated',
					},
				],
				default: 'date_added',
				routing: {
					send: {
						type: 'query',
						property: 'sortBy',
					},
				},
			},
		],
	},
];

const searchProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: ropofyApiSearchPagination,
			},
		},
	},
	{
		displayName: 'Page Limit',
		name: 'pageLimit',
		type: 'number',
		default: 20,
		required: true,
		description: 'Number of results per page',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		placeholder: 'Add Filter',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Field to filter by (e.g. firstNameLowerCase, dnd, etc.)',
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						options: [
							{ name: 'Contains', value: 'contains' },
							{ name: 'Equals', value: 'eq' },
							{ name: 'Greater Than', value: 'gt' },
							{ name: 'In', value: 'in' },
							{ name: 'Less Than', value: 'lt' },
							{ name: 'Not Equals', value: 'ne' },
							{ name: 'Range', value: 'range' },
						],
						default: 'eq',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value for the filter (for range, use JSON: {"gt":..., "lt":...})',
					},
				],
			},
			{
				name: 'group',
				displayName: 'Group',
				values: [
					{
						displayName: 'Group Operator',
						name: 'group',
						type: 'options',
						options: [
							{ name: 'AND', value: 'AND' },
							{ name: 'OR', value: 'OR' },
						],
						default: 'AND',
					},
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'json',
						default: '',
						description: 'Array of filters or groups (JSON)',
					},
				],
			},
		],
	},
	{
		displayName: 'Date Filters',
		name: 'dateFilters',
		type: 'collection',
		placeholder: 'Add Date Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Start date for filtering (ISO format)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'End date for filtering (ISO format)',
			},
			{
				displayName: 'Filter By Created Date (Date Added)',
				name: 'filterByDateAdded',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Filter By Updated Date (Date Updated)',
				name: 'filterByDateUpdated',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'sort',
				displayName: 'Sort',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						default: 'desc',
					},
				],
			},
		],
	},
];

const lookupProperties: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		description:
			'Lookup Contact by Email. If Email is not found it will try to find a contact by phone.',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['lookup'],
			},
		},
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description:
			'Lookup Contact by Phone. It will first try to find a contact by Email and than by Phone.',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['lookup'],
			},
		},
		default: '',
	},
];

export const contactFields: INodeProperties[] = [
	...createProperties,
	...updateProperties,
	...deleteProperties,
	...getProperties,
	...searchProperties, // <-- Ahora antes
	...getAllProperties, // <-- Ahora después
	...lookupProperties,
];
