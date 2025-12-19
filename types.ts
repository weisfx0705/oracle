
export interface Poem {
  id: number;
  content: string[];
}

export enum AppStep {
  QUESTION = 'question',
  PICKER = 'picker',
  RESULT = 'result',
}

export interface RandomSeed {
  letter: string;
  number: number;
}
