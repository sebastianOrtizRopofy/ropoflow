import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class RopofyOAuth2Api implements ICredentialType {
	name = 'ropofyOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Ropofy OAuth2 API';

	documentationUrl = 'ropofy';

	icon: Icon = 'file:icons/ropofy.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'options',
			default: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
			required: true,
			options: [
				{
					name: 'White-Label',
					value: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
				},
				{
					name: 'Standard',
					value: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
				},
			],
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			hint: "Separate scopes by space, scopes needed for node: 'locations.readonly contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly'",
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://services.leadconnectorhq.com/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName:
				'Make sure your credentials include the required OAuth scopes for all actions this node performs.',
			name: 'notice',
			type: 'notice',
			default: '',
			displayOptions: {
				hideOnCloud: true,
			},
		},
	];
}
