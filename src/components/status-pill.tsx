const TONE_CLASSES = {
  good: "bg-good-soft text-good",
  warning: "bg-warning-soft text-warning",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
} as const;

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONE_CLASSES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
