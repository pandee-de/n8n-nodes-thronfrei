import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IDataObject,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

export class Thronfrei implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Thronfrei',
		name: 'thronfrei',
		icon: 'file:thronfrei.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Trigger check-in, check-out, status and emergencies in Thronfrei',
		defaults: {
			name: 'Thronfrei',
		},
		inputs: ['main'] as unknown as NodeConnectionType[],
		outputs: ['main'] as unknown as NodeConnectionType[],
		credentials: [
			{
				name: 'thronfreiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Bathroom', value: 'bathroom' },
					{ name: 'Emergency', value: 'emergency' },
					{ name: 'Status', value: 'status' },
				],
				default: 'bathroom',
			},

			// Bathroom operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['bathroom'] } },
				options: [
					{
						name: 'Check In',
						value: 'checkIn',
						action: 'Check a user into a bathroom',
					},
					{
						name: 'Check Out',
						value: 'checkOut',
						action: 'Check a user out of their bathroom',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List all bathrooms',
					},
				],
				default: 'checkIn',
			},

			// Emergency operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['emergency'] } },
				options: [
					{
						name: 'Pee Emergency',
						value: 'pee',
						action: 'Send a pee emergency',
					},
					{
						name: 'Toilet Paper Emergency',
						value: 'toiletPaper',
						action: 'Send a toilet paper emergency',
					},
				],
				default: 'pee',
			},

			// Status operation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['status'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get the current status of all bathrooms',
					},
				],
				default: 'get',
			},

			// Bathroom selector (check-in / check-out / emergencies)
			{
				displayName: 'Bathroom Name or ID',
				name: 'bathroomId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getBathrooms' },
				default: '',
				description:
					'Choose a bathroom from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['bathroom'],
						operation: ['checkIn', 'checkOut'],
					},
				},
			},
			{
				displayName: 'Bathroom Name or ID',
				name: 'bathroomId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getBathrooms' },
				default: '',
				description:
					'Optional target bathroom. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: { resource: ['emergency'] },
				},
			},

			// Acting user
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description:
					'The family member this action acts as. Leave empty to use the API key\'s default user.',
				displayOptions: {
					show: {
						resource: ['bathroom', 'emergency'],
						operation: ['checkIn', 'checkOut', 'pee', 'toiletPaper'],
					},
				},
			},

			// Pee emergency extras
			{
				displayName: 'Urgency Level',
				name: 'urgencyLevel',
				type: 'options',
				options: [
					{ name: 'Low (1)', value: 1 },
					{ name: 'Medium (2)', value: 2 },
					{ name: 'High (3)', value: 3 },
				],
				default: 2,
				displayOptions: {
					show: { resource: ['emergency'], operation: ['pee'] },
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['emergency'], operation: ['pee'] },
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getBathrooms(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('thronfreiApi');
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'thronfreiApi',
					{
						method: 'GET',
						baseURL: credentials.baseUrl as string,
						url: '/v1/bathrooms',
						json: true,
					},
				)) as { bathrooms?: Array<{ id: string; name: string; floor?: string }> };

				return (response.bathrooms ?? []).map((bathroom) => ({
					name: bathroom.floor
						? `${bathroom.name} (${bathroom.floor})`
						: bathroom.name,
					value: bathroom.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('thronfreiApi');
		const baseUrl = credentials.baseUrl as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let method: IHttpRequestMethods = 'POST';
				let url = '';
				const body: IDataObject = {};

				if (resource === 'status' || (resource === 'bathroom' && operation === 'list')) {
					method = 'GET';
					url = resource === 'status' ? '/v1/status' : '/v1/bathrooms';
				} else if (resource === 'bathroom') {
					const bathroomId = this.getNodeParameter('bathroomId', i) as string;
					const userId = this.getNodeParameter('userId', i, '') as string;
					if (userId) body.userId = userId;
					const suffix = operation === 'checkIn' ? 'check-in' : 'check-out';
					url = `/v1/bathrooms/${encodeURIComponent(bathroomId)}/${suffix}`;
				} else if (resource === 'emergency') {
					const userId = this.getNodeParameter('userId', i, '') as string;
					const bathroomId = this.getNodeParameter('bathroomId', i, '') as string;
					if (userId) body.userId = userId;
					if (bathroomId) body.bathroomId = bathroomId;
					if (operation === 'pee') {
						body.urgencyLevel = this.getNodeParameter('urgencyLevel', i) as number;
						const message = this.getNodeParameter('message', i, '') as string;
						if (message) body.message = message;
						url = '/v1/emergencies/pee';
					} else {
						url = '/v1/emergencies/toilet-paper';
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported resource: ${resource}`,
						{ itemIndex: i },
					);
				}

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'thronfreiApi',
					{
						method,
						baseURL: baseUrl,
						url,
						body: method === 'GET' ? undefined : body,
						json: true,
					},
				);

				returnData.push({
					json: response as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
