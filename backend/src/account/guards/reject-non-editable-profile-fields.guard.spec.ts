import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { FieldNotEditableException } from '../exceptions/field-not-editable.exception.js';

import { RejectNonEditableProfileFieldsGuard } from './reject-non-editable-profile-fields.guard.js';

function createExecutionContext(body: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body } as unknown as Request),
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('RejectNonEditableProfileFieldsGuard', () => {
  const guard = new RejectNonEditableProfileFieldsGuard();

  it('body chỉ có "name" → trả true', () => {
    const result = guard.canActivate(createExecutionContext({ name: 'New Name' }));

    expect(result).toBe(true);
  });

  it('body có "email" → FieldNotEditableException với đúng details', () => {
    let caught: unknown;
    try {
      guard.canActivate(createExecutionContext({ name: 'New Name', email: 'x@example.com' }));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(FieldNotEditableException);
    expect((caught as FieldNotEditableException).details).toEqual([
      { field: 'email', issue: 'NOT_EDITABLE_VIA_THIS_ENDPOINT' },
    ]);
  });

  it('body có "role" → FieldNotEditableException với đúng details', () => {
    let caught: unknown;
    try {
      guard.canActivate(createExecutionContext({ role: 'ADMIN' }));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(FieldNotEditableException);
    expect((caught as FieldNotEditableException).details).toEqual([
      { field: 'role', issue: 'NOT_EDITABLE_VIA_THIS_ENDPOINT' },
    ]);
  });

  it('body có cả "email" và "role" → details chứa cả 2 field', () => {
    let caught: unknown;
    try {
      guard.canActivate(createExecutionContext({ email: 'x@example.com', role: 'ADMIN' }));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(FieldNotEditableException);
    expect((caught as FieldNotEditableException).details).toEqual([
      { field: 'email', issue: 'NOT_EDITABLE_VIA_THIS_ENDPOINT' },
      { field: 'role', issue: 'NOT_EDITABLE_VIA_THIS_ENDPOINT' },
    ]);
  });

  it('body undefined (request.body không tồn tại) → trả true', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({} as unknown as Request),
        getResponse: () => undefined,
        getNext: () => undefined,
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
