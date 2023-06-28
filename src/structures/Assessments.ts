interface MajorAssessmentData {
  name: string;
  schoolYear: string;
  rawScore: number;
  scaleScore: number;
  performanceLevel: string;
}

interface MCASData extends MajorAssessmentData {
  performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
}


export namespace Assessments {
  export class MajorAssessment {
    name: string;
    schoolYear: string;
    rawScore: number;
    scaleScore: number;
    performanceLevel: string;
  
    constructor(data: MajorAssessmentData) {
      this.name = data.name;
      this.schoolYear = data.schoolYear;
      this.rawScore = data.rawScore;
      this.scaleScore = data.scaleScore;
      this.performanceLevel = data.performanceLevel;
    }
  }
  
  export class MCAS extends MajorAssessment {
    performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
    subject?: string;

    constructor (data: MCASData) {
      super({
        ...data,
        name: 'MCAS',
      });
      this.performanceLevel = data.performanceLevel;
      this.subject;
    }
  
    getAchievementLevel(): string {
      switch (this.performanceLevel) {
      case 'NM':
        return 'Not Meeting Expectations';
      case 'PM':
        return 'Partially Meeting Expectations';
      case 'M':
        return 'Meeting Expectations';
      case 'E':
        return 'Exceeding Expectations';
      case 'A':
        return 'Advanced';
      case 'P':
        return 'Proficient';
      case 'NI':
        return 'Needs Improvement';
      case 'F':
        return 'Failing';
      }
    }
  }
}