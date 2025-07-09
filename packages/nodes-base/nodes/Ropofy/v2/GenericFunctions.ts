import { DateTime } from 'luxon';
import type { ToISOTimeOptions } from 'luxon';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodePropertyOptions,
	IPollFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError } from 'n8n-workflow';
import { setTimeout as sleep } from 'timers/promises';

const VALID_EMAIL_REGEX =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const VALID_PHONE_REGEX =
	/((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/;

export function isEmailValid(email: string): boolean {
	return VALID_EMAIL_REGEX.test(String(email).toLowerCase());
}

export function isPhoneValid(phone: string): boolean {
	return VALID_PHONE_REGEX.test(String(phone));
}

export function dateToIsoSupressMillis(dateTime: string) {
	const options: ToISOTimeOptions = { suppressMilliseconds: true };
	return DateTime.fromISO(dateTime).toISO(options);
}

export async function taskPostReceiceAction(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const contactId = this.getNodeParameter('contactId');
	items.forEach((item) => (item.json.contactId = contactId));
	return items;
}

export async function dueDatePreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let dueDateParam = this.getNodeParameter('dueDate', null) as string;
	if (!dueDateParam) {
		const fields = this.getNodeParameter('updateFields') as { dueDate: string };
		dueDateParam = fields.dueDate;
	}
	if (!dueDateParam) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{ message: 'dueDate is required', description: 'dueDate is required' },
		);
	}
	const dueDate = dateToIsoSupressMillis(dueDateParam);
	requestOptions.body = (requestOptions.body ?? {}) as object;
	Object.assign(requestOptions.body, { dueDate });
	return requestOptions;
}

export async function contactIdentifierPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = (requestOptions.body ?? {}) as object;
	let identifier = this.getNodeParameter('contactIdentifier', null) as string;
	if (!identifier) {
		const fields = this.getNodeParameter('updateFields') as { contactIdentifier: string };
		identifier = fields.contactIdentifier;
	}
	if (isEmailValid(identifier)) {
		Object.assign(requestOptions.body, { email: identifier });
	} else if (isPhoneValid(identifier)) {
		Object.assign(requestOptions.body, { phone: identifier });
	} else {
		Object.assign(requestOptions.body, { contactId: identifier });
	}
	return requestOptions;
}

export async function validEmailAndPhonePreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as { email?: string; phone?: string };

	if (body.email && !isEmailValid(body.email)) {
		const message = `email "${body.email}" has invalid format`;
		throw new NodeApiError(this.getNode(), {}, { message, description: message });
	}

	if (body.phone && !isPhoneValid(body.phone)) {
		const message = `phone "${body.phone}" has invalid format`;
		throw new NodeApiError(this.getNode(), {}, { message, description: message });
	}

	return requestOptions;
}

export async function dateTimeToEpochPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const qs = (requestOptions.qs ?? {}) as {
		startDate?: string | number;
		endDate?: string | number;
	};
	const toEpoch = (dt: string) => new Date(dt).getTime();
	if (qs.startDate) qs.startDate = toEpoch(qs.startDate as string);
	if (qs.endDate) qs.endDate = toEpoch(qs.endDate as string);
	return requestOptions;
}

export async function addLocationIdPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

	const resource = this.getNodeParameter('resource') as string;
	const operation = this.getNodeParameter('operation') as string;

	/* console.log('[Ropofy] addLocationIdPreSendAction:', {
		locationId,
		resource,
		operation,
		qs: requestOptions.qs,
		body: requestOptions.body,
	}); */

	if (resource === 'contact') {
		if (operation === 'getAll') {
			requestOptions.qs = requestOptions.qs ?? {};
			Object.assign(requestOptions.qs, { locationId });

			// --- INICIO FILTRO DE FECHAS EN BODY ---
			const filters = this.getNodeParameter('filters', {}) as any;
			const startDate = filters.startDate;
			const endDate = filters.endDate;
			const filterByDateAdded = filters.filterByDateAdded;
			const filterByDateUpdated = filters.filterByDateUpdated;

			const filterArray: any[] = [];
			if (startDate && endDate) {
				if (filterByDateAdded) {
					filterArray.push({
						field: 'dateAdded',
						operator: 'range',
						value: {
							gt: startDate,
							lt: endDate,
						},
					});
				}
				if (filterByDateUpdated) {
					filterArray.push({
						field: 'dateUpdated',
						operator: 'range',
						value: {
							gt: startDate,
							lt: endDate,
						},
					});
				}
			}
			if (filterArray.length > 0) {
				if (
					typeof requestOptions.body !== 'object' ||
					requestOptions.body === null ||
					Array.isArray(requestOptions.body)
				) {
					requestOptions.body = {};
				}
				(requestOptions.body as any).filters = [
					{
						group: 'OR',
						filters: filterArray,
					},
				];
			}
			// --- FIN FILTRO DE FECHAS EN BODY ---
		}
		if (operation === 'create') {
			requestOptions.body = requestOptions.body ?? {};
			Object.assign(requestOptions.body, { locationId });
		}
	}

	if (resource === 'opportunity') {
		if (operation === 'create') {
			requestOptions.body = requestOptions.body ?? {};
			Object.assign(requestOptions.body, { locationId });
		}
		if (operation === 'getAll') {
			requestOptions.qs = requestOptions.qs ?? {};
			Object.assign(requestOptions.qs, { location_id: locationId });
		}
	}

	// DEBUG: Mostrar el body final antes de retornar
	if (resource === 'contact' && operation === 'getAll') {
		console.log(
			'[Ropofy][DEBUG] Body final enviado en getAll contactos:',
			JSON.stringify(requestOptions, null, 2),
		);
	}

	/* 	console.log('[Ropofy] addLocationIdPreSendAction - FINAL:', {
		qs: requestOptions.qs,
		body: requestOptions.body,
	}); */

	return requestOptions;
}

export async function ropofyApiRequest(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| IWebhookFunctions
		| IPollFunctions
		| IHookFunctions
		| ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	url?: string,
	option: IDataObject = {},
) {
	let options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
			Version: '2021-07-28',
		},
		method,
		body,
		qs,
		url: url ?? `https://services.leadconnectorhq.com${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(qs).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	return await this.helpers.httpRequestWithAuthentication.call(this, 'ropofyOAuth2Api', options);
}

export const addNotePostReceiveAction = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const note = this.getNodeParameter('additionalFields.notes', 0) as string;

	if (!note) {
		return items;
	}

	const contact: IDataObject = (response.body as IDataObject).contact as IDataObject;

	// Ensure there is a valid response and extract contactId and userId
	if (!response || !response.body || !contact) {
		throw new ApplicationError('No response data available to extract contact ID and user ID.');
	}

	const contactId = contact.id;
	const userId = contact.locationId;

	const requestBody = {
		userId,
		body: note,
	};

	await ropofyApiRequest.call(this, 'POST', `/contacts/${contactId}/notes`, requestBody, {});

	return items;
};

export async function taskUpdatePreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as { title?: string; dueDate?: string };
	if (!body.title || !body.dueDate) {
		const contactId = this.getNodeParameter('contactId');
		const taskId = this.getNodeParameter('taskId');
		const resource = `/contacts/${contactId}/tasks/${taskId}`;
		const responseData = await ropofyApiRequest.call(this, 'GET', resource);
		body.title = body.title || responseData.title;
		// the api response dueDate has to be formatted or it will error on update
		body.dueDate = body.dueDate || dateToIsoSupressMillis(responseData.dueDate as string);
		requestOptions.body = body;
	}
	return requestOptions;
}

export async function splitTagsPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;
	if (body.tags) {
		if (Array.isArray(body.tags)) return requestOptions;
		body.tags = (body.tags as string).split(',').map((tag) => tag.trim());
	}
	return requestOptions;
}

export async function ropofyApiPagination(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;

	// Leer el delay de paginación configurable
	const delayPagination = this.getNodeParameter('delayPagination', 0) as number;

	const resourceMapping: { [key: string]: string } = {
		contact: 'contacts',
		opportunity: 'opportunities',
	};
	const rootProperty = resourceMapping[resource];

	requestData.options.qs = requestData.options.qs ?? {};
	if (returnAll) requestData.options.qs.limit = 100;

	// --- INICIO DEL FIX PARA CONTACT Y OPPORTUNITY ---
	// Guardar los parámetros base para contact y opportunity
	let baseQs: Record<string, any> = {};
	if (resource === 'contact') {
		baseQs = {
			locationId: requestData.options.qs.locationId,
			limit: requestData.options.qs.limit,
		};
	}
	if (resource === 'opportunity') {
		baseQs = {
			location_id: requestData.options.qs.location_id,
			limit: requestData.options.qs.limit,
		};
	}
	// --- FIN DEL FIX PARA CONTACT Y OPPORTUNITY ---

	let responseTotal = 0;
	let page = 1;

	do {
		// console.log(`[Ropofy] Pagination - Page: ${page}, Params:`, JSON.stringify(requestData.options.qs));
		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		// console.log(`[Ropofy] Pagination - Page: ${page}, Response:`, JSON.stringify(pageResponseData[0]?.json));
		const items = pageResponseData[0].json[rootProperty] as [];
		items.forEach((item) => responseData.push({ json: item }));

		const meta = pageResponseData[0].json.meta as IDataObject;
		const startAfterId = meta.startAfterId as string;
		const startAfter = meta.startAfter as number;

		// --- INICIO DEL FIX PARA CONTACT Y OPPORTUNITY ---
		if (resource === 'contact') {
			requestData.options.qs = {
				...baseQs,
				startAfterId,
				startAfter,
			};
		} else if (resource === 'opportunity') {
			requestData.options.qs = {
				...baseQs,
				startAfterId,
				startAfter,
			};
		} else {
			requestData.options.qs = { startAfterId, startAfter };
		}
		// --- FIN DEL FIX PARA CONTACT Y OPPORTUNITY ---

		responseTotal = (meta.total as number) || 0;
		page++;

		// Esperar el delay si está configurado y no es la última página
		if (returnAll && responseTotal > responseData.length && delayPagination > 0) {
			await sleep(delayPagination);
		}
	} while (returnAll && responseTotal > responseData.length);

	return responseData;
}

export async function getPipelineStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const operation = this.getNodeParameter('operation') as string;

	let pipelineId = '';
	if (operation === 'create') {
		pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
	}
	if (operation === 'update') {
		pipelineId = this.getNodeParameter('updateFields.pipelineId') as string;
	}
	if (operation === 'getAll') {
		pipelineId = this.getNodeParameter('filters.pipelineId') as string;
	}

	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

	const pipelines = (
		await ropofyApiRequest.call(this, 'GET', '/opportunities/pipelines', undefined, {
			locationId,
		})
	).pipelines as IDataObject[];

	const pipeline = pipelines.find((p) => p.id === pipelineId);
	if (pipeline) {
		const options: INodePropertyOptions[] = (pipeline.stages as IDataObject[]).map((stage) => {
			const name = stage.name as string;
			const value = stage.id as string;
			return { name, value };
		});
		return options;
	}
	return [];
}
export async function getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};
	const responseData = await ropofyApiRequest.call(
		this,
		'GET',
		'/opportunities/pipelines',
		undefined,
		{ locationId },
	);

	const pipelines = responseData.pipelines as [{ id: string; name: string; email: string }];
	const options: INodePropertyOptions[] = pipelines.map((pipeline) => {
		const name = pipeline.name;
		const value = pipeline.id;
		return { name, value };
	});
	return options;
}

export async function getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};
	const responseData = await ropofyApiRequest.call(this, 'GET', '/contacts/', undefined, {
		locationId,
	});

	const contacts = responseData.contacts as [{ id: string; name: string; email: string }];
	const options: INodePropertyOptions[] = contacts.map((contact) => {
		const name = contact.email;
		const value = contact.id;
		return { name, value };
	});
	return options;
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};
	const responseData = await ropofyApiRequest.call(this, 'GET', '/users/', undefined, {
		locationId,
	});

	const users = responseData.users as [{ id: string; name: string; email: string }];
	const options: INodePropertyOptions[] = users.map((user) => {
		const name = user.name;
		const value = user.id;
		return { name, value };
	});
	return options;
}

export async function addCustomFieldsPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const requestBody = requestOptions.body as IDataObject;

	if (requestBody && requestBody.customFields) {
		const rawCustomFields = requestBody.customFields as IDataObject;

		// Define the structure of fieldId
		interface FieldIdType {
			value: unknown;
			cachedResultName?: string;
		}

		// Ensure rawCustomFields.values is an array of objects with fieldId and fieldValue
		if (rawCustomFields && Array.isArray(rawCustomFields.values)) {
			const formattedCustomFields = rawCustomFields.values.map((field: unknown) => {
				// Assert that field is of the expected shape
				const typedField = field as { fieldId: FieldIdType; fieldValue: unknown };

				const fieldId = typedField.fieldId;

				if (typeof fieldId === 'object' && fieldId !== null && 'value' in fieldId) {
					return {
						id: fieldId.value,
						key: fieldId.cachedResultName ?? 'default_key',
						field_value: typedField.fieldValue,
					};
				} else {
					throw new ApplicationError('Error processing custom fields.');
				}
			});
			requestBody.customFields = formattedCustomFields;
		}
	}

	return requestOptions;
}

// Utilidad para formatear fecha a ISO con milisegundos y Z
function toIsoWithMillisZ(date: string) {
	if (!date) return date;
	const d = new Date(date);
	return d.toISOString();
}

// --- NUEVA FUNCIÓN: preSend para /contacts/search ---
export async function contactSearchPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { locationId } =
		((await this.getCredentials('ropofyOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

	// Solo para la acción 'search' de contactos
	const resource = this.getNodeParameter('resource') as string;
	const operation = this.getNodeParameter('operation') as string;
	if (resource !== 'contact' || operation !== 'search') return requestOptions;

	// Leer parámetros
	const page = this.getNodeParameter('page', 1) as number;
	const pageLimit = this.getNodeParameter('pageLimit', 20) as number;
	const searchAfterRaw = this.getNodeParameter('searchAfter', '') as string;
	const sort = this.getNodeParameter('sort', {}) as any;
	const filtersRaw = this.getNodeParameter('filters', {}) as any;
	const dateFilters = this.getNodeParameter('dateFilters', {}) as any;

	// searchAfter puede ser string separado por coma o array
	let searchAfter: string[] = [];
	if (typeof searchAfterRaw === 'string' && searchAfterRaw.trim() !== '') {
		try {
			const parsed = JSON.parse(searchAfterRaw);
			if (Array.isArray(parsed)) {
				searchAfter = parsed;
			} else {
				searchAfter = searchAfterRaw
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
			}
		} catch {
			searchAfter = searchAfterRaw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
	}

	// --- 1. Procesar filtros avanzados (filters) ---
	const filterArray: any[] = [];
	if (filtersRaw && typeof filtersRaw === 'object' && (filtersRaw.filter || filtersRaw.group)) {
		const filtersList = [];
		if (Array.isArray(filtersRaw.filter)) {
			filtersList.push(...filtersRaw.filter);
		} else if (filtersRaw.filter) {
			filtersList.push(filtersRaw.filter);
		}
		if (Array.isArray(filtersRaw.group)) {
			filtersList.push(...filtersRaw.group);
		} else if (filtersRaw.group) {
			filtersList.push(filtersRaw.group);
		}
		for (const f of filtersList) {
			if (f.field && f.operator) {
				// Filtro simple
				let value: any = f.value;
				try {
					value = JSON.parse(f.value);
				} catch {}
				filterArray.push({ field: f.field, operator: f.operator, value });
			} else if (f.group && f.filters) {
				// Grupo
				let groupFilters: any = f.filters;
				if (typeof groupFilters === 'string') {
					try {
						groupFilters = JSON.parse(groupFilters);
					} catch {}
				}
				filterArray.push({ group: f.group, filters: groupFilters });
			}
		}
	}

	// --- 2. Procesar filtros de fecha (dateFilters) ---
	const startDate = dateFilters.startDate ? toIsoWithMillisZ(dateFilters.startDate) : undefined;
	const endDate = dateFilters.endDate ? toIsoWithMillisZ(dateFilters.endDate) : undefined;
	const filterByDateAdded = dateFilters.filterByDateAdded;
	const filterByDateUpdated = dateFilters.filterByDateUpdated;

	const dateRangeFilters: any[] = [];
	if (startDate && endDate) {
		if (filterByDateAdded) {
			dateRangeFilters.push({
				field: 'dateAdded',
				operator: 'range',
				value: { gt: startDate, lt: endDate },
			});
		}
		if (filterByDateUpdated) {
			dateRangeFilters.push({
				field: 'dateUpdated',
				operator: 'range',
				value: { gt: startDate, lt: endDate },
			});
		}
	}
	if (dateRangeFilters.length > 1) {
		filterArray.push({ group: 'OR', filters: dateRangeFilters });
	} else if (dateRangeFilters.length === 1) {
		filterArray.push(dateRangeFilters[0]);
	}

	// --- 3. Sort ---
	let sortBody: any[] = [];
	if (sort && typeof sort === 'object' && sort.sort) {
		if (Array.isArray(sort.sort)) {
			sortBody = sort.sort;
		} else {
			sortBody = [sort.sort];
		}
	}

	// --- 4. Armar el body final ---
	requestOptions.body = {
		locationId,
		page,
		pageLimit,
		...(searchAfter.length > 0 ? { searchAfter } : {}),
		...(filterArray.length > 0 ? { filters: filterArray } : {}),
		...(sortBody.length > 0 ? { sort: sortBody } : {}),
	};

	// DEBUG: Mostrar el body final antes de retornar
	console.log(
		'[Ropofy][DEBUG][SearchContacts] Body enviado:',
		JSON.stringify(requestOptions.body, null, 2),
	);

	return requestOptions;
}

// --- NUEVA FUNCIÓN: paginación para /contacts/search ---
export async function ropofyApiSearchPagination(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const delayPagination = this.getNodeParameter('delayPagination', 0) as number;
	const rootProperty = 'contacts';
	let baseBody = { ...requestData.options.body };
	let page = 1;
	let searchAfter: any[] = [];
	do {
		console.log(`page${page}`);
		const body = {
			...baseBody,
			page,
			...(searchAfter.length > 0 ? { searchAfter } : {}),
		};
		requestData.options.body = body;
		try {
			const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
			console.log(
				'[Ropofy][DEBUG][SearchContacts] Respuesta HighLevel:',
				JSON.stringify(pageResponseData[0]?.json, null, 2),
			);
			if (!pageResponseData || pageResponseData.length === 0 || !pageResponseData[0]?.json) {
				break;
			}
			const responseJson = pageResponseData[0].json as IDataObject;
			if (responseJson.error || responseJson.message) {
				break;
			}
			const items = responseJson[rootProperty] as any[];
			if (items && Array.isArray(items)) {
				items.forEach((item) => responseData.push({ json: item }));
				if (items.length > 0 && items[items.length - 1].searchAfter) {
					searchAfter = items[items.length - 1].searchAfter;
				} else {
					searchAfter = [];
				}
			} else {
				searchAfter = [];
			}
			page++;
			if (returnAll && searchAfter.length > 0 && delayPagination > 0) {
				await sleep(delayPagination);
			}
		} catch (error) {
			break;
		}
	} while (returnAll && searchAfter.length > 0);
	return responseData;
}

export async function ropofyApiMessagesPagination(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const responseData: INodeExecutionData[] = [];
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = this.getNodeParameter('limit', 20) as number;
	let lastMessageId = this.getNodeParameter('lastMessageId', '') as string;
	let totalFetched = 0;
	let page = 1;
	do {
		console.log(`page${page} messages`);
		if (lastMessageId) {
			requestData.options.qs = { ...requestData.options.qs, lastMessageId };
		}
		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		if (!pageResponseData || pageResponseData.length === 0 || !pageResponseData[0]?.json) {
			break;
		}
		const responseJson = pageResponseData[0].json as any;
		console.log('Respuesta mensajes:', JSON.stringify(responseJson, null, 2));
		const items = responseJson.messages?.messages as any[];
		if (items && Array.isArray(items) && items.length > 0) {
			items.forEach((item) => responseData.push({ json: item }));
			totalFetched += items.length;
			lastMessageId = responseJson.messages?.lastMessageId;
		} else {
			break;
		}
		if (
			!returnAll ||
			(limit && totalFetched >= limit) ||
			responseJson.messages?.nextPage === false
		) {
			break;
		}
		page++;
	} while (true);
	return responseData;
}
