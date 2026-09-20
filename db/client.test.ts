import { describe, expect, it } from 'vitest';
import { toPostgresSql } from './client';

describe('PostgreSQL query compatibility', () => {
  it('converts positional parameters in order', () => {
    expect(toPostgresSql('SELECT * FROM users WHERE id=? AND github_login=?')).toBe(
      'SELECT * FROM users WHERE id=$1 AND github_login=$2',
    );
  });

  it('converts the legacy date and aggregate expressions', () => {
    expect(toPostgresSql("SELECT min(source_coverage.coverage_start,excluded.coverage_start), max(source_coverage.coverage_end,excluded.coverage_end) WHERE date >= date('now','-365 days')"))
      .toBe("SELECT LEAST(source_coverage.coverage_start,excluded.coverage_start), GREATEST(source_coverage.coverage_end,excluded.coverage_end) WHERE date >= to_char(CURRENT_DATE - INTERVAL '365 days', 'YYYY-MM-DD')");
  });
});
