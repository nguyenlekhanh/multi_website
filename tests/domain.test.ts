import { describe, expect, it } from 'vitest';
import { hostFromHeaders, normalizeHost } from '@/platform/domain';

describe('hostname normalization', () => {
  it('lowercases hostnames', () => {
    expect(normalizeHost('Business.Demo.LOCAL')).toBe('business.demo.local');
  });

  it('strips ports from Host header values', () => {
    expect(normalizeHost('business.demo.local:3000')).toBe('business.demo.local');
  });

  it('strips trailing dots (FQDN form)', () => {
    expect(normalizeHost('business.demo.local.')).toBe('business.demo.local');
  });

  it('trims whitespace', () => {
    expect(normalizeHost('  travel.demo.local \n')).toBe('travel.demo.local');
  });

  it('keeps www as a distinct hostname (explicit alias mapping only)', () => {
    expect(normalizeHost('WWW.meridian-consulting.example')).toBe('www.meridian-consulting.example');
    expect(normalizeHost('www.meridian-consulting.example')).not.toBe(
      normalizeHost('meridian-consulting.example'),
    );
  });

  it('rejects invalid hostname formats', () => {
    expect(normalizeHost('')).toBeNull();
    expect(normalizeHost(null)).toBeNull();
    expect(normalizeHost(undefined)).toBeNull();
    expect(normalizeHost('not valid')).toBeNull();
    expect(normalizeHost('-leading-hyphen.example')).toBeNull();
    expect(normalizeHost('trailing-hyphen-.example')).toBeNull();
    expect(normalizeHost('under_score.example')).toBeNull();
    expect(normalizeHost('..')).toBeNull();
  });

  it('handles bracketed IPv6 hosts with ports', () => {
    expect(normalizeHost('[::1]:3000')).toBe('::1');
    expect(normalizeHost('[::1]')).toBe('::1');
  });

  it('extracts the first value of a forwarded-host list', () => {
    expect(hostFromHeaders('business.demo.local:3000, proxy:443', 'fallback:80')).toBe(
      'business.demo.local',
    );
    expect(hostFromHeaders(null, 'blog.demo.local:3000')).toBe('blog.demo.local');
    expect(hostFromHeaders(null, null)).toBeNull();
  });
});
