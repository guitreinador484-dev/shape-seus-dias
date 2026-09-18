import { useCallback, useEffect, useState } from "react";
import { getMyGym, listGyms, setMyGym, type Gym } from "@/lib/exercise-videos";

/** Academia de Volta Redonda escolhida pelo aluno (fica salva na conta dele). */
export function useGymPreference(userId: string | null | undefined) {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymId, setGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([listGyms(), getMyGym(userId)])
      .then(([allGyms, saved]) => {
        if (!alive) return;
        setGyms(allGyms.filter((g) => g.is_active));
        setGymId(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const choose = useCallback(
    async (next: string | null) => {
      if (!userId) return;
      setGymId(next);
      await setMyGym(userId, next);
    },
    [userId],
  );

  return { gyms, gymId, choose, loading, needsChoice: !loading && !gymId && gyms.length > 0 };
}
