// askJson lives in supabase/functions/ask-pamwe, which is Deno-flavoured and
// outside the app's tsconfig, so the chain is mirrored here the same way
// push-preview mirrors fanOut. What matters is the decision it makes, and that
// is pure.

class ModelError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`model ${status}: ${body.slice(0, 200)}`);
  }
}
class RefusalError extends Error {}

function isAccountFailure(status: number, body: string): boolean {
  if (status === 401 || status === 402) return true;
  const b = body.toLowerCase();
  return b.includes('insufficient_quota') ||
    b.includes('credit_balance_exhausted') ||
    b.includes('credit balance') ||
    b.includes('invalid_api_key');
}

function isAccountError(err: any): boolean {
  const status = err instanceof ModelError
    ? err.status
    : (typeof err?.status === 'number' ? err.status : 0);
  const body = err instanceof ModelError ? err.body : String(err?.message ?? err);
  return isAccountFailure(status, body);
}

type Provider = { name: string; key?: string; call: () => Promise<any> };

async function askJson(providers: Provider[]): Promise<any> {
  const chain = providers.filter((p) => !!p.key);
  if (chain.length === 0) throw new ModelError(401, 'no model provider is configured');
  let last: unknown;
  for (const provider of chain) {
    try {
      return await provider.call();
    } catch (err) {
      last = err;
      if (err instanceof RefusalError || !isAccountError(err)) throw err;
    }
  }
  throw last;
}

const ok = (name: string) => jest.fn(() => Promise.resolve({ answered_by: name }));
const broke = (err: unknown) => jest.fn(() => Promise.reject(err));

const OUT_OF_CREDIT = new ModelError(400, 'Your credit balance is too low to access the Anthropic API');
const NO_QUOTA = new ModelError(429, '{"error":{"code":"insufficient_quota"}}');
const DEAD_KEY = new ModelError(401, 'invalid_api_key');
const TIMEOUT = new ModelError(504, 'gateway timeout');
const RATE_LIMIT = new ModelError(429, 'Rate limit reached. Please slow down.');

describe('the provider chain', () => {
  it('answers on OpenAI when OpenAI is healthy, and never touches the other', async () => {
    const anthropic = ok('anthropic');
    await expect(askJson([
      { name: 'openai', key: 'k', call: ok('openai') },
      { name: 'anthropic', key: 'k', call: anthropic },
    ])).resolves.toEqual({ answered_by: 'openai' });
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('falls through to Anthropic when OpenAI has no quota', async () => {
    await expect(askJson([
      { name: 'openai', key: 'k', call: broke(NO_QUOTA) },
      { name: 'anthropic', key: 'k', call: ok('anthropic') },
    ])).resolves.toEqual({ answered_by: 'anthropic' });
  });

  it('falls through on a dead key as well as an empty balance', async () => {
    await expect(askJson([
      { name: 'openai', key: 'k', call: broke(DEAD_KEY) },
      { name: 'anthropic', key: 'k', call: ok('anthropic') },
    ])).resolves.toEqual({ answered_by: 'anthropic' });
  });

  it('reports the account failure when every provider is out', async () => {
    // Both exhausted at once is not hypothetical: it happened on 2026-08-09.
    const err = await askJson([
      { name: 'openai', key: 'k', call: broke(NO_QUOTA) },
      { name: 'anthropic', key: 'k', call: broke(OUT_OF_CREDIT) },
    ]).catch((e) => e);
    expect(isAccountError(err)).toBe(true);
  });

  it('skips a provider with no key rather than calling it', async () => {
    await expect(askJson([
      { name: 'openai', key: undefined, call: broke(new Error('should not run')) },
      { name: 'anthropic', key: 'k', call: ok('anthropic') },
    ])).resolves.toEqual({ answered_by: 'anthropic' });
  });

  it('runs on one configured provider alone', async () => {
    await expect(askJson([
      { name: 'openai', key: 'k', call: ok('openai') },
      { name: 'anthropic', key: undefined, call: broke(new Error('no key')) },
    ])).resolves.toEqual({ answered_by: 'openai' });
  });

  it('says so when nothing is configured', async () => {
    await expect(askJson([
      { name: 'openai', key: undefined, call: ok('openai') },
      { name: 'anthropic', key: undefined, call: ok('anthropic') },
    ])).rejects.toBeInstanceOf(ModelError);
  });
});

// The failover exists for empty balances. Spending a second provider's tokens
// on a blip that would clear on its own turns one hiccup into two bills.
describe('what does NOT trigger a failover', () => {
  it('does not fail over on a timeout', async () => {
    const anthropic = ok('anthropic');
    await expect(askJson([
      { name: 'openai', key: 'k', call: broke(TIMEOUT) },
      { name: 'anthropic', key: 'k', call: anthropic },
    ])).rejects.toBe(TIMEOUT);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('does not fail over on an ordinary rate limit', async () => {
    // A bare 429 is "slow down", not "you have no money".
    const anthropic = ok('anthropic');
    await expect(askJson([
      { name: 'openai', key: 'k', call: broke(RATE_LIMIT) },
      { name: 'anthropic', key: 'k', call: anthropic },
    ])).rejects.toBe(RATE_LIMIT);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('does not fail over on a refusal, which is an answer', async () => {
    const refusal = new RefusalError('refused');
    const anthropic = ok('anthropic');
    await expect(askJson([
      { name: 'openai', key: 'k', call: broke(refusal) },
      { name: 'anthropic', key: 'k', call: anthropic },
    ])).rejects.toBe(refusal);
    expect(anthropic).not.toHaveBeenCalled();
  });
});
