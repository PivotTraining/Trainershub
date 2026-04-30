/**
 * Trainer-match quiz — sector-first drill-down.
 *
 * Step 1: pick a broad sector (fitness, mind, nutrition, sport-specific, music,
 *         academic, creative, professional, etc.) — this scopes the search.
 * Step 2: pick a sub-specialty inside that sector.
 * Step 3+: lifestyle filters (location, frequency, budget, style).
 *
 * The sub-specialty list is dynamic and depends on the chosen sector.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { markQuizComplete } from '@/components/FindMatchCard';
import { useTheme } from '@/lib/useTheme';

// ── Quiz data ──────────────────────────────────────────────────────────────────

interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  helper?: string;
  options: QuizOption[] | ((answers: Record<string, string>) => QuizOption[]);
}

const SECTOR_OPTIONS: QuizOption[] = [
  // Athletic sectors first — ordered per spec
  { id: 'basketball',   emoji: '🏀', label: 'Basketball' },
  { id: 'tennis',       emoji: '🎾', label: 'Tennis' },
  { id: 'golf',         emoji: '⛳', label: 'Golf' },
  { id: 'baseball',     emoji: '⚾', label: 'Baseball' },
  { id: 'football',     emoji: '🏈', label: 'Football' },
  { id: 'track',        emoji: '🏃', label: 'Track & running' },
  { id: 'other-sport',  emoji: '🏅', label: 'Other sport' },
  // Non-athletic
  { id: 'fitness',      emoji: '💪', label: 'Fitness & strength' },
  { id: 'mind',         emoji: '🧘', label: 'Mind & wellness' },
  { id: 'nutrition',    emoji: '🥗', label: 'Nutrition & diet' },
  { id: 'movement',     emoji: '🤸', label: 'Yoga & mobility' },
  { id: 'music',        emoji: '🎸', label: 'Music & performance' },
  { id: 'academic',     emoji: '📚', label: 'Academic & skills' },
  { id: 'creative',     emoji: '🎨', label: 'Creative & arts' },
  { id: 'professional', emoji: '💼', label: 'Career & business' },
];

const SUBSPECIALTY_BY_SECTOR: Record<string, QuizOption[]> = {
  basketball: [
    { id: 'shooting',     label: 'Shooting' },
    { id: 'ball-handling',label: 'Ball-handling & dribbling' },
    { id: 'defense',      label: 'Defense' },
    { id: 'iq',           label: 'Game IQ / film breakdown' },
    { id: 'strength',     label: 'Strength & conditioning' },
    { id: 'youth',        label: 'Youth / fundamentals' },
  ],
  tennis: [
    { id: 'forehand',  label: 'Stroke mechanics' },
    { id: 'serve',     label: 'Serve & return' },
    { id: 'doubles',   label: 'Doubles strategy' },
    { id: 'fitness',   label: 'Tennis-specific fitness' },
    { id: 'youth',     label: 'Youth / fundamentals' },
  ],
  golf: [
    { id: 'swing',     label: 'Swing mechanics' },
    { id: 'short-game',label: 'Short game' },
    { id: 'putting',   label: 'Putting' },
    { id: 'mental',    label: 'Mental game' },
    { id: 'fitness',   label: 'Golf-specific fitness' },
  ],
  baseball: [
    { id: 'hitting',  label: 'Hitting' },
    { id: 'pitching', label: 'Pitching' },
    { id: 'fielding', label: 'Fielding' },
    { id: 'strength', label: 'Strength & velocity' },
    { id: 'youth',    label: 'Youth / fundamentals' },
  ],
  football: [
    { id: 'qb',         label: 'Quarterback' },
    { id: 'wr-rb',      label: 'WR / RB skills' },
    { id: 'oline-dline',label: 'O-line / D-line' },
    { id: 'speed',      label: 'Speed & agility' },
    { id: 'strength',   label: 'Strength & power' },
    { id: 'youth',      label: 'Youth / fundamentals' },
  ],
  track: [
    { id: 'sprint',     label: 'Sprints' },
    { id: 'distance',   label: 'Distance / endurance' },
    { id: 'jumps',      label: 'Jumps' },
    { id: 'throws',     label: 'Throws' },
    { id: 'marathon',   label: 'Marathon training' },
  ],
  'other-sport': [
    { id: 'swimming',    label: 'Swimming' },
    { id: 'cycling',     label: 'Cycling' },
    { id: 'martial-arts',label: 'Martial arts / boxing' },
    { id: 'climbing',    label: 'Climbing' },
    { id: 'volleyball',  label: 'Volleyball' },
    { id: 'soccer',      label: 'Soccer' },
    { id: 'hockey',      label: 'Hockey' },
    { id: 'lacrosse',    label: 'Lacrosse' },
    { id: 'other',       label: 'Something else' },
  ],
  fitness: [
    { id: 'personal-training', label: 'Personal training' },
    { id: 'strength',          label: 'Strength & conditioning' },
    { id: 'weight-loss',       label: 'Weight loss' },
    { id: 'bodybuilding',      label: 'Bodybuilding / physique' },
    { id: 'crossfit',          label: 'CrossFit / functional' },
    { id: 'rehab',             label: 'Injury rehab' },
  ],
  mind: [
    { id: 'meditation',         label: 'Meditation & mindfulness' },
    { id: 'life-coaching',      label: 'Life coaching' },
    { id: 'mental-wellness',    label: 'Mental wellness' },
    { id: 'stress-management',  label: 'Stress & anxiety' },
    { id: 'breathwork',         label: 'Breathwork' },
  ],
  nutrition: [
    { id: 'nutritionist',       label: 'Nutritionist' },
    { id: 'dietician',          label: 'Registered dietician' },
    { id: 'meal-planning',      label: 'Meal planning' },
    { id: 'sports-nutrition',   label: 'Sports nutrition' },
  ],
  movement: [
    { id: 'yoga',         label: 'Yoga' },
    { id: 'pilates',      label: 'Pilates' },
    { id: 'mobility',     label: 'Mobility & flexibility' },
    { id: 'dance',        label: 'Dance' },
  ],
  music: [
    { id: 'guitar',      label: 'Guitar' },
    { id: 'piano',       label: 'Piano' },
    { id: 'voice',       label: 'Voice / singing' },
    { id: 'drums',       label: 'Drums' },
    { id: 'production',  label: 'Production / DJ' },
    { id: 'other-music', label: 'Another instrument' },
  ],
  academic: [
    { id: 'tutoring',     label: 'K-12 tutoring' },
    { id: 'language',     label: 'Language' },
    { id: 'test-prep',    label: 'Test prep (SAT, GRE…)' },
    { id: 'college',      label: 'College-level subject' },
    { id: 'study-skills', label: 'Study skills & ADHD coaching' },
  ],
  creative: [
    { id: 'painting',    label: 'Painting & drawing' },
    { id: 'writing',     label: 'Writing' },
    { id: 'photography', label: 'Photography' },
    { id: 'design',      label: 'Design / digital art' },
  ],
  professional: [
    { id: 'career',     label: 'Career coaching' },
    { id: 'executive',  label: 'Executive coaching' },
    { id: 'public-speaking', label: 'Public speaking' },
    { id: 'business',   label: 'Small-business mentoring' },
  ],
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'sector',
    prompt: 'What kind of trainer are you looking for?',
    helper: "Pick the area you'd like coaching in.",
    options: SECTOR_OPTIONS,
  },
  {
    id: 'specialty',
    prompt: "Let's get more specific.",
    helper: 'What exactly do you want to work on?',
    options: (answers) => SUBSPECIALTY_BY_SECTOR[answers['sector'] ?? ''] ?? [],
  },
  {
    id: 'location',
    prompt: 'Where do you prefer to train?',
    options: [
      { id: 'in-person', label: 'In-person' },
      { id: 'virtual',   label: 'Virtual' },
      { id: 'either',    label: 'Either works' },
    ],
  },
  {
    id: 'frequency',
    prompt: 'How often do you want to meet?',
    options: [
      { id: 'once',     label: 'Once a week or less' },
      { id: '2-3x',     label: '2–3 times a week' },
      { id: 'daily',    label: 'Most days' },
      { id: 'one-off',  label: 'A one-off session' },
    ],
  },
  {
    id: 'style',
    prompt: 'How would you describe your ideal coach?',
    options: [
      { id: 'high-energy', label: 'High-energy & motivating' },
      { id: 'calm',        label: 'Calm & encouraging' },
      { id: 'data-driven', label: 'Data-driven & structured' },
      { id: 'flexible',    label: 'Flexible & laid-back' },
    ],
  },
  {
    id: 'budget',
    prompt: "What's your budget per session?",
    options: [
      { id: 'under-50',  label: 'Under $50' },
      { id: '50-100',    label: '$50–$100' },
      { id: '100-150',   label: '$100–$150' },
      { id: '150-plus',  label: '$150+' },
    ],
  },
];

// ── Answer → filter mapping ────────────────────────────────────────────────────

interface DerivedFilters {
  sector?: string;
  specialty?: string;
  sessionType?: string;
  maxRateCents?: string;
  vibe?: string;
  [key: string]: string | undefined;
}

function deriveFilters(answers: Record<string, string>): DerivedFilters {
  const filters: DerivedFilters = {};

  if (answers['sector'])    filters.sector    = answers['sector'];
  if (answers['specialty']) filters.specialty = answers['specialty'];

  const loc = answers['location'];
  if (loc === 'in-person') filters.sessionType = 'in-person';
  else if (loc === 'virtual') filters.sessionType = 'virtual';

  const budget = answers['budget'];
  if (budget === 'under-50')      filters.maxRateCents = '5000';
  else if (budget === '50-100')   filters.maxRateCents = '10000';
  else if (budget === '100-150')  filters.maxRateCents = '15000';

  if (answers['style']) filters.vibe = answers['style'];

  return filters;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function Quiz() {
  const router = useRouter();
  const { colors, accent, spacing, radius, typography } = useTheme();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progress = (step + 1) / totalSteps;
  const selectedAnswer = answers[question.id];

  const options = useMemo(
    () => (typeof question.options === 'function' ? question.options(answers) : question.options),
    [question, answers],
  );

  const handleSelect = (optionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [question.id]: optionId };
      // Resetting sector should clear the dependent specialty answer
      if (question.id === 'sector' && prev['sector'] !== optionId) {
        delete next.specialty;
      }
      return next;
    });
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    } else {
      markQuizComplete();
      const filters = deriveFilters(answers);
      (router as any).replace({ pathname: '/(tabs)/browse', params: filters }); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const isLast = step === totalSteps - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: accent, width: `${progress * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.inner, { paddingHorizontal: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={[styles.backText, { color: colors.muted }]}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.stepLabel, { color: colors.muted, fontSize: typography.sm }]}>
            {step + 1} of {totalSteps}
          </Text>
        </View>

        <Text style={[styles.prompt, { color: colors.ink, fontSize: typography.xxl }]}>
          {question.prompt}
        </Text>

        {question.helper && (
          <Text style={[styles.helper, { color: colors.muted }]}>{question.helper}</Text>
        )}

        <View style={styles.optionsWrap}>
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.option,
                  {
                    borderColor: isSelected ? accent : colors.border,
                    backgroundColor: isSelected ? accent : colors.surface,
                    borderRadius: radius.lg,
                  },
                ]}
                onPress={() => handleSelect(opt.id)}
                activeOpacity={0.75}
              >
                {opt.emoji && <Text style={styles.optionEmoji}>{opt.emoji}</Text>}
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? '#fff' : colors.ink,
                      fontSize: typography.md,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: selectedAnswer ? accent : colors.disabled,
              borderRadius: radius.lg,
            },
          ]}
          onPress={handleNext}
          disabled={!selectedAnswer}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextButtonText, { fontSize: typography.md }]}>
            {isLast ? 'Show My Matches' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressTrack: { height: 4, width: '100%' },
  progressFill: { height: 4 },
  inner: { paddingTop: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { fontSize: 14, fontWeight: '500' },
  stepLabel: { fontWeight: '500' },
  prompt: { fontWeight: '700', lineHeight: 32, marginBottom: 6 },
  helper: { fontSize: 14, marginBottom: 22 },
  optionsWrap: { gap: 10 },
  option: {
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionEmoji: { fontSize: 22 },
  optionText: { fontWeight: '500', flex: 1 },
  footer: { paddingTop: 12 },
  nextButton: { alignItems: 'center', paddingVertical: 15 },
  nextButtonText: { color: '#fff', fontWeight: '600' },
});
