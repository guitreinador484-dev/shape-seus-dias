import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isDoneThisWeek, startOfTrainingWeek } from "./platform-data";

describe("semana de treino", () => {
  it("começa na segunda, mesmo quando hoje é domingo", () => {
    const sunday = new Date(2026, 10, 8, 15, 0);
    const start = startOfTrainingWeek(sunday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(2);
    expect(start.getHours()).toBe(0);
  });

  it("mantém a segunda como início quando hoje é segunda", () => {
    expect(startOfTrainingWeek(new Date(2026, 10, 9, 6, 0)).getDate()).toBe(9);
  });

  it("só considera feito o que foi marcado nesta semana", () => {
    const wednesday = new Date(2026, 10, 11, 10, 0);
    expect(isDoneThisWeek(new Date(2026, 10, 9, 18, 0).toISOString(), wednesday)).toBe(true);
    expect(isDoneThisWeek(new Date(2026, 10, 8, 18, 0).toISOString(), wednesday)).toBe(false);
    expect(isDoneThisWeek(null, wednesday)).toBe(false);
  });
});
