import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/lib/useTheme';

// ── Quiz data ──────────────────────────────────────────────────────────────────

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'goal',
    prompt: "What's your primary goal?",
    options: [
      { id: 'lose-weight',       label: 'Lose weight' },
      { id: 'build-muscle',      label: 'Build muscle' },
      { id: 'mental-wellness',   label: 'Mental wellness' },
      { id: 'nutrition',         label: 'Nutrition' },
      { id: 'flexibility',       label: 'Flexibility & mobility' },
      { id: 'general-fitness',   label: 'General fitness' },
    ],
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
    id: 'style',
    prompt: "How would you describe your ideal trainer's style?",
    options: [
      { id: 'high-energy',  label: 'High energy & intense' },
      { id: 'calm',         label: 'Calm & encouraging' },
      { id: 'data-driven',  label: 'Data-driven & structured' },
      { id: 'spiritual',    label: 'Spiritual & mindful' },
    ],
  },
  {
    id: 'frequency',
    prompt: 'How often do you want to train?',
    options: [
      { id: 'once',    label: 'Once a week' },
      { id: '2-3x',    label: '2–3x per week' },
      { id: 'daily',   label: 'Daily' },
    ],
  },
  {
    id: 'budget',
    prompt: "What's your budget per session?",
    options: [
      { id: 'under-50',   label: 'Under $50' },
      { id: '50-100',     label: '$50–$100' },
      { id: '100-150',    label: '$100–$150' },
      { id: '150-plus',   label: '$150+' },
    ],
  },
];

// ── Answer → filter mapping ────────────────────────────────────────────────────

interface DerivedFilters {
  specialty?: string;
  sessionType?: string;
  maxRateCents?: string;
  [key: string]: string | undefined;
}

function deriveFilters(answers: Record<string, string>): DerivedFilters {
  const filters: DerivedFilters = {};

  // Goal → specialty
  const goalMap: Record<string, string> = {
    'lose-weight':     'fitness',
    'build-muscle':    'fitness',
    'mental-wellness': 'mental wellness',
    'nutrition':       'nutrition',
    'flexibility':     'yoga',
    'general-fitness': 'fitness',
  };
  const goal = answers['goal'];
  if (goal && goalMap[goal]) {
    filters.specialty = goalMap[goal];
  }

  // Location → sessionType
  const loc = answers['location'];
  if (loc === 'in-person') filters.sessionType = 'in-person';
  else if (loc === 'virtual') filters.sessionType = 'virtual';

  // Budget → maxRateCents
  const budget = answers['budget'];
  if (budget === 'under-50') filters.maxRateCents = '5000';
  else if (budget === '50-100') filters.maxRateCents = '10000';
  else if (budget === '100-150') filters.maxRateCents = '15000';

  return filters;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function Quiz() {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progress = (step + 1) / totalSteps;
  const selectedAnswer = answers[question.id];

  const handleSelect = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    } else {
      const filters = deriveFilters(answers);
      (router as any).replace({ pathname: '/(tabs)/browse', params: filters }); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  };

  const isLast = step === totalSteps - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.ink,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>

      <View style={[styles.inner, { paddingHorizontal: spacing.lg }]}>
        {/* Step counter */}
        <Text style={[styles.stepLabel, { color: colors.muted, fontSize: typography.sm }]}>
          Question {step + 1} of {totalSteps}
        </Text>

        {/* Question */}
        <Text style={[styles.prompt, { color: colors.ink, fontSize: typography.xxl }]}>
          {question.prompt}
        </Text>

        {/* Options */}
        <View style={styles.optionsWrap}>
          {question.options.map((opt) => {
            const isSelected = selectedAnswer === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.option,
                  {
                    borderColor: isSelected ? colors.ink : colors.border,
                    backgroundColor: isSelected ? colors.ink : colors.surface,
                    borderRadius: radius.lg,
                  },
                ]}
                onPress={() => handleSelect(opt.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? colors.white : colors.ink,
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
      </View>

      {/* Next / Finish button */}
      <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: selectedAnswer ? colors.ink : colors.disabled,
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
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
  },
  inner: {
    flex: 1,
    paddingTop: 32,
  },
  stepLabel: {
    fontWeight: '500',
    marginBottom: 12,
  },
  prompt: {
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 28,
  },
  optionsWrap: {
    gap: 10,
  },
  option: {
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  optionText: {
    fontWeight: '500',
  },
  footer: {
    paddingTop: 12,
  },
  nextButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
