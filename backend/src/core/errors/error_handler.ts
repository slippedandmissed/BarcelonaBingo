import { inspect } from "node:util";
import Elysia from "elysia";
import { HttpError } from "./http_error";

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return inspect(error);
  }
}

function responseBody(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response !== undefined
  ) {
    return formatErrorMessage(error.response);
  }
  return formatErrorMessage(error);
}

function errorStatus(
  code: string | number,
  error: unknown,
  set: { status?: number | string },
): number | undefined {
  if (typeof code === "number") {
    return code;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  if (typeof set.status === "number") {
    return set.status;
  }
  if (set.status) {
    const parsed = Number.parseInt(String(set.status), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function logHttpOutcome(statusCode: number, message: string, err: unknown) {
  if (statusCode >= 500) {
    console.error(
      {
        error_type: "http",
        "http.response.status_code": statusCode,
        err,
      },
      message,
    );
    return;
  }

  console.debug(
    {
      error_type: "http",
      "http.response.status_code": statusCode,
      err,
    },
    message,
  );
}

function handleGlobalError({
  code,
  error,
  set,
}: {
  code: string | number;
  error: unknown;
  set: { status?: number | string };
}) {
  if (error instanceof HttpError) {
    logHttpOutcome(error.statusCode, error.message, error);
    set.status = error.statusCode;
    return error.message;
  }

  if (typeof code === "number") {
    const message = responseBody(error);
    const status = errorStatus(code, error, set)!;
    logHttpOutcome(status, message, error);
    set.status = status;
    return message;
  }

  // Remaining codes are Elysia builtins: NOT_FOUND, VALIDATION, UNKNOWN, …
  if (code === "VALIDATION") {
    console.warn(
      {
        error_type: "validation",
        err: error,
      },
      "request validation failed",
    );
    return;
  }

  const status = errorStatus(code, error, set);
  if (status !== undefined && status < 500) {
    console.debug(
      {
        error_type: "http",
        "http.response.status_code": status,
        err: error,
      },
      formatErrorMessage(error),
    );
    return;
  }

  console.error(
    {
      error_type: "unhandled",
      ...(status !== undefined ? { "http.response.status_code": status } : {}),
      err: error,
    },
    formatErrorMessage(error),
  );

  return formatErrorMessage(error);
}

export const errorHandler = new Elysia({ name: "errorHandler" })
  .error({
    HttpError,
  })
  .onError({ as: "global" }, handleGlobalError);
