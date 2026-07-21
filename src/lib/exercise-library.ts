import peito from "@/assets/exercises/peito.jpg";
import costas from "@/assets/exercises/costas.jpg";
import pernas from "@/assets/exercises/pernas.jpg";
import ombros from "@/assets/exercises/ombros.jpg";
import biceps from "@/assets/exercises/biceps.jpg";
import triceps from "@/assets/exercises/triceps.jpg";
import abdomen from "@/assets/exercises/abdomen.jpg";
import gluteos from "@/assets/exercises/gluteos.jpg";
import antebraco from "@/assets/exercises/antebraco.jpg";
import cardio from "@/assets/exercises/cardio.jpg";

export type ExerciseGroup = {
  key: string;
  name: string;
  emoji: string;
  image: string;
  description: string;
  beginners: string[];
  exercises: string[];
};

export const EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    key: "peito", name: "Peito", emoji: "💪", image: peito,
    description: "Trabalha os músculos do peito. Ajuda a deixar a parte da frente do corpo mais forte e definida.",
    beginners: ["Flexão inclinada", "Supino na máquina", "Supino reto com halteres"],
    exercises: [
      "Supino reto com barra","Supino inclinado com barra","Supino declinado com barra",
      "Supino reto com halteres","Supino inclinado com halteres","Crucifixo reto com halteres",
      "Crucifixo inclinado com halteres","Crossover na polia alta","Crossover na polia baixa",
      "Peck deck (voador)","Flexão de braço tradicional","Flexão diamante",
      "Flexão inclinada","Flexão declinada","Pullover com halter",
      "Supino na máquina","Mergulho em paralelas (peito)",
    ],
  },
  {
    key: "costas", name: "Costas", emoji: "🔙", image: costas,
    description: "Fortalece as costas e melhora a postura. Ótimo para quem passa o dia sentado.",
    beginners: ["Puxada frontal na polia", "Remada na máquina", "Remada baixa na polia (triângulo)"],
    exercises: [
      "Barra fixa pegada pronada","Barra fixa pegada supinada","Puxada frontal na polia",
      "Puxada atrás na polia","Remada curvada com barra","Remada cavalinho",
      "Remada baixa na polia (triângulo)","Remada unilateral com halter","Remada na máquina",
      "Pulldown com pegada neutra","Levantamento terra convencional","Levantamento terra sumô",
      "Stiff (terra romeno)","Encolhimento com barra","Encolhimento com halteres",
      "Hiperextensão lombar","Pullover na polia alta",
    ],
  },
  {
    key: "pernas", name: "Pernas", emoji: "🦵", image: pernas,
    description: "Fortalece coxas, quadríceps e posterior. Base para qualquer treino, dá firmeza no dia a dia.",
    beginners: ["Leg press 45º", "Cadeira extensora", "Cadeira flexora"],
    exercises: [
      "Agachamento livre","Agachamento frontal","Agachamento búlgaro","Agachamento sumô",
      "Leg press 45º","Leg press horizontal","Hack squat","Avanço com halteres",
      "Passada (walking lunge)","Cadeira extensora","Cadeira flexora","Mesa flexora",
      "Stiff com halteres","Stiff com barra","Afundo no smith","Levantamento terra romeno",
      "Panturrilha em pé","Panturrilha sentado","Panturrilha no leg press",
      "Step up no banco","Agachamento goblet","Cadeira adutora",
    ],
  },
  {
    key: "ombros", name: "Ombros", emoji: "🏋️", image: ombros,
    description: "Deixa os ombros mais largos e fortes. Melhora a postura e o formato do tronco.",
    beginners: ["Desenvolvimento na máquina", "Elevação lateral com halteres", "Elevação frontal com halteres"],
    exercises: [
      "Desenvolvimento militar com barra","Desenvolvimento com halteres","Desenvolvimento Arnold",
      "Desenvolvimento na máquina","Elevação lateral com halteres","Elevação lateral na polia",
      "Elevação frontal com halteres","Elevação frontal com anilha","Crucifixo invertido (posterior)",
      "Face pull na polia","Encolhimento para trapézio","Remada alta com barra",
      "Elevação lateral inclinada (posterior)",
    ],
  },
  {
    key: "biceps", name: "Bíceps", emoji: "💪", image: biceps,
    description: "Trabalha o músculo da frente do braço — aquele que aparece quando você dobra o cotovelo.",
    beginners: ["Rosca direta com barra", "Rosca alternada com halteres", "Rosca martelo"],
    exercises: [
      "Rosca direta com barra","Rosca direta com barra W","Rosca alternada com halteres",
      "Rosca martelo","Rosca concentrada","Rosca scott com barra","Rosca scott com halter",
      "Rosca na polia baixa","Rosca 21","Rosca inversa","Rosca cabo corda",
    ],
  },
  {
    key: "triceps", name: "Tríceps", emoji: "🔱", image: triceps,
    description: "Trabalha a parte de trás do braço. Ajuda a tirar a 'flacidez' e dar volume ao braço.",
    beginners: ["Tríceps pulley (corda)", "Tríceps na máquina", "Mergulho no banco"],
    exercises: [
      "Tríceps pulley (corda)","Tríceps pulley (barra)","Tríceps testa com barra W",
      "Tríceps francês com halter","Tríceps coice com halter","Mergulho em paralelas",
      "Mergulho no banco","Tríceps na máquina","Supino fechado","Flexão diamante",
      "Tríceps unilateral na polia",
    ],
  },
  {
    key: "abdomen", name: "Abdômen", emoji: "🔥", image: abdomen,
    description: "Fortalece a barriga e o core. Melhora a postura e protege a coluna.",
    beginners: ["Abdominal supra", "Prancha frontal", "Elevação de pernas suspenso"],
    exercises: [
      "Abdominal supra","Abdominal infra","Abdominal oblíquo","Abdominal bicicleta",
      "Prancha frontal","Prancha lateral","Elevação de pernas suspenso",
      "Abdominal canivete","Abdominal na polia (rezador)","Abdominal na máquina",
      "Russian twist","Mountain climber","Ab wheel (roda abdominal)","Dead bug",
    ],
  },
  {
    key: "gluteos", name: "Glúteos", emoji: "🍑", image: gluteos,
    description: "Modela e fortalece o bumbum. Também ajuda muito na postura e na força das pernas.",
    beginners: ["Elevação pélvica com barra (hip thrust)", "Glúteo na máquina", "Cadeira abdutora"],
    exercises: [
      "Elevação pélvica com barra (hip thrust)","Elevação pélvica unilateral","Glúteo na polia (coice)",
      "Glúteo na máquina","Agachamento sumô com halter","Avanço (lunge)","Passada com halteres",
      "Cadeira abdutora","Abdução em pé na polia","Ponte de glúteo no chão",
      "Bom dia (good morning)","Búlgaro com halteres",
    ],
  },
  {
    key: "antebraco", name: "Antebraço", emoji: "🤜", image: antebraco,
    description: "Fortalece o antebraço e melhora a pegada — útil pra pegar peso e para o dia a dia.",
    beginners: ["Rosca martelo", "Rosca de punho (palma para cima)", "Caminhada do fazendeiro (farmer's walk)"],
    exercises: [
      "Rosca de punho (palma para cima)","Rosca de punho invertida","Rosca martelo",
      "Rosca inversa com barra W","Caminhada do fazendeiro (farmer's walk)",
      "Pegada estática (dead hang)","Enrolar corda com peso",
    ],
  },
  {
    key: "cardio", name: "Cardio / Funcional", emoji: "🏃", image: cardio,
    description: "Melhora o fôlego, queima gordura e dá energia. Escolha o que você tem mais facilidade em fazer.",
    beginners: ["Esteira (corrida)", "Bicicleta ergométrica", "Polichinelo (jumping jack)"],
    exercises: [
      "Esteira (corrida)","Bicicleta ergométrica","Elíptico","Escada (stair master)",
      "Pular corda","Burpee","Mountain climber","Polichinelo (jumping jack)",
      "Agachamento com salto","Kettlebell swing","Battle rope","Box jump",
      "Sprint na esteira","HIIT 30s/30s",
    ],
  },
];
