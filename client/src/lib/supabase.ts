// Frontend-only stub for Supabase.
// You said you're not using a backend right now, so this file is made safe
// to import without requiring any environment variables.

// If you later add a real Supabase backend, replace this stub with the
// official client setup using your project URL and anon key.

// Minimal "no-op" supabase object that matches the methods your code may call.
// All methods just log a warning and return a safe placeholder.

type SupabaseResult<T = any> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

type AnyFn = (...args: any[]) => Promise<SupabaseResult>;

const makeWarning = (method: string) =>
  `[Supabase stub] Called ${method} but Supabase is not configured.`;

const makeNoopFn =
  (name: string): AnyFn =>
  async () => {
    console.warn(makeWarning(name));
    return { data: null, error: new Error('Supabase is not configured (frontend-only mode).') };
  };

type QueryBuilder<T = null> = Promise<SupabaseResult<T>> & {
  select: (...args: any[]) => QueryBuilder<T>;
  insert: (...args: any[]) => QueryBuilder<T>;
  update: (...args: any[]) => QueryBuilder<T>;
  delete: (...args: any[]) => QueryBuilder<T>;
  eq: (...args: any[]) => QueryBuilder<T>;
  in: (...args: any[]) => QueryBuilder<T>;
  ilike: (...args: any[]) => QueryBuilder<T>;
  gt: (...args: any[]) => QueryBuilder<T>;
  not: (...args: any[]) => QueryBuilder<T>;
  or: (...args: any[]) => QueryBuilder<T>;
  contains: (...args: any[]) => QueryBuilder<T>;
  lt: (...args: any[]) => QueryBuilder<T>;
  gte: (...args: any[]) => QueryBuilder<T>;
  lte: (...args: any[]) => QueryBuilder<T>;
  limit: (...args: any[]) => QueryBuilder<T>;
  order: (...args: any[]) => QueryBuilder<T>;
  single: (...args: any[]) => QueryBuilder<T>;
};

const createQueryBuilder = <T = any>(name: string): QueryBuilder<T> => {
  const warn = (method: string) => console.warn(makeWarning(method));
  const makeChain =
    (method: string) =>
    (..._args: any[]) => {
      warn(method);
      return builder;
    };

  const promise = Promise.resolve<SupabaseResult<T>>({
    data: null,
    error: new Error('Supabase is not configured (frontend-only mode).'),
    count: null,
  });

  const builder: Partial<QueryBuilder<T>> = {
    select: makeChain(`${name}.select`),
    insert: makeChain(`${name}.insert`),
    update: makeChain(`${name}.update`),
    delete: makeChain(`${name}.delete`),
    eq: makeChain(`${name}.eq`),
    in: makeChain(`${name}.in`),
    ilike: makeChain(`${name}.ilike`),
    gt: makeChain(`${name}.gt`),
    not: makeChain(`${name}.not`),
    or: makeChain(`${name}.or`),
    contains: makeChain(`${name}.contains`),
    lt: makeChain(`${name}.lt`),
    gte: makeChain(`${name}.gte`),
    lte: makeChain(`${name}.lte`),
    limit: makeChain(`${name}.limit`),
    order: makeChain(`${name}.order`),
    single: makeChain(`${name}.single`),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return builder as QueryBuilder<T>;
};

export const supabase = {
  auth: {
    signInWithPassword: makeNoopFn('auth.signInWithPassword'),
    signUp: makeNoopFn('auth.signUp'),
    signOut: makeNoopFn('auth.signOut'),
    resetPasswordForEmail: makeNoopFn('auth.resetPasswordForEmail'),
    verifyOtp: makeNoopFn('auth.verifyOtp'),
    updateUser: makeNoopFn('auth.updateUser'),
    getUser: makeNoopFn('auth.getUser'),
    getSession: makeNoopFn('auth.getSession'),
  },
  rpc(name: string, _params?: Record<string, any>) {
    console.warn(makeWarning(`rpc(${name})`));
    return Promise.resolve<SupabaseResult<any>>({
      data: null,
      error: new Error('Supabase RPC is not configured (frontend-only mode).'),
      count: null,
    });
  },
  from(table: string) {
    return createQueryBuilder(`from(${table})`);
  },
};
