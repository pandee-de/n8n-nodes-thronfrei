import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ThronfreiApi implements ICredentialType {
	name = 'thronfreiApi';

	displayName = 'Thronfrei API';

	documentationUrl = 'https://thronfrei.de/api/';


	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://automation.thronfrei.de',
			description:
				'Base URL of the Thronfrei API. The AutomationApi routes live under /v1.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Family-scoped automation key (starts with tfa_). Create it in the Thronfrei app under More → Smart Home.',
		},
		{
			displayName: 'Webhook Signing Secret',
			name: 'webhookSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional. If your Thronfrei Smart Home target uses a secret, set the same value here so the Trigger node can verify the x-thronfrei-signature HMAC.',
		},
	];

	// Sends the API key as a Bearer token on every request.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Verifies the key by calling the status endpoint.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/status',
			method: 'GET',
		},
	};
}
