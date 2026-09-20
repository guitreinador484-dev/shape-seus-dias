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
};

const BLUE: [number, number, number] = [37, 99, 235];
const GRAY: [number, number, number] = [110, 116, 128];
const INK: [number, number, number] = [17, 24, 39];
const PALE: [number, number, number] = [239, 246, 255];

/** Gera o PDF do treino e devolve o conteúdo em base64 (sem prefixo data:). */
export function buildWorkoutPdf(input: WorkoutPdfInput): { base64: string; fileName: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  let y = 0;

  // Cabeçalho
  const headerHeight = input.tierLabel ? 126 : 108;
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
    `${input.planName || "Treino"} · ${DAY_NAMES[input.dayOfWeek] ?? ""} · ${new Date().toLocaleDateString("pt-BR")}`,
    marginX,
    96,
  );
  if (input.tierLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      input.updateNote ? `${input.tierLabel} · ${input.updateNote}` : input.tierLabel,
      marginX,
      115,
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
    y += wrapped.length * 14 + 20;
  }

  if (input.summary) drawBlock("Seu objetivo", [input.summary]);
  if (input.goals?.length) drawBlock("Metas do treino", input.goals.map((g) => `- ${g}`));
  if (input.progression) drawBlock("Progressão de cargas", [input.progression]);

  const cols = [
    { label: "Exercício", x: marginX + 8, w: 156 },
    { label: "Séries", x: marginX + 170, w: 43 },
    { label: "Reps", x: marginX + 218, w: 48 },
    { label: "Carga", x: marginX + 272, w: 74 },
    { label: "Pausa", x: marginX + 352, w: 52 },
    { label: "Feito", x: marginX + 420, w: 42 },
  ];

  function drawHeader() {
    doc.setFillColor(...INK);
    doc.roundedRect(marginX, y - 15, contentWidth, 25, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    cols.forEach((col) => doc.text(col.label, col.x, y + 2));
    doc.setTextColor(20, 20, 20);
    y += 26;
  }

  drawHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (input.exercises.length === 0) {
    doc.setTextColor(...GRAY);
    doc.text("Nenhum exercício cadastrado neste treino.", marginX, y + 4);
  }

  input.exercises.forEach((exercise, index) => {
    const nameLines = doc.splitTextToSize(exercise.exercise_name || "-", cols[0]!.w);
    const noteLines = exercise.notes ? doc.splitTextToSize(`Obs.: ${exercise.notes}`, pageWidth - marginX * 2) : [];
    const rowHeight = Math.max(nameLines.length, 1) * 14 + noteLines.length * 12 + 18;

    if (y + rowHeight > pageHeight - 56) {
      doc.addPage();
      y = 64;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    if (index % 2 === 1) {
      doc.setFillColor(247, 249, 252);
      doc.rect(marginX, y - 12, contentWidth, rowHeight, "F");
    }

    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(nameLines, cols[0]!.x, y);
    doc.setFont("helvetica", "normal");
    doc.text(exercise.sets || "-", cols[1]!.x, y);
    doc.text(exercise.reps || "-", cols[2]!.x, y);
    doc.text(exercise.load_text || "-", cols[3]!.x, y);
    doc.text(exercise.rest_seconds ? `${exercise.rest_seconds}s` : "-", cols[4]!.x, y);
    doc.setDrawColor(150, 160, 175);
    doc.rect(cols[5]!.x + 5, y - 8, 10, 10, "S");

    let innerY = y + Math.max(nameLines.length, 1) * 13;
    if (noteLines.length) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      doc.text(noteLines, cols[0]!.x, innerY);
      innerY += noteLines.length * 12;
      doc.setFontSize(10);
    }
    y = innerY + 12;
  });

  if (input.exercises.length > 0 && y + 48 < pageHeight - 44) {
    y += 8;
    doc.setDrawColor(215, 220, 228);
    doc.line(marginX, y, pageWidth - marginX, y);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Anote suas cargas e marque cada exercício concluído. Priorize a técnica antes de aumentar o peso.", marginX, y + 18);
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
