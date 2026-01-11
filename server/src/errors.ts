/**
 * Error types and codes for Agent Kanban
 * Shared between backend and frontend for consistency
 */

// Error codes enum
export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Agent errors
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
  INVALID_AGENT_MESSAGE = 'INVALID_AGENT_MESSAGE',
  REGISTER_FAILED = 'REGISTER_FAILED',

  // Task errors
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_ALREADY_EXISTS = 'TASK_ALREADY_EXISTS',
  INVALID_TASK_MESSAGE = 'INVALID_TASK_MESSAGE',
  INVALID_TASK_STATUS = 'INVALID_TASK_STATUS',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',

  // WebSocket errors
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  SOCKET_TIMEOUT = 'SOCKET_TIMEOUT',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED'
}

// HTTP status code mapping
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,

  [ErrorCode.AGENT_NOT_FOUND]: 404,
  [ErrorCode.AGENT_ALREADY_EXISTS]: 409,
  [ErrorCode.INVALID_AGENT_MESSAGE]: 400,
  [ErrorCode.REGISTER_FAILED]: 500,

  [ErrorCode.TASK_NOT_FOUND]: 404,
  [ErrorCode.TASK_ALREADY_EXISTS]: 409,
  [ErrorCode.INVALID_TASK_MESSAGE]: 400,
  [ErrorCode.INVALID_TASK_STATUS]: 400,
  [ErrorCode.CREATE_FAILED]: 500,
  [ErrorCode.UPDATE_FAILED]: 500,
  [ErrorCode.DELETE_FAILED]: 500,

  [ErrorCode.CONNECTION_ERROR]: 503,
  [ErrorCode.SOCKET_TIMEOUT]: 504,
  [ErrorCode.MESSAGE_SEND_FAILED]: 500
};

// Custom error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ErrorHttpStatus[code] || 500;
    this.details = details;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }

  toSocketError() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// Error factory functions
export function notFoundError(resource: string, id: string): AppError {
  const code = resource === 'Agent' ? ErrorCode.AGENT_NOT_FOUND : ErrorCode.TASK_NOT_FOUND;
  return new AppError(code, `${resource} not found: ${id}`, { resource, id });
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
}

export function internalError(message: string, originalError?: Error): AppError {
  return new AppError(ErrorCode.INTERNAL_ERROR, message, {
    originalMessage: originalError?.message
  });
}

// Error logging utility
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  if (error instanceof AppError) {
    console.error(`[${timestamp}] [ERROR] ${context}:`, {
      code: error.code,
      message: error.message,
      details: error.details
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [ERROR] ${context}:`, error.message);
  } else {
    console.error(`[${timestamp}] [ERROR] ${context}:`, String(error));
  }
}

// Check if error is AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
