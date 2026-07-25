// Web shim: the UI kit never talks to Supabase at render time, but
// CategoryChip → lib/prayers imports the client module, whose real version
// boots createClient() with app env vars at module load. Any actual use in
// the browser bundle is a bug; throw loudly.
export const supabase: any = new Proxy(
  {},
  {
    get() {
      throw new Error('supabase is not part of the design-system bundle');
    },
  }
);
