import type { Question } from "@quizarena/shared";
import { prisma } from "../prisma";

const CATEGORY_MAP: Record<string, number> = {
  "General": 9,
  "Science": 17,
  "History": 23,
  "Geography": 22,
  "Entertainment": 11
};

// Emergency fallback questions if API fails and DB is empty
const EMERGENCY_QUESTIONS: Question[] = [
  {
    id: "fallback_01",
    text: "¿Cuál es el lenguaje de programación estándar utilizado para dar estilo a las páginas web?",
    options: ["CSS", "HTML", "JavaScript", "SQL"],
    category: "General",
    difficulty: "easy"
  },
  {
    id: "fallback_02",
    text: "¿Cuál es el planeta más grande de nuestro sistema solar?",
    options: ["Júpiter", "Saturno", "Tierra", "Marte"],
    category: "Science",
    difficulty: "easy"
  },
  {
    id: "fallback_03",
    text: "¿En qué año cayó el Muro de Berlín?",
    options: ["1989", "1991", "1985", "1993"],
    category: "History",
    difficulty: "medium"
  },
  {
    id: "fallback_04",
    text: "¿Cuál es la capital de Australia?",
    options: ["Canberra", "Sídney", "Melbourne", "Brisbane"],
    category: "Geography",
    difficulty: "medium"
  },
  {
    id: "fallback_05",
    text: "¿Qué director de cine dirigió la película 'Inception' (Origen)?",
    options: ["Christopher Nolan", "Steven Spielberg", "Quentin Tarantino", "Martin Scorsese"],
    category: "Entertainment",
    difficulty: "easy"
  }
];

function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú');
}

export class QuestionService {
  /**
   * Fetch 10 questions for a category.
   * Connects to Open Trivia DB with fallback options.
   */
  public async getQuestions(category: string, amount: number = 10): Promise<Question[]> {
    const categoryId = CATEGORY_MAP[category];
    const categoryQuery = categoryId ? `&category=${categoryId}` : "";
    const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple${categoryQuery}`;

    try {
      console.log(`[Trivia API] Fetching ${amount} questions from URL: ${url}`);
      
      // Node 18+ has native fetch
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OpenTriviaDB returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (data.response_code !== 0 || !data.results || data.results.length === 0) {
        throw new Error(`OpenTriviaDB returned response code ${data.response_code}`);
      }

      // Convert and format questions
      const questions: Question[] = data.results.map((q: any, index: number) => {
        // Decode HTML Entities
        const text = decodeHtml(q.question);
        const correctAnswer = decodeHtml(q.correct_answer);
        const incorrectAnswers = q.incorrect_answers.map((ans: string) => decodeHtml(ans));

        // Combine and shuffle options
        const options = [correctAnswer, ...incorrectAnswers];
        // Fisher-Yates shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        return {
          id: `otdb_${Date.now()}_${index}`,
          text,
          options,
          category: q.category,
          difficulty: q.difficulty,
          correctAnswer // Secret correct answer for scoring (private)
        };
      });

      console.log(`[Trivia API] Successfully loaded ${questions.length} questions.`);
      return questions;
    } catch (error: any) {
      console.warn(`[Trivia API ERROR] Fallback enabled: ${error.message}`);
      return await this.getFallbackQuestions(category, amount);
    }
  }

  /**
   * Fallback: loads questions from local database, or returns emergency in-code questions.
   */
  private async getFallbackQuestions(category: string, amount: number): Promise<Question[]> {
    try {
      // 1. Try to load from database
      const dbQuestions = await prisma.question.findMany({
        where: {
          category: category !== "General" ? category : undefined,
        },
        take: amount,
      });

      if (dbQuestions && dbQuestions.length > 0) {
        console.log(`[Trivia Fallback] Loaded ${dbQuestions.length} questions from SQLite.`);
        return dbQuestions.map((dbQ) => {
          let options: string[] = [];
          try {
            options = JSON.parse(dbQ.options);
          } catch {
            options = dbQ.options.split(","); // fallback parsing
          }

          return {
            id: dbQ.id,
            text: dbQ.text,
            options,
            category: dbQ.category,
            difficulty: dbQ.difficulty,
            correctAnswer: dbQ.answer // Secret correct answer for scoring
          } as Question & { correctAnswer: string };
        });
      }
    } catch (dbError) {
      console.error("[Trivia Fallback DB Error]", dbError);
    }

    // 2. Return code fallback questions
    console.log("[Trivia Fallback Emergency] Returning in-code static questions.");
    const filtered = EMERGENCY_QUESTIONS.filter(
      (q) => category === "General" || q.category.toLowerCase() === category.toLowerCase()
    );
    
    const results = filtered.length > 0 ? filtered : EMERGENCY_QUESTIONS;

    // Map secret correct answer for emergency questions
    return results.slice(0, amount).map((q) => {
      // Find what was the correct option (we match with the static answers index 0 originally before any shuffle,
      // but in EMERGENCY_QUESTIONS we predefined correct as options[0] in our array design)
      // Our EMERGENCY_QUESTIONS array structure has correct answer as the FIRST option originally:
      // ["CSS", "HTML", ...], CSS is correct.
      // So we map it before any potential clientside shuffling.
      return {
        ...q,
        correctAnswer: q.options[0]
      };
    });
  }
}

export const questionService = new QuestionService();
