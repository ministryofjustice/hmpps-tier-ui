import { AllPredictorVersionedDto } from '@ministryofjustice/hmpps-arns-frontend-components-lib/dist/types/dtos/AllPredictorVersionedDto'

export type AssessmentStatus = 'COMPLETE' | 'LOCKED_INCOMPLETE'
export type AssessmentType = 'LAYER3' | 'LAYER1'
export type ScoreLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'NOT_APPLICABLE'
export type ScoreType = 'STATIC' | 'DYNAMIC'
export type Severity = 'NO_NEED' | 'STANDARD' | 'SEVERE'
type YesNo = 'Yes' | 'No'
type Answer = 'No problems' | 'Some' | 'Significant'

export interface BasePredictorDto {
  score: number
  band: ScoreLevel
}

export interface ValidPredictor {
  score: number
  band: Exclude<ScoreLevel, 'NOT_APPLICABLE'>
}

export interface StaticOrDynamicPredictorDto extends BasePredictorDto {
  staticOrDynamic: ScoreType
}

export interface VersionedStaticOrDynamicPredictorDto extends StaticOrDynamicPredictorDto {
  algorithmVersion: string
}

export interface AllPredictorDto {
  allReoffendingPredictor?: StaticOrDynamicPredictorDto
  violentReoffendingPredictor?: StaticOrDynamicPredictorDto
  seriousViolentReoffendingPredictor?: StaticOrDynamicPredictorDto
  directContactSexualReoffendingPredictor?: BasePredictorDto
  indirectImageContactSexualReoffendingPredictor?: BasePredictorDto
  combinedSeriousReoffendingPredictor?: VersionedStaticOrDynamicPredictorDto
}

export interface OGRS4Predictors extends AllPredictorVersionedDto {
  completedDate: string
  status: AssessmentStatus
  assessmentType: AssessmentType
  outputVersion: '2'
  output: AllPredictorDto
}

export interface OASysTierInputs extends OASysSections {
  assessment: {
    assessmentId: number
    completedDate: Date
  }
}

export interface OASysSections {
  accommodation?: Section
  educationTrainingEmployability?: Section
  relationships?: RelationshipsSection
  lifestyleAndAssociates?: Section
  drugMisuse?: Section
  alcoholMisuse?: Section
  thinkingAndBehaviour?: ThinkingAndBehaviourSection
  attitudes?: Section
}

export interface Section {
  severity: Severity
}

export interface RelationshipsSection extends Section {
  severity: Severity
  parentalResponsibilities?: YesNo
}

export interface ThinkingAndBehaviourSection extends Section {
  severity: Severity
  impulsivity: Answer
  temperControl: Answer
}

export interface RiskOfSeriousHarmSummary {
  overallRiskLevel: ScoreLevel
}

export interface PredictorScoresV1 {
  completedDate?: string
  outputVersion: '1'
  output: {
    rsrPercentageScore: number
    rsrScoreLevel: ScoreLevel
  }
}

export interface PredictorScoresV2 {
  completedDate?: string
  outputVersion: '2'
  output: {
    combinedSeriousReoffendingPredictor: BandedScore
  }
}

export type PredictorScores = PredictorScoresV1 | PredictorScoresV2

export interface BandedScore {
  score: number
  band: ScoreLevel
}
