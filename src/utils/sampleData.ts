import { AppDatabase, Metric, UserProfile } from '../types';
import { getTodayIso, shiftDate, getWeekRange } from './dateUtils';

export function createInitialDatabase(): AppDatabase {
  const today = getTodayIso(); // 2026-09-08
  const weekInfo = getWeekRange(today);
  const monday = weekInfo.start; // 2026-09-07
  const tuesday = today;

  const defaultProfile: UserProfile = {
    name: 'Abhinav Dhakal',
    age: 25,
    occupation: 'Founder',
    currency: 'Rs.',
    onboardingCompleted: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const defaultMetrics: Metric[] = [
    {
      id: 'metric-deep-work',
      name: 'Deep Work',
      type: 'duration',
      category: 'Work',
      unit: 'hrs',
      targetValue: 25,
      targetPeriod: 'week',
      color: '#38bdf8',
      icon: 'Clock',
      isDefaultQuickLog: true,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-exercise',
      name: 'Exercise',
      type: 'duration',
      category: 'Health',
      unit: 'hrs',
      targetValue: 4,
      targetPeriod: 'week',
      color: '#34d399',
      icon: 'Dumbbell',
      isDefaultQuickLog: true,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-reading',
      name: 'Reading',
      type: 'duration',
      category: 'Learning',
      unit: 'hrs',
      targetValue: 3,
      targetPeriod: 'week',
      color: '#a78bfa',
      icon: 'BookOpen',
      isDefaultQuickLog: true,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-spent',
      name: 'Money Spent',
      type: 'currency',
      category: 'Money',
      unit: 'Rs.',
      targetValue: 25000,
      targetPeriod: 'month',
      color: '#f87171',
      icon: 'CreditCard',
      isDefaultQuickLog: true,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-income',
      name: 'Income',
      type: 'currency',
      category: 'Money',
      unit: 'Rs.',
      targetValue: 100000,
      targetPeriod: 'month',
      color: '#34d399',
      icon: 'TrendingUp',
      isDefaultQuickLog: false,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-projects',
      name: 'Projects Shipped',
      type: 'number',
      category: 'Work',
      unit: 'items',
      targetValue: 3,
      targetPeriod: 'week',
      color: '#fbbf24',
      icon: 'Rocket',
      isDefaultQuickLog: false,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'metric-tasks',
      name: 'Tasks Completed',
      type: 'number',
      category: 'Work',
      unit: 'tasks',
      targetValue: 25,
      targetPeriod: 'week',
      color: '#818cf8',
      icon: 'CheckSquare',
      isDefaultQuickLog: false,
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  return {
    version: 1,
    profile: defaultProfile,
    settings: {
      currencySymbol: 'Rs.',
      theme: 'obsidian',
      weekStartsOnMonday: true,
    },
    metrics: defaultMetrics,
    entries: [
      // Monday entries (2026-09-07)
      { id: 'e-1', metricId: 'metric-deep-work', value: 300, date: monday, createdAt: monday }, // 5h
      { id: 'e-2', metricId: 'metric-exercise', value: 45, date: monday, createdAt: monday }, // 45m
      { id: 'e-3', metricId: 'metric-reading', value: 40, date: monday, createdAt: monday }, // 40m
      { id: 'e-4', metricId: 'metric-spent', value: 1200, date: monday, createdAt: monday },
      { id: 'e-5', metricId: 'metric-projects', value: 1, date: monday, createdAt: monday },
      { id: 'e-6', metricId: 'metric-tasks', value: 8, date: monday, createdAt: monday },

      // Tuesday entries (Today: 2026-09-08)
      { id: 'e-7', metricId: 'metric-deep-work', value: 260, date: tuesday, createdAt: tuesday }, // 4h 20m
      { id: 'e-8', metricId: 'metric-exercise', value: 45, date: tuesday, createdAt: tuesday }, // 45m
      { id: 'e-9', metricId: 'metric-reading', value: 30, date: tuesday, createdAt: tuesday }, // 30m
      { id: 'e-10', metricId: 'metric-spent', value: 850, date: tuesday, createdAt: tuesday }, // Rs. 850
      { id: 'e-11', metricId: 'metric-projects', value: 1, date: tuesday, createdAt: tuesday },
      { id: 'e-12', metricId: 'metric-tasks', value: 10, date: tuesday, createdAt: tuesday },
      { id: 'e-13', metricId: 'metric-income', value: 42000, date: tuesday, createdAt: tuesday },

      // Past days in current month
      { id: 'e-14', metricId: 'metric-deep-work', value: 360, date: shiftDate(monday, -3), createdAt: '2026-09-04' },
      { id: 'e-15', metricId: 'metric-deep-work', value: 240, date: shiftDate(monday, -4), createdAt: '2026-09-03' },
      { id: 'e-16', metricId: 'metric-spent', value: 6370, date: shiftDate(monday, -5), createdAt: '2026-09-02' },
    ],
    events: [
      {
        id: 'ev-1',
        title: 'Shipped Aline attendance update',
        description: 'Completed manual overtime modal & subscription fix.',
        date: tuesday,
        createdAt: tuesday,
      },
      {
        id: 'ev-2',
        title: 'Worked on personal project',
        description: 'Designed MeTric architecture and data rollups.',
        date: tuesday,
        createdAt: tuesday,
      },
      {
        id: 'ev-3',
        title: 'Drafted Q4 roadmap for Aline',
        date: monday,
        createdAt: monday,
      },
    ],
    notes: [
      {
        date: tuesday,
        content: 'Good day. Got most important work done.',
        updatedAt: tuesday,
      },
      {
        date: monday,
        content: 'Strong start to the week. High focus in the morning.',
        updatedAt: monday,
      },
    ],
    goals: [
      {
        id: 'goal-1',
        title: 'Ship 3 meaningful things this week',
        metricId: 'metric-projects',
        targetValue: 3,
        period: 'week',
        startDate: monday,
        endDate: weekInfo.end,
        createdAt: monday,
      },
      {
        id: 'goal-2',
        title: 'Hit 25 hours of deep work',
        metricId: 'metric-deep-work',
        targetValue: 25,
        period: 'week',
        startDate: monday,
        endDate: weekInfo.end,
        createdAt: monday,
      },
      {
        id: 'goal-3',
        title: '4 workouts this week',
        metricId: 'metric-exercise',
        targetValue: 4,
        period: 'week',
        startDate: monday,
        endDate: weekInfo.end,
        createdAt: monday,
      },
    ],
    reviews: [
      {
        id: 'rev-prev-week',
        periodType: 'week',
        periodKey: '2026-W36',
        periodStart: shiftDate(monday, -7),
        periodEnd: shiftDate(monday, -1),
        wentWell: 'Consistency in deep work early mornings was phenomenal. Shipped the billing overhaul.',
        didntGoWell: 'Stayed up too late on Thursday and lost momentum on Friday.',
        focus: 'Protect 8 hours of sleep and hit 4 solid workouts.',
        updatedAt: shiftDate(monday, -1),
      },
    ],
  };
}

export function createBlankDatabase(): AppDatabase {
  return {
    version: 1,
    profile: {
      name: '',
      age: undefined,
      occupation: '',
      currency: 'Rs.',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    settings: {
      currencySymbol: 'Rs.',
      theme: 'obsidian',
      weekStartsOnMonday: true,
    },
    metrics: [
      {
        id: 'metric-deep-work',
        name: 'Deep Work',
        type: 'duration',
        category: 'Work',
        unit: 'hrs',
        targetValue: 25,
        targetPeriod: 'week',
        color: '#38bdf8',
        icon: 'Clock',
        isDefaultQuickLog: true,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'metric-exercise',
        name: 'Exercise',
        type: 'duration',
        category: 'Health',
        unit: 'hrs',
        targetValue: 4,
        targetPeriod: 'week',
        color: '#34d399',
        icon: 'Dumbbell',
        isDefaultQuickLog: true,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'metric-reading',
        name: 'Reading',
        type: 'duration',
        category: 'Learning',
        unit: 'hrs',
        targetValue: 3,
        targetPeriod: 'week',
        color: '#a78bfa',
        icon: 'BookOpen',
        isDefaultQuickLog: true,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'metric-spent',
        name: 'Money Spent',
        type: 'currency',
        category: 'Money',
        unit: 'Rs.',
        targetValue: 25000,
        targetPeriod: 'month',
        color: '#f87171',
        icon: 'CreditCard',
        isDefaultQuickLog: true,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ],
    entries: [],
    events: [],
    notes: [],
    goals: [],
    reviews: [],
  };
}
