import { afterEach, describe, expect, it } from 'vitest';
import { resolveDataSourceMode } from '@/platform/data';

describe('data source selection', () => {
  const ORIGINAL = { ...process.env };
  const env = process.env as { DATA_SOURCE?: string; NODE_ENV?: string };

  afterEach(() => {
    env.DATA_SOURCE = ORIGINAL.DATA_SOURCE;
    env.NODE_ENV = ORIGINAL.NODE_ENV;
  });

  it('selects postgres explicitly', () => {
    env.DATA_SOURCE = 'postgres';
    expect(resolveDataSourceMode()).toBe('postgres');
    env.DATA_SOURCE = 'postgresql';
    expect(resolveDataSourceMode()).toBe('postgres');
  });

  it('selects seed explicitly', () => {
    env.DATA_SOURCE = 'seed';
    expect(resolveDataSourceMode()).toBe('seed');
  });

  it('defaults to seed outside production', () => {
    delete env.DATA_SOURCE;
    env.NODE_ENV = 'development';
    expect(resolveDataSourceMode()).toBe('seed');
  });

  it('refuses to guess in production', () => {
    delete env.DATA_SOURCE;
    env.NODE_ENV = 'production';
    expect(() => resolveDataSourceMode()).toThrowError(/DATA_SOURCE is required in production/);
  });

  it('rejects unknown values', () => {
    env.DATA_SOURCE = 'mongodb';
    expect(() => resolveDataSourceMode()).toThrowError(/Invalid DATA_SOURCE/);
  });
});
