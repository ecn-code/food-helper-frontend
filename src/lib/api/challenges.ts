import { request } from '$lib/api/backend';

export type ChallengeResponse = {
	id: number;
	code: string;
	name: string;
	description: string;
	rewardAmount: number;
	periodDays: number;
	available: boolean;
	lastUsedAt: string | null;
	nextAvailableAt: string | null;
};

export type ChallengeDefinitionRequest = Pick<
	ChallengeResponse,
	'code' | 'name' | 'description' | 'rewardAmount' | 'periodDays'
>;

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listChallenges(payerUserId: number, authorization: string, onlyAvailable = false) {
	const query = new URLSearchParams({ payerUserId: String(Number(payerUserId)) });
	if (onlyAvailable) query.set('onlyAvailable', 'true');

	return await request<ChallengeResponse[]>(`/api/v1/challenges?${query.toString()}`, {
		headers: headers(authorization)
	});
}

export async function redeemChallenge(challengeCode: string, payerUserId: number, authorization: string) {
	const query = new URLSearchParams({ payerUserId: String(Number(payerUserId)) });
	return await request<ChallengeResponse>(
		`/api/v1/challenges/${encodeURIComponent(challengeCode)}/redeem?${query.toString()}`,
		{ method: 'POST', headers: headers(authorization) }
	);
}

export async function createChallenge(values: ChallengeDefinitionRequest, authorization: string) {
	return await request<ChallengeResponse>('/api/v1/challenges', {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify(values)
	});
}

export async function updateChallenge(challengeCode: string, values: ChallengeDefinitionRequest, authorization: string) {
	return await request<ChallengeResponse>(`/api/v1/challenges/${encodeURIComponent(challengeCode)}`, {
		method: 'PUT',
		headers: headers(authorization),
		body: JSON.stringify(values)
	});
}

export async function deleteChallenge(challengeCode: string, authorization: string) {
	await request<void>(`/api/v1/challenges/${encodeURIComponent(challengeCode)}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}
