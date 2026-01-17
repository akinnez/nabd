import { signal } from "../core/signals";

export function resource<T>(fetcher: () => Promise<T>) {
  const data = signal<T | undefined>(undefined);
  const loading = signal(true);
  const error = signal<any>(null);

  const exec = async () => {
    loading.set(true);
    try { data.set(await fetcher()); error.set(null); }
    catch (e) { error.set(e); }
    finally { loading.set(false); }
  };

  exec();
  return { data, loading, error, refetch: exec };
}