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

/** Gera o PDF do treino e devolve o conteúdo em base64 (sem prefixo data:). */
export function buildWorkoutPdf(input: WorkoutPdfInput): { base64: string; fileName: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  let y = 0;

  // Cabeçalho
  const headerHeight = input.tierLabel ? 110 : 92;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(input.professional || "Plano de Treino", marginX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Aluno: ${input.studentName}`, marginX, 64);
  doc.text(
    `${input.planName || "Treino"} · ${DAY_NAMES[input.dayOfWeek] ?? ""} · ${new Date().toLocaleDateString("pt-BR")}`,
    marginX,
    80,
  );
  if (input.tierLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      input.updateNote ? `${input.tierLabel} · ${input.updateNote}` : input.tierLabel,
      marginX,
      98,
    );
    doc.setFont("helvetica", "normal");
  }

  y = headerHeight + 36;
  doc.setTextColor(20, 20, 20);

  const contentWidth = pageWidth - marginX * 2;

  /** Bloco de texto simples (título + linhas), com quebra de página. */
  function drawBlock(title: string, lines: string[]) {
    if (!lines.length) return;
    const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, contentWidth) as string[]);
    const blockHeight = 20 + wrapped.length * 13 + 12;
    if (y + blockHeight > pageHeight - 56) {
      doc.addPage();
      y = 64;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(title, marginX, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 13 + 14;
  }

  if (input.summary) drawBlock("Seu objetivo", [input.summary]);
  if (input.goals?.length) drawBlock("Metas do treino", input.goals.map((g) => `• ${g}`));
  if (input.progression) drawBlock("Progressão de cargas", [input.progression]);

  const cols = [
    { label: "Exercício", x: marginX, w: 170 },
    { label: "Séries", x: marginX + 176, w: 52 },
    { label: "Reps", x: marginX + 232, w: 56 },
    { label: "Carga", x: marginX + 292, w: 70 },
    { label: "Descanso", x: marginX + 366, w: 70 },
  ];

  function drawHeader() {
    doc.setFillColor(238, 242, 255);
    doc.rect(marginX - 8, y - 14, pageWidth - (marginX - 8) * 2, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
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
    const rowHeight = Math.max(nameLines.length, 1) * 13 + noteLines.length * 12 + 12;

    if (y + rowHeight > pageHeight - 56) {
      doc.addPage();
      y = 64;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX - 8, y - 12, pageWidth - (marginX - 8) * 2, rowHeight, "F");
    }

    doc.setTextColor(20, 20, 20);
    doc.text(nameLines, cols[0]!.x, y);
    doc.text(exercise.sets || "-", cols[1]!.x, y);
    doc.text(exercise.reps || "-", cols[2]!.x, y);
    doc.text(exercise.load_text || "-", cols[3]!.x, y);
    doc.text(exercise.rest_seconds ? `${exercise.rest_seconds}s` : "-", cols[4]!.x, y);

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

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `${input.professional || "Plano de treino"} · gerado em ${new Date().toLocaleDateString("pt-BR")}`,
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
