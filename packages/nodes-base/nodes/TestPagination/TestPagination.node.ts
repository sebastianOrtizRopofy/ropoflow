import type {
	INodeType,
	INodeTypeDescription,
	IExecutePaginationFunctions,
	INodeExecutionData,
	DeclarativeRestApiSettings,
} from 'n8n-workflow';

export async function testPagination(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	console.log('¡Paginación personalizada ejecutada en nodo de prueba!');
	console.log('URL recibida:', requestData.options.url);
	return [];
}

export class TestPagination implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Pagination',
		name: 'testPagination',
		group: ['transform'],
		version: 1,
		description: 'Nodo de prueba para paginación personalizada',
		defaults: {
			name: 'Test Pagination',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				routing: {
					send: {
						paginate: '={{ $value }}',
					},
					operations: {
						pagination: testPagination,
					},
				},
			},
		],
		routing: {
			request: {
				method: 'GET',
				url: 'https://jsonplaceholder.typicode.com/posts',
			},
		},
	};
}
