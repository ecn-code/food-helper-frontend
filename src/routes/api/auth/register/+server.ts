import { json, type RequestHandler } from '@sveltejs/kit';
import { register, type RegisterValues } from '$lib/server/auth-api';
import { ApiError } from '$lib/server/backend-api';
import { setAuthSession } from '$lib/server/session';

type RegisterErrorResponse = {
	type: 'register';
	error: string;
	values: Pick<RegisterValues, 'username' | 'registrationCode'>;
	fieldErrors?: Partial<Record<keyof RegisterValues, string>>;
};

function isSecure(url: URL) {
	return url.protocol === 'https:';
}

function readString(value: unknown) {
	return String(value ?? '').trim();
}

function registerError(
	status: number,
	error: string,
	values: RegisterErrorResponse['values'],
	fieldErrors?: RegisterErrorResponse['fieldErrors']
) {
	return json(
		{
			type: 'register',
			error,
			values,
			fieldErrors
		} satisfies RegisterErrorResponse,
		{ status }
	);
}

function validateRegisterForm(values: RegisterValues) {
	const fieldErrors: RegisterErrorResponse['fieldErrors'] = {};

	if (!values.username) {
		fieldErrors.username = 'El usuario es obligatorio';
	} else if (values.username.length < 3 || values.username.length > 80) {
		fieldErrors.username = 'Debe tener entre 3 y 80 caracteres';
	}

	if (!values.password) {
		fieldErrors.password = 'La contrasena es obligatoria';
	} else if (values.password.length < 8 || values.password.length > 128) {
		fieldErrors.password = 'Debe tener entre 8 y 128 caracteres';
	}

	if (!values.registrationCode) {
		fieldErrors.registrationCode = 'El codigo es obligatorio';
	} else if (values.registrationCode.length > 128) {
		fieldErrors.registrationCode = 'No puede superar 128 caracteres';
	}

	return fieldErrors;
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const payload = await request.json().catch(() => null);
	const values: RegisterValues = {
		username: readString((payload as Record<string, unknown> | null)?.username),
		password: String((payload as Record<string, unknown> | null)?.password ?? ''),
		registrationCode: readString((payload as Record<string, unknown> | null)?.registrationCode)
	};
	const publicValues = {
		username: values.username,
		registrationCode: values.registrationCode
	};
	const fieldErrors = validateRegisterForm(values);

	if (Object.keys(fieldErrors).length > 0) {
		return registerError(400, 'Revisa los campos marcados', publicValues, fieldErrors);
	}

	try {
		const auth = await register(values);
		setAuthSession(cookies, auth, isSecure(url));
		return json(
			{
				type: 'register',
				success: 'Cuenta creada correctamente',
				values: { username: auth.username }
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof ApiError) {
			return registerError(error.status === 409 ? 409 : 400, error.message, publicValues);
		}

		throw error;
	}
};
