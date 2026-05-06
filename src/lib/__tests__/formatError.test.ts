import { describe, it, expect } from 'vitest';
import { formatError } from '../formatError';

describe('formatError', () => {
  it('returns error.message for Error instances', () => {
    expect(formatError(new Error('oops'))).toBe('oops');
  });
  it('returns the string directly for string errors', () => {
    expect(formatError('bad thing')).toBe('bad thing');
  });
  it('returns fallback for null', () => {
    expect(formatError(null)).toBe('An unexpected error occurred');
  });
  it('returns fallback for undefined', () => {
    expect(formatError(undefined)).toBe('An unexpected error occurred');
  });
  it('returns fallback for objects', () => {
    expect(formatError({ code: 42 })).toBe('An unexpected error occurred');
  });
  it('returns fallback for numbers', () => {
    expect(formatError(404)).toBe('An unexpected error occurred');
  });
});
