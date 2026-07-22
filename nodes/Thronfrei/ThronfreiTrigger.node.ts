import { createHmac, timingSafeEqual } from 'crypto';
import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IDataObject,
} from 'n8n-workflow';

const EVENT_OPTIONS = [
	{ name: 'Bad Besetzt', value: 'bad_besetzt' },
	{ name: 'Bad Frei', value: 'bad_frei' },
	{ name: 'Klopapier-Notruf', value: 'klopapier_notruf' },
	{ name: 'Klopapier Erledigt', value: 'klopapier_erledigt' },
	{ name: 'Pipi-Notruf', value: 'pipi_notruf' },
	{ name: 'Pipi Gesehen', value: 'pipi_gesehen' },
	{ name: 'Pipi Erledigt', value: 'pipi_erledigt' },
	{ name: 'Pipi Abgebrochen', value: 'pipi_abgebrochen' },
];

export class ThronfreiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Thronfrei Trigger',
		name: 'thronfreiTrigger',
		icon: 'file:thronfrei.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow on Thronfrei Smart Home events',
		defaults: {
			name: 'Thronfrei Trigger',
		},
		inputs: [],
		outputs: ['main'] as unknown as NodeConnectionType[],
		credentials: [
			{
				name: 'thronfreiApi',
				required: false,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'thronfrei',
			},
		],
		properties: [
			{
				displayName:
					'Copy the <b>Production URL</b> below and add it as a Smart Home target in the Thronfrei app (More → Smart Home). Select the same events there.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENT_OPTIONS,
				default: [],
				description:
					'Only these events start the workflow. Leave empty to accept every event.',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: false,
				description:
					'Whether to reject requests whose x-thronfrei-signature HMAC does not match the Webhook Signing Secret in the credential',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData() as IDataObject;
		const headers = this.getHeaderData() as IDataObject;
		const selectedEvents = this.getNodeParameter('events', []) as string[];
		const verifySignature = this.getNodeParameter('verifySignature', false) as boolean;

		if (verifySignature) {
			const credentials = await this.getCredentials('thronfreiApi');
			const secret = (credentials?.webhookSecret as string) ?? '';
			const provided = (headers['x-thronfrei-signature'] as string) ?? '';
			if (!secret || !isValidSignature(req.rawBody, body, secret, provided)) {
				return { noWebhookResponse: false, webhookResponse: { status: 401 } };
			}
		}

		const eventName = (body.event as string) ?? (headers['x-thronfrei-event'] as string);
		if (selectedEvents.length > 0 && (!eventName || !selectedEvents.includes(eventName))) {
			// Acknowledge but do not start the workflow.
			return { webhookResponse: { received: true, ignored: true } } as IWebhookResponseData;
		}

		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}

function isValidSignature(
	rawBody: Buffer | undefined,
	body: IDataObject,
	secret: string,
	provided: string,
): boolean {
	const payload = rawBody && rawBody.length > 0 ? rawBody : Buffer.from(JSON.stringify(body));
	const digest = createHmac('sha256', secret).update(payload).digest('hex');
	const expected = `sha256=${digest}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(provided);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
