import * as jspdfModule from "jspdf";

// Interop: no navegador o default é o construtor; no servidor (SSR/Worker) o
// módulo pode chegar como { jsPDF } ou { default: { jsPDF } }.
type JsPdfCtor = typeof import("jspdf").jsPDF;
const mod = jspdfModule as unknown as {
  default?: JsPdfCtor | { jsPDF?: JsPdfCtor };
  jsPDF?: JsPdfCtor;
};
const fromDefault =
  typeof mod.default === "function"
    ? mod.default
    : (mod.default as { jsPDF?: JsPdfCtor } | undefined)?.jsPDF;
const jsPDF: JsPdfCtor = (mod.jsPDF ?? fromDefault) as JsPdfCtor;

export const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type WorkoutPdfExercise = {
  exercise_name: string;
  sets?: string | null;
  reps?: string | null;
  load_text?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
};

export type WorkoutPdfInput = {
  studentName: string;
  planName: string;
  dayOfWeek: number;
  professional?: string;
  exercises: WorkoutPdfExercise[];
  /** Nome do plano comprado (ex.: "Plano Intermediário — Evolução"). */
  tierLabel?: string | null;
  /** Resumo do objetivo do aluno. */
  summary?: string | null;
  /** Metas de treino (planos Intermediário e Avançado). */
  goals?: string[] | null;
  /** Orientação de progressão de cargas (planos Intermediário e Avançado). */
  progression?: string | null;
  /** Ex.: "Atualização a cada 15 dias". */
  updateNote?: string | null;
  /** Membro de ênfase (ex.: "Glúteos", "Peitoral"). */
  emphasis?: string | null;
  /** Tipo de treino ("tradicional", "intercalado", "circuito"). */
  workoutType?: string | null;
};

const BLUE: [number, number, number] = [230, 0, 0];
const GRAY: [number, number, number] = [110, 116, 128];
const INK: [number, number, number] = [5, 5, 5];
const PALE: [number, number, number] = [245, 245, 245];
const GOLD: [number, number, number] = [217, 119, 6];

/** Gera o PDF do treino e devolve o conteúdo em base64 (sem prefixo data:). */
export function buildWorkoutPdf(input: WorkoutPdfInput): { base64: string; fileName: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  let y = 0;

  // Extrai tags e ênfase do título se não passados diretamente
  const isIntercalado = input.workoutType === "intercalado" || /\[intercalado\]/i.test(input.planName);
  const emphasisMatch = input.emphasis || input.planName.match(/\[(?:ênfase|enfase|foco):\s*([^\]]+)\]/i)?.[1];
  const cleanPlanName = input.planName
    .replace(/\[intercalado\]/gi, "")
    .replace(/\[circuito\]/gi, "")
    .replace(/\[tradicional\]/gi, "")
    .replace(/\[(?:ênfase|enfase|foco):[^\]]+\]/gi, "")
    .trim() || "Treino";

  // Cabeçalho
  const hasExtraBadges = isIntercalado || !!emphasisMatch;
  const headerHeight = input.tierLabel ? (hasExtraBadges ? 142 : 126) : (hasExtraBadges ? 124 : 108);
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 9, headerHeight, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.circle(pageWidth - 60, 42, 22, "S");
  doc.setFontSize(8);
  doc.text("GT", pageWidth - 60, 45, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text((input.professional || "GUI TREINADOR").toUpperCase(), marginX, 28);
  doc.setFontSize(22);
  doc.text("PLANO DE TREINO", marginX, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(210, 218, 230);
  doc.text(`Aluno: ${input.studentName}`, marginX, 78);
  doc.text(
    `${cleanPlanName} · ${DAY_NAMES[input.dayOfWeek] ?? ""} · ${new Date().toLocaleDateString("pt-BR")}`,
    marginX,
    96,
  );

  let currentY = 114;
  if (hasExtraBadges) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const badges: string[] = [];
    if (isIntercalado) badges.push("MÉTODO INTERCALADO (PARES ALTERNADOS)");
    if (emphasisMatch) badges.push(`ÊNFASE: ${emphasisMatch.toUpperCase()}`);
    doc.setTextColor(255, 200, 100);
    doc.text(badges.join("   |   "), marginX, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 16;
  }

  if (input.tierLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(200, 210, 225);
    doc.text(
      input.updateNote ? `${input.tierLabel} · ${input.updateNote}` : input.tierLabel,
      marginX,
      currentY,
    );
    doc.setFont("helvetica", "normal");
  }

  y = headerHeight + 28;
  doc.setTextColor(...INK);

  const contentWidth = pageWidth - marginX * 2;

  /** Bloco de texto simples (título + linhas), com quebra de página. */
  function drawBlock(title: string, lines: string[]) {
    if (!lines.length) return;
    const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, contentWidth) as string[]);
    const blockHeight = 30 + wrapped.length * 14 + 10;
    if (y + blockHeight > pageHeight - 56) {
      doc.addPage();
      y = 64;
    }
    doc.setFillColor(...PALE);
    doc.roundedRect(marginX, y - 14, contentWidth, blockHeight, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), marginX + 12, y + 2);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(wrapped, marginX + 12, y);
    y += wrapped.length * 14 + 26;
  }

  if (input.summary) drawBlock("Seu objetivo", [input.summary]);
  if (input.goals?.length) drawBlock("Metas do treino", input.goals.map((g) => `- ${g}`));
  if (input.progression) drawBlock("Progressão de cargas", [input.progression]);

  // Remove emoji/símbolos que a fonte padrão do PDF não suporta.
  const clean = (text: string) => text.replace(/[^\u0000-\u024F•·—–\s]/gu, "").replace(/\s{2,}/g, " ").trim();

  // Título da seção de exercícios
  if (y + 40 > pageHeight - 56) { doc.addPage(); y = 64; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(`EXERCÍCIOS (${input.exercises.length})`, marginX, y);
  doc.setFillColor(...BLUE);
  doc.rect(marginX, y + 6, 40, 2.5, "F");
  y += 26;

  if (input.exercises.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text("Nenhum exercício cadastrado neste treino.", marginX, y + 4);
  }

  const cardPad = 12;
  const badge = 26;
  const textX = marginX + cardPad + badge + 12;
  const textW = contentWidth - (textX - marginX) - cardPad - 20;
  const stats = 4;
  const statGap = 6;
  const statW = (contentWidth - (textX - marginX) - cardPad - statGap * (stats - 1)) / stats;

  input.exercises.forEach((exercise, index) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    const nameLines = doc.splitTextToSize(clean(exercise.exercise_name || "-"), textW) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const noteLines = exercise.notes ? (doc.splitTextToSize(clean(exercise.notes), contentWidth - (textX - marginX) - cardPad) as string[]) : [];
    const cardH = cardPad + nameLines.length * 14 + 8 + 38 + (noteLines.length ? 8 + noteLines.length * 11 : 0) + cardPad;

    if (y + cardH > pageHeight - 56) {
      doc.addPage();
      y = 56;
    }

    const top = y;
    doc.setDrawColor(225, 225, 225);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, top, contentWidth, cardH, 6, 6, "FD");
    doc.setFillColor(...BLUE);
    doc.rect(marginX, top + 6, 3, cardH - 12, "F");

    // Número
    doc.setFillColor(...INK);
    doc.roundedRect(marginX + cardPad, top + cardPad, badge, badge, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(String(index + 1).padStart(2, "0"), marginX + cardPad + badge / 2, top + cardPad + 17, { align: "center" });

    // Nome + caixa "feito"
    let cy = top + cardPad + 11;
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    doc.text(nameLines, textX, cy);
    doc.setDrawColor(150, 150, 150);
    doc.roundedRect(marginX + contentWidth - cardPad - 13, top + cardPad, 13, 13, 2, 2, "S");
    cy += nameLines.length * 14 - 4;

    // Métricas
    const values = [
      ["SÉRIES", exercise.sets || "-"],
      ["REPETIÇÕES", exercise.reps || "-"],
      ["CARGA", exercise.load_text || "-"],
      ["DESCANSO", exercise.rest_seconds ? `${exercise.rest_seconds}s` : "-"],
    ];
    values.forEach(([label, value], i) => {
      const sx = textX + i * (statW + statGap);
      doc.setFillColor(...PALE);
      doc.roundedRect(sx, cy, statW, 38, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(label!, sx + 7, cy + 10);
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      const v = doc.splitTextToSize(clean(value!), statW - 12) as string[];
      doc.text(v.slice(0, 2), sx + 7, cy + 21);
    });
    cy += 38;

    if (noteLines.length) {
      cy += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(noteLines, textX, cy);
    }
    y = top + cardH + 10;
  });

  if (input.exercises.length > 0 && y + 40 < pageHeight - 44) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text("Anote suas cargas e marque cada exercício concluído. Priorize a técnica antes de aumentar o peso.", marginX, y + 10);
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `${input.professional || "Plano de treino"}  |  Atualizado em ${new Date().toLocaleDateString("pt-BR")}`,
      marginX,
      pageHeight - 28,
    );
    doc.text(`${page}/${pages}`, pageWidth - marginX, pageHeight - 28, { align: "right" });
  }

  const dataUri = doc.output("datauristring");
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const safeName = (input.planName || "treino").normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  return { base64, fileName: `${safeName || "treino"}.pdf` };
}

/** Converte um arquivo enviado pelo usuário em base64 (sem prefixo data:). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });
}
